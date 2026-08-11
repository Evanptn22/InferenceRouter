import { env } from '../../config/env.js';
import { PaymentError } from '../paymentError.js';
import {
  createInflowFacilitator,
  createInflowSellerClient,
  inflowAccepts,
} from '@inflowpayai/x402-seller';

// x402. Real settlement means an actual on-chain transfer. PAYMENT_MODE=mock
// (default) keeps the from-scratch simulation below; PAYMENT_MODE=live calls
// the real InFlow facilitator/seller SDK and requires INFLOW_API_KEY, else it
// fails loudly (501) instead of silently pretending to have paid.
//
// Named "exact-onchain" (not "exact") because "exact" is a settlement-
// precision *scheme* value (charge the listed amount exactly, vs "upto"
// pre-authorize+settle) — a different axis from which rail moves the money.
export const rail = 'exact-onchain';

function assertLiveConfigured() {
  if (!env.inflowApiKey) {
    throw new PaymentError('INFLOW_API_KEY not set — required for PAYMENT_MODE=live', {
      statusCode: 501,
      code: 'not_implemented',
    });
  }
}

// Both factories are cheap to hold module-lifetime: createInflowSellerClient
// primes its config/getSupported caches once (60min TTL) and createInflowFacilitator
// is a plain sync constructor — no reason to rebuild either per request.
let sellerClientPromise;
function getSellerClient() {
  if (!sellerClientPromise) {
    sellerClientPromise = createInflowSellerClient({
      environment: env.inflowEnvironment,
      apiKey: env.inflowApiKey,
    });
  }
  return sellerClientPromise;
}

let facilitator;
function getFacilitator() {
  if (!facilitator) {
    facilitator = createInflowFacilitator({
      environment: env.inflowEnvironment,
      apiKey: env.inflowApiKey,
    });
  }
  return facilitator;
}

// inflowAccepts() pre-resolves PaymentOption.price to AssetAmount form
// ({asset, amount, extra?}) against the seller's real /v1/x402/config — this
// flattens that into the {scheme, network, asset, amount, payTo,
// maxTimeoutSeconds, extra} shape FacilitatorClient.verify/settle expect.
function toPaymentRequirements(option) {
  const price = option.price;
  return {
    scheme: option.scheme,
    network: option.network,
    asset: price.asset,
    amount: price.amount,
    payTo: option.payTo,
    maxTimeoutSeconds: option.maxTimeoutSeconds ?? 300,
    extra: option.extra ?? price.extra ?? {},
  };
}

function buildMockRequirement({ resourceId, priceUSD, resourcePath, mode, scheme }) {
  return {
    rail,
    mode,
    scheme,
    network: env.x402Network,
    mechanism: 'on-chain transfer (EIP-3009/Permit2 on EVM, chain-native on Solana)',
    settlementSpeed: 'variable',
    amount: priceUSD,
    currency: 'USD',
    resource: resourcePath,
    resourceId,
    expiresAt: null,
    payTo: env.x402PayToAddress,
    asset: 'USDC',
    nonce: crypto.randomUUID(),
  };
}

export async function buildRequirement({ resourceId, priceUSD, resourcePath, mode, scheme }) {
  if (env.paymentMode !== 'live') {
    return buildMockRequirement({ resourceId, priceUSD, resourcePath, mode, scheme });
  }
  assertLiveConfigured();

  const client = await getSellerClient();
  const options = await inflowAccepts(client, { price: `$${priceUSD}`, schemes: ['exact'] });
  const option = options[0];
  if (!option) {
    throw new PaymentError('InFlow seller config has no "exact"-scheme payment option configured', {
      statusCode: 502,
      code: 'not_implemented',
    });
  }
  const requirements = toPaymentRequirements(option);

  return {
    rail,
    mode,
    scheme,
    network: requirements.network,
    mechanism: 'on-chain transfer (EIP-3009/Permit2 on EVM, chain-native on Solana)',
    settlementSpeed: 'variable',
    amount: priceUSD,
    currency: 'USD',
    resource: resourcePath,
    resourceId,
    expiresAt: null,
    payTo: requirements.payTo,
    asset: requirements.asset,
    // Stashed for verifyPayment(): the exact PaymentRequirements shape
    // FacilitatorClient.verify/settle need, resolved once here rather than
    // re-derived from our own flattened fields above.
    _x402Requirements: requirements,
  };
}

export async function verifyPayment({ requirement, payload }) {
  if (env.paymentMode !== 'live') {
    // Mock mode: structural check only — no real chain call.
    if (!payload.payer || typeof payload.amount !== 'number') {
      throw new PaymentError('malformed x402 payload', { statusCode: 400, code: 'malformed_payload' });
    }
    if (payload.amount < requirement.amount) {
      throw new PaymentError('x402 payment amount below requirement', { statusCode: 402, code: 'amount_mismatch' });
    }
    return { payerId: payload.payer, receipt: { rail, mock: true, network: requirement.network } };
  }

  assertLiveConfigured();
  if (!requirement._x402Requirements) {
    throw new PaymentError('missing resolved x402 requirements — buildRequirement() must run first', {
      statusCode: 500,
      code: 'invalid_proof',
    });
  }

  // NOTE (untested without a genuine signing client): `payload` here is
  // whatever verify.js decoded from our own {rail, ...} envelope, not
  // necessarily a spec-shaped x402 PaymentPayload ({x402Version, accepted,
  // payload}). A real InFlow/x402 buyer client sends the latter. Reconciling
  // our envelope with the real wire format is tracked separately — this
  // delegates to the real facilitator as-is, which will legitimately reject
  // anything that isn't a genuine signed payload.
  const { rail: _rail, ...paymentPayload } = payload;
  const paymentRequirements = requirement._x402Requirements;

  const verifyResult = await getFacilitator().verify(paymentPayload, paymentRequirements);
  if (!verifyResult.isValid) {
    throw new PaymentError(verifyResult.invalidReason ?? 'x402 payment failed verification', {
      statusCode: 402,
      code: 'invalid_proof',
    });
  }
  const settleResult = await getFacilitator().settle(paymentPayload, paymentRequirements);
  return { payerId: paymentPayload.payer ?? paymentRequirements.payTo, receipt: { rail, settleResult } };
}

export async function payRequirement({ requirement, payerAccount }) {
  if (env.paymentMode !== 'live') {
    return { payload: { rail, payer: payerAccount }, receipt: { rail, mock: true, network: requirement.network } };
  }
  // Real on-chain buyer-side payment requires signing a payload with a real
  // wallet — no wallet/signing infra exists in this codebase. Honest stub
  // rather than a fake settle() call, same pattern as instrument.js.
  throw new PaymentError('live on-chain buyer-side signing not implemented — no wallet configured', {
    statusCode: 501,
    code: 'not_implemented',
  });
}
