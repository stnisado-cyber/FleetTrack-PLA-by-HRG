
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Car, UsageLog, FuelLevel, VehicleCondition } from './types';
import { Icons } from './constants';
import FormPage from './pages/FormPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import ReturnPage from './pages/ReturnPage';
import { supabase } from './services/supabase';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("-");
  const [networkError, setNetworkError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // LOGIKA KODE KANTOR YANG KONSISTEN
  const [networkId] = useState(() => {
    // 1. Cek URL (Penting saat share link)
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    let id = params.get('net');
    
    // 2. Cek Memori HP
    const idFromLocal = localStorage.getItem('pla_fleet_net_id');
    
    if (id) {
      localStorage.setItem('pla_fleet_net_id', id);
      return id;
    }
    
    // GUNAKAN DEFAULT JIKA TIDAK ADA (Agar admin & user langsung nyambung)
    const finalId = idFromLocal || 'PLA-FLEET-MAIN'; 
    localStorage.setItem('pla_fleet_net_id', finalId);
    return finalId;
  });

  const [cars, setCars] = useState<Car[]>(() => {
    const saved = localStorage.getItem(`cars_${networkId}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [logs, setLogs] = useState<UsageLog[]>(() => {
    const saved = localStorage.getItem(`logs_${networkId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Fungsi Tarik Data Cloud dari Supabase (Multi-Table)
  const fetchCloudData = async () => {
    try {
      // TULIS ULANG: Menggunakan fleet_units dengan kolom spesifik: id, nama_unit, plat_nomor, status
      const { data: unitsData, error: unitsError } = await supabase
        .from('fleet_units')
        .select('id, nama_unit, plat_nomor, status');

      if (unitsError) throw unitsError;

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('fleet_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Transform DB columns to App state
      const mappedCars: Car[] = (unitsData || []).map(u => {
        let status = u.status?.toLowerCase() || 'available';
        // Normalisasi: Ubah "on duty" atau "on duty " menjadi "on-duty"
        if (status.includes('on duty') || status.includes('on trip')) {
          status = 'on-duty';
        }
        return {
          id: u.id.toString(),
          name: u.nama_unit,
          plateNumber: u.plat_nomor,
          status: status as any
        };
      });

      const mappedLogs: UsageLog[] = (bookingsData || []).map(b => {
        const unit = mappedCars.find(c => c.id === b.unit_id?.toString());
        const approval = b.status_approval?.toLowerCase() || 'pending';
        const isActive = approval === 'active' || approval === 'on-duty' || approval === 'on duty' || approval === 'on trip';
        return {
          id: b.id.toString(),
          unitId: b.unit_id?.toString() || '',
          carName: unit?.name || 'Unknown Unit',
          driverName: b.nama_user || '',
          department: b.departemen || '',
          purpose: b.keperluan_tujuan || b.purpose || '',
          plannedStartTime: b.rencana_pakai || '',
          plannedEndTime: b.sampai_kapan || '',
          departureTime: b.waktu_berangkat || b.created_at,
          estimatedArrivalTime: b.estimasi_kembali || '',
          startOdometer: b.odometer_awal || 0,
          startFuel: b.bbm_awal || '1/2',
          startCondition: b.kondisi_awal || 'BAIK',
          destination: b.tujuan || b.destination || b.keperluan_tujuan || '',
          status: isActive ? 'active' : (approval as any),
          requestDate: b.created_at,
          odometerPhotoUrl: b.foto_odometer || ''
        };
      });

      return { cars: mappedCars, logs: mappedLogs };
    } catch (e) {
      console.error("Supabase Fetch Error:", e);
      throw e;
    }
  };

  const syncData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const myData = await fetchCloudData();
      if (myData) {
        setLogs(myData.logs);
        localStorage.setItem(`logs_${networkId}`, JSON.stringify(myData.logs));
        setCars(myData.cars);
        localStorage.setItem(`cars_${networkId}`, JSON.stringify(myData.cars));
      }
      setNetworkError(false);
      setLastSync(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      setIsReady(true);
    } catch (e: any) {
      console.warn("Sync failed:", e.message);
      setNetworkError(true);
    } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, [networkId]);

  const updateUnitStatus = async (unitId: string, status: string) => {
    const { error } = await supabase.from('fleet_units').update({ status }).eq('id', unitId);
    if (error) {
      console.error(`Gagal update status unit ${unitId} ke ${status}:`, error);
      throw error;
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase.from('fleet_bookings').update({ status_approval: status }).eq('id', bookingId);
    if (error) {
      console.error(`Gagal update status booking ${bookingId} ke ${status}:`, error);
      throw error;
    }
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(() => syncData(true), 5000); // Cek tiap 5 detik (Auto-refresh lebih cepat)
    return () => clearInterval(interval);
  }, [syncData]);

  const handleAddLog = async (log: UsageLog) => {
    setIsSyncing(true);
    console.log("Memulai pengiriman data ke fleet_bookings...", log);
    try {
      let photoUrl = '';

      // 1. Upload Foto ke Storage jika ada
      if (log.odometerPhotoFile) {
        const file = log.odometerPhotoFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `odometer/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fleet-photos')
          .upload(filePath, file);

        if (uploadError) {
          console.error("Gagal upload foto:", uploadError);
          throw new Error("Gagal mengunggah foto odometer.");
        }

        const { data: { publicUrl } } = supabase.storage
          .from('fleet-photos')
          .getPublicUrl(filePath);
        
        photoUrl = publicUrl;
        console.log("Foto berhasil diupload:", photoUrl);
      }

      // 2. Insert ke fleet_bookings dengan kolom asli database
      const payload: any = { 
        nama_user: log.driverName, 
        departemen: log.department, 
        odometer_awal: log.startOdometer, 
        keperluan_tujuan: log.purpose, 
        unit_id: parseInt(log.unitId), 
        rencana_pakai: log.plannedStartTime,
        sampai_kapan: log.plannedEndTime,
        status_approval: 'pending',
        foto_odometer: photoUrl
      };

      console.log("Payload yang dikirim ke Supabase:", payload);

      const { error: bookErr } = await supabase
        .from('fleet_bookings')
        .insert([payload]);

      if (bookErr) {
        console.error("GAGAL INSERT fleet_bookings:", bookErr);
        throw bookErr;
      }

      // 3. Update status unit ke requested
      await updateUnitStatus(log.unitId, 'requested');

      await syncData();
      alert("✅ Permohonan Terkirim! Mohon tunggu approval HRGA.");
    } catch (e: any) {
      console.error("Error Total handleAddLog:", e);
      alert(`⚠️ GAGAL MENGIRIM: ${e.message || "Koneksi sibuk"}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApprove = async (id: string) => {
    setIsSyncing(true);
    try {
      const log = logs.find(l => l.id === id);
      if (!log) return;

      await updateBookingStatus(id, 'active');
      await updateUnitStatus(log.unitId, 'on-duty');

      await syncData();
    } catch (e) {
      console.error("Error Total handleApprove:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReject = async (id: string) => {
    setIsSyncing(true);
    try {
      const log = logs.find(l => l.id === id);
      if (!log) return;

      await updateBookingStatus(id, 'rejected');
      await updateUnitStatus(log.unitId, 'available');

      await syncData();
    } catch (e) {
      console.error("Error Total handleReject:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleComplete = async (id: string, endData: any) => {
    setIsSyncing(true);
    try {
      const log = logs.find(l => l.id === id);
      if (!log) return;

      let parkingUrl = '';
      let speedometerUrl = '';

      // 1. Upload Foto Parkir jika ada
      if (endData.parkingPhoto) {
        try {
          const file = dataURLtoFile(endData.parkingPhoto, `parking_${id}.jpg`);
          const filePath = `returns/parking_${Date.now()}_${id}.jpg`;
          const { error: uploadError } = await supabase.storage.from('fleet-photos').upload(filePath, file);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('fleet-photos').getPublicUrl(filePath);
            parkingUrl = publicUrl;
          }
        } catch (e) { console.error("Upload parking failed", e); }
      }

      // 2. Upload Foto Speedometer jika ada
      if (endData.odoPhoto) {
        try {
          const file = dataURLtoFile(endData.odoPhoto, `speedo_${id}.jpg`);
          const filePath = `returns/speedo_${Date.now()}_${id}.jpg`;
          const { error: uploadError } = await supabase.storage.from('fleet-photos').upload(filePath, file);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('fleet-photos').getPublicUrl(filePath);
            speedometerUrl = publicUrl;
          }
        } catch (e) { console.error("Upload speedo failed", e); }
      }

      // 3. Update status booking
      await updateBookingStatus(id, 'completed');

      // 4. Insert ke fleet_returns dengan percobaan bertahap (resilient insert)
      const fullPayload: any = {
        booking_id: id,
        odometer_akhir: endData.endOdometer,
        bbm_akhir: endData.endFuel,
        kondisi_akhir: endData.endCondition,
        waktu_kembali: endData.arrivalTime,
        catatan: `${endData.notes || ''} (BBM: ${endData.endFuel}, Kondisi: ${endData.endCondition})`,
        foto_parkir: parkingUrl,
        foto_speedometer: speedometerUrl
      };

      let { error: returnErr } = await supabase.from('fleet_returns').insert([fullPayload]);
      
      // Jika gagal karena kolom tidak ditemukan, coba lagi dengan payload minimal
      if (returnErr && returnErr.code === 'PGRST204') {
        console.warn("Retrying insert with minimal payload due to missing columns:", returnErr.message);
        const minimalPayload = {
          booking_id: id,
          odometer_akhir: endData.endOdometer,
          waktu_kembali: endData.arrivalTime,
          catatan: `${endData.notes || ''} [BBM: ${endData.endFuel}, Kondisi: ${endData.endCondition}, Foto: ${parkingUrl}, ${speedometerUrl}]`
        };
        const { error: retryErr } = await supabase.from('fleet_returns').insert([minimalPayload]);
        returnErr = retryErr;
      }
      
      if (returnErr) {
        console.error("Error insert fleet_returns:", returnErr);
        throw returnErr;
      }

      // 5. Update status unit
      await updateUnitStatus(log.unitId, 'available');

      await syncData();
      alert("✅ Pengembalian unit berhasil diproses.");
    } catch (e: any) {
      console.error("Error Total handleComplete:", e);
      alert("Gagal memproses pengembalian unit: " + (e.message || "Error Database"));
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper function to convert dataURL to File
  function dataURLtoFile(dataurl: string, filename: string) {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return new File([], filename);
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  const handleDeleteLog = async (id: string, unitId: string) => {
    setIsSyncing(true);
    try {
      const { error: deleteErr } = await supabase
        .from('fleet_bookings')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      // Reset unit status ke available karena log-nya dihapus (asumsi salah input/pembatalan manual)
      await updateUnitStatus(unitId, 'available');

      await syncData();
    } catch (e: any) {
      console.error("Error Delete Log:", e);
      alert(`❌ Gagal menghapus log: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleMaintenance = async (unitId: string) => {
    setIsSyncing(true);
    try {
      const car = cars.find(c => c.id === unitId);
      if (!car) return;
      const newStatus = car.status === 'maintenance' ? 'available' : 'maintenance';
      await updateUnitStatus(unitId, newStatus);
      await syncData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestSupabase = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('fleet_bookings')
        .insert([
          { 
            nama_user: 'Tes Nisa', 
            departemen: 'HRGA', 
            odometer_awal: 100, 
            keperluan_tujuan: 'Tes Koneksi', 
            unit_id: '1',
            rencana_pakai: new Date().toISOString(),
            sampai_kapan: new Date().toISOString(),
            status_approval: 'pending'
          }
        ]);

      if (error) throw error;
      alert("✅ Berhasil! Data tes masuk ke tabel 'fleet_bookings' dengan kolom baru.");
    } catch (e: any) {
      console.error("Test Insert Error:", e);
      alert(`❌ Gagal: ${e.message}. Pastikan tabel 'fleet_bookings' sudah ada di Supabase dengan kolom yang sesuai.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEmergencyReset = async () => {
    // Note: Confirmation is now handled by the custom modal in DashboardPage.tsx
    setIsSyncing(true);
    console.log("Memulai full reset armada dan permohonan...");
    try {
      // 1. Reset SEMUA unit yang bukan maintenance menjadi 'available'
      // JANGAN masukkan 'on-duty' ke dalam exclusion list!
      const { error: unitsErr } = await supabase
        .from('fleet_units')
        .update({ status: 'available' })
        .not('status', 'in', '(maintenance,Maintenance,MAINTENANCE,SERVIS,servis,Servis)');

      if (unitsErr) {
        console.error("Gagal update fleet_units:", unitsErr);
        throw unitsErr;
      }

      // 2. Tutup SEMUA permohonan (bookings) yang sedang berjalan/pending
      // Kita reset status_approval menjadi 'completed' untuk log yang menggantung
      const { error: bookingsErr } = await supabase
        .from('fleet_bookings')
        .update({ status_approval: 'completed' })
        .not('status_approval', 'in', '(completed,rejected,COMPLETED,REJECTED,Selesai,Ditolak)');

      if (bookingsErr) {
        console.error("Gagal update fleet_bookings:", bookingsErr);
        throw bookingsErr;
      }

      console.log("Reset DB berhasil, membersihkan cache lokal...");
      // Hapus cache lokal agar data benar-benar fresh
      localStorage.removeItem(`logs_${networkId}`);
      localStorage.removeItem(`cars_${networkId}`);
      
      await syncData();
      try { alert("✅ RESET TOTAL BERHASIL: Semua armada kini Hijau (Tersedia)."); } catch(e) {}
    } catch (e: any) {
      console.error("Critical Reset Error:", e);
      try { alert("❌ GAGAL RESET: " + (e.message || "Unknown error")); } catch(err) {}
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <HashRouter>
      <div className="flex flex-col md:flex-row min-h-screen w-full bg-[#f8fafc] text-slate-900">
        <Sidebar 
          isAdmin={isAdmin} 
          isSyncing={isSyncing} 
          lastSync={lastSync} 
          networkError={networkError} 
          networkId={networkId}
          onLogout={() => { setIsAdmin(false); sessionStorage.removeItem('admin_auth'); }} 
          pendingCount={logs.filter(l => l.status === 'pending').length}
          onRefresh={() => syncData()}
        />
        
        <main className="flex-1 w-full pb-24 md:pb-0 overflow-x-hidden relative">
          {/* Mobile Header Bar */}
          <div className={`md:hidden p-3 flex justify-between items-center text-[9px] font-black uppercase tracking-widest border-b sticky top-0 z-[60] shadow-sm ${networkError ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-white'}`}>
             <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-fuchsia-400 animate-pulse' : (networkError ? 'bg-white' : 'bg-green-500')}`}></div>
               FLEET MONITORING
             </div>
             <button onClick={() => syncData()} className="bg-white/10 px-2 py-1 rounded">REFRESH</button>
          </div>

          <Routes>
            <Route path="/" element={<FormPage cars={cars} networkId={networkId} isSyncing={isSyncing} networkError={networkError} onSubmit={handleAddLog} />} />
            <Route path="/return" element={<ReturnPage logs={logs} onComplete={handleComplete} onExtend={() => {}} />} />
            <Route 
              path="/dashboard" 
              element={isAdmin ? <DashboardPage cars={cars} logs={logs} onComplete={handleComplete} onApprove={handleApprove} onReject={handleReject} onRefresh={() => syncData()} onToggleMaintenance={handleToggleMaintenance} onTestSupabase={handleTestSupabase} onResetAll={handleEmergencyReset} lastSync={lastSync} /> : <AdminGuard onAuth={(pin) => { if(pin === '1234') { setIsAdmin(true); sessionStorage.setItem('admin_auth', 'true'); return true; } return false; }} />} 
            />
            <Route 
              path="/history" 
              element={isAdmin ? <HistoryPage logs={logs} onDelete={handleDeleteLog} /> : <AdminGuard onAuth={() => false} />} 
            />
          </Routes>
        </main>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 text-white p-4 flex justify-around items-center border-t border-slate-800 z-50">
           <Link to="/" className="p-3"><Icons.Clipboard /></Link>
           <Link to="/return" className="p-3"><Icons.Return /></Link>
           <Link to="/dashboard" className="p-3 relative">
             <Icons.Layout />
             {logs.filter(l => l.status === 'pending').length > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>}
           </Link>
        </div>
      </div>
    </HashRouter>
  );
}

function Sidebar({ isAdmin, isSyncing, lastSync, networkError, networkId, onLogout, pendingCount, onRefresh }: any) {
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const shareLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const finalUrl = `${baseUrl}#/`;
    navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="hidden md:flex flex-col w-80 bg-slate-950 border-r border-slate-800 min-h-screen sticky top-0 text-white shadow-2xl z-50">
      <div className="p-10 border-b border-slate-900 flex items-center gap-5">
        <div className="w-12 h-12 bg-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20"><Icons.Car /></div>
        <div>
          <span className="font-black text-white text-xl tracking-tight block uppercase">PLA <span className="text-fuchsia-500">FLEET</span></span>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mt-1">HRGA MONITORING</span>
        </div>
      </div>
      
      <nav className="flex-1 p-6 space-y-2 mt-4">
        {[
          { path: '/', label: 'Form Booking', icon: <Icons.Clipboard /> },
          { path: '/return', label: 'Kembali Unit', icon: <Icons.Return /> },
          { path: '/dashboard', label: 'Admin Panel', icon: <Icons.Layout />, badge: pendingCount },
          { path: '/history', label: 'Log Database', icon: <Icons.History /> },
        ].map((item) => (
          <Link key={item.path} to={item.path} className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${location.pathname === item.path ? 'bg-fuchsia-600 text-white shadow-xl translate-x-2' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <span className="flex items-center gap-4">{item.icon} {item.label}</span>
            {item.badge && item.badge > 0 && <span className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-[9px] animate-pulse">{item.badge}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-8 border-t border-slate-900 space-y-4">
        <div className={`px-5 py-4 rounded-2xl border transition-all ${networkError ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-900/50'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] font-black uppercase text-slate-500">STATUS KONEKSI:</span>
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-fuchsia-500 animate-ping' : (networkError ? 'bg-amber-500' : 'bg-green-500')}`}></div>
          </div>
          <p className="text-[11px] font-black uppercase text-fuchsia-500 tracking-[0.2em]">{networkError ? 'OFFLINE' : 'TERKONEKSI'}</p>
          <div className="flex justify-between items-center mt-2 border-t border-slate-800 pt-2">
            <p className="text-[7px] font-bold text-slate-600 uppercase">UPDATE: {lastSync}</p>
            <button onClick={onRefresh} className="text-[7px] font-black text-fuchsia-400 hover:text-white uppercase transition-colors">REFRESH</button>
          </div>
        </div>
        
        <button onClick={shareLink} className={`w-full py-5 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${copied ? 'bg-green-600 text-white' : 'bg-white text-slate-950 hover:bg-fuchsia-600 hover:text-white'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
          {copied ? 'LINK TERSALIN!' : 'SALIN LINK DRIVER'}
        </button>

        {isAdmin && <button onClick={onLogout} className="w-full py-4 text-red-500 border border-red-500/10 rounded-2xl text-[8px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Logout Admin</button>}
      </div>
    </div>
  );
}

function AdminGuard({ onAuth }: any) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-slate-950 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 className="text-xl font-black text-slate-950 uppercase mb-8 tracking-tighter">Admin Access Only</h2>
        <form onSubmit={(e) => { e.preventDefault(); if(!onAuth(pin)) { setError(true); setPin(''); } }} className="space-y-6">
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={4} className={`w-full py-6 bg-slate-50 border-4 rounded-3xl text-center text-4xl font-black outline-none ${error ? 'border-red-500 animate-shake' : 'border-slate-50 focus:border-fuchsia-500'}`} placeholder="****" autoFocus />
          <button type="submit" className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-fuchsia-600 transition-all">Unlock Dashboard</button>
        </form>
        {error && <p className="text-[10px] font-black text-red-500 uppercase mt-4">PIN Salah, Coba Lagi</p>}
      </div>
    </div>
  );
}
