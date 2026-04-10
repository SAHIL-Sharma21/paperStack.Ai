import { HTTP_METHODS } from './constant';
import type { AuthResponse, DocumentItem, SearchResponse } from './types';
const DEFAULT_API_BASE_URL = 'http://localhost:8001/api/v1';


function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const base =
    typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : DEFAULT_API_BASE_URL;
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
