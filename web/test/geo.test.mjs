import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, DEFAULT_LOC } from '../js/geo.js';

test('haversineKm de un punto a sí mismo es 0', () => {
  assert.equal(haversineKm(10.5, -66.8, 10.5, -66.8), 0);
});
test('haversineKm ~1km para ~0.009° de latitud', () => {
  const d = haversineKm(0, 0, 0.0089932, 0);
  assert.ok(Math.abs(d - 1) < 0.05, `esperaba ~1km, dio ${d}`);
});
test('DEFAULT_LOC es Chacao', () => {
  assert.deepEqual(DEFAULT_LOC, { lat: 10.497, lng: -66.854 });
});
