import { env } from './env.js';

// The MVP catalog: one model per provider, a flat price per request, and a
// fallback chain used when the primary entry's circuit breaker is open or
// its call fails. Ordered cheapest/fastest -> most expensive/reliable.
export const catalog = [
  {
    id: 'fast-cheap',
    provider: 'groq',
    providerModel: 'llama-3.1-8b-instant',
    apiKey: env.groqApiKey,
    pricePerRequestUSD: 0.0005,
    fallback: 'balanced',
  },
  {
    id: 'balanced',
    provider: 'openai',
    providerModel: 'gpt-4o-mini',
    apiKey: env.openaiApiKey,
    pricePerRequestUSD: 0.002,
    fallback: 'quality',
  },
  {
    id: 'quality',
    provider: 'anthropic',
    providerModel: 'claude-3-5-haiku-20241022',
    apiKey: env.anthropicApiKey,
    pricePerRequestUSD: 0.004,
    fallback: null,
  },
];

const byId = new Map(catalog.map((entry) => [entry.id, entry]));

export function getCatalogEntry(id) {
  return byId.get(id);
}

// Walks an entry's fallback chain, primary first.
export function getFallbackChain(id) {
  const chain = [];
  let current = byId.get(id);
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    chain.push(current);
    seen.add(current.id);
    current = current.fallback ? byId.get(current.fallback) : undefined;
  }
  return chain;
}
