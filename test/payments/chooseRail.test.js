import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseRail } from '../../src/payments/chooseRail.js';

test('chooses balance (MPP) when both balance and exact-onchain are offered', () => {
  assert.equal(chooseRail([{ rail: 'exact-onchain' }, { rail: 'balance' }]), 'balance');
  assert.equal(chooseRail([{ rail: 'balance' }, { rail: 'exact-onchain' }]), 'balance');
});

test('falls back to exact-onchain (x402) when balance is not offered', () => {
  assert.equal(chooseRail([{ rail: 'exact-onchain' }]), 'exact-onchain');
});

test('returns null when neither known rail is offered', () => {
  assert.equal(chooseRail([{ rail: 'instrument' }]), null);
  assert.equal(chooseRail([]), null);
});
