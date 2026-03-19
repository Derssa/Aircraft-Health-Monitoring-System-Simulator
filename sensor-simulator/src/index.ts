import express from "express";
import { kafkaClient, Telemetry } from 'shared';

const producer = kafkaClient.producer();

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// Base values for normal operation
let currentTemp = randomInRange(500, 700);
let currentVib = randomInRange(0.1, 0.3);
let currentHyd = randomInRange(2900, 3100);
let currentCabin = randomInRange(10.5, 11.5);
let currentFuel = 500;

function generateData(): Telemetry {
  const timestamp = new Date().toISOString();

  // Drift and fluctuations
  currentTemp += (Math.random() - 0.5) * 5;
  currentVib += (Math.random() - 0.5) * 0.02;
  currentHyd += (Math.random() - 0.5) * 50;
  currentCabin += (Math.random() - 0.5) * 0.1;
  currentFuel += (Math.random() - 0.5) * 5;

  // Clamp values strictly to realistic ranges
  currentTemp = clamp(currentTemp, 500, 800);
  currentVib = clamp(Math.abs(currentVib), 0.05, 0.5); // strictly positive
  currentHyd = clamp(currentHyd, 2800, 3200);
  currentCabin = Math.max(0, clamp(currentCabin, 10, 12)); // strictly positive

  let temp = currentTemp;
  let vib = currentVib;

  // Random anomaly injection
  const r = Math.random();
  if (r < 0.02) { 
    // 2% chance of critical temperature spike
    temp += randomInRange(50, 150); 
  }
  if (r > 0.02 && r < 0.04) { 
    // 2% chance of vibration spike
    vib += randomInRange(0.6, 2.0); // push into Yellow/Red alert zones
  }

  return {
    id: crypto.randomUUID(),
    sensor_id: 'engine_sensor_01',
    timestamp,
    engine_temperature: Number(temp.toFixed(2)),
    engine_vibration: Number(vib.toFixed(2)),
    hydraulic_pressure: Number(currentHyd.toFixed(2)),
    cabin_pressure: Number(currentCabin.toFixed(2)),
    fuel_flow: Number(currentFuel.toFixed(2))
  };
}

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Sensor simulator running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "sensor-simulator" });
});

app.listen(PORT, () => {
  console.log(`Health server running on port ${PORT}`);
});

async function start() {
  console.log('Starting sensor simulator...');
  await producer.connect();
  console.log('Producer connected.');

  setInterval(async () => {
    // 2% chance of missing data
    if (Math.random() < 0.02) {
      console.log('Simulating missing data event...');
      return;
    }

    const payload = generateData();
    console.log(`Sending telemetry at ${payload.timestamp}...`);

    try {
      await producer.send({
        topic: 'telemetry.raw',
        messages: [{ value: JSON.stringify(payload) }]
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, 1000); // 1 record per second
}

start().catch(err => {
  console.error('Simulator failed:', err);
  process.exit(1);
});
