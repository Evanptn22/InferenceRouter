import * as balance from './balance.js';
import * as exact from './exact.js';
import * as instrument from './instrument.js';

const schemes = { balance, exact, instrument };

export function getScheme(name) {
  const impl = schemes[name];
  if (!impl) {
    throw new Error(`no payment scheme registered for "${name}"`);
  }
  return impl;
}
