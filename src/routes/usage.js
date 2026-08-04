import { createPaymentGate } from '../plugins/requirePayment.js';
import { env } from '../config/env.js';
import { query } from '../core/ledger.js';

function resolveUsageResource() {
  return { resourceId: 'usage-query', priceUSD: env.usageQueryPriceUSD };
}

export default async function usageRoutes(app) {
  app.get('/v1/usage', { preHandler: createPaymentGate(resolveUsageResource) }, async (request) => {
    const { entries, totalSpentUSD } = query(request.payerId);
    return { payerId: request.payerId, totalSpentUSD, entries };
  });
}
