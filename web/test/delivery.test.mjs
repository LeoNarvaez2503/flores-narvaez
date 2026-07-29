import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryFee } from '../js/delivery.js';

test('coincide con las referencias por distancia', () => {
  assert.equal(deliveryFee(1), 1.15);
  assert.equal(deliveryFee(3), 1.85);
  assert.equal(deliveryFee(5), 2.55);
});
test('mínimo a 0 km y clamp a 50 km', () => {
  assert.equal(deliveryFee(0), 0.80);
  assert.equal(deliveryFee(-9), 0.80);
  assert.equal(deliveryFee(100), deliveryFee(50));
});
