import { env } from '../../config/env.js';
import { PaymentError } from '../paymentError.js';
import { debit } from '../../core/balances.js';
import { Mppx } from 'mppx/server';
import { inflow } from '@inflowpayai/mpp-seller';

// MPP. Seller side (buildRequirement/verifyPayment) is wired to the real
// InFlow SDK in PAYMENT_MODE=live. Buyer side (payRequirement, used by
// router.js's payUpstream) intentionally stays on the internal-ledger debit
// regardless of PAYMENT_MODE — real buyer-side signing needs the
// authenticated `inflow` CLI, a separate not-yet-built piece of work. Since
// the hard rule always resolves payUpstream to this rail, making
// payRequirement live-only-and-unimplemented here (the way exact.js does)
// would break every live-mode request, not just an untested edge case.
export const rail = 'balance';

// Logs a curated, known-safe subset of an unexpected SDK error server-side
// so it stays diagnosable — never the full error object, which could carry
// unexpected fields (e.g. request headers) depending on what the third-party
// SDK chose to attach. The client only ever gets the generic PaymentError
// message, never this.
function logSanitized(context, err) {
  console.error(`[payments/balance] ${context}:`, {
    name: err?.name,
    message: err?.message,
    httpStatus: err?.httpStatus,
    code: err?.code,
  });
}

function assertLiveConfigured() {
  if (!env.inflowApiKey) {
    throw new PaymentError('INFLOW_API_KEY not set — required for PAYMENT_MODE=live', {
      statusCode: 501,
      code: 'not_implemented',
    });
  }
  if (!env.mppSecretKey) {
    throw new PaymentError('MPP_SECRET_KEY not set — required for PAYMENT_MODE=live', {
      statusCode: 501,
      code: 'not_implemented',
    });
  }
}

// Mppx.create() is cheap to hold module-lifetime — it just registers the
// method + HMAC secret, no network call until challenge/verify are invoked.
let mppx;
function getMppx() {
  if (!mppx) {
    mppx = Mppx.create({
      methods: [inflow({ apiKey: env.inflowApiKey, environment: env.inflowEnvironment })],
      secretKey: env.mppSecretKey,
    });
  }
  return mppx;
}

function buildMockRequirement({ resourceId, priceUSD, resourcePath, mode, scheme }) {
  return {
    rail,
    mode,
    scheme,
    network: 'inflow:1',
    mechanism: 'InFlow-internal ledger transfer',
    settlementSpeed: 'instant',
    amount: priceUSD,
    currency: 'USD',
    resource: resourcePath,
    resourceId,
    expiresAt: null,
    merchantId: env.mppMerchantId,
  };
}

export async function buildRequirement({ resourceId, priceUSD, resourcePath, mode, scheme }) {
  if (env.paymentMode !== 'live') {
    return buildMockRequirement({ resourceId, priceUSD, resourcePath, mode, scheme });
  }
  assertLiveConfigured();

  // mppx.challenge.<method>.<intent>(...) mints a standalone, HMAC-bound
  // Challenge object without needing an HTTP request — this is what lets
  // 'balance' fit our buildRequirement/verifyPayment split instead of
  // needing mppx's atomic charge()-against-a-raw-request lifecycle.
  //
  // Wrapped for the same reason as verifyPayment() below: an unexpected
  // error here (auth rejected, network failure, InFlow outage) must not
  // escape raw — it happens during 402 challenge-building, before any
  // payment is even presented, so there's no PaymentError-aware caller yet
  // to catch an unwrapped SDK exception.
  let challenge;
  try {
    challenge = await getMppx().challenge.inflow.charge({
      amount: String(priceUSD),
      currency: 'USDC',
      scope: resourceId,
    });
  } catch (err) {
    logSanitized('buildRequirement', err);
    throw new PaymentError('failed to build MPP payment challenge', { statusCode: 502, code: 'not_implemented' });
  }

  return {
    rail,
    mode,
    scheme,
    network: 'inflow:1',
    mechanism: 'InFlow-internal ledger transfer',
    settlementSpeed: 'instant',
    amount: priceUSD,
    currency: 'USD',
    resource: resourcePath,
    resourceId,
    expiresAt: challenge.expires ?? null,
    merchantId: env.mppMerchantId,
    // Stashed for verifyPayment(): the minted Challenge object a submitted
    // credential must be checked against.
    _mppChallenge: challenge,
  };
}

export async function verifyPayment({ requirement, payload }) {
  if (env.paymentMode !== 'live') {
    debit(payload.payerId, requirement.amount, `pay:${requirement.resourceId}`);
    return { payerId: payload.payerId, receipt: { rail, debited: requirement.amount } };
  }

  assertLiveConfigured();
  if (!requirement._mppChallenge) {
    throw new PaymentError('missing minted MPP challenge — buildRequirement() must run first', {
      statusCode: 500,
      code: 'invalid_proof',
    });
  }

  // NOTE (untested without a genuine InFlow buyer client): real MPP
  // credentials travel in an Authorization header
  // (`Payment id="...", realm="...", method="inflow", ...`), decoded via
  // mppx's own Credential.deserialize — not our custom {rail, ...} X-Payment
  // envelope. `payload` here is whatever verify.js decoded from our envelope,
  // so this assumes the caller nested a real credential payload/source under
  // it. Reconciling the wire format (same open item as exact.js's x402 side)
  // is tracked separately.
  const credential = {
    challenge: requirement._mppChallenge,
    payload: payload.credentialPayload ?? payload,
    source: payload.source,
  };

  // Wrapped for the same reason as exact.js: an unexpected error from
  // broadcastCredential() must never escape raw — errorHandler.js's
  // catch-all would echo error.message straight to the client/logs with no
  // guarantee it's free of anything sensitive.
  let receipt;
  try {
    receipt = await getMppx().broadcastCredential(credential, { scope: requirement.resourceId });
  } catch (err) {
    logSanitized('verifyPayment', err);
    throw new PaymentError('MPP credential verification failed', { statusCode: 502, code: 'invalid_proof' });
  }
  return { payerId: payload.payerId ?? payload.source ?? 'unknown-payer', receipt: { rail, mppReceipt: receipt } };
}

export async function payRequirement({ requirement, payerAccount }) {
  debit(payerAccount, requirement.amount, `upstream:${requirement.resourceId}`);
  return { payload: { rail, payerId: payerAccount }, receipt: { rail, debited: requirement.amount } };
}
