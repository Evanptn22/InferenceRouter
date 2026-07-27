import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { registerErrorHandler } from './plugins/errorHandler.js';
import chatRoutes from './routes/chat.js';
import catalogRoutes from './routes/catalog.js';
import usageRoutes from './routes/usage.js';
import healthRoutes from './routes/health.js';

export function buildApp() {
  const app = Fastify({ logger: true });

  registerErrorHandler(app);

  app.register(rateLimit, {
    max: 20,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.headers['x-api-key'] ?? request.ip,
  });

  app.register(chatRoutes);
  app.register(catalogRoutes);
  app.register(usageRoutes);
  app.register(healthRoutes);

  return app;
}
