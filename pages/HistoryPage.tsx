
import React, { useState } from 'react';
import { UsageLog } from '../types';

interface Props {
  logs: UsageLog[];
  onDelete?: (id: string, unitId: string) => void;
}

export default function HistoryPage({ logs, onDelete }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{id: string, unitId: string} | null>(null);

  const filteredLogs = logs.filter(log => 
    log.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.carName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
  };

  const formatTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr));
  };

  return (
    <div className="p-4 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-fuchsia-600"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-600">Centralized Data Hub</p>
          </div>
          <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tight">Log Aktivitas Operasional</h1>
        </div>
      </div>

      <div className="relative mb-8">
        <input type="text" placeholder="Cari Driver, Unit, atau Departemen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-8 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:border-fuchsia-500 outline-none transition-all font-black text-xs shadow-sm" />
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-8 border-r border-slate-900">User & Armada</th>
                <th className="px-8 py-8 border-r border-slate-900">Tujuan</th>
                <th className="px-8 py-8 border-r border-slate-900 text-center">Waktu</th>
                <th className="px-8 py-8 border-r border-slate-900 text-center">Energi & KM</th>
                <th className="px-8 py-8 text-center">Dokumen</th>
                <th className="px-8 py-8 text-center border-r border-slate-900">Status</th>
                <th className="px-8 py-8 text-center uppercase tracking-[0.2em] font-black text-[10px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="px-8 py-8">
                    <p className="font-black text-slate-950 text-lg group-hover:text-fuchsia-600 transition-colors leading-none mb-1">{log.driverName}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{log.carName} • {log.department}</p>
                  </td>
                  <td className="px-8 py-8">
                    <p className="text-sm font-black text-slate-700 leading-tight mb-2 truncate max-w-[200px]">{log.destination}</p>
                    <p className="text-[9px] text-slate-400 font-bold italic truncate max-w-[150px]">"{log.purpose}"</p>
                  </td>
                  <td className="px-8 py-8 text-center">
                    <p className="text-xs font-black text-slate-950">{formatDate(log.departureTime)}</p>
                    <p className="text-[10px] font-bold text-fuchsia-600 mb-2">{formatTime(log.departureTime)} WIB</p>
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Rencana: {formatTime(log.plannedStartTime)} - {formatTime(log.plannedEndTime)}</p>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex flex-col gap-1 items-center">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${log.carName.toUpperCase().includes('BYD') ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        {log.endFuel ? (log.carName.toUpperCase().includes('BYD') ? `BAT: ${log.endFuel}` : `BBM: ${log.endFuel}`) : 'N/A'}
                      </span>
                      <span className="font-mono text-[9px] font-black text-slate-400">{log.endOdometer ? `${log.endOdometer} KM` : `${log.startOdometer} KM`}</span>
                    </div>
                  </td>
                  <td className="px-8 py-8 text-center">
                    {(log.returnPhoto || log.odometerPhotoUrl) ? (
                      <button onClick={() => setSelectedPhoto((log.returnPhoto || log.odometerPhotoUrl)!)} className="p-3 bg-fuchsia-100 text-fuchsia-600 rounded-xl hover:bg-fuchsia-600 hover:text-white transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                      </button>
                    ) : (
                      <span className="text-[9px] font-black text-slate-300 uppercase italic">No Photo</span>
                    )}
                  </td>
                  <td className="px-8 py-8 text-center">
                    <span className={`inline-flex px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                      log.status === 'completed' ? 'bg-slate-50 text-slate-400 border-slate-100' : 
                      log.status === 'active' ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-lg' :
                      log.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-amber-500 text-slate-950 border-amber-600'
                    }`}>
                      {log.status === 'on-duty' ? 'ON TRIP' : log.status}
                    </span>
                  </td>
                  <td className="px-8 py-8 text-center">
                    <button 
                      onClick={() => setConfirmDelete({ id: log.id, unitId: log.unitId })}
                      className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all group-hover:shadow-md"
                      title="Hapus Log"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[400] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
           <button onClick={() => setSelectedPhoto(null)} className="absolute top-8 right-8 p-4 bg-white/10 text-white rounded-full hover:bg-red-600 transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6 6 18M6 6l12 12"/></svg>
           </button>
           <div className="max-w-5xl w-full h-full flex flex-col items-center justify-center gap-8">
              <div className="bg-white p-4 rounded-[3rem] shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
                <img src={selectedPhoto} className="max-h-[70vh] w-auto rounded-[2rem] shadow-inner" alt="Parking documentation" />
              </div>
           </div>
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-4">Hapus Log Ini?</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">Data ini akan dihapus permanen dari database cloud.</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => { onDelete?.(confirmDelete.id, confirmDelete.unitId); setConfirmDelete(null); }} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-red-700 transition-all">Ya, Hapus Permanen</button>
                <button onClick={() => setConfirmDelete(null)} className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all">Batalkan</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
