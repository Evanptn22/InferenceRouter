import { getFallbackChain } from '../config/catalog.js';
import { getAdapter, ProviderError } from '../providers/index.js';
import { canAttempt, recordSuccess, recordFailure } from './circuitBreaker.js';
import { chargedPrice, notCharged } from './pricing.js';
import * as ledger from './ledger.js';

const TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 2; // 1 initial call + 1 retry, retryable errors only

function normalizeError(err) {
  if (err instanceof ProviderError) return err;
  if (err.name === 'AbortError') {
    return new ProviderError('upstream timed out', { status: 504, retryable: true });
  }
  return new ProviderError(err.message ?? 'unknown provider error', { status: 502, retryable: true });
}

async function callProvider(entry, messages) {
  const adapter = getAdapter(entry.provider);
  let lastError;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const start = Date.now();
    try {
      const { content } = await adapter.invoke({
        apiKey: entry.apiKey,
        model: entry.providerModel,
        messages,
        signal: controller.signal,
      });
      return { content, latencyMs: Date.now() - start };
    } catch (err) {
      lastError = normalizeError(err);
      if (!lastError.retryable) break;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

// Walks the catalog entry's fallback chain, tries each candidate whose
// breaker allows it, and meters exactly once — on whichever branch actually
// produces the response returned to the caller.
export async function route({ catalogId, messages, consumerId }) {
  const chain = getFallbackChain(catalogId);
  if (chain.length === 0) {
    throw new Error(`unknown catalog id "${catalogId}"`);
  }

  let lastError;
  for (const entry of chain) {
    if (!canAttempt(entry.id)) {
      lastError = new Error(`circuit open for "${entry.id}"`);
      continue;
    }
    try {
      const { content, latencyMs } = await callProvider(entry, messages);
      recordSuccess(entry.id);
      const pricing = chargedPrice(entry);
      ledger.record({ consumerId, pricing, status: 'ok', latencyMs });
      return { content, pricing, latencyMs };
    } catch (err) {
      recordFailure(entry.id);
      lastError = err;
    }
  }

  const primary = chain[0];
  ledger.record({
    consumerId,
    pricing: notCharged(primary.id, primary.provider),
    status: 'error',
    latencyMs: 0,
  });
  const error = new Error(
    `all providers in the fallback chain for "${catalogId}" failed: ${lastError?.message}`
  );
  error.cause = lastError;
  throw error;
}
