/**
 * Word document parser - .docx (mammoth supports docx only; .doc may fail)
 * @author: Sahil Sharma
 */

import * as mammoth from 'mammoth';
import * as fs from 'fs';

export const parseWord = async (fullPath: string): Promise<string> => {
  try {
    const dataBuffer = fs.readFileSync(fullPath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  } catch (error) {
    console.error('[WordParser] Error parsing Word document:', error);
    throw error;
  }
};
