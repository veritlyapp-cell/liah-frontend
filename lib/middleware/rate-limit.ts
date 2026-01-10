/**
 * Simple in-memory rate limiter for API routes.
 * For production at scale, consider using Redis or Upstash.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
    maxRequests: number;      // Max requests allowed
    windowMs: number;         // Time window in milliseconds
    keyPrefix?: string;       // Prefix for the rate limit key
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;      // Seconds until reset (if blocked)
}

/**
 * Check if a request is allowed under rate limiting.
 * @param identifier - Unique identifier (IP, userId, etc.)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const key = `${config.keyPrefix || 'rl'}:${identifier}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // If no entry or window expired, create new
    if (!entry || entry.resetTime < now) {
        entry = {
            count: 1,
            resetTime: now + config.windowMs
        };
        rateLimitStore.set(key, entry);

        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetTime: entry.resetTime
        };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
            retryAfter
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime
    };
}

/**
 * Get client IP from request headers (works with Vercel)
 */
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    return 'unknown';
}

// Pre-configured rate limits for different route types
export const RATE_LIMITS = {
    // Email routes: 5 requests per minute per IP
    email: {
        maxRequests: 5,
        windowMs: 60 * 1000,
        keyPrefix: 'email'
    },

    // AI routes: 10 requests per minute per IP
    ai: {
        maxRequests: 10,
        windowMs: 60 * 1000,
        keyPrefix: 'ai'
    },

    // Webhooks: 100 requests per minute per IP
    webhook: {
        maxRequests: 100,
        windowMs: 60 * 1000,
        keyPrefix: 'webhook'
    },

    // Admin routes: 30 requests per minute per user
    admin: {
        maxRequests: 30,
        windowMs: 60 * 1000,
        keyPrefix: 'admin'
    },

    // Auth routes: 10 requests per minute per IP (prevent brute force)
    auth: {
        maxRequests: 10,
        windowMs: 60 * 1000,
        keyPrefix: 'auth'
    }
};
