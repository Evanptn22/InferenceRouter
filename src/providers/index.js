import * as groq from './groq.js';
import * as cerebras from './Cerebras.js';
import * as gemini from './Gemini.js';
import * as anthropic from './anthropic.js';

export { ProviderError } from './providerError.js';

const adapters = { groq, cerebras, gemini, anthropic };

export function getAdapter(providerName) {
  const adapter = adapters[providerName];
  if (!adapter) {
    throw new Error(`no adapter registered for provider "${providerName}"`);
  }
  return adapter;
}
