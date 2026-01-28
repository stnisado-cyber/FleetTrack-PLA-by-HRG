
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Car, UsageLog, FuelLevel, VehicleCondition } from './types';
import { INITIAL_CARS, Icons } from './constants';
import FormPage from './pages/FormPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import ReturnPage from './pages/ReturnPage';

const SHARED_STORAGE_ID = "e089285093556d11e54a";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("-");
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false); // Pastikan data awal sudah ditarik
  
  const [networkId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    let id = params.get('net');
    
    if (!id && window.location.hash.includes('?')) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      id = hashParams.get('net');
    }
    
    const idFromLocal = localStorage.getItem('pla_fleet_net_id');
    
    if (id) {
      localStorage.setItem('pla_fleet_net_id', id);
      return id;
    }
    return idFromLocal || `FLEET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  });

  const [cars, setCars] = useState<Car[]>(INITIAL_CARS);
  const [logs, setLogs] = useState<UsageLog[]>([]);

  // Fungsi ambil data murni dari CLOUD tanpa gangguan cache browser
  const fetchCloudData = async () => {
    const timestamp = Date.now();
    const response = await fetch(`https://api.npoint.io/${SHARED_STORAGE_ID}?cb=${timestamp}`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error("Server tidak merespon");
    const data = await response.json();
    return data[networkId] || null;
  };

  const syncData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const myData = await fetchCloudData();
      if (myData) {
        setLogs(prev => {
          const cloudLogs = myData.logs || [];
          // Merge logic: utamakan yang ada ID-nya (Cloud adalah source of truth)
          localStorage.setItem('pla_fleet_logs', JSON.stringify(cloudLogs));
          return cloudLogs;
        });
        setCars(prev => {
          const cloudCars = myData.cars || INITIAL_CARS;
          localStorage.setItem('pla_fleet_cars', JSON.stringify(cloudCars));
          return cloudCars;
        });
      }
      setNetworkError(null);
      setLastSync(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsReady(true);
    } catch (e: any) {
      setNetworkError(e.message);
    } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, [networkId]);

  const pushDataToCloud = async (updatedCars: Car[], updatedLogs: UsageLog[]) => {
    const response = await fetch(`https://api.npoint.io/${SHARED_STORAGE_ID}`, { cache: 'no-store' });
    const allData = response.ok ? await response.json() : {};
    
    allData[networkId] = {
      cars: updatedCars,
      logs: updatedLogs,
      lastUpdate: new Date().toISOString()
    };

    const postRes = await fetch(`https://api.npoint.io/${SHARED_STORAGE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allData)
    });
    
    if (!postRes.ok) throw new Error("Gagal menyimpan ke Cloud");
    return true;
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(() => syncData(true), 7000); 
    return () => clearInterval(interval);
  }, [syncData]);

  const handleAddLog = async (log: UsageLog) => {
    setIsSyncing(true);
    try {
      // 1. VERIFIKASI CLOUD INSTAN SEBELUM SUBMIT
      const latestCloud = await fetchCloudData();
      const latestCars: Car[] = latestCloud?.cars || INITIAL_CARS;
      const latestLogs: UsageLog[] = latestCloud?.logs || [];
      
      const targetCar = latestCars.find(c => c.id === log.carId);
      
      if (!targetCar || targetCar.status !== 'available') {
        alert("❌ UNIT BARU SAJA DIAMBIL USER LAIN!\nHalaman akan dimuat ulang untuk melihat ketersediaan terbaru.");
        await syncData();
        return;
      }

      // 2. JIKA OK, PROSES BOOKING
      const updatedCars = latestCars.map(c => c.id === log.carId ? { ...c, status: 'requested' as const } : c);
      const updatedLogs = [log, ...latestLogs];

      await pushDataToCloud(updatedCars, updatedLogs);
      
      // Update UI lokal setelah sukses cloud
      setCars(updatedCars);
      setLogs(updatedLogs);
      setNetworkError(null);
    } catch (e: any) {
      alert("⚠️ KONEKSI GAGAL: Data tidak terkirim ke HRGA. Cek internet.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApprove = async (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    const updatedLogs = logs.map(l => l.id === id ? { ...l, status: 'active' as const } : l);
    const updatedCars = cars.map(c => c.id === log.carId ? { ...c, status: 'on-duty' as const } : c);
    
    setCars(updatedCars);
    setLogs(updatedLogs);
    await pushDataToCloud(updatedCars, updatedLogs);
  };

  const handleReject = async (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    const updatedLogs = logs.map(l => l.id === id ? { ...l, status: 'rejected' as const } : l);
    const updatedCars = cars.map(c => c.id === log.carId ? { ...c, status: 'available' as const } : c);
    
    setCars(updatedCars);
    setLogs(updatedLogs);
    await pushDataToCloud(updatedCars, updatedLogs);
  };

  const handleComplete = async (id: string, endData: any) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    const updatedLogs = logs.map(l => l.id === id ? { ...l, status: 'completed' as const, ...endData } : l);
    const updatedCars = cars.map(c => c.id === log.carId ? { ...c, status: 'available' as const } : c);
    
    setCars(updatedCars);
    setLogs(updatedLogs);
    await pushDataToCloud(updatedCars, updatedLogs);
  };

  const handleToggleMaintenance = async (carId: string) => {
    const updatedCars = cars.map(c => c.id === carId ? { ...c, status: (c.status === 'maintenance' ? 'available' : 'maintenance') as any } : c);
    setCars(updatedCars);
    await pushDataToCloud(updatedCars, logs);
  };

  return (
    <HashRouter>
      <div className="flex flex-col md:flex-row min-h-screen w-full bg-[#f8fafc] text-slate-900">
        <Sidebar 
          isAdmin={isAdmin} 
          isSyncing={isSyncing} 
          lastSync={lastSync} 
          networkError={!!networkError} 
          networkId={networkId}
          onLogout={() => { setIsAdmin(false); sessionStorage.removeItem('admin_auth'); }} 
          pendingCount={logs.filter(l => l.status === 'pending').length} 
        />
        
        <main className="flex-1 w-full pb-24 md:pb-0 overflow-x-hidden relative">
          {/* Mobile Header Indikator Sinkronisasi */}
          <div className={`md:hidden p-2 flex justify-between items-center text-[8px] font-black uppercase tracking-widest border-b z-[60] sticky top-0 ${networkError ? 'bg-red-600 text-white' : 'bg-slate-950 text-white'}`}>
             <div className="flex items-center gap-2">
               <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-fuchsia-400 animate-pulse' : (networkError ? 'bg-white' : 'bg-green-500')}`}></div>
               {networkError ? "KONEKSI TERPUTUS" : `KANTOR: ${networkId}`}
             </div>
             <div className="opacity-60">{isSyncing ? "MENGAMBIL DATA..." : `SINKRON: ${lastSync}`}</div>
          </div>

          {!isReady && !networkError && (
             <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menghubungkan ke Cloud HRGA...</p>
             </div>
          )}

          <Routes>
            <Route path="/" element={<FormPage cars={cars} networkId={networkId} isSyncing={isSyncing} networkError={!!networkError} onSubmit={handleAddLog} />} />
            <Route path="/return" element={<ReturnPage logs={logs} onComplete={handleComplete} onExtend={() => {}} />} />
            <Route 
              path="/dashboard" 
              element={isAdmin ? <DashboardPage cars={cars} logs={logs} onComplete={handleComplete} onApprove={handleApprove} onReject={handleReject} onRefresh={() => syncData()} onToggleMaintenance={handleToggleMaintenance} /> : <AdminGuard onAuth={(pin) => { if(pin === '1234') { setIsAdmin(true); sessionStorage.setItem('admin_auth', 'true'); return true; } return false; }} />} 
            />
            <Route 
              path="/history" 
              element={isAdmin ? <HistoryPage logs={logs} onImportLogs={async (imported) => { setLogs(imported); await pushDataToCloud(cars, imported); }} /> : <AdminGuard onAuth={() => false} />} 
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

function Sidebar({ isAdmin, isSyncing, lastSync, networkError, networkId, onLogout, pendingCount }: any) {
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const shareLink = () => {
    // Pastikan link menyertakan networkId agar user lain masuk ke database yang sama
    const baseUrl = window.location.origin + window.location.pathname;
    const finalUrl = `${baseUrl}?net=${networkId}#/`;
    
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
          { path: '/', label: 'Ambil Mobil', icon: <Icons.Clipboard /> },
          { path: '/return', label: 'Balik Mobil', icon: <Icons.Return /> },
          { path: '/dashboard', label: 'Monitoring', icon: <Icons.Layout />, badge: pendingCount },
          { path: '/history', label: 'Database', icon: <Icons.History /> },
        ].map((item) => (
          <Link key={item.path} to={item.path} className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${location.pathname === item.path ? 'bg-fuchsia-600 text-white shadow-xl translate-x-2' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            <span className="flex items-center gap-4">{item.icon} {item.label}</span>
            {item.badge && item.badge > 0 && <span className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-[9px] animate-pulse">{item.badge}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-8 border-t border-slate-900 space-y-4">
        <div className={`px-5 py-4 rounded-2xl border transition-all ${networkError ? 'border-red-500 bg-red-500/10' : 'border-slate-800 bg-slate-900/50'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[7px] font-black uppercase text-slate-500">KODE KANTOR:</span>
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-fuchsia-500 animate-ping' : (networkError ? 'bg-red-500' : 'bg-green-500')}`}></div>
          </div>
          <p className="text-[11px] font-black uppercase text-fuchsia-500 tracking-[0.2em]">{networkId}</p>
          <div className="flex justify-between items-center mt-2 border-t border-slate-800 pt-2">
            <p className="text-[7px] font-bold text-slate-600 uppercase">SINKRON: {lastSync}</p>
            <p className="text-[7px] font-black text-slate-400 uppercase">{networkError ? 'ERROR' : 'CLOUD READY'}</p>
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
