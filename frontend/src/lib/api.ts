import { HTTP_METHODS } from './constant';
import type {
  AuthResponse,
  ConversationDetail,
  ConversationListItem,
  DocumentItem,
  SearchResponse,
} from './types';
const DEFAULT_API_BASE_URL = 'http://localhost:8001/api/v1';


function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  let base: string;
  if (trimmed !== '') {
    base = trimmed;
  } else if (import.meta.env.DEV) {
    base = DEFAULT_API_BASE_URL;
  } else {
    throw new Error(
      'VITE_API_BASE_URL is required in non-development builds. Set it to a valid absolute URL (e.g. https://api.example.com/api/v1).',
    );
  }
  try {
    return new URL(base).href.replace(/\/$/, '');
  } catch {
    throw new Error(
      `VITE_API_BASE_URL must be a valid absolute URL (e.g. http://localhost:8001/api/v1). Received: ${JSON.stringify(raw)}`,
    );
  }
}

const API_BASE_URL = resolveApiBaseUrl();

type RequestOptions = {
  method?: HTTP_METHODS;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiErrorJsonBody = { message?: string | string[] };

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('paperstack_token');

  const response = await fetch(buildUrl(path, options.params), {
    method: options.method ?? HTTP_METHODS.GET,
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
    body: options.body ?? null,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errData = (await response.json()) as ApiErrorJsonBody;
      if (Array.isArray(errData.message)) {
        message = errData.message.join(', ');
      } else if (typeof errData.message === 'string') {
        message = errData.message;
      }
    } catch {
      message = `Request failed with status ${response.status}`;
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

async function fetchAuthorizedBlob(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<Blob> {
  const token = localStorage.getItem('paperstack_token');
  const response = await fetch(buildUrl(path, params), {
    method: HTTP_METHODS.GET,
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errData = (await response.json()) as ApiErrorJsonBody;
      if (Array.isArray(errData.message)) {
        message = errData.message.join(', ');
      } else if (typeof errData.message === 'string') {
        message = errData.message;
      }
    } catch {
      message = `Request failed with status ${response.status}`;
    }
    throw new ApiError(message, response.status);
  }

  return response.blob();
}

/** SSE payloads from POST /documents/:id/chat */
export type DocumentChatSsePayload = {
  text?: string;
  error?: string;
  done?: boolean;
  saved?: boolean;
  conversationId?: string;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('paperstack_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Stream RAG chat; calls `onPayload` for each `data: {...}` line until the stream ends.
 */
export async function streamDocumentChat(
  documentId: string,
  body: { message: string; conversationId?: string },
  options: {
    onPayload: (p: DocumentChatSsePayload) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const response = await fetch(buildUrl(`/documents/${documentId}/chat`), {
    method: HTTP_METHODS.POST,
    credentials: 'include',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errData = (await response.json()) as ApiErrorJsonBody;
      if (Array.isArray(errData.message)) {
        message = errData.message.join(', ');
      } else if (typeof errData.message === 'string') {
        message = errData.message;
      }
    } catch {
      message = `Request failed with status ${response.status}`;
    }
    throw new ApiError(message, response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ApiError('No response body', 500);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const block of chunks) {
      for (const line of block.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const json = trimmed.slice(5).trim();
        if (!json) continue;
        try {
          options.onPayload(JSON.parse(json) as DocumentChatSsePayload);
        } catch {
          /* ignore malformed chunk */
        }
      }
    }
  }
}

export const chatApi = {
  listConversations(documentId: string): Promise<ConversationListItem[]> {
    return request<ConversationListItem[]>(`/documents/${documentId}/conversations`);
  },

  getConversation(
    documentId: string,
    conversationId: string,
  ): Promise<ConversationDetail> {
    return request<ConversationDetail>(
      `/documents/${documentId}/conversations/${conversationId}`,
    );
  },
};

export const authApi = {
  login(emailOrUsername: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: HTTP_METHODS.POST,
      body: JSON.stringify({ emailOrUsername, password }),
    });
  },

  signup(email: string, username: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/signup', {
      method: HTTP_METHODS.POST,
      body: JSON.stringify({ email, username, password }),
    });
  },
};

export const documentsApi = {
  list(): Promise<DocumentItem[]> {
    return request<DocumentItem[]>('/documents');
  },

  upload(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    return request<DocumentItem>('/documents/upload', {
      method: HTTP_METHODS.POST,
      body: formData,
    });
  },

  search(query: string, limit = 10): Promise<SearchResponse> {
    return request<SearchResponse>('/documents/search', {
      params: { query, limit },
    });
  },

  remove(documentId: string): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/documents/${documentId}`, {
      method: HTTP_METHODS.DELETE,
    });
  },

  fetchFileBlob(documentId: string, options?: { inline?: boolean }): Promise<Blob> {
    return fetchAuthorizedBlob(`/documents/${documentId}/file`, {
      ...(options?.inline ? { inline: '1' } : {}),
    });
  },

  async downloadToDevice(documentId: string, filename: string): Promise<void> {
    const blob = await fetchAuthorizedBlob(`/documents/${documentId}/file`);
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  },
};

export { ApiError };
