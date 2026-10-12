/**
 * Documents Module - PDF/Word upload & metadata
 * @author: Sahil Sharma
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentProcessorService } from './document-processor.service';
import { DocumentFile, DocumentSchema } from './schemas/document.schema';
import { StorageModule } from '../storage/storage.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { VectordbModule } from '../vectordb/vectordb.module';
import { ChatModule } from '../chat/chat.module';
import { UsageModule } from '../usage/usage.module';
import { getPlanLimits } from '../usage/plan-limits';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentFile.name, schema: DocumentSchema },
    ]),
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: { fileSize: getPlanLimits(config).maxUploadBytes },
      }),
    }),
    StorageModule,
    EmbeddingsModule,
    VectordbModule,
    UsageModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentProcessorService],
  exports: [DocumentsService, DocumentProcessorService],
})
export class DocumentsModule {}
