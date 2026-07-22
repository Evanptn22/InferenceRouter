# Inference Router

MVP inference router built on Fastify + Node 22. Routes a normalized chat-completion
request across a 3-entry provider catalog (Groq, OpenAI, Anthropic), meters every
call at a flat per-request price, and stays up through provider failures via
timeouts, retries, a circuit breaker, and a fallback chain.

Full architecture writeup: see the design doc shared alongside this repo.

## Setup

Requires Node.js 22+.

```bash
npm install
cp .env.example .env
# fill in the provider keys you want to actually exercise
npm run dev
```

## Try it

```bash
# list the catalog with live prices
curl http://localhost:3000/v1/catalog

# routed, metered inference call
curl http://localhost:3000/v1/chat/completions \
  -H "x-api-key: demo-key" \
  -H "content-type: application/json" \
  -d '{"model": "fast-cheap", "messages": [{"role": "user", "content": "say hi in 5 words"}]}'

# usage ledger for the demo consumer
curl http://localhost:3000/v1/usage -H "x-api-key: demo-key"

# liveness / readiness
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
```

If a provider's key is missing or it errors out, the router automatically falls
back to the next catalog entry (`fast-cheap` → `balanced` → `quality`) rather
than failing the request outright — try it by leaving `GROQ_API_KEY` blank.

## Layout

```
src/
  server.js            listen + graceful shutdown + crash safety net
  app.js               builds the Fastify instance, registers plugins/routes
  config/              env, catalog (pricing lives here), demo consumers
  plugins/              auth, global error handler
  providers/             raw-fetch adapters for openai/anthropic/groq
  core/                  router, circuit breaker, pricing, ledger
  routes/                chat, catalog, usage, health
data/
  ledger.jsonl           append-only usage log (created at runtime)
```

## Notes

- Pricing is flat-per-request for the MVP (`PricingResult` in `src/core/pricing.js`).
  This is the object Phase 3 (x402 / MPP) will read a price from — nothing
  upstream of it should need to change when that lands.
- The ledger is in-memory plus an append-only JSONL file (`data/ledger.jsonl`),
  replayed on startup so usage survives a restart. No database dependency.
- This was scaffolded in an environment without Node.js installed, so
  `npm install` / `npm run dev` have not been executed here — run them locally
  to verify before demoing.
# InferenceRouter
