
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
  carId: string;
  carName: string;
  driverName: string;
  department: string;
  purpose: string;
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
  status: 'pending' | 'active' | 'completed' | 'rejected';
  requestDate: string;
  returnPhoto?: string;
}

export interface AppState {
  cars: Car[];
  logs: UsageLog[];
}
