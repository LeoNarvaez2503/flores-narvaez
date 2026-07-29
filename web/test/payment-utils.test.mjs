import test from 'node:test';
import assert from 'node:assert/strict';
import { luhnValid, formatCardNumber, expiryValid, cvvValid } from '../js/payment-utils.js';

test('luhnValid acepta una tarjeta de prueba válida', () => {
  assert.equal(luhnValid('4242 4242 4242 4242'), true);
  assert.equal(luhnValid('1234 5678 9012 3456'), false);
});
test('formatCardNumber agrupa de a 4', () => {
  assert.equal(formatCardNumber('4242424242424242'), '4242 4242 4242 4242');
});
test('expiryValid compara contra una fecha dada', () => {
  const now = new Date(2026, 0, 15); // ene 2026
  assert.equal(expiryValid('12/26', now), true);
  assert.equal(expiryValid('01/20', now), false);
  assert.equal(expiryValid('13/30', now), false);
});
test('cvvValid acepta 3 o 4 dígitos', () => {
  assert.equal(cvvValid('123'), true);
  assert.equal(cvvValid('1'), false);
});
