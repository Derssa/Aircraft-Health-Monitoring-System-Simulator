import { Kafka } from 'kafkajs';
import fs from 'fs';

const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
const caPath = process.env.KAFKA_CA_PATH;
const certPath = process.env.KAFKA_CERT_PATH;
const keyPath = process.env.KAFKA_KEY_PATH;

const sslConfig = caPath && certPath && keyPath ? {
  ssl: {
    rejectUnauthorized: false,
    ca: [fs.readFileSync(caPath, 'utf-8')],
    cert: fs.readFileSync(certPath, 'utf-8'),
    key: fs.readFileSync(keyPath, 'utf-8'),
  }
} : {};

export const kafkaClient = new Kafka({
  clientId: 'ahms-client',
  brokers: brokers.split(','),
  ...sslConfig
});
