import { env } from '../../config/env.js';
import { PaymentError } from '../paymentError.js';

// x402. Real settlement means an actual on-chain transfer, so this is
// mock-by-default: PAYMENT_MODE=live fails loudly (501) instead of silently
// pretending to have paid. Named "exact-onchain" (not "exact") because
// "exact" is a settlement-precision *scheme* value (charge the listed amount
// exactly, vs "upto" pre-authorize+settle) — a different axis from which
// rail moves the money.
export const rail = 'exact-onchain';

export function buildRequirement({ resourceId, priceUSD, resourcePath, mode, scheme }) {
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

function assertMock() {
  if (env.paymentMode === 'live') {
    throw new PaymentError('live x402 facilitator not configured', {
      statusCode: 501,
      code: 'not_implemented',
    });
  }
}

export async function verifyPayment({ requirement, payload }) {
  assertMock();
  // Mock mode: structural check only — no real chain call.
  if (!payload.payer || typeof payload.amount !== 'number') {
    throw new PaymentError('malformed x402 payload', { statusCode: 400, code: 'malformed_payload' });
  }
  if (payload.amount < requirement.amount) {
    throw new PaymentError('x402 payment amount below requirement', { statusCode: 402, code: 'amount_mismatch' });
  }
  return { payerId: payload.payer, receipt: { rail, mock: true, network: requirement.network } };
}

export async function payRequirement({ requirement, payerAccount }) {
  assertMock();
  return { payload: { rail, payer: payerAccount }, receipt: { rail, mock: true, network: requirement.network } };
}
