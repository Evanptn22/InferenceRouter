import { getScheme } from './schemes/index.js';
import { PaymentError } from './paymentError.js';

function decode(presented) {
  try {
    return JSON.parse(Buffer.from(presented, 'base64url').toString('utf8'));
  } catch {
    throw new PaymentError('malformed X-Payment header', { statusCode: 400, code: 'malformed_payload' });
  }
}

export async function verifyPresentedPayment({ presented, accepts }) {
  const payload = decode(presented);
  const requirement = accepts.find((a) => a.rail === payload.rail);
  if (!requirement) {
    throw new PaymentError(`unsupported payment rail "${payload.rail}"`, {
      statusCode: 402,
      code: 'unsupported_scheme',
    });
  }
  const { payerId, receipt } = await getScheme(payload.rail).verifyPayment({ requirement, payload });
  return { rail: payload.rail, payerId, receipt };
}
