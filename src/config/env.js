export const env = {
  port: Number(process.env.PORT ?? 3000),
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  groqApiKey: process.env.GROQ_API_KEY ?? '',

  // Payments (x402 + MPP) — see src/payments/.
  paymentMode: process.env.PAYMENT_MODE ?? 'mock', // gates 'exact' (x402) only — 'balance' is always real
  x402Network: process.env.X402_NETWORK ?? 'eip155:84532', // Base Sepolia testnet id, never actually dialed in mock mode
  x402PayToAddress: process.env.X402_PAY_TO_ADDRESS ?? 'mock-seller-treasury',
  mppMerchantId: process.env.MPP_MERCHANT_ID ?? 'inflow-mock-merchant',
  inflowBuyerId: process.env.INFLOW_BUYER_ID ?? 'inflow-router',
  usageQueryPriceUSD: Number(process.env.USAGE_QUERY_PRICE_USD ?? 0.0001),
  demoStartingBalanceUSD: Number(process.env.DEMO_STARTING_BALANCE_USD ?? 1.0),
};
