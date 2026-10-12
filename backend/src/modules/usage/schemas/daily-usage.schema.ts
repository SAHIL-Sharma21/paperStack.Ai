/**
 * Daily Usage Schema - per-user counters for one UTC day (auto-expires via TTL)
 * @author: Sahil Sharma
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  collection: 'daily_usage',
  timestamps: true,
})
export class DailyUsage {
  @Prop({ required: true, ref: 'User', type: Types.ObjectId })
  userId: Types.ObjectId;

  /** UTC day in YYYY-MM-DD format */
  @Prop({ required: true })
  day: string;

  /** No schema default: upserts set this through $inc, which would conflict with a default. */
  @Prop({ required: true })
  chatMessages: number;

  @Prop({ required: true })
  expiresAt: Date;
}

export type DailyUsageDocument = HydratedDocument<DailyUsage>;
export const DailyUsageSchema = SchemaFactory.createForClass(DailyUsage);

DailyUsageSchema.index({ userId: 1, day: 1 }, { unique: true });
DailyUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
