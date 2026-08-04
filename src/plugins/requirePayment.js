import { buildAccepts } from '../payments/challenge.js';
import { verifyPresentedPayment } from '../payments/verify.js';
import { PaymentError } from '../payments/paymentError.js';

// Per-route preHandler (not a global hook) so public routes like /v1/catalog
// and /healthz stay unauthenticated — same reasoning the old auth.js used.
// Fastify runs preHandler after body parsing/schema validation, so
// resolveResource can safely read request.body.
export function createPaymentGate(resolveResource) {
  return async function requirePayment(request, reply) {
    const resource = resolveResource(request);
    if (!resource) {
      reply.code(404).send({ error: 'unknown resource' });
      return;
    }

    const accepts = buildAccepts({ ...resource, resourcePath: request.url });
    const presented = request.headers['x-payment'];
    if (!presented) {
      reply.code(402).send({ error: 'payment required', accepts });
      return;
    }

    try {
      const { scheme, payerId, receipt } = await verifyPresentedPayment({ presented, accepts });
      request.paymentScheme = scheme;
      request.payerId = payerId;
      request.paymentReceipt = receipt;
    } catch (err) {
      if (err instanceof PaymentError) {
        reply.code(err.statusCode).send({ error: err.message, accepts });
        return;
      }
      throw err;
    }
  };
}
