// Fixed business rule: whenever 'balance' (MPP) is among the advertised
// rails, it wins — no cost comparison, no preference weighting. Only falls
// through to 'exact-onchain' (x402) when 'balance' isn't offered at all.
export function chooseRail(accepts) {
  const rails = new Set(accepts.map((a) => a.rail));
  if (rails.has('balance')) return 'balance';
  if (rails.has('exact-onchain')) return 'exact-onchain';
  return null;
}
