/**
 * Document response DTO - safe fields for API responses
 * @author: Sahil Sharma
 */

export class DocumentResponseDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}
