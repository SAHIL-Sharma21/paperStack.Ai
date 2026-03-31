import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  /** Optional: continue an existing conversation */
  @IsOptional()
  @IsString()
  conversationId?: string;
}
