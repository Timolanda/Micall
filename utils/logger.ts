import winston from 'winston';
import { env } from '../config/environment';

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'micall-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

if (env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add request context middleware
export const addRequestContext = (req: any, res: any, next: any) => {
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  logger.defaultMeta = {
    ...logger.defaultMeta,
    requestId,
    path: req.path,
    method: req.method
  };
  next();
};

export default logger; 