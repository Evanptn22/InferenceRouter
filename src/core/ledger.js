import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const ledgerPath = path.join(dataDir, 'ledger.jsonl');

const records = [];

// Rebuild in-memory state from the append-only file so usage survives a
// restart without needing a real database.
function replay() {
  if (!existsSync(ledgerPath)) return;
  const lines = readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {
      // Skip a truncated/corrupt trailing line rather than failing startup.
    }
  }
}

mkdirSync(dataDir, { recursive: true });
replay();

export function record({ consumerId, pricing, status, latencyMs }) {
  const entry = {
    id: crypto.randomUUID(),
    consumerId,
    catalogId: pricing.catalogId,
    provider: pricing.provider,
    amount: pricing.amount,
    currency: pricing.currency,
    unit: pricing.unit,
    status,
    latencyMs,
    timestamp: new Date().toISOString(),
  };
  records.push(entry);
  appendFileSync(ledgerPath, JSON.stringify(entry) + '\n');
  return entry;
}

export function query(consumerId) {
  const entries = records.filter((r) => r.consumerId === consumerId);
  const totalSpentUSD = entries
    .filter((r) => r.status === 'ok')
    .reduce((sum, r) => sum + r.amount, 0);
  return { entries, totalSpentUSD };
}
