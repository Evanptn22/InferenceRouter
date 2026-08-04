import { createPaymentGate } from '../plugins/requirePayment.js';
import { getCatalogEntry } from '../config/catalog.js';
import { route } from '../core/router.js';

const bodySchema = {
  type: 'object',
  required: ['model', 'messages'],
  properties: {
    model: { type: 'string' },
    messages: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['role', 'content'],
        properties: {
          role: { type: 'string', enum: ['system', 'user', 'assistant'] },
          content: { type: 'string' },
        },
      },
    },
  },
};

function resolveChatResource(request) {
  const entry = getCatalogEntry(request.body?.model);
  return entry ? { resourceId: entry.id, priceUSD: entry.pricePerRequestUSD } : null;
}

export default async function chatRoutes(app) {
  app.post(
    '/v1/chat/completions',
    { preHandler: createPaymentGate(resolveChatResource), schema: { body: bodySchema } },
    async (request, reply) => {
      const { model, messages } = request.body;

      try {
        const result = await route({
          catalogId: model,
          messages,
          payerId: request.payerId,
          callerScheme: request.paymentScheme,
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
            paidVia: request.paymentScheme,
            upstreamPaidVia: result.upstreamScheme,
          },
        };
      } catch (err) {
        reply.code(502).send({ error: err.message });
      }
    }
  );
}
