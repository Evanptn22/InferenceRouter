import { catalog } from '../config/catalog.js';

export default async function catalogRoutes(app) {
  // Public and unauthenticated on purpose — a caller needs to see prices
  // before deciding whether to spend money calling /v1/chat/completions.
  app.get('/v1/catalog', async () => ({
    models: catalog.map((entry) => ({
      id: entry.id,
      provider: entry.provider,
      model: entry.providerModel,
      pricePerRequestUSD: entry.pricePerRequestUSD,
      currency: 'USD',
    })),
  }));
}
