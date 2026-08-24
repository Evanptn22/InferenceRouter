export const env = {
  port: Number(process.env.PORT ?? 3000),
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  cerebrasApiKey: process.env.CEREBRAS_API_KEY ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',

  // Payments (x402 + MPP) — see src/payments/.
  // paymentMode gates BOTH real InFlow SDK rails now: 'mock' keeps the
  // from-scratch simulation running (no credentials needed); 'live' calls the
  // real @inflowpayai/x402-seller + @inflowpayai/mpp-seller SDKs and requires
  // inflowApiKey (+ mppSecretKey for balance) to be set, else it fails loudly.
  paymentMode: process.env.PAYMENT_MODE ?? 'mock',
  inflowApiKey: process.env.INFLOW_API_KEY ?? '',
  inflowEnvironment: process.env.INFLOW_ENVIRONMENT ?? 'sandbox', // 'sandbox' | 'production'
  mppSecretKey: process.env.MPP_SECRET_KEY ?? '', // 32+ bytes, HMAC-binds MPP challenges — openssl rand -base64 32
  x402Network: process.env.X402_NETWORK ?? 'eip155:84532', // used only in mock mode; real mode resolves network from InFlow's own config
  x402PayToAddress: process.env.X402_PAY_TO_ADDRESS ?? 'mock-seller-treasury', // mock mode only
  mppMerchantId: process.env.MPP_MERCHANT_ID ?? 'inflow-mock-merchant', // mock mode only
  inflowBuyerId: process.env.INFLOW_BUYER_ID ?? 'inflow-router',
  usageQueryPriceUSD: Number(process.env.USAGE_QUERY_PRICE_USD ?? 0.0001),
  demoStartingBalanceUSD: Number(process.env.DEMO_STARTING_BALANCE_USD ?? 1.0),

  // AEP (Agent Enrollment Protocol) — see src/aep/. Must be a did:web
  // identifier for the domain this service is actually deployed on;
  // the placeholder below only works for local testing.
  aepServiceDid: process.env.AEP_SERVICE_DID ?? 'did:web:localhost%3A3000',
};
