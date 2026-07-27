const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 10_000;

const CLOSED = 'CLOSED';
const OPEN = 'OPEN';
const HALF_OPEN = 'HALF_OPEN';

// One breaker per catalog entry, keyed by catalog id.
const breakers = new Map();

function getOrCreate(id) {
  let breaker = breakers.get(id);
  if (!breaker) {
    breaker = { state: CLOSED, failureCount: 0, openedAt: 0 };
    breakers.set(id, breaker);
  }
  return breaker;
}

// Moves an OPEN breaker into HALF_OPEN once its cooldown has elapsed, so the
// caller can decide whether to let a single trial request through.
function settle(breaker) {
  if (breaker.state === OPEN && Date.now() - breaker.openedAt >= COOLDOWN_MS) {
    breaker.state = HALF_OPEN;
  }
}

export function canAttempt(id) {
  const breaker = getOrCreate(id);
  settle(breaker);
  return breaker.state !== OPEN;
}

export function recordSuccess(id) {
  const breaker = getOrCreate(id);
  breaker.state = CLOSED;
  breaker.failureCount = 0;
}

export function recordFailure(id) {
  const breaker = getOrCreate(id);
  if (breaker.state === HALF_OPEN) {
    breaker.state = OPEN;
    breaker.openedAt = Date.now();
    return;
  }
  breaker.failureCount += 1;
  if (breaker.failureCount >= FAILURE_THRESHOLD) {
    breaker.state = OPEN;
    breaker.openedAt = Date.now();
  }
}

export function getBreakerStates() {
  const out = {};
  for (const [id, breaker] of breakers) {
    settle(breaker);
    out[id] = breaker.state;
  }
  return out;
}
