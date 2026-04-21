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
import { ChatModule } from 'src/modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
    }),
    DbModule,
    UserModule,
    AuthModule,
    KafkaModule,
    DocumentsModule,
    EmbeddingsModule,
    VectordbModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
