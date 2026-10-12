/**
 * Per-IP rate limits (requests per window). Used with @Throttle() on routes.
 * @author: Sahil Sharma
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const DEFAULT_REQUESTS_PER_MINUTE = 120;

export const AUTH_THROTTLE = { default: { limit: 10, ttl: MINUTE_MS } };
export const UPLOAD_THROTTLE = { default: { limit: 10, ttl: HOUR_MS } };
export const CHAT_THROTTLE = { default: { limit: 10, ttl: MINUTE_MS } };

export const THROTTLE_ERROR_MESSAGE =
  'Too many requests. Please wait a moment and try again.';

/**
 * Client IP for rate limiting. Behind Cloudflare, every request arrives from a
 * Cloudflare edge IP, so the original client IP header must be preferred.
 */
export function getClientIpTracker(req: Record<string, unknown>): string {
  const headers = (req.headers ?? {}) as Record<
    string,
    string | string[] | undefined
  >;
  const cfIp = headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim() !== '') return cfIp.trim();
  return typeof req.ip === 'string' ? req.ip : 'unknown';
}
