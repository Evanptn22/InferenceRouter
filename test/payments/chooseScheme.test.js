import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseScheme } from '../../src/payments/chooseScheme.js';

test('chooses balance (MPP) when both balance and exact are offered', () => {
  assert.equal(chooseScheme([{ scheme: 'exact' }, { scheme: 'balance' }]), 'balance');
  assert.equal(chooseScheme([{ scheme: 'balance' }, { scheme: 'exact' }]), 'balance');
});

test('falls back to exact (x402) when balance is not offered', () => {
  assert.equal(chooseScheme([{ scheme: 'exact' }]), 'exact');
});

test('returns null when neither known scheme is offered', () => {
  assert.equal(chooseScheme([{ scheme: 'instrument' }]), null);
  assert.equal(chooseScheme([]), null);
});
