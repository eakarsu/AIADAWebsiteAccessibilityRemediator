/**
 * Rate limiter middleware factory.
 * Provides preconfigured limiters for AI routes, auth routes, and general API traffic.
 */
const rateLimit = require('express-rate-limit');

/**
 * AI rate limiter: 20 requests per hour, keyed by authenticated user ID.
 * Requires auth middleware to run first (sets req.user).
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    return req.user ? `user_${req.user.id}` : `ip_${req.ip}`;
  },
  message: {
    error: 'Too many AI requests. Limit is 20 per hour per user. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

/**
 * General API rate limiter: 100 requests per 15 minutes per IP.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests. Limit is 100 per 15 minutes. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth brute-force limiter: 10 attempts per 15 minutes per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRateLimiter, generalLimiter, authRateLimiter };
