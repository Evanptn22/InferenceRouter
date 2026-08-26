// Demonstrates all three MPP pay outcomes against InFlow's real sandbox,
// using the buyer-side @inflowpayai/mpp SDK directly with the sandbox
// INFLOW_API_KEY already configured for the seller in .env:
//   1. no-payment-required — an unprotected resource, sanity-checks the integration is live
//   2. paid               — a full real settlement
//   3. replay-rejected     — reusing the same credential a second time
//
// Run from the project root: node --env-file=.env _settlement-demo.mjs
// Requires InferenceRouter's own server already running on localhost:3000.
// Throwaway diagnostic script — not part of the app.
import { MppClient, parseChallengeHeaders } from '@inflowpayai/mpp';
import { Mppx } from 'mppx/server';
import { inflow } from '@inflowpayai/mpp-seller';

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3000';
const INFLOW_API_KEY = process.env.INFLOW_API_KEY;
const INFLOW_ENVIRONMENT = process.env.INFLOW_ENVIRONMENT ?? 'sandbox';
const MPP_SECRET_KEY = process.env.MPP_SECRET_KEY;

if (!INFLOW_API_KEY || !MPP_SECRET_KEY) {
  throw new Error("INFLOW_API_KEY and MPP_SECRET_KEY must be set — run with the project's .env");
}

// --- TEST 1: no-payment-required ---------------------------------------
console.log('=== TEST 1: no-payment-required ===');
const catalogRes = await fetch(`${SERVER_URL}/v1/catalog`);
console.log(`    GET /v1/catalog -> ${catalogRes.status} (expect 200, unprotected resource)`);
if (catalogRes.status !== 200) {
  console.warn('    WARNING: expected 200 for an unprotected resource');
}

// --- TEST 2: paid --------------------------------------------------------
console.log('\n=== TEST 2: paid ===');
console.log('--> probing seller for a challenge...');
const probeRes = await fetch(`${SERVER_URL}/v1/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'fast-cheap', messages: [{ role: 'user', content: 'hello' }] }),
});
if (probeRes.status !== 402) {
  throw new Error(`expected 402, got ${probeRes.status}: ${await probeRes.text()}`);
}
const authHeader = probeRes.headers.get('www-authenticate');
if (!authHeader) throw new Error('no WWW-Authenticate header on 402 response');
console.log('    challenge header:', authHeader);

const [mppChallenge] = parseChallengeHeaders(authHeader);
const buyer = new MppClient({ apiKey: INFLOW_API_KEY, environment: INFLOW_ENVIRONMENT });

console.log('--> asking InFlow to create the buyer-side transaction...');
let tx = await buyer.createTransaction({ challenge: mppChallenge, options: {} });
console.log('    state:', tx.state);

while (tx.state === 'pending') {
  const waitSeconds = tx.retryAfterSeconds ?? 3;
  console.log(`    pending, retrying in ${waitSeconds}s...`, tx.methodSpecific ?? '');
  await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  tx = await buyer.getTransaction(tx.transactionId);
  console.log('    state:', tx.state);
}

if (tx.state !== 'ready' || !tx.credential) {
  console.error('transaction did not settle:', tx.problem ?? tx);
  process.exit(1);
}
console.log('--> got a real InFlow-issued credential.');

const mppx = Mppx.create({
  methods: [inflow({ apiKey: INFLOW_API_KEY, environment: INFLOW_ENVIRONMENT })],
  secretKey: MPP_SECRET_KEY,
});

console.log('--> broadcasting credential to settle...');
const receipt = await mppx.broadcastCredential(tx.credential, { scope: 'fast-cheap' });
console.log('PAID:', receipt);

// --- TEST 3: replay-rejected ---------------------------------------------
console.log('\n=== TEST 3: replay-rejected ===');
console.log('--> re-broadcasting the SAME credential a second time (should fail)...');
try {
  const replay = await mppx.broadcastCredential(tx.credential, { scope: 'fast-cheap' });
  console.warn('UNEXPECTED: replay was accepted:', replay);
} catch (err) {
  console.log('replay correctly rejected:', err?.message ?? err);
}

console.log('\nAll three outcomes exercised.');
