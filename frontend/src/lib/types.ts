export type AuthUser = {
  id: string;
  email: string;
  username: string;
};

export type AuthResponse = {
  access_token: string;
  message: string;
  user: AuthUser;
};

export type DocumentItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SearchResult = {
  documentId: string;
  originalName: string;
  text: string;
  score: number;
  chunkIndex: number;
};

export type SearchResponse = {
  results: SearchResult[];
};

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type ConversationListItem = {
  id: string;
  documentId: string;
  /** First user message preview from API (for sidebar labels). */
  title?: string;
  messageCount: number;
  lastMessageAt?: string;
  createdAt?: string;
};

export type ConversationDetail = {
  id: string;
  documentId: string;
  messages: ChatTurn[];
  createdAt?: string;
  updatedAt?: string;
};
