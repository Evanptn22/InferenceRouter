import { getFallbackChain } from '../config/catalog.js';
import { getAdapter, ProviderError } from '../providers/index.js';
import { canAttempt, recordSuccess, recordFailure } from './circuitBreaker.js';
import { chargedPrice, notCharged, providerCost } from './pricing.js';
import * as ledger from './ledger.js';
import { env } from '../config/env.js';
import { buildAccepts } from '../payments/challenge.js';
import { chooseRail } from '../payments/chooseRail.js';
import { getScheme } from '../payments/schemes/index.js';

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

// InFlow-as-buyer: synthesizes (does not fetch) an upstream 402 challenge
// priced off entry.providerCostUSD, reusing the same buildAccepts() the
// seller side uses, and pays it per the hard rule (chooseRail always
// resolves to 'balance' since both rails are always offered here). Real
// OpenAI/Anthropic/Groq don't speak x402/MPP today — this models what paying
// them via agentic payments would look like.
async function payUpstream(entry) {
  const accepts = await buildAccepts({
    resourceId: entry.id,
    priceUSD: entry.providerCostUSD,
    resourcePath: `upstream:${entry.provider}`,
  });
  const chosenRail = chooseRail(accepts);
  const requirement = accepts.find((a) => a.rail === chosenRail);
  const { receipt } = await getScheme(chosenRail).payRequirement({
    requirement,
    payerAccount: env.inflowBuyerId,
  });
  return { rail: chosenRail, receipt };
}

// Walks the catalog entry's fallback chain, tries each candidate whose
// breaker allows it, and meters exactly once — on whichever branch actually
// produces the response returned to the caller.
export async function route({ catalogId, messages, payerId, callerRail }) {
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
      const upstreamPayment = await payUpstream(entry);
      const { content, latencyMs } = await callProvider(entry, messages);
      recordSuccess(entry.id);
      const pricing = chargedPrice(entry);
      ledger.record({ payerId, pricing, status: 'ok', latencyMs, direction: 'inbound', rail: callerRail });
      ledger.record({
        payerId: env.inflowBuyerId,
        pricing: providerCost(entry),
        status: 'ok',
        latencyMs,
        direction: 'outbound',
        rail: upstreamPayment.rail,
      });
      return { content, pricing, latencyMs, upstreamRail: upstreamPayment.rail };
    } catch (err) {
      recordFailure(entry.id);
      lastError = err;
    }
  }

  const primary = chain[0];
  ledger.record({
    payerId,
    pricing: notCharged(primary.id, primary.provider),
    status: 'error',
    latencyMs: 0,
    direction: 'inbound',
    rail: callerRail,
  });
  const error = new Error(
    `all providers in the fallback chain for "${catalogId}" failed: ${lastError?.message}`
  );
  error.cause = lastError;
  throw error;
}
