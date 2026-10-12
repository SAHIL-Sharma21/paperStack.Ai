/**
 * Kafka Service - publishes messages for async processing
 *
 * FLOW:
 * 1. Document uploaded -> we publish { documentId } to Kafka
 * 2. A consumer (separate app or same app) listens on the topic
 * 3. Consumer processes the document (extract text, embeddings, vector DB)
 * 4. Consumer updates document status to 'completed' or 'failed'
 *
 * Kafka being unreachable never stops the API from starting; uploads then
 * fall back to inline processing (see KAFKA_FALLBACK_INLINE).
 *
 * We use KafkaJS - the standard Node.js Kafka client.
 * @author: Sahil Sharma
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, type Producer } from 'kafkajs';
import {
  CONNECT_FAILURE_COOLDOWN_MS,
  MAX_RETRIES,
  RETRY_DELAY_MS,
} from './constant';
import {
  buildKafkaConfig,
  getProcessingMode,
  isInlineFallbackEnabled,
} from './kafka-client.config';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  /** False when DOCUMENT_PROCESSING_MODE=inline: nothing is published. */
  readonly enabled: boolean;
  readonly fallbackInline: boolean;

  private readonly topic: string;
  private kafka?: Kafka;
  private producer?: Producer;
  private connected = false;
  private connecting: Promise<void> | null = null;
  private lastConnectFailureAt = 0;

  constructor(private config: ConfigService) {
    this.enabled = getProcessingMode(config) === 'kafka';
    this.fallbackInline = isInlineFallbackEnabled(config);
    this.topic = this.config.get<string>('KAFKA_TOPIC', 'document-processing');

    if (this.enabled) {
      this.kafka = new Kafka(buildKafkaConfig(config));
      this.producer = this.kafka.producer();
      this.producer.on(this.producer.events.DISCONNECT, () => {
        this.connected = false;
      });
    }
  }

  async onModuleInit() {
    if (!this.enabled) {
      console.log(
        '[KafkaService] DOCUMENT_PROCESSING_MODE=inline - Kafka disabled',
      );
      return;
    }
    try {
      await this.ensureConnected();
      await this.ensureTopic();
    } catch (err) {
      console.warn(
        '[KafkaService] Kafka unavailable at startup:',
        (err as Error).message,
      );
    }
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.producer?.disconnect();
    }
  }

  /**
   * Publish a document ID to Kafka for processing.
   * Retries on "leadership election" and other transient errors.
   */
  async publishDocumentForProcessing(documentId: string): Promise<void> {
    if (!this.producer) {
      throw new Error('[KafkaService] Kafka is disabled');
    }
    await this.ensureConnected();

    const payload = { documentId, timestamp: new Date().toISOString() };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.producer.send({
          topic: this.topic,
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

  /** Connects once; after a failure, fails fast for a cooldown so uploads are not slowed down. */
  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    const producer = this.producer;
    if (!producer) throw new Error('[KafkaService] Kafka is disabled');

    if (Date.now() - this.lastConnectFailureAt < CONNECT_FAILURE_COOLDOWN_MS) {
      throw new Error(
        '[KafkaService] Kafka recently unreachable; skipping connect attempt',
      );
    }

    this.connecting ??= producer
      .connect()
      .then(() => {
        this.connected = true;
      })
      .catch((err: unknown) => {
        this.lastConnectFailureAt = Date.now();
        throw err;
      })
      .finally(() => {
        this.connecting = null;
      });
    await this.connecting;
  }

  /** Create topic if missing (avoids "leadership election" on first publish) */
  private async ensureTopic(): Promise<void> {
    if (!this.kafka) return;
    const admin = this.kafka.admin();
    try {
      await admin.connect();
      const existing = await admin.listTopics();
      if (!existing.includes(this.topic)) {
        await admin.createTopics({
          topics: [{ topic: this.topic, numPartitions: 1 }],
        });
      }
    } catch (err) {
      console.warn(
        '[KafkaService] ensureTopic - topic creation skipped:',
        (err as Error).message,
      );
    } finally {
      await admin.disconnect();
    }
  }
}
