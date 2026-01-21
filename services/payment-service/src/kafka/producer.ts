import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { createLogger } from '../utils/logger';

const logger = createLogger('KafkaProducer');

let producer: Producer | null = null;

export const getKafkaProducer = async (): Promise<Producer> => {
    if (!producer) {
        const kafka = new Kafka({
            clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
            retry: {
                retries: 3,
                initialRetryTime: 100,
                factor: 2,
            },
        });

        producer = kafka.producer();
        await producer.connect();
        logger.info('Kafka producer connected');
    }

    return producer;
};

export const disconnectKafkaProducer = async (): Promise<void> => {
    if (producer) {
        await producer.disconnect();
        producer = null;
        logger.info('Kafka producer disconnected');
    }
};

export const publishMessage = async (record: ProducerRecord): Promise<void> => {
    const kafkaProducer = await getKafkaProducer();
    await kafkaProducer.send(record);
    logger.info({ topic: record.topic }, 'Message published to Kafka');
};
