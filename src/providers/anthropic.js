import { ProviderError } from './providerError.js';

const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 1024;

// Anthropic's Messages API wants system prompts pulled out of the messages
// array and passed as a top-level field.
function splitSystem(messages) {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');
  return { system, rest };
}

export async function invoke({ apiKey, model, messages, signal }) {
  if (!apiKey) {
    throw new ProviderError('missing ANTHROPIC_API_KEY', { status: 401, retryable: false });
  }

  const { system, rest } = splitSystem(messages);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      ...(system ? { system } : {}),
      messages: rest,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ProviderError(`anthropic ${res.status}: ${body.slice(0, 200)}`, {
      status: res.status,
      retryable: res.status >= 500,
    });
  }

  const raw = await res.json();
  const content = raw.content?.[0]?.type === 'text' ? raw.content[0].text : '';
  return { content, raw };
}
