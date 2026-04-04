import type { AuthResponse, DocumentItem, SearchResponse } from './types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT';
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
    method: options.method ?? 'GET',
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
      const errData = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errData.message)) {
        message = errData.message.join(', ');
      } else if (typeof errData.message === 'string') {
        message = errData.message;
      }
    } catch {
      // keep default message
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export const authApi = {
  login(emailOrUsername: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password }),
    });
  },

  signup(email: string, username: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/signup', {
      method: 'POST',
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
      method: 'POST',
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
      method: 'DELETE',
    });
  },
};
