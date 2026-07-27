import { getBreakerStates } from '../core/circuitBreaker.js';

export default async function healthRoutes(app) {
  app.get('/healthz', async () => ({ status: 'ok' }));

  app.get('/readyz', async () => {
    const breakers = getBreakerStates();
    const anyOpen = Object.values(breakers).includes('OPEN');
    // Still 200 when a breaker is open — the fallback chain means the
    // service can keep serving traffic, just in a degraded state.
    return { status: anyOpen ? 'degraded' : 'ok', breakers };
  });
}
