/**
 * Document Processor - extracts text, embeds chunks and indexes them in Qdrant.
 * Used by the Kafka consumer and by the API's inline fallback.
 * @author: Sahil Sharma
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { DocumentsService } from './documents.service';
import { StorageService } from '../storage/storage.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectordbService } from '../vectordb/vectordb.service';
import { extractText } from '../../utils/text-extractor';
import { getPlanLimits } from '../usage/plan-limits';
import { COMPLETED_STATUS, FAILED_STATUS } from './constant';

@Injectable()
export class DocumentProcessorService {
  private readonly maxDocumentChars: number;

  constructor(
    config: ConfigService,
    private readonly documentsService: DocumentsService,
    private readonly storageService: StorageService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectordbService: VectordbService,
  ) {
    this.maxDocumentChars = getPlanLimits(config).maxDocumentChars;
  }

  /**
   * Extracts the text from the document, chunks and embeds it,
   * then upserts it into the vector database.
   * Never throws for processing errors: the document is marked failed instead.
   */
  async processDocument(documentId: string): Promise<void> {
    console.log('[DocumentProcessor] Processing document', documentId);

    const doc = await this.documentsService.findById(documentId);
    if (!doc) {
      console.warn('[DocumentProcessor] Document not found:', documentId);
      return;
    }
    if (doc.status === COMPLETED_STATUS) {
      console.log(
        '[DocumentProcessor] Already completed, skipping:',
        documentId,
      );
      return;
    }

    const claimed = await this.documentsService.claimDocument(documentId);
    if (!claimed) {
      console.log(
        '[DocumentProcessor] Could not claim document (another worker may have it):',
        documentId,
      );
      return;
    }

    const fullPath = this.storageService.getFullPath(claimed.storagePath);
    if (!fs.existsSync(fullPath)) {
      console.error('[DocumentProcessor] File not found:', fullPath);
      await this.documentsService.updateStatus(documentId, FAILED_STATUS);
      return;
    }

    try {
      let parsedText = await extractText(fullPath, claimed.mimeType);
      console.log(
        '[DocumentProcessor] Extracted text length:',
        parsedText?.length ?? 0,
      );

      if (!parsedText || parsedText.trim().length === 0) {
        console.warn(
          '[DocumentProcessor] No text extracted from document:',
          documentId,
        );
        await this.documentsService.updateStatus(documentId, FAILED_STATUS);
        return;
      }

      if (parsedText.length > this.maxDocumentChars) {
        console.warn(
          `[DocumentProcessor] Text truncated to ${this.maxDocumentChars} chars (plan limit):`,
          documentId,
        );
        parsedText = parsedText.slice(0, this.maxDocumentChars);
      }

      const chunks = await this.embeddingsService.chunkAndEmbed(parsedText);
      console.log(
        '[DocumentProcessor] Chunked and embedded:',
        chunks.length,
        'chunks',
      );

      await this.vectordbService.upsert(
        documentId,
        claimed.userId.toString(),
        chunks,
        { originalName: claimed.originalName },
      );

      await this.documentsService.updateStatus(documentId, COMPLETED_STATUS);
      console.log('[DocumentProcessor] Document processed:', documentId);
    } catch (err) {
      console.error('[DocumentProcessor] Processing failed:', documentId, err);
      await this.documentsService.updateStatus(documentId, FAILED_STATUS);
    }
  }
}
