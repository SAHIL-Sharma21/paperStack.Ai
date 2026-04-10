import type { DocumentItem } from '../../../lib/types';
import {
  COMPLETED_STATUS,
  DAY_DATE_FORMAT,
  DEFAULT_STATUS,
  FAILED_STATUS,
  PROCESSING_STATUS,
  SHORT_DATE_FORMAT,
  UNITS,
  YEAR_DATE_FORMAT,
  type DocumentStatus,
} from './constants';

export function statusVariant(status: string): DocumentStatus {
  switch (status) {
    case PROCESSING_STATUS:
      return PROCESSING_STATUS;
    case COMPLETED_STATUS:
      return COMPLETED_STATUS;
    case FAILED_STATUS:
      return FAILED_STATUS;
    default:
      return DEFAULT_STATUS;
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const units = [UNITS.B, UNITS.KB, UNITS.MB, UNITS.GB];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

export function formatShortDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: SHORT_DATE_FORMAT,
    day: DAY_DATE_FORMAT,
    year: YEAR_DATE_FORMAT,
  }).format(d);
}

export function filterDocumentsByName(docs: DocumentItem[], query: string): DocumentItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return docs;
  return docs.filter((d) => d.originalName.toLowerCase().includes(q));
}
