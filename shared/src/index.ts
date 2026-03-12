export * from './db.js';
export * from './kafka.js';

export interface Telemetry {
  id: string;
  sensor_id: string;
  timestamp: string; // ISO string
  engine_temperature: number;
  engine_vibration: number;
  hydraulic_pressure: number;
  cabin_pressure: number;
  fuel_flow: number;
}

export interface Alert {
  id: string;
  sensor_id: string;
  timestamp: string;
  alert_type: string; // e.g. 'CRITICAL', 'WARNING', 'MAINTENANCE'
  message: string;
  value: number;
}

export interface SensorStatus {
  sensor_id: string;
  last_active: string;
  status: 'ONLINE' | 'OFFLINE';
}
