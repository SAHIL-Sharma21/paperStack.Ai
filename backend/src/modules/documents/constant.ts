export const FILE_TYPES = {
    PDF: 'application/pdf',
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const PROCESSING_STATUS = 'processing';
export const COMPLETED_STATUS = 'completed';
export const FAILED_STATUS = 'failed';

export type DocumentStatus = typeof PROCESSING_STATUS | typeof COMPLETED_STATUS | typeof FAILED_STATUS;