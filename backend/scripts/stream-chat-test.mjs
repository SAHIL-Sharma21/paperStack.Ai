#!/usr/bin/env node
/**
 * Test RAG chat: login → pick document (workout PDF by name or DOCUMENT_ID) → stream questions.
 *
 * Usage:
 *   cd backend
 *   PAPERSTACK_EMAIL=you@example.com PAPERSTACK_PASSWORD='...' node scripts/stream-chat-test.mjs
 *
 * Optional:
 *   PAPERSTACK_DOCUMENT_ID=507f1f77bcf86cd799439011
 *   PAPERSTACK_API_BASE=http://localhost:8001/api/v1
 */

const API =
  process.env.PAPERSTACK_API_BASE?.replace(/\/$/, '') ||
  'http://localhost:8001/api/v1';

const email = process.env.PAPERSTACK_EMAIL;
const password = process.env.PAPERSTACK_PASSWORD;
const documentIdEnv = process.env.PAPERSTACK_DOCUMENT_ID?.trim();

const QUESTIONS = [
  'According to this document, how many minutes of cardio should I do daily, and on what kind of equipment?',
  'List the main exercises scheduled for Wednesday (Legs + Core).',
  'What rest period between sets does the plan recommend?',
  'What does the plan say about reps and lifting form?',
];

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrUsername: email,
      password,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Login ${res.status}: ${t}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error('Login response missing access_token');
  return data.access_token;
}

async function listDocuments(token) {
  const res = await fetch(`${API}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`List documents ${res.status}: ${t}`);
  }
  return res.json();
}

function pickDocumentId(docs) {
  if (documentIdEnv) return documentIdEnv;
  const workout = docs.find(
    (d) =>
      /workout/i.test(d.originalName || '') ||
      /workout_plan/i.test(d.originalName || ''),
  );
  if (workout?.id) return workout.id;
  const completed = docs.filter((d) => d.status === 'completed');
  if (completed.length === 1) return completed[0].id;
  if (completed.length > 0) {
    console.warn(
      'Multiple completed documents; using first. Set PAPERSTACK_DOCUMENT_ID to be explicit.\n',
    );
    return completed[0].id;
  }
  throw new Error(
    'No completed document found. Wait for processing or set PAPERSTACK_DOCUMENT_ID.',
  );
}

async function streamChat(token, docId, message, conversationId) {
  const body =
    conversationId != null && conversationId !== ''
      ? JSON.stringify({ message, conversationId })
      : JSON.stringify({ message });
  const res = await fetch(`${API}/documents/${docId}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Chat ${res.status}: ${t}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  let convId;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() ?? '';
    for (const block of parts) {
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const json = line.slice(5).trim();
        try {
          const obj = JSON.parse(json);
          if (obj.conversationId != null && obj.conversationId !== '') {
            convId = obj.conversationId;
          }
          if (obj.text) {
            process.stdout.write(obj.text);
            full += obj.text;
          }
          if (obj.error) console.error('\n[error]', obj.error);
          if (obj.done) {
            /* saved flag etc. */
          }
        } catch {
          /* ignore */
        }
      }
    }
  }
  return { full, conversationId: convId };
}

async function main() {
  if (!email || !password) {
    console.error(`
Set credentials:
  PAPERSTACK_EMAIL=... PAPERSTACK_PASSWORD='...' node scripts/stream-chat-test.mjs
`);
    process.exit(1);
  }

  console.log('API:', API);
  const token = await login();
  console.log('Logged in.\n');

  const docs = await listDocuments(token);
  const docId = pickDocumentId(docs);
  const meta = docs.find((d) => d.id === docId);
  console.log(
    'Document:',
    meta?.originalName ?? docId,
    `(${meta?.status ?? '?'})`,
    '\nid:',
    docId,
    '\n',
  );

  let conversationId;
  for (const q of QUESTIONS) {
    console.log('Q:', q, '\nA:');
    const { conversationId: nextConv } = await streamChat(
      token,
      docId,
      q,
      conversationId,
    );
    if (nextConv) conversationId = nextConv;
    console.log('\n\n---\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
