import crypto from "crypto";

/**
 * Generates a cryptographically strong, unguessable token for table QRs or sessions.
 */
export function generateSecureToken(byteLength: number = 24): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}

/**
 * Computes deterministic SHA-256 hex hash of a raw token.
 * Store ONLY the hashed digest in PostgreSQL `table_qr_tokens.token_hash`.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Performs constant-time comparison of two hex strings to prevent timing attacks.
 */
export function timingSafeEqualHex(hexA: string, hexB: string): boolean {
  try {
    const bufA = Buffer.from(hexA, "hex");
    const bufB = Buffer.from(hexB, "hex");
    if (bufA.length === 0 || bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

/**
 * Sliding-window rate limiter for sensitive public endpoints (QR resolution, order creation).
 * Returns `{ allowed, remaining, resetInMs }`.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 20,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(identifier);

  // Periodic cleanup when store grows
  if (rateLimitStore.size > 5000) {
    rateLimitStore.forEach((bucket, key) => {
      if (bucket.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    });
  }

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetInMs: windowMs };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetInMs: Math.max(0, existing.resetAt - now),
  };
}
