import { env } from '../../config/env.js';
import { debit } from '../../core/balances.js';

// MPP. Real, unmocked: a "balance" payment IS an internal ledger debit — no
// external network to fake, so unlike "exact-onchain" this never runs in mock mode.
export const rail = 'balance';

export function buildRequirement({ resourceId, priceUSD, resourcePath, mode, scheme }) {
  return {
    rail,
    mode, // 'charge' | 'session' | 'free' — only 'charge' is implemented today
    scheme, // 'exact' | 'upto' — only 'exact' is implemented today
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

export async function verifyPayment({ requirement, payload }) {
  debit(payload.payerId, requirement.amount, `pay:${requirement.resourceId}`);
  return { payerId: payload.payerId, receipt: { rail, debited: requirement.amount } };
}

export async function payRequirement({ requirement, payerAccount }) {
  debit(payerAccount, requirement.amount, `upstream:${requirement.resourceId}`);
  return { payload: { rail, payerId: payerAccount }, receipt: { rail, debited: requirement.amount } };
}
