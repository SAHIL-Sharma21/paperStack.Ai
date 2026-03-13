/**
 * Documents Service - document metadata CRUD
 * @author: Sahil Sharma
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentFile, DocumentDocument } from './schemas/document.schema';
import { DocumentStatus, FAILED_STATUS, PROCESSING_STATUS } from './constant';

export interface CreateDocumentDto {
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentFile.name)
    private documentModel: Model<DocumentDocument>,
  ) {}

  async create(createDto: CreateDocumentDto): Promise<DocumentDocument> {
    const doc = new this.documentModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
      status: PROCESSING_STATUS as DocumentStatus,
    });
    const saved = await doc.save();
    return saved;
  }

  async findByUserId(userId: string): Promise<DocumentDocument[]> {
    return this.documentModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
  }

  async findById(documentId: string): Promise<DocumentDocument | null> {
    return this.documentModel.findById(documentId);
  }

  async updateStatus(
    documentId: string,
    status: DocumentStatus,
  ): Promise<DocumentDocument | null> {
    return this.documentModel.findByIdAndUpdate(
      documentId,
      { status },
      { returnDocument: 'after' },
    );
  }

  /**
   * Atomically claim a document for processing. Only one worker can succeed.
   * Fails if already COMPLETED, or if another worker has a valid lease.
   * Lease expires after 15 min to recover from crashed workers.
   */
  async claimDocument(
    documentId: string,
    leaseExpiryMs = 15 * 60 * 1000,
  ): Promise<DocumentDocument | null> {
    const leaseCutoff = new Date(Date.now() - leaseExpiryMs);
    return this.documentModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(documentId),
        status: { $in: [PROCESSING_STATUS, FAILED_STATUS] },
        $or: [
          { leasedAt: { $exists: false } },
          { leasedAt: null },
          { leasedAt: { $lt: leaseCutoff } },
        ],
      },
      { $set: { leasedAt: new Date() } },
      { returnDocument: 'after' },
    );
  }
}
