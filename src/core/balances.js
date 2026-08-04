import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { PaymentError } from '../payments/paymentError.js';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const balancesPath = path.join(dataDir, 'balances.jsonl');

const deltas = [];

// Rebuild in-memory state from the append-only file so balances survive a
// restart without needing a real database — same pattern as core/ledger.js.
function replay() {
  if (!existsSync(balancesPath)) return;
  const lines = readFileSync(balancesPath, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      deltas.push(JSON.parse(line));
    } catch {
      // Skip a truncated/corrupt trailing line rather than failing startup.
    }
  }
}

mkdirSync(dataDir, { recursive: true });
replay();

// Every payer id implicitly starts at env.demoStartingBalanceUSD (auto-seed —
// there's no real onramp in this demo, same convenience role demo-key:demo
// used to play).
function currentBalance(payerId) {
  return deltas
    .filter((d) => d.payerId === payerId)
    .reduce((sum, d) => sum + d.delta, env.demoStartingBalanceUSD);
}

function recordDelta({ payerId, delta, reason }) {
  const entry = { payerId, delta, reason, timestamp: new Date().toISOString() };
  deltas.push(entry);
  appendFileSync(balancesPath, JSON.stringify(entry) + '\n');
  return entry;
}

export function getBalance(payerId) {
  return currentBalance(payerId);
}

export function credit(payerId, amount, reason) {
  return recordDelta({ payerId, delta: amount, reason });
}

export function debit(payerId, amount, reason) {
  if (currentBalance(payerId) < amount) {
    throw new PaymentError(`insufficient balance for "${payerId}"`, {
      statusCode: 402,
      code: 'insufficient_balance',
    });
  }
  return recordDelta({ payerId, delta: -amount, reason });
}
