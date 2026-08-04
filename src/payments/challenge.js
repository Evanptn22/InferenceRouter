import { getScheme } from './schemes/index.js';

// 'instrument' is registered in schemes/index.js but never offered — not yet
// enabled end-to-end.
const OFFERED_SCHEMES = ['balance', 'exact'];

export function buildAccepts({ resourceId, priceUSD, resourcePath }) {
  return OFFERED_SCHEMES.map((name) =>
    getScheme(name).buildRequirement({ resourceId, priceUSD, resourcePath })
  );
}
