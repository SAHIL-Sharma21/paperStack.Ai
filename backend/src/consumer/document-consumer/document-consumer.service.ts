/**
 * Document Consumer Service - consumes document-processing topic and processes documents
 * Runs as its own app (consumer/main.ts) or embedded in the API (KAFKA_EMBEDDED_CONSUMER=true).
 * @author: Sahil Sharma
 */

import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, type Consumer } from 'kafkajs';
import { buildKafkaConfig } from '../../modules/kafka/kafka-client.config';
import { DocumentProcessorService } from '../../modules/documents/document-processor.service';
import {
  DOCUMENT_CONSUMER_OPTIONS,
  type DocumentConsumerOptions,
} from './document-consumer.options';

const EMBEDDED_RETRY_DELAY_MS = 60_000;

@Injectable()
export class DocumentConsumerService implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;
  private retryTimer?: NodeJS.Timeout;
  private stopped = false;

  constructor(
    private config: ConfigService,
    private documentProcessor: DocumentProcessorService,
    @Inject(DOCUMENT_CONSUMER_OPTIONS)
    private readonly options: DocumentConsumerOptions,
  ) {}

  async onModuleInit() {
    if (!this.options.enabled) return;
    if (this.options.embedded) {
      void this.startWithRetry();
      return;
    }
    await this.start();
  }

  async onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    await this.consumer?.disconnect();
  }

  private async startWithRetry(): Promise<void> {
    try {
      await this.start();
    } catch (err) {
      console.warn(
        `[DocumentConsumer] Could not start embedded consumer, retrying in ${EMBEDDED_RETRY_DELAY_MS / 1000}s:`,
        (err as Error).message,
      );
      await this.consumer?.disconnect().catch(() => {});
      this.consumer = undefined;
      if (!this.stopped) {
        this.retryTimer = setTimeout(() => {
          void this.startWithRetry();
        }, EMBEDDED_RETRY_DELAY_MS);
      }
    }
  }

  private async start(): Promise<void> {
    const topic = this.config.get<string>('KAFKA_TOPIC', 'document-processing');
    const fromBeginning =
      this.config.get<string>('KAFKA_FROM_BEGINNING', 'false') === 'true';

    const kafka = new Kafka(buildKafkaConfig(this.config, '-consumer'));
    const consumer = kafka.consumer({
      groupId: 'paperstack-document-processor',
      sessionTimeout: 60_000, // 60s; heartbeat during processing keeps session alive
    });
    this.consumer = consumer;

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: fromBeginning });
    console.log('[DocumentConsumer] Subscribed to', topic);

    const heartbeatIntervalMs = 5000;

    await consumer.run({
      eachBatchAutoResolve: false,
      eachBatch: async (payload) => {
        const { batch } = payload;
        const resolveOffset = (offset: string) => payload.resolveOffset(offset);
        const heartbeat = () => payload.heartbeat();

        for (const message of batch.messages) {
          if (!payload.isRunning() || payload.isStale()) break;

          const key = message.key?.toString();
          const value = message.value?.toString();
          console.log('[DocumentConsumer] Received', {
            topic: batch.topic,
            partition: batch.partition,
            key,
          });

          let documentId: string | undefined;
          try {
            const payload = (value ? JSON.parse(value) : {}) as {
              documentId?: string;
            };
            documentId = payload.documentId ?? key;
          } catch (err) {
            console.error('[DocumentConsumer] Invalid message JSON:', err);
            resolveOffset(message.offset);
            continue;
          }

          if (!documentId) {
            console.warn(
              '[DocumentConsumer] No documentId in message, skipping',
            );
            resolveOffset(message.offset);
            continue;
          }

          const heartbeatTimer = setInterval(() => {
            void heartbeat().catch(() => {});
          }, heartbeatIntervalMs);

          try {
            await this.documentProcessor.processDocument(documentId);
            resolveOffset(message.offset);
          } catch (err) {
            console.error(
              '[DocumentConsumer] Error processing message:',
              documentId,
              err,
            );
          } finally {
            clearInterval(heartbeatTimer);
            await heartbeat();
          }
        }
      },
    });
  }
}
