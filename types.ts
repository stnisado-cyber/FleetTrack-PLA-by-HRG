
export interface Car {
  id: string;
  name: string;
  plateNumber: string;
  status: 'available' | 'on-duty' | 'maintenance' | 'requested';
}

export type FuelLevel = 'E' | '1/4' | '1/2' | '3/4' | 'F';
export type VehicleCondition = 'BAIK' | 'PERLU PENGECEKAN';

export interface UsageLog {
  id: string;
  unitId: string;
  carName: string;
  driverName: string;
  department: string;
  purpose: string;
  plannedStartTime: string;
  plannedEndTime: string;
  departureTime: string;
  estimatedArrivalTime: string;
  arrivalTime?: string;
  startOdometer: number;
  endOdometer?: number;
  startFuel: FuelLevel;
  endFuel?: FuelLevel;
  startCondition: VehicleCondition;
  endCondition?: VehicleCondition;
  destination: string;
  notes?: string;
  status: 'pending' | 'active' | 'completed' | 'rejected' | 'on-duty';
  requestDate: string;
  returnPhoto?: string;
  parkingPhotoUrl?: string;
  speedometerPhotoUrl?: string;
  odometerPhotoUrl?: string;
  odometerPhotoFile?: File;
}

export interface AppState {
  cars: Car[];
  logs: UsageLog[];
}
