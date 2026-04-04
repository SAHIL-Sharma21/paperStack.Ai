# PaperStack Frontend (Phase 1)

## Stack

- Vite + React + TypeScript
- React Router
- TanStack Query
- Axios

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Environment

- `VITE_API_BASE_URL` default: `http://localhost:8001/api/v1`

## Implemented in Phase 1

- Auth pages: login/signup
- Protected routes
- Documents page: upload, list, delete
- Semantic search page

## Next phases

- Chat UI with SSE stream handling
- Better error toasts and loading states
- Design system/components
