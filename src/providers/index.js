import * as groq from './groq.js';
import * as cerebras from './Cerebras.js';
import * as gemini from './Gemini.js';
import * as openrouter from './OpenRouter.js';

export { ProviderError } from './providerError.js';

const adapters = { groq, cerebras, gemini, openrouter };

export function getAdapter(providerName) {
  const adapter = adapters[providerName];
  if (!adapter) {
    throw new Error(`no adapter registered for provider "${providerName}"`);
  }
  return adapter;
}
