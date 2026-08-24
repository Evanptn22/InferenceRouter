import { createPaymentGate } from '../plugins/requirePayment.js';
import { getCatalogEntry } from '../config/catalog.js';
import { route } from '../core/router.js';

const VALID_ROLES = ['system', 'user', 'assistant'];

// Not a Fastify route `schema` — that would validate (and reject) the body
// before the payment preHandler runs, which breaks the x402/MPP "probe"
// convention where a client checks for a 402 challenge with an empty body
// before sending the real request. This runs manually, after payment.
function validateChatBody(body) {
  if (typeof body?.model !== 'string') return 'model is required';
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return 'messages must be a non-empty array';
  }
  for (const message of body.messages) {
    if (!VALID_ROLES.includes(message?.role) || typeof message?.content !== 'string') {
      return 'each message needs a role (system/user/assistant) and string content';
    }
  }
  return null;
}

function resolveChatResource(request) {
  const entry = getCatalogEntry(request.body?.model);
  return entry ? { resourceId: entry.id, priceUSD: entry.pricePerRequestUSD } : null;
}

// Probes arrive with Content-Type: application/json but no real body — used
// only when no payment is presented (see requirePayment.js), so it can never
// cause a paid request to be priced against the wrong model.
function probeFallback() {
  const entry = getCatalogEntry('fast-cheap');
  return { resourceId: entry.id, priceUSD: entry.pricePerRequestUSD };
}

export default async function chatRoutes(app) {
  // Same reasoning: a probe body must not crash body parsing before the
  // payment gate gets a chance to run. Payment verification decodes the
  // X-Payment header directly, never request.body, so treating unparseable
  // JSON as {} here can't bypass any payment check — it only ever affects
  // resolveChatResource/validateChatBody, which already handle absent fields.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    try {
      done(null, body.trim().length === 0 ? {} : JSON.parse(body));
    } catch {
      done(null, {});
    }
  });

  app.post(
    '/v1/chat/completions',
    {
      preHandler: createPaymentGate(resolveChatResource, {
        probeFallback,
        validateBody: (request) => validateChatBody(request.body),
      }),
    },
    async (request, reply) => {
      const { model, messages } = request.body;

      try {
        const result = await route({
          catalogId: model,
          messages,
          payerId: request.payerId,
          callerRail: request.paymentRail,
        });
        return {
          id: crypto.randomUUID(),
          model,
          provider: result.pricing.provider,
          choices: [{ message: { role: 'assistant', content: result.content } }],
          usage: {
            price: result.pricing.amount,
            currency: result.pricing.currency,
            unit: result.pricing.unit,
            latencyMs: result.latencyMs,
          },
          payment: {
            paidVia: request.paymentRail,
            upstreamPaidVia: result.upstreamRail,
          },
        };
      } catch (err) {
        reply.code(502).send({ error: err.message });
      }
    }
  );
}
