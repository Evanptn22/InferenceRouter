import { requireApiKey } from '../plugins/auth.js';
import { query } from '../core/ledger.js';

export default async function usageRoutes(app) {
  app.get('/v1/usage', { preHandler: requireApiKey }, async (request) => {
    const { entries, totalSpentUSD } = query(request.consumerId);
    return { consumerId: request.consumerId, totalSpentUSD, entries };
  });
}
