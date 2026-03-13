import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'ahms_user',
  password: process.env.DB_PASSWORD || 'ahms_password',
  database: process.env.DB_NAME || 'ahms_db',
  ssl: { rejectUnauthorized: false }
});

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database schema...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id VARCHAR(50) PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        sensor_id VARCHAR(50) NOT NULL,
        engine_temperature NUMERIC NOT NULL,
        engine_vibration NUMERIC NOT NULL,
        hydraulic_pressure NUMERIC NOT NULL,
        cabin_pressure NUMERIC NOT NULL,
        fuel_flow NUMERIC NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(50) PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        sensor_id VARCHAR(50) NOT NULL,
        alert_type VARCHAR(20) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        value NUMERIC NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sensor_status (
        sensor_id VARCHAR(50) PRIMARY KEY,
        last_active TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL
      )
    `);

    // Indexes for querying history efficiently
    await client.query(`CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC)`);

    await client.query('COMMIT');
    console.log('Database schema initialized.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Deletes telemetry and alerts older than 1 hour to prevent DB bloat.
 */
export async function cleanupOldData() {
  try {
    const resultTelemetry = await pool.query("DELETE FROM telemetry WHERE timestamp < NOW() - INTERVAL '1 hour'");
    const resultAlerts = await pool.query("DELETE FROM alerts WHERE timestamp < NOW() - INTERVAL '1 hour'");

    if (resultTelemetry.rowCount! > 0 || resultAlerts.rowCount! > 0) {
      console.log(`[Retention] Cleaned up ${resultTelemetry.rowCount} telemetry records and ${resultAlerts.rowCount} alerts older than 1 hour.`);
    }
  } catch (err) {
    console.error('Error during data cleanup:', err);
  }
}
