import express from "express";
import { kafkaClient, pool, Telemetry, Alert } from 'shared';

const consumer = kafkaClient.consumer({ groupId: 'validation-group' });
const producer = kafkaClient.producer();

// Simple moving average tracking for drift detection
const engineTempHistory: number[] = [];
const SMA_WINDOW = 10;

async function processTelemetry(telemetry: Telemetry) {
  const alerts: Alert[] = [];
  const { sensor_id, timestamp, engine_temperature, engine_vibration } = telemetry;

  // 1. Critical Alert: Engine Temperature > 800
  if (engine_temperature > 800) {
    alerts.push({
      id: crypto.randomUUID(),
      sensor_id,
      timestamp,
      alert_type: 'CRITICAL',
      message: 'Engine temperature exceeded critical threshold (800°C)',
      value: engine_temperature
    });
  }

  // 2. Warning: Vibration > 1.5
  if (engine_vibration > 1.5) {
    alerts.push({
      id: crypto.randomUUID(),
      sensor_id,
      timestamp,
      alert_type: 'WARNING',
      message: 'High engine vibration detected (> 1.5g)',
      value: engine_vibration
    });
  }

  // 3. Maintenance: Sensor Drift using SMA
  engineTempHistory.push(engine_temperature);
  if (engineTempHistory.length > SMA_WINDOW) {
    engineTempHistory.shift();
  }

  if (engineTempHistory.length === SMA_WINDOW) {
    const sma = engineTempHistory.reduce((a, b) => a + b, 0) / SMA_WINDOW;
    // If the diff between current temp and SMA is continuously growing or > 30 without a single spike
    if (Math.abs(engine_temperature - sma) > 30 && engine_temperature <= 800) {
      alerts.push({
        id: crypto.randomUUID(),
        sensor_id,
        timestamp,
        alert_type: 'MAINTENANCE',
        message: 'Sensor drift detected: current temperature deviates significantly from moving average',
        value: engine_temperature
      });
    }
  }

  return alerts;
}

async function start() {
  console.log('Starting Validation Service...');
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'telemetry.validated', fromBeginning: false });
  console.log('Validation service connected to Kafka and PostgreSQL.');

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const telemetry: Telemetry = JSON.parse(message.value.toString());
        const alerts = await processTelemetry(telemetry);

        for (const alert of alerts) {
          // 1. Insert alert to DB
          await pool.query(
            `INSERT INTO alerts (id, timestamp, sensor_id, alert_type, severity, message, value)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [alert.id, alert.timestamp, alert.sensor_id, alert.alert_type, alert.alert_type, alert.message, alert.value]
          );

          // 2. Publish alert to Kafka
          await producer.send({
            topic: 'alerts',
            messages: [{ value: JSON.stringify(alert) }]
          });
          console.log(`[${alert.alert_type}] Alert generated for ${alert.sensor_id}: ${alert.message}`);
        }
      } catch (err) {
        console.error('Error processing validation:', err);
      }
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Validation service running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "validation" });
});

app.listen(PORT, () => {
  console.log(`Health server running on port ${PORT}`);
});

start().catch(err => {
  console.error('Validation service failed:', err);
  process.exit(1);
});
