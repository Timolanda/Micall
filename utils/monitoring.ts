import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { env } from '../config/environment';
import prometheus from 'prom-client';
import { Express } from 'express';

export const initializeMonitoring = () => {
  if (env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      integrations: [new Integrations.BrowserTracing()],
      tracesSampleRate: 1.0,
    });
  }
};

export const logError = (error: Error, context?: object) => {
  console.error(error);
  if (env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  }
};

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const emergencyEventsTotal = new prometheus.Counter({
  name: 'emergency_events_total',
  help: 'Total number of emergency events',
  labelNames: ['type', 'status']
});

const activeUsers = new prometheus.Gauge({
  name: 'active_users',
  help: 'Number of currently active users'
});

const wsConnections = new prometheus.Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections'
});

// Database metrics
const dbOperationDuration = new prometheus.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

export const setupMonitoring = (app: Express) => {
  // Enable default metrics
  prometheus.collectDefaultMetrics();

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.send(await prometheus.register.metrics());
  });

  // Request duration middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      httpRequestDuration.observe(
        {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode
        },
        duration
      );
      httpRequestTotal.inc({
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode
      });
    });
    next();
  });

  return {
    emergencyEventsTotal,
    activeUsers,
    wsConnections,
    dbOperationDuration
  };
}; 