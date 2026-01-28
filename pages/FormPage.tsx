
import React, { useState } from 'react';
import { Car, UsageLog, FuelLevel, VehicleCondition } from '../types';
import { DEPARTMENTS, Icons } from '../constants';

interface Props {
  cars: Car[];
  networkId: string;
  isSyncing: boolean;
  networkError: boolean;
  onSubmit: (log: UsageLog) => void;
}

export default function FormPage({ cars, networkId, isSyncing, networkError, onSubmit }: Props) {
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    carId: '',
    driverName: '',
    department: '',
    purpose: '',
    departureTime: new Date().toISOString().slice(0, 16),
    estimatedArrivalTime: new Date(new Date().getTime() + 7200000).toISOString().slice(0, 16),
    startOdometer: '',
    startFuel: '1/2' as FuelLevel,
    startCondition: 'BAIK' as VehicleCondition,
    destination: '',
    notes: ''
  });

  const selectedCar = cars.find(c => c.id === formData.carId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCar) return;

    const newLog: UsageLog = {
      id: crypto.randomUUID(),
      carId: formData.carId,
      carName: `${selectedCar.name} (${selectedCar.plateNumber})`,
      driverName: formData.driverName,
      department: formData.department,
      purpose: formData.purpose,
      departureTime: new Date(formData.departureTime).toISOString(),
      estimatedArrivalTime: new Date(formData.estimatedArrivalTime).toISOString(),
      startOdometer: parseInt(formData.startOdometer) || 0,
      startFuel: formData.startFuel,
      startCondition: formData.startCondition,
      destination: formData.destination,
      notes: formData.notes,
      status: 'pending',
      requestDate: new Date().toISOString()
    };

    onSubmit(newLog);
    setSubmitted(true);
    setFormData({ ...formData, carId: '', driverName: '', purpose: '', destination: '', startOdometer: '' });
    setTimeout(() => setSubmitted(false), 5000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-xl mx-auto p-6 md:p-12 animate-in fade-in duration-700">
      {/* HEADER STATUS */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-fuchsia-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-fuchsia-500/20">
           <Icons.Car />
        </div>
        
        {/* Connection Status Badge */}
        <div className={`mb-4 flex items-center gap-3 px-5 py-2 rounded-full border-2 transition-all ${networkError ? 'bg-red-50 border-red-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-fuchsia-500 animate-pulse' : (networkError ? 'bg-red-500' : 'bg-green-500')}`}></div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${networkError ? 'text-red-600' : 'text-white'}`}>
            {networkError ? 'Koneksi Error' : (isSyncing ? 'Sinkronisasi...' : `KANTOR: ${networkId}`)}
          </span>
        </div>

        <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Form Ambil Mobil</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Isi data permohonan Anda di bawah ini</p>
      </div>

      {submitted && (
        <div className="mb-8 p-6 bg-green-600 text-white rounded-[2rem] flex items-center gap-4 shadow-xl animate-in zoom-in duration-500">
          <div className="bg-white p-2 rounded-lg text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p className="font-black text-xs uppercase tracking-tight">Berhasil Terkirim ke HRGA!</p>
            <p className="text-[8px] opacity-80 uppercase font-bold">Mohon tunggu persetujuan admin.</p>
          </div>
        </div>
      )}

      {networkError && !submitted && (
        <div className="mb-8 p-4 bg-red-100 border-2 border-red-200 text-red-700 rounded-2xl text-[10px] font-black uppercase text-center tracking-widest animate-bounce">
          ⚠️ HP Anda Tidak Terkoneksi. Cek Sinyal/Paket Data.
        </div>
      )}

      {!formData.carId ? (
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-6">Pilih Unit Yang Tersedia</p>
          <div className="grid grid-cols-1 gap-4">
            {cars.map((car) => {
              const isAvailable = car.status === 'available';
              return (
                <button key={car.id} disabled={!isAvailable} onClick={() => setFormData({...formData, carId: car.id})} className={`p-6 rounded-[2rem] border-2 text-left flex items-center justify-between transition-all ${isAvailable ? 'bg-white border-slate-100 hover:border-fuchsia-50' : 'bg-slate-50 border-slate-50 opacity-50 grayscale'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isAvailable ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <Icons.Car />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-slate-950 leading-none">{car.name}</h3>
                      <p className="text-[9px] font-mono font-bold text-slate-400 mt-1 uppercase">{car.plateNumber}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                    {isAvailable ? 'Tersedia' : car.status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
             <button type="button" onClick={() => setFormData({...formData, carId: ''})} className="text-[10px] font-black text-fuchsia-600 uppercase tracking-widest flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m15 18-6-6 6-6"/></svg> Kembali
             </button>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit: {selectedCar?.name}</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama User</label>
              <input type="text" required value={formData.driverName} onChange={e => setFormData({ ...formData, driverName: e.target.value })} className="w-full px-6 py-4 rounded-xl border-2 border-slate-50 bg-slate-50 font-black text-sm outline-none focus:border-fuchsia-500" placeholder="Nama Lengkap" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Departemen</label>
              <select required value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full px-6 py-4 rounded-xl border-2 border-slate-50 bg-slate-50 font-black text-sm outline-none">
                <option value="">PILIH DEPARTEMEN</option>
                {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Odometer Awal (KM)</label>
              <input type="number" required value={formData.startOdometer} onChange={e => setFormData({ ...formData, startOdometer: e.target.value })} className="w-full px-6 py-4 rounded-xl border-2 border-slate-50 bg-slate-50 font-mono font-black text-xl text-fuchsia-600 outline-none" placeholder="0" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tujuan / Keperluan</label>
              <input type="text" required value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })} className="w-full px-6 py-4 rounded-xl border-2 border-slate-50 bg-slate-50 font-black text-sm outline-none" placeholder="Contoh: Meeting Gedung A" />
            </div>
          </div>

          <button type="submit" disabled={isSyncing} className={`w-full py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isSyncing ? 'bg-slate-200 text-slate-400' : 'bg-slate-950 text-white hover:bg-fuchsia-600'}`}>
            {isSyncing ? 'MENGIRIM...' : 'Kirim Permohonan'}
          </button>
        </form>
      )}
    </div>
  );
}
