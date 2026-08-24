import { createStaticCatalog } from '@offering-protocol/service';
import { catalog } from '../config/catalog.js';

// Read-only projection of the existing model catalog into ODP offerings —
// src/config/catalog.js stays the single source of truth for pricing (the
// same data /v1/catalog already serves).
export const odpCatalog = createStaticCatalog({
  offerings: catalog.map((entry) => ({
    odp_version: '1.0',
    id: entry.id,
    name: entry.id,
    description: `${entry.provider} ${entry.providerModel}`,
    price: {
      type: 'fixed',
      amount: String(entry.pricePerRequestUSD),
      currency: 'USD',
    },
    // Points agents at the existing x402/MPP-protected purchase endpoint —
    // no AEP enrollment required to use it (see src/plugins/requirePayment.js).
    actions: [
      {
        id: 'purchase',
        rel: 'purchase',
        authentication: 'not-required',
        http: {
          href: '/v1/chat/completions',
          method: 'POST',
          request: { content_type: 'application/json' },
          response_content_types: ['application/json'],
        },
      },
    ],
  })),
});
