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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : Number(value),
  )
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
