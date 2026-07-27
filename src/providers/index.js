import * as openai from './openai.js';
import * as anthropic from './anthropic.js';
import * as groq from './groq.js';

export { ProviderError } from './providerError.js';

const adapters = { openai, anthropic, groq };

export function getAdapter(providerName) {
  const adapter = adapters[providerName];
  if (!adapter) {
    throw new Error(`no adapter registered for provider "${providerName}"`);
  }
  return adapter;
}
