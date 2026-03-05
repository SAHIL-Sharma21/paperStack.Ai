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

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: any;

  constructor(private config: ConfigService) {
    const brokers = this.config.get<string>('KAFKA_BROKERS', 'localhost:9092').split(',');
    const clientId = this.config.get<string>('KAFKA_CLIENT_ID', 'paperstack-backend');

    this.kafka = new Kafka({
      clientId,
      brokers,
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  /**
   * Publish a document ID to Kafka for processing.
   * Consumer will pick this up and run embeddings/RAG pipeline.
   */
  async publishDocumentForProcessing(documentId: string): Promise<void> {
    const topic = this.config.get<string>('KAFKA_TOPIC', 'document-processing');

    await this.producer.send({
      topic,
      messages: [
        {
          key: documentId,
          value: JSON.stringify({ documentId, timestamp: new Date().toISOString() }),
        },
      ],
    });
  }
}
