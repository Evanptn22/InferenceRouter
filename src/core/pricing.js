// PricingResult is the stable contract downstream phases (x402, MPP) read
// from. Whoever attaches payment to a request only needs this object — how
// the amount was computed can change (flat fee now, token-metered later)
// without anything upstream changing.
export function chargedPrice(catalogEntry) {
  return {
    amount: catalogEntry.pricePerRequestUSD,
    currency: 'USD',
    unit: 'request',
    catalogId: catalogEntry.id,
    provider: catalogEntry.provider,
    status: 'charged',
  };
}

export function notCharged(catalogId, provider) {
  return {
    amount: 0,
    currency: 'USD',
    unit: 'request',
    catalogId,
    provider,
    status: 'not_charged',
  };
}

// InFlow's own cost to the upstream provider — distinct from chargedPrice(),
// which is what InFlow charges its callers. Same PricingResult shape so it
// flows into ledger.record() unchanged.
export function providerCost(catalogEntry) {
  return {
    amount: catalogEntry.providerCostUSD,
    currency: 'USD',
    unit: 'request',
    catalogId: catalogEntry.id,
    provider: catalogEntry.provider,
    status: 'charged',
  };
}
