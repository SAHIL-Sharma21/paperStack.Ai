/**
 * Embeddings Constants
 * @author: Sahil Sharma
 */

export const GEMINI_EMBEDDING_DIM = 3072;
export const FASTEMBED_EMBEDDING_DIM = 384;

/** Max chars per chunk */
export const MAX_CHUNK_CHARS = 3000;

export type EmbeddingProvider = 'gemini' | 'fastembed';
