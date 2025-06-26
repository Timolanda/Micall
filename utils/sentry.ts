import * as Sentry from '@sentry/node';
import { env } from '../config/environment';

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Mongo(),
    new Sentry.Integrations.Redis(),
  ],
});

export { Sentry }; 