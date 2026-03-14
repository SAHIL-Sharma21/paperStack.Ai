/**
 * Documents Controller - document upload & list
 * @author: Sahil Sharma
 */

import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { DocumentResponseDto } from './dto/document-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/user.schema';
import { StorageService } from '../storage/storage.service';
import { KafkaService } from '../kafka/kafka.service';
import { multerDocumentConfig } from './config/multer.config';
import { FAILED_STATUS } from './constant';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectordbService } from '../vectordb/vectordb.service';
import {
  SearchDocumentResultDto,
  SearchDocumentsRequestDto,
  SearchDocumentsResponseDto,
} from './dto/search-documents.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storageService: StorageService,
    private readonly kafkaService: KafkaService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectordbService: VectordbService,
  ) {}

  /**
   * Upload a document (PDF or Word).
   * 1. Save file to local storage (TODO: S3)
   * 2. Create document metadata in DB (status: processing)
   * 3. Publish documentId to Kafka for async processing
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerDocumentConfig))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: UserDocument & { _id: { toString(): string } },
  ): Promise<DocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided. Use field name "file".');
    }

    const userId = user._id.toString();

    // 1. Save file (local disk now; TODO: S3 in StorageService)
    const { storagePath } = await this.storageService.save(file, userId);

    // 2. Create document metadata in MongoDB
    const doc = await this.documentsService.create({
      userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath,
    });

    // 3. Publish to Kafka - consumer will process (embeddings, vector DB, etc.)
    try {
      await this.kafkaService.publishDocumentForProcessing(doc._id.toString());
    } catch (err) {
      await this.documentsService.updateStatus(
        doc._id.toString(),
        FAILED_STATUS,
      );
      this.storageService.delete(storagePath);
      throw err;
    }

    return this.toResponseDto(doc);
  }

  @Get()
  async getMyDocuments(
    @CurrentUser() user: UserDocument & { _id: { toString(): string } },
  ): Promise<DocumentResponseDto[]> {
    const documents = await this.documentsService.findByUserId(
      user._id.toString(),
    );
    return documents.map((doc) => this.toResponseDto(doc));
  }

  private toResponseDto(doc: {
    _id: { toString(): string };
    originalName: string;
    mimeType: string;
    size: number;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    dto.id = doc._id.toString();
    dto.originalName = doc.originalName;
    dto.mimeType = doc.mimeType;
    dto.size = doc.size;
    dto.status = doc.status;
    if (doc.createdAt) dto.createdAt = doc.createdAt;
    if (doc.updatedAt) dto.updatedAt = doc.updatedAt;
    return dto;
  }

  @Get('search')
  async searchDocuments(
    @Query() dto: SearchDocumentsRequestDto,
    @CurrentUser() user: UserDocument & { _id: { toString(): string } },
  ): Promise<SearchDocumentsResponseDto> {
    const userId = user._id.toString();
    const topK = dto.limit ?? 10;

    const queryEmbedding = await this.embeddingsService.embed(dto.query);
    const results = await this.vectordbService.search(queryEmbedding, topK, {
      userId,
    });

    const response = new SearchDocumentsResponseDto();
    response.results = results.map((r) => this.toSearchResultDto(r));
    return response;
  }

  private toSearchResultDto(r: {
    payload?: Record<string, unknown> | null;
    score?: number;
  }): SearchDocumentResultDto {
    const p = r.payload ?? {};
    const dto = new SearchDocumentResultDto();
    dto.documentId = String(p.documentId ?? '');
    dto.originalName = String(p.originalName ?? '');
    dto.text = String(p.text ?? '');
    dto.score = r.score ?? 0;
    dto.chunkIndex = Number(p.chunkIndex ?? 0);
    return dto;
  }
}
