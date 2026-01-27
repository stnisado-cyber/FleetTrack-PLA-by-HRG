
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Car, UsageLog, FuelLevel, VehicleCondition } from './types';
import { INITIAL_CARS, Icons } from './constants';
import FormPage from './pages/FormPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import ReturnPage from './pages/ReturnPage';

// ID unik untuk penyimpanan data bersama di internet
const SHARED_STORAGE_ID = "e089285093556d11e54a";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("-");
  const [networkError, setNetworkError] = useState(false);
  
  // Deteksi ID Jaringan Kantor (dari URL atau LocalStorage)
  const [networkId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('net');
    const fromStorage = localStorage.getItem('pla_fleet_net_id');
    
    if (fromUrl) {
      localStorage.setItem('pla_fleet_net_id', fromUrl);
      return fromUrl;
    }
    if (fromStorage) return fromStorage;
    
    const newId = `FLEET-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    localStorage.setItem('pla_fleet_net_id', newId);
    return newId;
  });

  const [cars, setCars] = useState<Car[]>(() => {
    const saved = localStorage.getItem('pla_fleet_cars');
    return saved ? JSON.parse(saved) : INITIAL_CARS;
  });

  const [logs, setLogs] = useState<UsageLog[]>(() => {
    const saved = localStorage.getItem('pla_fleet_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const API_ENDPOINT = `https://api.npoint.io/${SHARED_STORAGE_ID}`;

  // Logika utama sinkronisasi otomatis
  const syncData = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await fetch(API_ENDPOINT);
      if (response.ok) {
        const cloudData = await response.json();
        const myNetworkData = cloudData[networkId];
        
        if (myNetworkData) {
          // 1. SINKRONISASI LOG (Merge Logic)
          setLogs(currentLocalLogs => {
            const localMap = new Map(currentLocalLogs.map(l => [l.id, l]));
            let hasChanged = false;

            myNetworkData.logs.forEach((cloudLog: UsageLog) => {
              const localLog = localMap.get(cloudLog.id);
              // Jika data baru atau status berubah (misal: di-approve HRGA)
              if (!localLog || localLog.status !== cloudLog.status) {
                localMap.set(cloudLog.id, cloudLog);
                hasChanged = true;
              }
            });

            if (hasChanged) {
              const updated = Array.from(localMap.values()).sort((a, b) => 
                new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
              );
              localStorage.setItem('pla_fleet_logs', JSON.stringify(updated));
              return updated;
            }
            return currentLocalLogs;
          });

          // 2. SINKRONISASI STATUS MOBIL
          setCars(currentCars => {
            if (JSON.stringify(currentCars) !== JSON.stringify(myNetworkData.cars)) {
              localStorage.setItem('pla_fleet_cars', JSON.stringify(myNetworkData.cars));
              return myNetworkData.cars;
            }
            return currentCars;
          });
        }
        setNetworkError(false);
        setLastSync(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e) {
      setNetworkError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [networkId, isSyncing, API_ENDPOINT]);

  // Push data ke cloud setiap ada perubahan lokal
  const pushToCloud = async (newCars: Car[], newLogs: UsageLog[]) => {
    try {
      const getRes = await fetch(API_ENDPOINT);
      const allCloudData = getRes.ok ? await getRes.json() : {};
      
      allCloudData[networkId] = { 
        cars: newCars, 
        logs: newLogs,
        lastUpdate: new Date().toISOString()
      };

      await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allCloudData)
      });
      setLastSync(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error("Cloud push failed", e);
    }
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, 10000); // Polling setiap 10 detik
    return () => clearInterval(interval);
  }, []);

  const updateAll = async (newCars: Car[], newLogs: UsageLog[]) => {
    setCars(newCars);
    setLogs(newLogs);
    localStorage.setItem('pla_fleet_cars', JSON.stringify(newCars));
    localStorage.setItem('pla_fleet_logs', JSON.stringify(newLogs));
    await pushToCloud(newCars, newLogs);
  };

  const handleAddLog = (log: UsageLog) => {
    const updatedLogs = [log, ...logs];
    const updatedCars = cars.map(c => c.id === log.carId ? { ...c, status: 'requested' as const } : c);
    updateAll(updatedCars, updatedLogs);
  };

  const handleApprove = (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    const updatedLogs = logs.map(l => l.id === id ? { ...l, status: 'active' as const } : l);
    const updatedCars = cars.map(c => c.id === log.carId ? { ...c, status: 'on-duty' as const } : c);
    updateAll(updatedCars, updatedLogs);
  };

  const handleReject = (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    const updatedLogs = logs.map(l => l.id === id ? { ...l, status: 'rejected' as const } : l);
    const updatedCars = cars.map(c => c.id === log.carId ? { ...c, status: 'available' as const } : c);
    updateAll(updatedCars, updatedLogs);
  };

  const handleComplete = (id: string, endData: any) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    const updatedLogs = logs.map(l => l.id === id ? { ...l, status: 'completed' as const, ...endData } : l);
    const updatedCars = cars.map(c => c.id === log.carId ? { ...c, status: 'available' as const } : c);
    updateAll(updatedCars, updatedLogs);
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
        />
        
        <main className="flex-1 w-full pb-24 md:pb-0 overflow-x-hidden relative">
          <Routes>
            <Route path="/" element={<FormPage cars={cars} onSubmit={handleAddLog} />} />
            <Route path="/return" element={<ReturnPage logs={logs} onComplete={handleComplete} onExtend={() => {}} />} />
            <Route 
              path="/dashboard" 
              element={isAdmin ? <DashboardPage cars={cars} logs={logs} onComplete={handleComplete} onApprove={handleApprove} onReject={handleReject} onToggleMaintenance={(id) => {
                const updated = cars.map(c => c.id === id ? { ...c, status: (c.status === 'maintenance' ? 'available' : 'maintenance') as any } : c);
                updateAll(updated, logs);
              }} /> : <AdminGuard onAuth={(pin) => { if(pin === '1234') { setIsAdmin(true); sessionStorage.setItem('admin_auth', 'true'); return true; } return false; }} />} 
            />
            <Route 
              path="/history" 
              element={isAdmin ? <HistoryPage logs={logs} onImportLogs={(imported) => updateAll(cars, imported)} /> : <AdminGuard onAuth={() => false} />} 
            />
          </Routes>
        </main>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 text-white p-4 flex justify-around items-center border-t border-slate-800 z-50">
           <Link to="/" className="p-3"><Icons.Clipboard /></Link>
           <Link to="/return" className="p-3"><Icons.Return /></Link>
           <Link to="/dashboard" className="p-3 relative">
             <Icons.Layout />
             {logs.filter(l => l.status === 'pending').length > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full"></div>}
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
    const origin = window.location.origin;
    const path = window.location.pathname;
    const cleanPath = path.endsWith('/') ? path : path + '/';
    // Mencegah doubling URL dan memastikan parameter network ikut tersalin
    const finalUrl = `${origin}${cleanPath}?net=${networkId}#/`;
    
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
            <span className="text-[7px] font-black uppercase text-slate-500">KANTOR ID: {networkId}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-fuchsia-500 animate-ping' : 'bg-green-500'}`}></div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest">{networkError ? 'Sync Offline' : 'Cloud Active'}</p>
          <p className="text-[7px] font-bold text-slate-600 mt-1 uppercase">SINKRON: {lastSync}</p>
        </div>
        
        <button onClick={shareLink} className={`w-full py-5 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 ${copied ? 'bg-green-600 text-white' : 'bg-white text-slate-950 hover:bg-fuchsia-600 hover:text-white shadow-xl'}`}>
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
        <h2 className="text-xl font-black text-slate-950 uppercase mb-8 tracking-tighter">Admin Control</h2>
        <form onSubmit={(e) => { e.preventDefault(); if(!onAuth(pin)) { setError(true); setPin(''); } }} className="space-y-6">
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={4} className={`w-full py-6 bg-slate-50 border-4 rounded-3xl text-center text-4xl font-black outline-none ${error ? 'border-red-500 animate-shake' : 'border-slate-50 focus:border-fuchsia-500'}`} placeholder="****" autoFocus />
          <button type="submit" className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-fuchsia-600 transition-all">Unlock Access</button>
        </form>
      </div>
    </div>
  );
}
