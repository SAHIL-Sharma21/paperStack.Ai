/**
 * Chat Controller - RAG chat with streaming and conversation history
 * @author: Sahil Sharma
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/user.schema';
import { ChatService } from './chat.service';
import { RagService } from './rag.service';
import { DocumentsService } from '../documents/documents.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import {
  ConversationDto,
  ConversationListItemDto,
} from './dto/chat-response.dto';
import { COMPLETED_STATUS } from '../documents/constant';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly ragService: RagService,
    private readonly documentsService: DocumentsService,
  ) {}

  /**
   * Stream RAG response for a question about a document.
   * POST /documents/:documentId/chat
   * Body: { message, conversationId? }
   */
  @Post(':documentId/chat')
  async streamChat(
    @Param('documentId', ParseObjectIdPipe) documentId: string,
    @Body() dto: ChatRequestDto,
    @CurrentUser() user: UserDocument & { _id: { toString(): string } },
    @Res() res: Response,
  ): Promise<void> {
    const userId = user._id.toString();

    const doc = await this.documentsService.findById(documentId);
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId.toString() !== userId) {
      throw new NotFoundException('Document not found');
    }
    if (doc.status !== COMPLETED_STATUS) {
      throw new BadRequestException(
        'Document is still processing. Please wait until it is completed.',
      );
    }

    const conversation = await this.chatService.getOrCreateConversation(
      userId,
      documentId,
      dto.conversationId,
    );
    const conversationIdStr = conversation._id.toString();

    const maxHistoryPairs = 10;
    const historyForRag = conversation.messages.slice(-maxHistoryPairs * 2);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let clientDisconnected = false;
    res.on('close', () => {
      clientDisconnected = true;
    });

    let fullResponse = '';

    try {
      for await (const chunk of this.ragService.streamRagResponse(
        userId,
        documentId,
        dto.message,
        historyForRag.map((m) => ({ role: m.role, content: m.content })),
      )) {
        if(clientDisconnected) break;
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    } catch (err) {
      console.error('[ChatController] RAG stream error:', err);
      res.write(
        `data: ${JSON.stringify({
          error: 'Failed to generate response',
          conversationId: conversationIdStr,
        })}\n\n`,
      );
      res.end();
      return;
    }

    try {
      await this.chatService.addMessages(
        conversation._id.toString(),
        dto.message,
        fullResponse,
      );
      if (!clientDisconnected && !res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            done: true,
            saved: true,
            conversationId: conversationIdStr,
          })}\n\n`,
        );
      }
    } catch (err) {
      console.error('[ChatController] Failed to save conversation:', err);
      if (!clientDisconnected && !res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            done: true,
            saved: false,
            error: 'Failed to persist conversation history',
            conversationId: conversationIdStr,
          })}\n\n`,
        );
      }
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  /**
   * List all conversations for a document.
   * GET /documents/:documentId/conversations
   */
  @Get(':documentId/conversations')
  async listConversations(
    @Param('documentId', ParseObjectIdPipe) documentId: string,
    @CurrentUser() user: UserDocument & { _id: { toString(): string } },
  ): Promise<ConversationListItemDto[]> {
    const userId = user._id.toString();
    await this.ensureDocumentAccess(userId, documentId);

    const conversations =
      await this.chatService.getConversationsByDocument(userId, documentId);

    return conversations.map((c) => this.toListItemDto(c));
  }

  /**
   * Get full conversation with messages.
   * GET /documents/:documentId/conversations/:conversationId
   */
  @Get(':documentId/conversations/:conversationId')
  async getConversation(
    @Param('documentId', ParseObjectIdPipe) documentId: string,
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @CurrentUser() user: UserDocument & { _id: { toString(): string } },
  ): Promise<ConversationDto> {
    const userId = user._id.toString();
    await this.ensureDocumentAccess(userId, documentId);

    const conv = await this.chatService.getConversationById(
      conversationId,
      userId,
    );
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.documentId.toString() !== documentId) {
      throw new NotFoundException('Conversation not found');
    }

    return this.toConversationDto(conv);
  }

  private async ensureDocumentAccess(
    userId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.documentsService.findById(documentId);
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.userId.toString() !== userId) {
      throw new NotFoundException('Document not found');
    }
  }

  private toListItemDto(conv: {
    _id: { toString(): string };
    documentId: { toString(): string };
    messages: unknown[];
    updatedAt?: Date;
    createdAt?: Date;
  }): ConversationListItemDto {
    const dto = new ConversationListItemDto();
    dto.id = conv._id.toString();
    dto.documentId = conv.documentId.toString();
    dto.messageCount = conv.messages?.length ?? 0;
    dto.lastMessageAt = conv.updatedAt;
    dto.createdAt = conv.createdAt;
    return dto;
  }

  private toConversationDto(conv: {
    _id: { toString(): string };
    documentId: { toString(): string };
    messages: Array<{ role: string; content: string }>;
    createdAt?: Date;
    updatedAt?: Date;
  }): ConversationDto {
    const dto = new ConversationDto();
    dto.id = conv._id.toString();
    dto.documentId = conv.documentId.toString();
    dto.messages = (conv.messages ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    dto.createdAt = conv.createdAt;
    dto.updatedAt = conv.updatedAt;
    return dto;
  }
}
