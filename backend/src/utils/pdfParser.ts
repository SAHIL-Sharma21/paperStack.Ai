/**
 * PDF parser utility function
 * @author: Sahil Sharma
 */

import { PDFParse } from 'pdf-parse';
import * as fs from 'fs';

export const parsePdf = async (fullPath: string): Promise<string> => {
  try {
    const dataBuffer = fs.readFileSync(fullPath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    console.error('[PDFParser] Error parsing PDF:', error);
    throw error;
  }
};
