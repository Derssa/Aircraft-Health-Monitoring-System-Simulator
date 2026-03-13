import { Kafka } from "kafkajs";
import fs from "fs";

const brokers = process.env.KAFKA_BROKERS;
const caPath = process.env.KAFKA_CA_PATH;
const certPath = process.env.KAFKA_CERT_PATH;
const keyPath = process.env.KAFKA_KEY_PATH;

if (!brokers || !caPath || !certPath || !keyPath) {
  throw new Error("Missing Kafka environment variables");
}

export const kafkaClient = new Kafka({
  clientId: "aircraft-health-system",
  brokers: [brokers],
  ssl: {
    ca: [fs.readFileSync(caPath, "utf-8")],
    cert: fs.readFileSync(certPath, "utf-8"),
    key: fs.readFileSync(keyPath, "utf-8"),
  },
});