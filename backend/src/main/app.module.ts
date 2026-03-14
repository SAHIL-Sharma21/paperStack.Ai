import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from '../db/db.module';
import { UserModule } from 'src/modules/users/user.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { DocumentsModule } from 'src/modules/documents/documents.module';
import { KafkaModule } from 'src/modules/kafka/kafka.module';
import { EmbeddingsModule } from 'src/modules/embeddings/embeddings.module';
import { VectordbModule } from 'src/modules/vectordb/vectordb.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DbModule,
    UserModule,
    AuthModule,
    KafkaModule,
    DocumentsModule,
    EmbeddingsModule,
    VectordbModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
