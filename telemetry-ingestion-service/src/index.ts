import express from "express";
import { kafkaClient, pool, initializeDatabase, cleanupOldData, Telemetry } from 'shared';
import { z } from 'zod';

const telemetrySchema = z.object({
  id: z.string().uuid(),
  sensor_id: z.string(),
  timestamp: z.string().datetime(),
  engine_temperature: z.number(),
  engine_vibration: z.number(),
  hydraulic_pressure: z.number(),
  cabin_pressure: z.number(),
  fuel_flow: z.number()
});

const consumer = kafkaClient.consumer({ groupId: 'ingestion-group' });
const producer = kafkaClient.producer();

async function start() {
  console.log('Starting Telemetry Ingestion Service...');

  // ensure DB is initialized
  await initializeDatabase();

  // Retention cleanup: Run every 5 minutes
  setInterval(async () => {
    await cleanupOldData();
  }, 5 * 60 * 1000);

  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'telemetry.raw', fromBeginning: false });

  console.log('Ingestion service connected to Kafka and PostgreSQL. Retention policy (1h) active.');

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const rawData = JSON.parse(message.value.toString());
        const validatedData = telemetrySchema.parse(rawData);

        // 1. Insert into DB
        await pool.query(
          `INSERT INTO telemetry (id, timestamp, sensor_id, engine_temperature, engine_vibration, hydraulic_pressure, cabin_pressure, fuel_flow)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [
            validatedData.id,
            validatedData.timestamp,
            validatedData.sensor_id,
            validatedData.engine_temperature,
            validatedData.engine_vibration,
            validatedData.hydraulic_pressure,
            validatedData.cabin_pressure,
            validatedData.fuel_flow
          ]
        );

        // Update sensor status
        await pool.query(
          `INSERT INTO sensor_status (sensor_id, last_active, status)
           VALUES ($1, $2, 'ONLINE')
           ON CONFLICT (sensor_id) DO UPDATE SET last_active = EXCLUDED.last_active, status = 'ONLINE'`,
          [validatedData.sensor_id, validatedData.timestamp]
        );

        // 2. Publish to telemetry.validated
        await producer.send({
          topic: 'telemetry.validated',
          messages: [{ value: JSON.stringify(validatedData) }]
        });

        console.log(`Successfully ingested and validated telemetry ${validatedData.id}`);
      } catch (err) {
        console.error('Validation or ingestion error:', err);
      }
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Telemetry ingestion service running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "telemetry-ingestion" });
});

app.listen(PORT, () => {
  console.log(`Health server running on port ${PORT}`);
});

start().catch(err => {
  console.error('Ingestion service failed:', err);
  process.exit(1);
});
