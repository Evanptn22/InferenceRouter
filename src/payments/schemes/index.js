import * as balance from './balance.js';
import * as exact from './exact.js';
import * as instrument from './instrument.js';

// Keyed by rail value, not module/file name.
const rails = { balance, 'exact-onchain': exact, instrument };

export function getScheme(name) {
  const impl = rails[name];
  if (!impl) {
    throw new Error(`no payment rail registered for "${name}"`);
  }
  return impl;
}
