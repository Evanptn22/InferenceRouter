// Static ODP Service Document config — see src/routes/odp.js for how this is
// served. `operations` and `odp_version` are filled in automatically by
// createOdpService from the catalog / operationAuthentication, so they're
// intentionally omitted here.
export const odpDocument = {
  name: 'InferenceRouter',
  description: 'MVP inference router: routes chat-completion requests across a small provider catalog with flat metered pricing.',
  language: 'en',
  localizations: ['en'],
  http: {
    endpoint_base: '/odp',
  },
  protocols: {
    enrollment: [{ name: 'aep' }],
    payments: [
      { name: 'mpp', authentication: 'not-required', options: ['inflow'] },
      { name: 'x402', authentication: 'not-required' },
    ],
  },
};
