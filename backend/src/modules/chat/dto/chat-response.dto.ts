export class ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export class ConversationDto {
  id: string;
  documentId: string;
  messages: ChatMessageDto[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConversationListItemDto {
  id: string;
  documentId: string;
  /** First user message, collapsed whitespace, truncated (list preview). */
  title: string;
  messageCount: number;
  lastMessageAt?: Date;
  createdAt?: Date;
}
