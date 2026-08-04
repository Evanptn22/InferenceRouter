// Fixed business rule: whenever 'balance' (MPP) is among the advertised
// schemes, it wins — no cost comparison, no preference weighting. Only falls
// through to 'exact' (x402) when 'balance' isn't offered at all.
export function chooseScheme(accepts) {
  const schemes = new Set(accepts.map((a) => a.scheme));
  if (schemes.has('balance')) return 'balance';
  if (schemes.has('exact')) return 'exact';
  return null;
}
