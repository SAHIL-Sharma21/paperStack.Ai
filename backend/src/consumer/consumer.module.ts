/**
 * Consumer App Module - Kafka consumer only (no HTTP)
 * @author: Sahil Sharma
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '../db/db.module';
import { DocumentsModule } from '../modules/documents/documents.module';
import { StorageModule } from '../modules/storage/storage.module';
import { KafkaModule } from '../modules/kafka/kafka.module';
import { EmbeddingsModule } from '../modules/embeddings/embeddings.module';
import { VectordbModule } from '../modules/vectordb/vectordb.module';
import { DocumentConsumerService } from './document-consumer/document-consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),
    DbModule,
    KafkaModule,
    DocumentsModule,
    StorageModule,
    EmbeddingsModule,
    VectordbModule,
  ],
  providers: [DocumentConsumerService],
})
export class ConsumerModule {}
