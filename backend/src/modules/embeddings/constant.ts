/**
 * Embeddings Constants
 * @author: Sahil Sharma
 */

export const GEMINI_EMBEDDING_DIM = 3072;
export const FASTEMBED_EMBEDDING_DIM = 384;

/** Max chars per chunk */
export const MAX_CHUNK_CHARS = 3000;

/** Texts per Gemini batch embed request (API maximum is 100) */
export const GEMINI_EMBED_BATCH_SIZE = 50;

export type EmbeddingProvider = 'gemini' | 'fastembed';
