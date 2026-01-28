
import React, { useState } from 'react';
import { Car, UsageLog, FuelLevel, VehicleCondition } from '../types';

interface Props {
  cars: Car[];
  logs: UsageLog[];
  onComplete: (id: string, endData: { endOdo: number, endFuel: FuelLevel, endCondition: VehicleCondition, arrivalTime: string }) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRefresh: () => void;
  onToggleMaintenance: (carId: string) => void;
}

export default function DashboardPage({ cars, logs, onComplete, onApprove, onReject, onRefresh, onToggleMaintenance }: Props) {
  const pendingLogs = logs.filter(l => l.status === 'pending');
  const activeLogs = logs.filter(l => l.status === 'active');
  const [completeDialog, setCompleteDialog] = useState<string | null>(null);
  
  const [endData, setEndData] = useState({
    endOdo: '',
    endFuel: '1/2' as FuelLevel,
    endCondition: 'BAIK' as VehicleCondition,
    arrivalTime: new Date().toISOString().slice(0, 16)
  });

  const stats = {
    total: cars.length,
    available: cars.filter(c => c.status === 'available').length,
    onDuty: cars.filter(c => c.status === 'on-duty').length,
    maintenance: cars.filter(c => c.status === 'maintenance').length,
    pending: pendingLogs.length
  };

  return (
    <div className="p-4 md:p-12 space-y-12 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-fuchsia-600"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-600">HRGA Control Center</p>
          </div>
          <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Monitoring & Approval</h1>
        </div>
        <button onClick={onRefresh} className="px-6 py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-fuchsia-600 transition-all shadow-xl">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
           Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Unit" value={stats.total} color="bg-slate-950 text-white" />
        <StatCard label="Tersedia" value={stats.available} color="bg-white border-slate-100" accent="bg-green-500" />
        <StatCard label="On Trip" value={stats.onDuty} color="bg-white border-slate-100" accent="bg-fuchsia-600" />
        <StatCard label="Servis" value={stats.maintenance} color="bg-white border-slate-100" accent="bg-slate-400" />
        <StatCard label="Pemesanan Baru" value={stats.pending} color={stats.pending > 0 ? "bg-amber-500 text-slate-950 animate-pulse" : "bg-white border-slate-100"} />
      </div>

      {pendingLogs.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-2 h-8 bg-amber-500 rounded-full animate-pulse"></div>
            <h2 className="text-xl font-black text-slate-950 uppercase tracking-wider">Butuh Persetujuan ({pendingLogs.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingLogs.map(log => (
              <div key={log.id} className="bg-white border-4 border-amber-500 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Permohonan Baru</p>
                  <h3 className="font-black text-2xl text-slate-950 mb-1">{log.carName}</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-6">{log.driverName} • {log.department}</p>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tujuan</p>
                    <p className="text-sm font-bold text-slate-800 line-clamp-2">"{log.destination}"</p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => onApprove(log.id)} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 shadow-lg active:scale-95">Approve</button>
                    <button onClick={() => onReject(log.id)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all active:scale-95">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-2 h-8 bg-fuchsia-600 rounded-full"></div>
            <h2 className="text-xl font-black text-slate-950 uppercase tracking-wider">Aktivitas Berjalan ({activeLogs.length})</h2>
          </div>
          {activeLogs.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center">
              <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Belum ada unit bertugas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeLogs.map(log => (
                <div key={log.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="font-black text-xl text-slate-950 mb-1">{log.carName}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">{log.driverName} • {log.department}</p>
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Tujuan</span>
                    <span className="text-[10px] font-black text-slate-950 uppercase truncate max-w-[120px]">{log.destination}</span>
                  </div>
                  <button onClick={() => setCompleteDialog(log.id)} className="w-full py-4 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-fuchsia-600 transition-all">Selesaikan Trip</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-2 h-8 bg-slate-400 rounded-full"></div>
            <h2 className="text-xl font-black text-slate-950 uppercase tracking-wider">Armada Anda</h2>
          </div>
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl space-y-4">
             {cars.map(car => (
               <div key={car.id} className="flex items-center justify-between p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-black text-slate-950 text-sm">{car.name}</p>
                    <p className="text-[9px] font-mono text-slate-400 font-bold">{car.plateNumber}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter ${
                      car.status === 'available' ? 'bg-green-100 text-green-600' :
                      car.status === 'on-duty' ? 'bg-fuchsia-100 text-fuchsia-600' :
                      car.status === 'requested' ? 'bg-amber-100 text-amber-600' :
                      'bg-slate-800 text-white'
                    }`}>
                      {car.status}
                    </span>
                    {(car.status === 'available' || car.status === 'maintenance') && (
                      <button 
                        onClick={() => onToggleMaintenance(car.id)}
                        className={`p-2 rounded-lg transition-all ${
                          car.status === 'maintenance' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-800 hover:text-white'
                        }`}
                        title={car.status === 'maintenance' ? "Set Available" : "Set Maintenance"}
                      >
                        {car.status === 'maintenance' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        )}
                      </button>
                    )}
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      {completeDialog && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-8 text-center">Input KM Akhir</h3>
            <input 
              type="number" 
              value={endData.endOdo}
              onChange={e => setEndData({ ...endData, endOdo: e.target.value })}
              className="w-full px-8 py-8 border-4 border-slate-50 rounded-[2rem] outline-none font-mono font-black text-4xl text-center mb-8"
              placeholder="0000"
            />
            <div className="flex flex-col gap-4">
              <button onClick={() => {
                onComplete(completeDialog, { ...endData, endOdo: parseInt(endData.endOdo), arrivalTime: new Date().toISOString() });
                setCompleteDialog(null);
              }} className="py-6 bg-slate-950 text-white font-black uppercase text-xs rounded-2xl">Confirm & Clear Status</button>
              <button onClick={() => setCompleteDialog(null)} className="py-2 text-slate-400 font-bold uppercase text-[10px]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, accent }: { label: string, value: number, color: string, accent?: string }) {
  return (
    <div className={`${color} rounded-[2rem] p-6 border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden shadow-sm`}>
      {accent && <div className={`absolute top-0 left-0 w-1.5 h-full ${accent}`}></div>}
      <span className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">{label}</span>
      <span className="text-3xl font-black tabular-nums">{value}</span>
    </div>
  );
}
