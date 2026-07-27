import { env } from './env.js';

// Demo-only api key -> consumer id map, parsed from ROUTER_API_KEYS
// ("key1:consumer1,key2:consumer2"). Not a real auth system.
const apiKeyToConsumer = new Map(
  env.routerApiKeys
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => pair.split(':'))
    .filter(([key, consumerId]) => key && consumerId)
);

export function resolveConsumer(apiKey) {
  return apiKeyToConsumer.get(apiKey);
}
