// ─── Mock Telemetry Generator ────────────────────────────────────────────────
// Produces realistic, smoothly-drifting aircraft telemetry with persistent
// anomaly events so the dashboard can run without any backend services.

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TelemetryAlert {
  type: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface MockTelemetry {
  id: string;
  sensor_id: string;
  timestamp: string;
  engine_temperature: number;
  engine_vibration: number;
  hydraulic_pressure: number;
  cabin_pressure: number;
  fuel_flow: number;
  alerts: TelemetryAlert[];
}

export interface MockAlert {
  id: string;
  sensor_id: string;
  timestamp: string;
  alert_type: 'CRITICAL' | 'WARNING' | 'MAINTENANCE';
  message: string;
  value: number;
}

// ─── Anomaly State ────────────────────────────────────────────────────────────

type AnomalyType =
  | 'HIGH_ENGINE_TEMP'
  | 'HIGH_VIBRATION'
  | 'LOW_HYDRAULIC_PRESSURE'
  | 'CABIN_PRESSURE_DROP'
  | null;

let activeAnomaly: AnomalyType = null;
let anomalyTicksRemaining = 0;

// ─── Stateful baseline values ─────────────────────────────────────────────────

const last = {
  engineTemp: randomInRange(500, 700),
  vibration: randomInRange(0.1, 0.3),
  hydraulic: randomInRange(2900, 3100),
  cabinPressure: randomInRange(10.5, 11.5),
  fuelFlow: randomInRange(480, 520),
};

// ─── Alert threshold checker ──────────────────────────────────────────────────

function evaluateAlerts(
  engineTemp: number,
  vibration: number,
  hydraulic: number,
  cabinPressure: number,
): TelemetryAlert[] {
  const alerts: TelemetryAlert[] = [];

  // Engine temperature
  if (engineTemp > 900)
    alerts.push({ type: 'HIGH_ENGINE_TEMP', severity: 'critical', message: 'Engine temperature exceeds safe limit' });
  else if (engineTemp > 800)
    alerts.push({ type: 'HIGH_ENGINE_TEMP', severity: 'warning', message: 'Engine temperature above normal range' });

  // Vibration
  if (vibration > 1.5)
    alerts.push({ type: 'HIGH_VIBRATION', severity: 'critical', message: 'Severe engine vibration detected' });
  else if (vibration > 0.5)
    alerts.push({ type: 'HIGH_VIBRATION', severity: 'warning', message: 'High engine vibration detected' });

  // Hydraulic pressure
  if (hydraulic < 2500)
    alerts.push({ type: 'LOW_HYDRAULIC_PRESSURE', severity: 'critical', message: 'Critical hydraulic pressure loss' });
  else if (hydraulic < 2800)
    alerts.push({ type: 'LOW_HYDRAULIC_PRESSURE', severity: 'warning', message: 'Low hydraulic pressure detected' });

  // Cabin pressure
  if (cabinPressure < 8)
    alerts.push({ type: 'CABIN_PRESSURE_DROP', severity: 'critical', message: 'Rapid cabin depressurisation detected' });
  else if (cabinPressure < 10)
    alerts.push({ type: 'CABIN_PRESSURE_DROP', severity: 'warning', message: 'Cabin pressure below normal range' });

  return alerts;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateTelemetry(): MockTelemetry {
  // Smooth normal drift
  last.engineTemp  += (Math.random() - 0.5) * 5;
  last.vibration   += (Math.random() - 0.5) * 0.02;
  last.hydraulic   += (Math.random() - 0.5) * 50;
  last.cabinPressure += (Math.random() - 0.5) * 0.1;
  last.fuelFlow    += (Math.random() - 0.5) * 5;

  // Clamp to normal ranges
  last.engineTemp   = clamp(last.engineTemp, 500, 800);
  last.vibration    = clamp(Math.abs(last.vibration), 0.05, 0.5);
  last.hydraulic    = clamp(last.hydraulic, 2800, 3200);
  last.cabinPressure = clamp(last.cabinPressure, 10, 12);
  last.fuelFlow     = clamp(last.fuelFlow, 400, 600);

  // ── Anomaly lifecycle ────────────────────────────────────────────────────
  if (activeAnomaly && anomalyTicksRemaining > 0) {
    anomalyTicksRemaining--;
    if (anomalyTicksRemaining === 0) activeAnomaly = null;
  } else if (!activeAnomaly && Math.random() < 0.02) {
    // 2% chance per tick to start a random anomaly
    const types: AnomalyType[] = [
      'HIGH_ENGINE_TEMP',
      'HIGH_VIBRATION',
      'LOW_HYDRAULIC_PRESSURE',
      'CABIN_PRESSURE_DROP',
    ];
    activeAnomaly = types[Math.floor(Math.random() * types.length)];
    anomalyTicksRemaining = Math.round(randomInRange(5, 15));
  }

  // Override relevant value while anomaly is active
  let tempOut     = last.engineTemp;
  let vibOut      = last.vibration;
  let hydOut      = last.hydraulic;
  let cabinOut    = last.cabinPressure;

  if (activeAnomaly === 'HIGH_ENGINE_TEMP')        tempOut  = randomInRange(850, 950);
  else if (activeAnomaly === 'HIGH_VIBRATION')     vibOut   = randomInRange(1.0, 2.0);
  else if (activeAnomaly === 'LOW_HYDRAULIC_PRESSURE') hydOut = randomInRange(2000, 2600);
  else if (activeAnomaly === 'CABIN_PRESSURE_DROP')  cabinOut = randomInRange(7, 9);

  const alerts = evaluateAlerts(tempOut, vibOut, hydOut, cabinOut);

  return {
    id: crypto.randomUUID(),
    sensor_id: 'mock_sensor_01',
    timestamp: new Date().toISOString(),
    engine_temperature: Number(tempOut.toFixed(2)),
    engine_vibration: Number(vibOut.toFixed(2)),
    hydraulic_pressure: Number(hydOut.toFixed(2)),
    cabin_pressure: Number(cabinOut.toFixed(2)),
    fuel_flow: Number(last.fuelFlow.toFixed(2)),
    alerts,
  };
}

// ─── Sidebar alert adapter ────────────────────────────────────────────────────
// Converts inline telemetry alerts to the MockAlert shape used by the sidebar.

export function generateMockAlert(telemetry: MockTelemetry): MockAlert | null {
  if (telemetry.alerts.length === 0) return null;
  const top = telemetry.alerts[0];
  return {
    id: crypto.randomUUID(),
    sensor_id: telemetry.sensor_id,
    timestamp: telemetry.timestamp,
    alert_type: top.severity === 'critical' ? 'CRITICAL' : 'WARNING',
    message: top.message,
    value: telemetry.engine_temperature, // use temp as representative value
  };
}
