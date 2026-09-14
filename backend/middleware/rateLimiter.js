/**
 * Rate Limiter Configuration
 * Supports both in-memory (default) and Redis (production)
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { logger } from '../services/logger.js';

// Check if Redis is configured
const hasRedis = process.env.REDIS_URL && process.env.REDIS_URL.startsWith('redis');

const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Muitas tentativas. Tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
  };

  if (hasRedis && process.env.NODE_ENV === 'production') {
    // Redis-backed rate limiting for production
    // Requires: npm install ioredis rate-limit-redis
    try {
      const Redis = require('ioredis');
      const redisClient = new Redis(process.env.REDIS_URL);

      return rateLimit({
        ...defaultOptions,
        ...options,
        store: new RedisStore({
          sendCommand: (...args) => redisClient.call(...args),
        }),
        keyGenerator: (req) => {
          // Use user ID if authenticated, otherwise IP
          return req.user?.id || req.ip;
        },
      });
    } catch (err) {
      logger.warn('Redis not available, falling back to memory store', { error: err.message });
    }
  }

  // In-memory rate limiting (development/default)
  return rateLimit({
    ...defaultOptions,
    ...options,
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    },
  });
};

// Pre-configured limiters
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
});

export const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 failed attempts per hour
  message: 'Muitas tentativas de login. Tente novamente em 1 hora.',
});

export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
});

export const paymentLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 payment attempts per hour
});

export default createRateLimiter;