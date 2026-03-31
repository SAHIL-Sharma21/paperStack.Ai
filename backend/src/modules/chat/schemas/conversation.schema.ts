/**
 * Conversation Schema - stores chat history per document
 * @author: Sahil Sharma
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class ChatMessage {
  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @Prop({ required: true })
  content: string;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

@Schema({
  collection: 'conversations',
  timestamps: true,
})
export class Conversation {
  @Prop({ required: true, ref: 'User', type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ required: true, ref: 'DocumentFile', type: Types.ObjectId })
  documentId: Types.ObjectId;

  @Prop({ type: [ChatMessageSchema], default: [] })
  messages: ChatMessage[];
}

export type ConversationDocument = HydratedDocument<Conversation>;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ userId: 1, documentId: 1 });
