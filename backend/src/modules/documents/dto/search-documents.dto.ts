import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** Query params for GET /documents/search?query=...&limit=... */
export class SearchDocumentsRequestDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class SearchDocumentResultDto {
  documentId: string;
  originalName: string;
  text: string;
  score: number;
  chunkIndex: number;
}

export class SearchDocumentsResponseDto {
  results: SearchDocumentResultDto[];
}