/**
 * Multer configuration for document uploads
 *
 * - Accepts: PDF, Word (.doc, .docx)
 * - Max size: MAX_UPLOAD_MB plan limit (set in DocumentsModule via MulterModule)
 * - Saves to temp dir first; StorageService moves to final location
 *
 * @author: Sahil Sharma
 */

import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { FILE_TYPES } from '../constant';

const ALLOWED_MIMES = [FILE_TYPES.PDF, FILE_TYPES.DOC, FILE_TYPES.DOCX];

export const multerDocumentConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      // Temp dir - StorageService will move to final location
      const uploadRoot =
        process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
      const tmpDir = join(uploadRoot, '/tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname) || '';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  fileFilter: (
    req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'Invalid file type. Allowed: PDF, Word (.doc, .docx)',
        ),
        false,
      );
    }
  },
};
