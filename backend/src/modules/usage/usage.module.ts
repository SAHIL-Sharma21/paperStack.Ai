/**
 * Usage Module - free-plan limits and per-user quotas
 * @author: Sahil Sharma
 */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyUsage, DailyUsageSchema } from './schemas/daily-usage.schema';
import {
  DocumentFile,
  DocumentSchema,
} from '../documents/schemas/document.schema';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyUsage.name, schema: DailyUsageSchema },
      { name: DocumentFile.name, schema: DocumentSchema },
    ]),
  ],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
