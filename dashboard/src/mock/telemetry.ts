// ─── Mock Telemetry Generator ────────────────────────────────────────────────
// Produces realistic, smoothly-drifting aircraft telemetry data so the
// dashboard can run without any backend services.

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// Stateful values that evolve smoothly between ticks
const last = {
  engineTemp: randomInRange(500, 700),
  vibration: randomInRange(0.1, 0.3),
  hydraulic: randomInRange(2900, 3100),
  cabinPressure: randomInRange(10.5, 11.5),
  fuelFlow: randomInRange(480, 520),
};

export interface MockTelemetry {
  id: string;
  sensor_id: string;
  timestamp: string;
  engine_temperature: number;
  engine_vibration: number;
  hydraulic_pressure: number;
  cabin_pressure: number;
  fuel_flow: number;
}

export interface MockAlert {
  id: string;
  sensor_id: string;
  timestamp: string;
  alert_type: 'CRITICAL' | 'WARNING' | 'MAINTENANCE';
  message: string;
  value: number;
}

export function generateTelemetry(): MockTelemetry {
  // Apply smooth drift
  last.engineTemp += (Math.random() - 0.5) * 5;
  last.vibration += (Math.random() - 0.5) * 0.02;
  last.hydraulic += (Math.random() - 0.5) * 50;
  last.cabinPressure += (Math.random() - 0.5) * 0.1;
  last.fuelFlow += (Math.random() - 0.5) * 5;

  // Clamp to realistic ranges
  last.engineTemp = clamp(last.engineTemp, 500, 800);
  last.vibration = clamp(Math.abs(last.vibration), 0.05, 0.5);
  last.hydraulic = clamp(last.hydraulic, 2800, 3200);
  last.cabinPressure = clamp(last.cabinPressure, 10, 12);
  last.fuelFlow = clamp(last.fuelFlow, 400, 600);

  // Occasional anomaly spikes (2% chance each)
  let tempOut = last.engineTemp;
  let vibOut = last.vibration;
  const r = Math.random();
  if (r < 0.02) {
    tempOut += randomInRange(50, 150); // temperature spike → CRITICAL
  } else if (r < 0.04) {
    vibOut += randomInRange(0.6, 2.0); // vibration spike → WARNING
  }

  return {
    id: crypto.randomUUID(),
    sensor_id: 'mock_sensor_01',
    timestamp: new Date().toISOString(),
    engine_temperature: Number(tempOut.toFixed(2)),
    engine_vibration: Number(vibOut.toFixed(2)),
    hydraulic_pressure: Number(last.hydraulic.toFixed(2)),
    cabin_pressure: Number(last.cabinPressure.toFixed(2)),
    fuel_flow: Number(last.fuelFlow.toFixed(2)),
  };
}

/** Optionally generates an alert based on a telemetry reading. Returns null if no alert. */
export function generateMockAlert(telemetry: MockTelemetry): MockAlert | null {
  if (telemetry.engine_temperature > 800) {
    return {
      id: crypto.randomUUID(),
      sensor_id: telemetry.sensor_id,
      timestamp: telemetry.timestamp,
      alert_type: 'CRITICAL',
      message: `Engine temperature exceeded critical threshold (${telemetry.engine_temperature.toFixed(1)}°C)`,
      value: telemetry.engine_temperature,
    };
  }
  if (telemetry.engine_vibration > 1.5) {
    return {
      id: crypto.randomUUID(),
      sensor_id: telemetry.sensor_id,
      timestamp: telemetry.timestamp,
      alert_type: 'WARNING',
      message: `High engine vibration detected (${telemetry.engine_vibration.toFixed(2)}g > 1.5g)`,
      value: telemetry.engine_vibration,
    };
  }
  return null;
}
