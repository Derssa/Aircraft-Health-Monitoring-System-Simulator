import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { pool, kafkaClient } from 'shared';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

// Broadcast helper
const broadcast = (data: any) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Kafka Consumer for real-time updates
const consumer = kafkaClient.consumer({ groupId: 'api-gateway-ws-group' });

async function startKafka() {
  await consumer.connect();
  await consumer.subscribe({ topics: ['telemetry.validated', 'alerts'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }: { topic: string; message: any }) => {
      if (!message.value) return;
      try {
        const payload = JSON.parse(message.value.toString());
        broadcast({
          type: topic === 'alerts' ? 'ALERT' : 'TELEMETRY',
          data: payload
        });
      } catch (err) {
        console.error('Error broadcasting message:', err);
      }
    }
  });
}

startKafka().catch(console.error);

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
server.listen(PORT, () => {
  console.log(`API Gateway with WebSockets listening on port ${PORT}`);
});
