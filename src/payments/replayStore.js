// In-memory replay guard for presented X-Payment credentials. Resets on
// restart — same MVP tradeoff already made for AEP's stores
// (src/aep/service.js): briefly reopens the door to replaying a credential
// from just before a crash/restart, not acceptable for a long-running
// production deployment without a durable store, fine for now.
const MAX_ENTRIES = 10_000;

export function createInMemoryReplayStore() {
  const seen = new Map(); // presented credential string -> first-seen timestamp

  return {
    hasBeenUsed(presented) {
      return seen.has(presented);
    },
    markAsUsed(presented) {
      if (seen.size >= MAX_ENTRIES) {
        // Maps preserve insertion order — evict the oldest entry.
        seen.delete(seen.keys().next().value);
      }
      seen.set(presented, Date.now());
    },
  };
}
