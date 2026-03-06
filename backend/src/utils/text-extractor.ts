/**
 * Text extractor - dispatches to PDF or Word parser based on mimeType
 * @author: Sahil Sharma
 */

import { FILE_TYPES } from '../modules/documents/constant';
import { parsePdf } from './pdfParser';
import { parseWord } from './wordParser';

export function extractText(fullPath: string, mimeType: string): Promise<string> {
  switch (mimeType) {
    case FILE_TYPES.PDF:
      return parsePdf(fullPath);
    case FILE_TYPES.DOC:
    case FILE_TYPES.DOCX:
      return parseWord(fullPath);
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
