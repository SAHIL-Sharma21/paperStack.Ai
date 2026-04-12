/**
 * Chat Service - conversation CRUD and message storage
 * @author: Sahil Sharma
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  async createConversation(
    userId: string,
    documentId: string,
  ): Promise<ConversationDocument> {
    const conv = new this.conversationModel({
      userId: new Types.ObjectId(userId),
      documentId: new Types.ObjectId(documentId),
      messages: [],
    });
    return conv.save();
  }

  async getOrCreateConversation(
    userId: string,
    documentId: string,
    conversationId?: string,
  ): Promise<ConversationDocument> {
    if (conversationId) {
      const existing = await this.conversationModel.findOne({
        _id: new Types.ObjectId(conversationId),
        userId: new Types.ObjectId(userId),
        documentId: new Types.ObjectId(documentId),
      });
      if (existing) return existing;
    }
    return this.createConversation(userId, documentId);
  }

  async addMessages(
    conversationId: string,
    userMessage: string,
    assistantMessage: string,
  ): Promise<ConversationDocument | null> {
    return this.conversationModel.findByIdAndUpdate(
      new Types.ObjectId(conversationId),
      {
        $push: {
          messages: {
            $each: [
              { role: 'user' as const, content: userMessage },
              { role: 'assistant' as const, content: assistantMessage },
            ],
          },
        },
      },
      { returnDocument: 'after' },
    );
  }

  async getConversationsByDocument(
    userId: string,
    documentId: string,
  ): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({
        userId: new Types.ObjectId(userId),
        documentId: new Types.ObjectId(documentId),
      })
      .sort({ updatedAt: -1 });
  }

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument | null> {
    return this.conversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      userId: new Types.ObjectId(userId),
    });
  }

  async deleteConversation(
    conversationId: string,
    userId: string,
    documentId: string,
  ): Promise<boolean> {
    const res = await this.conversationModel.findOneAndDelete({
      _id: new Types.ObjectId(conversationId),
      userId: new Types.ObjectId(userId),
      documentId: new Types.ObjectId(documentId),
    });
    return res != null;
  }

  async deleteConversationsForDocument(
    userId: string,
    documentId: string,
  ): Promise<void> {
    await this.conversationModel.deleteMany({
      userId: new Types.ObjectId(userId),
      documentId: new Types.ObjectId(documentId),
    });
  }
}
