
import React, { useState } from 'react';
import { UsageLog } from '../types';

interface Props {
  logs: UsageLog[];
  onImportLogs: (importedLogs: UsageLog[]) => void;
}

export default function HistoryPage({ logs, onImportLogs }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showSync, setShowSync] = useState(false);
  const [syncCode, setSyncCode] = useState('');

  const filteredLogs = logs.filter(log => 
    log.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.carName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const data = btoa(JSON.stringify(logs));
    setSyncCode(data);
    navigator.clipboard.writeText(data);
    alert("Kode Sync berhasil disalin! Kirim kode ini ke admin untuk sinkronisasi data.");
  };

  const handleImport = () => {
    try {
      const decoded = JSON.parse(atob(syncCode));
      if (Array.isArray(decoded)) {
        onImportLogs(decoded);
        setSyncCode('');
        setShowSync(false);
        alert("Data berhasil digabungkan!");
      }
    } catch (e) {
      alert("Kode Sync tidak valid.");
    }
  };

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
        <div className="flex gap-4">
          <button onClick={() => setShowSync(true)} className="px-6 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Manual Sync
          </button>
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
                <th className="px-8 py-8 text-center">Status</th>
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
                    <p className="text-[10px] font-bold text-fuchsia-600">{formatTime(log.departureTime)} WIB</p>
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
                    {log.returnPhoto ? (
                      <button onClick={() => setSelectedPhoto(log.returnPhoto!)} className="p-3 bg-fuchsia-100 text-fuchsia-600 rounded-xl hover:bg-fuchsia-600 hover:text-white transition-all shadow-sm">
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
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showSync && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-6 z-[300] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-12 w-full max-w-xl shadow-2xl">
            <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-4">Sync Center</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Gabungkan data manual dari perangkat lain</p>
            
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Export Data</p>
                <button onClick={handleExport} className="w-full py-4 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Salin Kode Sync Saya</button>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Import Data</p>
                <textarea 
                  value={syncCode}
                  onChange={e => setSyncCode(e.target.value)}
                  placeholder="Paste kode di sini..."
                  className="w-full h-24 p-4 rounded-xl border-2 border-slate-200 outline-none focus:border-fuchsia-500 font-mono text-[10px] mb-4"
                />
                <button onClick={handleImport} className="w-full py-4 bg-fuchsia-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Gabungkan Data Sekarang</button>
              </div>
            </div>

            <button onClick={() => setShowSync(false)} className="w-full mt-6 text-slate-400 font-black uppercase text-[10px]">Tutup</button>
          </div>
        </div>
      )}

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
    </div>
  );
}
