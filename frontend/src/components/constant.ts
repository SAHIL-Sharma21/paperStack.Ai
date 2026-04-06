export const ACCEPT_ATTR =
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const ACCEPTED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const PDF_FILE_EXT = '.pdf' as const;
export const WORD_FILE_EXT = {
  DOC: '.doc',
  DOCX: '.docx',
} as const;

export const DOCUMENT_THUMB_LABEL = {
  DOCX: 'DOCX',
  DOC: 'DOC',
  FILE: 'FILE',
} as const;