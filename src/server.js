import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();

// Demo-safety net: log and keep the process alive instead of crashing on an
// unexpected error. This is a crutch for staying up through a demo, not a
// pattern to carry into production untouched.
process.on('uncaughtException', (err) => {
  app.log.error({ err }, 'uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  app.log.error({ err: reason }, 'unhandledRejection');
});

async function shutdown(signal) {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

try {
  await app.listen({ port: env.port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
