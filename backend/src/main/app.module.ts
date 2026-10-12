import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from '../db/db.module';
import { UserModule } from '../modules/users/user.module';
import { AuthModule } from '../modules/auth/auth.module';
import { DocumentsModule } from '../modules/documents/documents.module';
import { KafkaModule } from '../modules/kafka/kafka.module';
import { EmbeddingsModule } from '../modules/embeddings/embeddings.module';
import { VectordbModule } from '../modules/vectordb/vectordb.module';
import { ChatModule } from '../modules/chat/chat.module';
import { UsageModule } from '../modules/usage/usage.module';
import { getProcessingMode } from '../modules/kafka/kafka-client.config';
import { DocumentConsumerService } from '../consumer/document-consumer/document-consumer.service';
import {
  DOCUMENT_CONSUMER_OPTIONS,
  type DocumentConsumerOptions,
} from '../consumer/document-consumer/document-consumer.options';
import {
  DEFAULT_REQUESTS_PER_MINUTE,
  THROTTLE_ERROR_MESSAGE,
  getClientIpTracker,
} from '../common/constants/throttle.constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const perMinute = Number.parseInt(
          config.get<string>('THROTTLE_LIMIT_PER_MINUTE') ?? '',
          10,
        );
        return {
          throttlers: [
            {
              name: 'default',
              ttl: 60_000,
              limit:
                Number.isFinite(perMinute) && perMinute > 0
                  ? perMinute
                  : DEFAULT_REQUESTS_PER_MINUTE,
            },
          ],
          errorMessage: THROTTLE_ERROR_MESSAGE,
          getTracker: getClientIpTracker,
        };
      },
    }),
    DbModule,
    UserModule,
    AuthModule,
    KafkaModule,
    DocumentsModule,
    EmbeddingsModule,
    VectordbModule,
    ChatModule,
    UsageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    DocumentConsumerService,
    {
      provide: DOCUMENT_CONSUMER_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DocumentConsumerOptions => ({
        enabled:
          getProcessingMode(config) === 'kafka' &&
          config.get<string>('KAFKA_EMBEDDED_CONSUMER') === 'true',
        embedded: true,
      }),
    },
  ],
})
export class AppModule {}
