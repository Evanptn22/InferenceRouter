import { resolveConsumer } from '../config/consumers.js';

// Per-route preHandler (not a global hook) so public routes like /v1/catalog
// and /healthz stay unauthenticated.
export async function requireApiKey(request, reply) {
  const apiKey = request.headers['x-api-key'];
  const consumerId = apiKey && resolveConsumer(apiKey);
  if (!consumerId) {
    reply.code(401).send({ error: 'missing or invalid x-api-key' });
    return;
  }
  request.consumerId = consumerId;
}
