import { buildAccepts, wwwAuthenticateHeader } from '../payments/challenge.js';
import { verifyPresentedPayment } from '../payments/verify.js';
import { PaymentError } from '../payments/paymentError.js';

// 402 responses must carry a WWW-Authenticate: Payment header (MPP
// requirement; x402-only accepts just skip it) alongside the JSON body.
function send402(reply, accepts, error) {
  const header = wwwAuthenticateHeader(accepts);
  if (header) reply.header('WWW-Authenticate', header);
  reply.code(402).send({ error, accepts });
}

// Per-route preHandler (not a global hook) so public routes like /v1/catalog
// and /healthz stay unauthenticated — same reasoning the old auth.js used.
// Fastify runs preHandler after body parsing, so resolveResource can safely
// read request.body.
//
// probeFallback lets an unauthenticated x402/MPP "probe" (a request sent with
// no real body, just to check whether payment is required) still get a
// meaningful 402 even though resolveResource can't identify a priced
// resource from an empty body. It's only consulted when no payment was
// presented — a request that DOES present payment but resolves to no
// resource still 404s, so we never verify (and potentially charge) against a
// guessed resource.
//
// validateBody, when given, runs after a resource is resolved but *before*
// verifyPresentedPayment — i.e. before a real payment gets charged/settled —
// so a malformed request with a genuinely valid payment is rejected without
// spending the buyer's money, the same guarantee the old route-level Fastify
// `schema` gave before it had to be removed to let probes through.
export function createPaymentGate(resolveResource, { probeFallback, validateBody } = {}) {
  return async function requirePayment(request, reply) {
    const presented = request.headers['x-payment'];
    const resource = resolveResource(request) ?? (!presented ? probeFallback?.() : undefined);
    if (!resource) {
      reply.code(404).send({ error: 'unknown resource' });
      return;
    }

    const accepts = await buildAccepts({ ...resource, resourcePath: request.url });
    if (!presented) {
      send402(reply, accepts, 'payment required');
      return;
    }

    const bodyError = validateBody?.(request);
    if (bodyError) {
      reply.code(400).send({ error: bodyError, accepts });
      return;
    }

    try {
      const { rail, payerId, receipt } = await verifyPresentedPayment({ presented, accepts });
      request.paymentRail = rail;
      request.payerId = payerId;
      request.paymentReceipt = receipt;
    } catch (err) {
      if (err instanceof PaymentError) {
        if (err.statusCode === 402) {
          send402(reply, accepts, err.message);
        } else {
          reply.code(err.statusCode).send({ error: err.message, accepts });
        }
        return;
      }
      throw err;
    }
  };
}
