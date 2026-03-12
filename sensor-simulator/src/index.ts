import { kafkaClient, Telemetry } from 'shared';

const producer = kafkaClient.producer();

// Base values for normal operation
let currentTemp = 95;
let currentVib = 2.5;
let currentHyd = 3000;
let currentCabin = 10.5;
let currentFuel = 500;

function generateData(): Telemetry {
  const timestamp = new Date().toISOString();
  
  // Drift and fluctuations
  currentTemp += (Math.random() - 0.5) * 2;
  currentVib += (Math.random() - 0.5) * 0.1;
  currentHyd += (Math.random() - 0.5) * 10;
  currentCabin += (Math.random() - 0.5) * 0.2;
  currentFuel += (Math.random() - 0.5) * 5;

  let temp = currentTemp;
  let vib = currentVib;
  
  // Random anomaly injection
  const r = Math.random();
  if (r < 0.05) { // 5% chance of critical temperature spike
    temp += 30; // engine_temperature > 120 -> CRITICAL
  }
  if (r > 0.05 && r < 0.1) { // 5% chance of warning vibration spike
    vib += 3; // > threshold -> WARNING
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
