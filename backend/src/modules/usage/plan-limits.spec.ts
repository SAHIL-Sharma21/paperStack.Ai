import { ConfigService } from '@nestjs/config';
import { DEFAULT_PLAN_LIMITS, getPlanLimits } from './plan-limits';

describe('getPlanLimits', () => {
  it('uses free-plan defaults when nothing is configured', () => {
    const limits = getPlanLimits(new ConfigService({}));
    expect(limits).toEqual({
      maxUploadBytes: DEFAULT_PLAN_LIMITS.maxUploadMb * 1024 * 1024,
      maxPdfPages: DEFAULT_PLAN_LIMITS.maxPdfPages,
      maxDocumentsPerUser: DEFAULT_PLAN_LIMITS.maxDocumentsPerUser,
      maxChatMessagesPerDay: DEFAULT_PLAN_LIMITS.maxChatMessagesPerDay,
      maxDocumentChars: DEFAULT_PLAN_LIMITS.maxPdfPages * 3000,
    });
  });

  it('reads configured values', () => {
    const limits = getPlanLimits(
      new ConfigService({
        MAX_UPLOAD_MB: '2',
        MAX_PDF_PAGES: '10',
        MAX_DOCUMENTS_PER_USER: '3',
        MAX_CHAT_MESSAGES_PER_DAY: '50',
      }),
    );
    expect(limits.maxUploadBytes).toBe(2 * 1024 * 1024);
    expect(limits.maxPdfPages).toBe(10);
    expect(limits.maxDocumentsPerUser).toBe(3);
    expect(limits.maxChatMessagesPerDay).toBe(50);
    expect(limits.maxDocumentChars).toBe(30_000);
  });

  it('falls back to defaults for invalid values', () => {
    const limits = getPlanLimits(
      new ConfigService({ MAX_PDF_PAGES: '0', MAX_DOCUMENTS_PER_USER: 'abc' }),
    );
    expect(limits.maxPdfPages).toBe(DEFAULT_PLAN_LIMITS.maxPdfPages);
    expect(limits.maxDocumentsPerUser).toBe(
      DEFAULT_PLAN_LIMITS.maxDocumentsPerUser,
    );
  });
});
