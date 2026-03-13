/**
 * Kafka Service - publishes messages for async processing
 *
 * FLOW:
 * 1. Document uploaded -> we publish { documentId } to Kafka
 * 2. A consumer (separate app or same app) listens on the topic
 * 3. Consumer processes the document (extract text, embeddings, vector DB)
 * 4. Consumer updates document status to 'completed' or 'failed'
 *
 * We use KafkaJS - the standard Node.js Kafka client.
 * @author: Sahil Sharma
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';
import { MAX_RETRIES, RETRY_DELAY_MS } from './constant';
import { parseBrokers } from './helper';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: any;

  constructor(private config: ConfigService) {
    const raw = this.config.get<string>('KAFKA_BROKERS', 'localhost:9092');
    const brokers = parseBrokers(raw);
    const clientId = this.config.get<string>(
      'KAFKA_CLIENT_ID',
      'paperstack-backend',
    );

    this.kafka = new Kafka({
      clientId,
      brokers,
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();

    // Create topic if missing (avoids "leadership election" on first publish)
    const topic = this.config.get<string>('KAFKA_TOPIC', 'document-processing');
    const admin = this.kafka.admin();
    try {
      await admin.connect();
      const existing = await admin.listTopics();
      if (!existing.includes(topic)) {
        await admin.createTopics({
          topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
        });
      }
    } catch (err) {
      console.warn(
        '[KafkaService] onModuleInit - topic creation skipped:',
        (err as Error).message,
      );
    } finally {
      await admin.disconnect();
    }
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  /**
   * Publish a document ID to Kafka for processing.
   * Retries on "leadership election" and other transient errors.
   */
  async publishDocumentForProcessing(documentId: string): Promise<void> {
    const topic = this.config.get<string>('KAFKA_TOPIC', 'document-processing');
    const payload = { documentId, timestamp: new Date().toISOString() };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.producer.send({
          topic,
          messages: [{ key: documentId, value: JSON.stringify(payload) }],
        });
        return;
      } catch (err) {
        const msg = (err as Error).message;
        console.warn(
          '[KafkaService] publishDocumentForProcessing() - attempt',
          attempt,
          'failed:',
          msg,
        );
        if (attempt === MAX_RETRIES) {
          console.error(
            '[KafkaService] publishDocumentForProcessing() - all retries exhausted, rethrowing',
          );
          throw err;
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
}
