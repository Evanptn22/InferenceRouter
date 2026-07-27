export const env = {
  port: Number(process.env.PORT ?? 3000),
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  routerApiKeys: process.env.ROUTER_API_KEYS ?? 'demo-key:demo',
};
