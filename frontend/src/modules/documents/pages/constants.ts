export const  PROCESSING_STATUS = "processing";
export const  COMPLETED_STATUS = "completed";
export const  FAILED_STATUS = "failed";
export const  DEFAULT_STATUS = "default";

export type DocumentStatus = typeof PROCESSING_STATUS | typeof COMPLETED_STATUS | typeof FAILED_STATUS | typeof DEFAULT_STATUS;

export const UNITS = {
    B: 'B',
    KB: 'KB',
    MB: 'MB',
    GB: 'GB',
} as const;

export const SHORT_DATE_FORMAT = 'short';
export const DAY_DATE_FORMAT = 'numeric';
export const YEAR_DATE_FORMAT = 'numeric';

export const DATE_FORMAT_OPTIONS = {
    month: SHORT_DATE_FORMAT,
    day: DAY_DATE_FORMAT,
    year: YEAR_DATE_FORMAT,
} as const;
