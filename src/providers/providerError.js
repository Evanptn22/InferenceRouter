export class ProviderError extends Error {
  constructor(message, { status, retryable }) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    // Timeouts, network failures, and 5xx are worth a retry/fallback.
    // 4xx means the request itself was bad — retrying won't help.
    this.retryable = retryable;
  }
}
