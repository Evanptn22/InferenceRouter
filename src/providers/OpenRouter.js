import { ProviderError } from './providerError.js';

// OpenRouter exposes an OpenAI-compatible chat-completions endpoint that
// proxies to many upstream model providers.
export async function invoke({ apiKey, model, messages, signal }) {
  if (!apiKey) {
    throw new ProviderError('missing OPENROUTER_API_KEY', { status: 401, retryable: false });
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ProviderError(`openrouter ${res.status}: ${body.slice(0, 200)}`, {
      status: res.status,
      retryable: res.status >= 500,
    });
  }

  const raw = await res.json();
  return { content: raw.choices?.[0]?.message?.content ?? '', raw };
}
