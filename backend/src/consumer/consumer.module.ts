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
import { DocumentConsumerService } from './document-consumer/document-consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DbModule,
    KafkaModule,
    DocumentsModule,
    StorageModule,
  ],
  providers: [DocumentConsumerService],
})
export class ConsumerModule {}
