/**
 * Text extractor - dispatches to PDF or Word parser based on mimeType
 * Mammoth supports .docx only; legacy .doc is unsupported.
 * @author: Sahil Sharma
 */

import * as path from 'path';
import { FILE_TYPES } from '../modules/documents/constant';
import { parsePdf } from './pdfParser';
import { parseWord } from './wordParser';

export function extractText(
  fullPath: string,
  mimeType: string,
): Promise<string> {
  switch (mimeType) {
    case FILE_TYPES.PDF:
      return parsePdf(fullPath);
    case FILE_TYPES.DOCX:
      return parseWord(fullPath);
    case FILE_TYPES.DOC:
      return parseLegacyDoc(fullPath);
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Legacy .doc (application/msword) is not supported by Mammoth.
 * Throws with filename and instructions to convert to .docx.
 */
async function parseLegacyDoc(fullPath: string): Promise<string> {
  const filename = path.basename(fullPath);
  throw new Error(
    `Legacy .doc format is unsupported for "${filename}". Mammoth only supports .docx. Please convert the file to .docx (e.g. open in Word and Save As .docx) and upload again.`,
  );
}
