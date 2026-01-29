/**
 * Security utilities for API routes
 */

// Rate limiting store (in-memory, resets on cold start)
// For production, use Vercel KV or Upstash Redis
const rateLimitStore: Map<string, number[]> = new Map();

const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '100');
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60') * 1000;

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = rateLimitStore.get(ip) || [];
  
  // Clean old entries
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recent.length >= RATE_LIMIT_REQUESTS) {
    rateLimitStore.set(ip, recent);
    return { allowed: false, remaining: 0 };
  }
  
  recent.push(now);
  rateLimitStore.set(ip, recent);
  
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - recent.length };
}

export function verifyApiKey(request: Request): boolean {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return true; // No key configured = open access
  
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    if (authHeader.slice(7) === apiKey) return true;
  }
  
  // Check query param
  const url = new URL(request.url);
  if (url.searchParams.get('api_key') === apiKey) return true;
  
  return false;
}

// Input validation
const SAFE_STRING_PATTERN = /^[a-zA-Z0-9\s\-_'\.]+$/;
const UUID_PATTERN = /^\{?[a-fA-F0-9\-]+\}?$/;

export function sanitizeString(value: string, maxLength = 100): string | null {
  if (!value) return value;
  const trimmed = value.slice(0, maxLength);
  if (!SAFE_STRING_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function validateUUID(value: string): boolean {
  return UUID_PATTERN.test(value);
}
