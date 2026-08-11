import { getScheme } from './schemes/index.js';
import { PaymentError } from './paymentError.js';

// 'instrument' is registered in schemes/index.js but never offered — not yet
// enabled end-to-end.
const OFFERED_RAILS = ['balance', 'exact-onchain'];

// mode/scheme are a separate axis from rail (which network moves the money).
// Only 'charge'+'exact' are implemented today; 'session'/'free' and 'upto'
// are registered values for a future increment (session-based MPP spending
// limits, pre-authorize-then-settle-actual for metered pricing).
const SUPPORTED_MODES = ['charge'];
const SUPPORTED_SCHEMES = ['exact'];

// Async because live-mode 'exact-onchain' resolves a real price against
// InFlow's hosted /v1/x402/config (cached after the first call, but still a
// Promise-returning call) — mock mode and 'balance' resolve synchronously,
// but Promise.all doesn't care either way.
export async function buildAccepts({ resourceId, priceUSD, resourcePath, mode = 'charge', scheme = 'exact' }) {
  if (!SUPPORTED_MODES.includes(mode)) {
    throw new PaymentError(`payment mode "${mode}" not yet implemented`, { statusCode: 501, code: 'not_implemented' });
  }
  if (!SUPPORTED_SCHEMES.includes(scheme)) {
    throw new PaymentError(`payment scheme "${scheme}" not yet implemented`, { statusCode: 501, code: 'not_implemented' });
  }
  return Promise.all(
    OFFERED_RAILS.map((name) => getScheme(name).buildRequirement({ resourceId, priceUSD, resourcePath, mode, scheme }))
  );
}
