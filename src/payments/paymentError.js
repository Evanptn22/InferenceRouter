export class PaymentError extends Error {
  constructor(message, { status = 402, statusCode = status, retryable = false, code } = {}) {
    super(message);
    this.name = 'PaymentError';
    this.status = status;
    // errorHandler.js reads .statusCode; ProviderError only ever set .status, a
    // latent mismatch that never mattered because chat.js catches provider
    // errors locally. Set both so this works regardless of which is read.
    this.statusCode = statusCode;
    // Lets router.js's fallback loop treat a failed pay-step like a ProviderError.
    this.retryable = retryable;
    this.code = code;
  }
}
