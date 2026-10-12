/**
 * Free-plan limits, configurable via env so they can be tuned per deployment.
 * @author: Sahil Sharma
 */

import { ConfigService } from '@nestjs/config';
import { MAX_CHUNK_CHARS } from '../embeddings/constant';

export interface PlanLimits {
  maxUploadBytes: number;
  maxPdfPages: number;
  maxDocumentsPerUser: number;
  maxChatMessagesPerDay: number;
  /** Text beyond this is not indexed (caps DOCX files, which have no page count). */
  maxDocumentChars: number;
}

export const DEFAULT_PLAN_LIMITS = {
  maxUploadMb: 5,
  maxPdfPages: 30,
  maxDocumentsPerUser: 5,
  maxChatMessagesPerDay: 30,
} as const;

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getPlanLimits(config: ConfigService): PlanLimits {
  const maxUploadMb = readPositiveInt(
    config.get<string>('MAX_UPLOAD_MB'),
    DEFAULT_PLAN_LIMITS.maxUploadMb,
  );
  const maxPdfPages = readPositiveInt(
    config.get<string>('MAX_PDF_PAGES'),
    DEFAULT_PLAN_LIMITS.maxPdfPages,
  );
  return {
    maxUploadBytes: maxUploadMb * 1024 * 1024,
    maxPdfPages,
    maxDocumentsPerUser: readPositiveInt(
      config.get<string>('MAX_DOCUMENTS_PER_USER'),
      DEFAULT_PLAN_LIMITS.maxDocumentsPerUser,
    ),
    maxChatMessagesPerDay: readPositiveInt(
      config.get<string>('MAX_CHAT_MESSAGES_PER_DAY'),
      DEFAULT_PLAN_LIMITS.maxChatMessagesPerDay,
    ),
    maxDocumentChars: maxPdfPages * MAX_CHUNK_CHARS,
  };
}
