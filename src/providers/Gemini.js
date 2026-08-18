import { ProviderError } from './providerError.js';

// Gemini's generateContent API doesn't take OpenAI-style {role, content}
// messages directly: system prompts are a separate top-level field, and the
// assistant role is called "model" instead of "assistant".
function toContents(messages) {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

function toSystemInstruction(messages) {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  return system ? { parts: [{ text: system }] } : undefined;
}

export async function invoke({ apiKey, model, messages, signal }) {
  if (!apiKey) {
    throw new ProviderError('missing GEMINI_API_KEY', { status: 401, retryable: false });
  }

  const systemInstruction = toSystemInstruction(messages);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      signal,
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        contents: toContents(messages),
        ...(systemInstruction ? { systemInstruction } : {}),
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ProviderError(`gemini ${res.status}: ${body.slice(0, 200)}`, {
      status: res.status,
      retryable: res.status >= 500,
    });
  }

  const raw = await res.json();
  const content = raw.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { content, raw };
}
