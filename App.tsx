
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Car, UsageLog, FuelLevel, VehicleCondition } from './types';
import { INITIAL_CARS, Icons } from './constants';
import FormPage from './pages/FormPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import ReturnPage from './pages/ReturnPage';

// ID Storage Tunggal agar semua user masuk ke 'Gedung' yang sama
const SHARED_STORAGE_ID = "e089285093556d11e54a";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("-");
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // LOGIKA KUNCI KANTOR: Memastikan semua orang pakai kode yang sama
  const [networkId] = useState(() => {
    // 1. Cek di URL dulu (ini yang paling penting saat share link)
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
    let id = params.get('net');
    
    // 2. Kalau di URL tidak ada, cek di memori HP (pernah buka link sebelumnya)
    const idFromLocal = localStorage.getItem('pla_fleet_net_id');
    
    if (id) {
      localStorage.setItem('pla_fleet_net_id', id);
      return id;
    }
    // 3. Kalau bener-bener baru, buat kode baru (ini hanya untuk HRGA pertama kali)
    const newId = idFromLocal || `FLEET-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    localStorage.setItem('pla_fleet_net_id', newId);
    return newId;
  });

  const [cars, setCars] = useState<Car[]>(INITIAL_CARS);
  const [logs, setLogs] = useState<UsageLog[]>([]);

  // Fungsi Tarik Data dari Internet (Cloud)
  const fetchCloudData = async () => {
    try {
      const response = await fetch(`https://api.npoint.io/${SHARED_STORAGE_ID}?cb=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) return null;
      const allData = await response.json();
      return allData[networkId] || null;
    } catch (e) {
      return null;
    }
  };

  // Fungsi Kirim Data ke Internet (Cloud)
  const pushDataToCloud = async (updatedCars: Car[], updatedLogs: UsageLog[]) => {
    try {
      // Ambil data semua kantor dulu agar tidak menghapus kantor orang lain
      const response = await fetch(`https://api.npoint.io/${SHARED_STORAGE_ID}`, { cache: 'no-store' });
      const allData = response.ok ? await response.json() : {};
      
      allData[networkId] = {
        cars: updatedCars,
        logs: updatedLogs,
        lastUpdate: new Date().toISOString()
      };

      await fetch(`https://api.npoint.io/${SHARED_STORAGE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allData)
      });
      return true;
    } catch (e) {
      throw new Error("Gagal terhubung ke server cloud");
    }
  };

  const syncData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    const cloudData = await fetchCloud