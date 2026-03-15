/**
 * Chat Module - RAG chat with document context and conversation history
 * @author: Sahil Sharma
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RagService } from './rag.service';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { DocumentsModule } from '../documents/documents.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { VectordbModule } from '../vectordb/vectordb.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    DocumentsModule,
    EmbeddingsModule,
    VectordbModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, RagService],
  exports: [ChatService],
})
export class ChatModule {}
