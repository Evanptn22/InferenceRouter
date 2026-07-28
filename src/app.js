import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { registerErrorHandler } from './plugins/errorHandler.js';
import chatRoutes from './routes/chat.js';
import catalogRoutes from './routes/catalog.js';
import usageRoutes from './routes/usage.js';
import healthRoutes from './routes/health.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

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

  app.register(fastifyStatic, { root: publicDir });

  return app;
}
