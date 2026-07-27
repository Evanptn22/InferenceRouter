import { requireApiKey } from '../plugins/auth.js';
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

export default async function chatRoutes(app) {
  app.post(
    '/v1/chat/completions',
    { preHandler: requireApiKey, schema: { body: bodySchema } },
    async (request, reply) => {
      const { model, messages } = request.body;

      try {
        const result = await route({ catalogId: model, messages, consumerId: request.consumerId });
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
        };
      } catch (err) {
        if (err.message.startsWith('unknown catalog id')) {
          reply.code(404).send({ error: err.message });
          return;
        }
        reply.code(502).send({ error: err.message });
      }
    }
  );
}
