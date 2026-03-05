/**
 * Document Schema - stores metadata for uploaded PDF/Word files
 * @author: Sahil Sharma
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { COMPLETED_STATUS, FAILED_STATUS, PROCESSING_STATUS, type DocumentStatus } from '../constant';

export type DocumentDocument = HydratedDocument<DocumentFile>;

@Schema({
  collection: 'documents',
  timestamps: true,
})
export class DocumentFile {
  @Prop({ required: true, ref: 'User', type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  storagePath: string;

  @Prop({ required: true, default: PROCESSING_STATUS, enum: [PROCESSING_STATUS, COMPLETED_STATUS, FAILED_STATUS] })
  status: DocumentStatus;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentFile);