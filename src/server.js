import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();

async function shutdown(signal, exitCode = 0) {
  app.log.info({ signal }, 'shutting down');
  // Force-exit if close() hangs (e.g. the crash that triggered this left a
  // connection/socket in a state that never drains) — unref so it doesn't
  // itself keep the process alive on the clean-shutdown path.
  const forceExit = setTimeout(() => process.exit(exitCode || 1), 5000);
  forceExit.unref();
  try {
    await app.close();
  } catch (err) {
    app.log.error({ err }, 'error during shutdown');
  }
  process.exit(exitCode);
}

// Node's own guidance: after an uncaughtException the process is in an
// unknown state and should not keep serving traffic. Log, attempt a clean
// close, then exit non-zero — restarting is the process supervisor's job
// (systemd/pm2/the host platform), not an in-process retry.
process.on('uncaughtException', (err) => {
  app.log.error({ err }, 'uncaughtException');
  shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (reason) => {
  app.log.error({ err: reason }, 'unhandledRejection');
  shutdown('unhandledRejection', 1);
});
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

try {
  await app.listen({ port: env.port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
