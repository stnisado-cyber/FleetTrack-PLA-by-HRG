
import React, { useState, useRef } from 'react';
import { UsageLog, FuelLevel, VehicleCondition } from '../types';
import { Icons } from '../constants';

interface Props {
  logs: UsageLog[];
  onComplete: (id: string, endData: { endOdo: number, endFuel: FuelLevel, endCondition: VehicleCondition, arrivalTime: string, returnPhoto?: string }) => void;
  onExtend: (id: string, newTime: string, reason: string) => void;
}

export default function ReturnPage({ logs, onComplete, onExtend }: Props) {
  const activeLogs = logs.filter(l => l.status === 'active');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<'returned' | 'extended' | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [odoError, setOdoError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [endData, setEndData] = useState({
    endOdo: '',
    endFuel: '1/2' as FuelLevel,
    endCondition: 'BAIK' as VehicleCondition,
    arrivalTime: new Date().toISOString().slice(0, 16)
  });

  const selectedLog = logs.find(l => l.id === selectedLogId);
  const isEV = selectedLog?.carName.toUpperCase().includes('BYD');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOdoChange = (val: string) => {
    setEndData({ ...endData, endOdo: val });
    if (selectedLog && val) {
      const numVal = parseInt(val);
      if (numVal < selectedLog.startOdometer) {
        setOdoError(`KM Akhir (${numVal}) tidak boleh lebih kecil dari KM Awal (${selectedLog.startOdometer})`);
      } else {
        setOdoError(null);
      }
    } else {
      setOdoError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogId || !endData.endOdo || odoError) return;
    
    onComplete(selectedLogId, {
      endOdo: parseInt(endData.endOdo),
      endFuel: endData.endFuel,
      endCondition: endData.endCondition,
      arrivalTime: new Date(endData.arrivalTime).toISOString(),
      returnPhoto: photoPreview || undefined
    });

    setSubmitted('returned');
    setSelectedLogId(null);
    setPhotoPreview(null);
    setEndData({
      endOdo: '',
      endFuel: '1/2',
      endCondition: 'BAIK',
      arrivalTime: new Date().toISOString().slice(0, 16)
    });

    setTimeout(() => setSubmitted(null), 5000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fuelOptions: { value: FuelLevel; label: string; batteryLabel: string }[] = [
    { value: 'E', label: 'E', batteryLabel: '<20%' },
    { value: '1/4', label: '1/4', batteryLabel: '40%' },
    { value: '1/2', label: '1/2', batteryLabel: '60%' },
    { value: '3/4', label: '3/4', batteryLabel: '80%' },
    { value: 'F', label: 'F', batteryLabel: '100%' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-12 animate-in fade-in duration-700">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-1 bg-fuchsia-600"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-600">Fleet Operations</p>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-950 uppercase tracking-tight leading-tight">Kelola Unit Bertugas</h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Pilih unit untuk konfirmasi balik ke pool</p>
      </div>

      {submitted === 'returned' && (
        <div className="mb-10 p-7 bg-green-600 text-white rounded-[2rem] flex items-center gap-5 shadow-2xl animate-in zoom-in duration-500">
          <div className="bg-white text-green-600 p-3 rounded-2xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p className="font-black text-xl leading-none mb-1 uppercase tracking-tight">Data Berhasil Disinkron!</p>
            <p className="text-sm opacity-90 font-bold uppercase tracking-tighter text-green-50">Status armada kini tersedia untuk user lain.</p>
          </div>
        </div>
      )}

      {!selectedLogId ? (
        <div className="space-y-6">
          {activeLogs.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center">
              <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Tidak ada unit yang sedang bertugas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeLogs.map(log => (
                <div key={log.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl transition-all group overflow-hidden relative">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-slate-950 text-white rounded-2xl group-hover:bg-fuchsia-600 transition-colors">
                      <Icons.Car />
                    </div>
                    <div className="text-right">
                       <span className="text-[9px] font-black px-3 py-1 bg-fuchsia-100 text-fuchsia-600 rounded-full uppercase tracking-widest block mb-1">On Duty</span>
                       <span className="text-[9px] font-mono font-bold text-slate-400">KM Awal: {log.startOdometer}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-950 leading-none mb-1">{log.carName}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{log.driverName} • {log.department}</p>
                  <button onClick={() => setSelectedLogId(log.id)} className="w-full py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-fuchsia-600 transition-all shadow-lg active:scale-95">Selesaikan Trip Sekarang</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-950 px-10 py-12 text-white flex items-center gap-8 relative overflow-hidden">
             <button type="button" onClick={() => {setSelectedLogId(null); setPhotoPreview(null); setOdoError(null);}} className="p-4 bg-slate-800 rounded-2xl hover:bg-fuchsia-600 transition-all relative z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
             </button>
             <div className="relative z-10">
               <p className="text-[10px] font-black text-fuchsia-500 uppercase tracking-[0.3em] mb-2">Check-In Armada</p>
               <h3 className="text-3xl font-black">{selectedLog?.carName}</h3>
             </div>
          </div>

          <div className="p-10 md:p-14 space-y-12">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Foto Parkir Unit & Dashboard</label>
              <div className="relative">
                {photoPreview ? (
                  <div className="relative rounded-[2.5rem] overflow-hidden border-4 border-fuchsia-500 shadow-2xl aspect-video">
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Parking documentation" />
                    <button type="button" onClick={() => setPhotoPreview(null)} className="absolute top-4 right-4 p-3 bg-red-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-48 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-fuchsia-500 hover:border-fuchsia-100 hover:bg-fuchsia-50/30 transition-all group">
                    <div className="p-5 bg-slate-50 rounded-full group-hover:bg-fuchsia-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ambil Foto Dokumentasi</span>
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" capture="environment" className="hidden" />
              </div>
            </div>

            <div className="space-y-4 text-center">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Angka Odometer Akhir (KM)</label>
              <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase">KM AWAL TERDETEKSI: {selectedLog?.startOdometer}</p>
              <input 
                type="number" 
                required 
                value={endData.endOdo} 
                onChange={e => handleOdoChange(e.target.value)} 
                className={`w-full px-8 py-8 border-4 rounded-[2.5rem] outline-none font-mono font-black text-5xl text-center bg-slate-50 transition-all ${odoError ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-50 focus:border-fuchsia-500 text-slate-950'}`} 
                placeholder="000000" 
              />
              {odoError && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-4 animate-bounce">{odoError}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {isEV ? 'Status Baterai EV (%)' : 'Level BBM Akhir'}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {fuelOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setEndData({...endData, endFuel: opt.value})} className={`py-4 rounded-xl font-black text-[10px] transition-all border-2 ${endData.endFuel === opt.value ? 'bg-slate-950 text-white border-slate-950 scale-110 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>
                      {isEV ? opt.batteryLabel : opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kondisi Fisik Unit</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEndData({...endData, endCondition: 'BAIK'})} className={`flex-1 py-4 rounded-xl font-black text-[10px] border-2 transition-all ${endData.endCondition === 'BAIK' ? 'bg-green-600 text-white border-green-700 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>NORMAL</button>
                  <button type="button" onClick={() => setEndData({...endData, endCondition: 'PERLU PENGECEKAN'})} className={`flex-1 py-4 rounded-xl font-black text-[10px] border-2 transition-all ${endData.endCondition === 'PERLU PENGECEKAN' ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>ADA KELUHAN</button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-10 bg-slate-50 border-t border-slate-100">
             <button 
                type="submit" 
                disabled={!!odoError || !endData.endOdo} 
                className={`w-full py-8 font-black uppercase text-sm tracking-[0.3em] rounded-[2rem] transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 ${odoError || !endData.endOdo ? 'bg-slate-300 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-950 text-white hover:bg-fuchsia-600'}`}
             >
                <Icons.Return />
                Kirim Data Kembali
             </button>
          </div>
        </form>
      )}
    </div>
  );
}
