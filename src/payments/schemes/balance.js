import { env } from '../../config/env.js';
import { debit } from '../../core/balances.js';

// MPP. Real, unmocked: a "balance" payment IS an internal ledger debit — no
// external network to fake, so unlike "exact" this never runs in mock mode.
export const scheme = 'balance';

export function buildRequirement({ resourceId, priceUSD, resourcePath }) {
  return {
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

export async function verifyPayment({ requirement, payload }) {
  debit(payload.payerId, requirement.amount, `pay:${requirement.resourceId}`);
  return { payerId: payload.payerId, receipt: { scheme, debited: requirement.amount } };
}

export async function payRequirement({ requirement, payerAccount }) {
  debit(payerAccount, requirement.amount, `upstream:${requirement.resourceId}`);
  return { payload: { scheme, payerId: payerAccount }, receipt: { scheme, debited: requirement.amount } };
}
