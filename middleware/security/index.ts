import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/environment';

// Content Security Policy configuration
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.mapbox.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.mapbox.com'],
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    connectSrc: [
      "'self'",
      'https://api.mapbox.com',
      'wss://*.mapbox.com',
      env.API_URL
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: []
  }
};

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: cspConfig,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Rate limiting by IP
export const rateLimiter = {
  standard: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
  }),
  auth: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts'
  })
};

// SQL Injection prevention
export const sqlInjectionPrevention = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/i;
  const params = { ...req.query, ...req.body };

  for (const key in params) {
    if (typeof params[key] === 'string' && sqlPatterns.test(params[key])) {
      return res.status(403).json({ error: 'Invalid input detected' });
    }
  }
  next();
};

// NoSQL injection prevention
export const noSqlSanitize = mongoSanitize();

// Parameter pollution prevention
export const parameterPollution = hpp({
  whitelist: ['type', 'status', 'sort'] // Allow duplicates for these params
});

// JWT token verification with key rotation
export const verifyJWT = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = await verifyTokenWithRotation(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}; 