import { ProviderError } from './providerError.js';

export async function invoke({ apiKey, model, messages, signal }) {
  if (!apiKey) {
    throw new ProviderError('missing OPENAI_API_KEY', { status: 401, retryable: false });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
    throw new ProviderError(`openai ${res.status}: ${body.slice(0, 200)}`, {
      status: res.status,
      retryable: res.status >= 500,
    });
  }

  const raw = await res.json();
  return { content: raw.choices?.[0]?.message?.content ?? '', raw };
}
