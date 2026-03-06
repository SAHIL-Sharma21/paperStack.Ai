/**
 * Storage Service - saves uploaded files
 *
 * CURRENT: Local disk storage (./uploads/{userId}/)
 *
 * TODO (S3): Replace local implementation with AWS S3:
 * 1. Install @aws-sdk/client-s3
 * 2. Create S3 client with credentials from env (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET)
 * 3. Use s3.putObject() with Key = `${userId}/${uniqueId}-${originalName}`
 * 4. Return storagePath as the S3 key (or full URL if using public bucket)
 *
 * @author: Sahil Sharma
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface SaveFileResult {
  storagePath: string;
}

@Injectable()
export class StorageService {
  private readonly uploadDir: string;

  constructor(private config: ConfigService) {
    // Local upload directory - from env or default ./uploads
    this.uploadDir =
      this.config.get<string>('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');
  }

  /** Resolves storagePath (e.g. userId/filename.pdf) to full filesystem path. */
  getFullPath(storagePath: string): string {
    return path.join(this.uploadDir, storagePath);
  }

  /**
   * Saves a file to local disk.
   * Structure: uploads/{userId}/{uuid}-{originalName}
   *
   * TODO (S3): Upload to S3 instead and return the object key/URL.
   */
  async save(
    file: Express.Multer.File,
    userId: string,
  ): Promise<SaveFileResult> {
    const userDir = path.join(this.uploadDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '';
    const baseName = path.basename(file.originalname, ext);
    const uniqueName = `${baseName}-${randomUUID()}${ext}`;
    // Use forward slashes - same format works for S3 keys
    const storagePath = `${userId}/${uniqueName}`;
    const fullPath = path.join(this.uploadDir, storagePath);

    try {
      fs.renameSync(file.path, fullPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
        fs.copyFileSync(file.path, fullPath);
        fs.unlinkSync(file.path);
      } else {
        throw err;
      }
    }

    return { storagePath };
  }

  /**
   * Deletes a file by storagePath (e.g. userId/filename.pdf).
   */
  delete(storagePath: string): void {
    try {
      const fullPath = path.join(this.uploadDir, storagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.error('[StorageService] delete() - error deleting file:', err);
      throw err;
    }
  }
}
