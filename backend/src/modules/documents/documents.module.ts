/**
 * Documents Module - PDF/Word upload & metadata
 * @author: Sahil Sharma
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentFile, DocumentSchema } from './schemas/document.schema';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentFile.name, schema: DocumentSchema },
    ]),
    StorageModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
