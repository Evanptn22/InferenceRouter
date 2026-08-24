import crypto from 'node:crypto';
import {
  createAepService,
  createDidWebClientAssertionVerifier,
  createInMemoryClientAssertionReplayStore,
  createInMemoryCommandIdempotencyStore,
  createInMemoryEnrollmentStore,
  createInMemoryServiceCredentialStore,
  createStaticEnrollmentPolicy,
  didWebIdentityMethod,
  storedApiKeyGrantType,
} from '@aep-foundation/service';
import { env } from '../config/env.js';

// In-memory stores — enrollments/credentials reset on restart, same MVP
// tradeoff the payment rails already make in mock mode. Swapping in durable
// stores later is drop-in since these satisfy the same store interfaces.
const credentialStore = createInMemoryServiceCredentialStore();

export const aepService = createAepService({
  serviceDid: env.aepServiceDid,
  identityMethods: [didWebIdentityMethod()],
  clientAssertionVerifier: createDidWebClientAssertionVerifier(),
  enrollmentStore: createInMemoryEnrollmentStore(),
  commandIdempotencyStore: createInMemoryCommandIdempotencyStore(),
  replayStore: createInMemoryClientAssertionReplayStore(),
  enrollmentPolicy: createStaticEnrollmentPolicy({ status: 'active' }),
  grantTypes: [
    storedApiKeyGrantType({
      store: credentialStore,
      issue: async (request) => ({
        api_key: crypto.randomUUID(),
        credential_id: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
        header: 'X-Api-Key',
        scopes: request.requested_scopes ?? [],
      }),
    }),
  ],
});
