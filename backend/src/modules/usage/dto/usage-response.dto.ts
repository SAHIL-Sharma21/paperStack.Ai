export interface UsageQuotaDto {
  used: number;
  limit: number;
}

export interface UsageResponseDto {
  plan: 'free';
  documents: UsageQuotaDto;
  chatMessagesToday: UsageQuotaDto & { resetsAt: string };
  maxUploadMb: number;
  maxPdfPages: number;
}
