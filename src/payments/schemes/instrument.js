import { PaymentError } from '../paymentError.js';

// Reserved for card/fiat rails. Registered for completeness so the scheme
// taxonomy is visible in code, but never included in an offered `accepts`
// array — not yet enabled end-to-end.
export const scheme = 'instrument';

function notEnabled() {
  throw new PaymentError('instrument rail not yet enabled end-to-end', {
    statusCode: 501,
    code: 'not_implemented',
  });
}

export function buildRequirement() {
  notEnabled();
}

export async function verifyPayment() {
  notEnabled();
}

export async function payRequirement() {
  notEnabled();
}
