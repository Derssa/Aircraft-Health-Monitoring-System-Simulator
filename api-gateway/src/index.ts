import express from 'express';
import cors from 'cors';
import { pool } from 'shared';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/telemetry/latest', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM telemetry
      ORDER BY timestamp DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest telemetry' });
  }
});

app.get('/telemetry/history', async (req, res) => {
  try {
    // Return last 1000 records for graphs
    const { rows } = await pool.query(`
      SELECT * FROM telemetry
      ORDER BY timestamp DESC
      LIMIT 1000
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch telemetry history' });
  }
});

app.get('/alerts', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM alerts
      ORDER BY timestamp DESC
      LIMIT 1000
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.get('/system/status', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM sensor_status`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sensor status' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
