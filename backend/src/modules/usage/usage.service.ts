/**
 * Usage Service - free-plan quotas (documents per user, chat messages per day)
 * @author: Sahil Sharma
 */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DocumentDocument,
  DocumentFile,
} from '../documents/schemas/document.schema';
import { DailyUsage, DailyUsageDocument } from './schemas/daily-usage.schema';
import { getPlanLimits, type PlanLimits } from './plan-limits';
import type { UsageResponseDto } from './dto/usage-response.dto';

const MONGO_DUPLICATE_KEY = 11000;
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === MONGO_DUPLICATE_KEY
  );
}

@Injectable()
export class UsageService {
  readonly limits: PlanLimits;

  constructor(
    config: ConfigService,
    @InjectModel(DailyUsage.name)
    private readonly usageModel: Model<DailyUsageDocument>,
    @InjectModel(DocumentFile.name)
    private readonly documentModel: Model<DocumentDocument>,
  ) {
    this.limits = getPlanLimits(config);
  }

  countDocuments(userId: string): Promise<number> {
    return this.documentModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
  }

  async assertCanUploadDocument(userId: string): Promise<void> {
    const count = await this.countDocuments(userId);
    if (count >= this.limits.maxDocumentsPerUser) {
      throw new ForbiddenException(
        `Free plan limit reached: you can keep up to ${this.limits.maxDocumentsPerUser} documents. Delete one to upload another.`,
      );
    }
  }

  /**
   * Atomically counts one chat message against today's quota.
   * Returns false when the quota is used up. At the limit the filter stops
   * matching, the upsert tries to insert a second row for the same day, and
   * the unique index rejects it with a duplicate key error.
   */
  async tryConsumeChatMessage(userId: string): Promise<boolean> {
    const now = new Date();
    try {
      const updated = await this.usageModel.findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          day: utcDay(now),
          chatMessages: { $lt: this.limits.maxChatMessagesPerDay },
        },
        {
          $inc: { chatMessages: 1 },
          $setOnInsert: {
            expiresAt: new Date(nextUtcMidnight(now).getTime() + DAY_MS),
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
      return updated != null;
    } catch (err) {
      if (isDuplicateKeyError(err)) return false;
      throw err;
    }
  }

  /** Gives back a message slot when the answer could not be generated. */
  async refundChatMessage(userId: string): Promise<void> {
    await this.usageModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
        day: utcDay(new Date()),
        chatMessages: { $gt: 0 },
      },
      { $inc: { chatMessages: -1 } },
    );
  }

  async getChatMessagesToday(userId: string): Promise<number> {
    const row = await this.usageModel
      .findOne({
        userId: new Types.ObjectId(userId),
        day: utcDay(new Date()),
      })
      .lean();
    return row?.chatMessages ?? 0;
  }

  async getUsage(userId: string): Promise<UsageResponseDto> {
    const [documents, chatMessages] = await Promise.all([
      this.countDocuments(userId),
      this.getChatMessagesToday(userId),
    ]);
    return {
      plan: 'free',
      documents: { used: documents, limit: this.limits.maxDocumentsPerUser },
      chatMessagesToday: {
        used: chatMessages,
        limit: this.limits.maxChatMessagesPerDay,
        resetsAt: nextUtcMidnight(new Date()).toISOString(),
      },
      maxUploadMb: Math.round(this.limits.maxUploadBytes / (1024 * 1024)),
      maxPdfPages: this.limits.maxPdfPages,
    };
  }
}
