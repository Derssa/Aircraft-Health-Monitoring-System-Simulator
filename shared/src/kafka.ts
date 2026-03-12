import { Kafka } from 'kafkajs';

export const kafkaClient = new Kafka({
  clientId: 'ahms-client',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});
