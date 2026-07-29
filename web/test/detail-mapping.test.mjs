import test from 'node:test';
import assert from 'node:assert/strict';
import { toCheckoutWine } from '../js/detail-mapping.js';

const wine = {
  id: 'w1', wineryName: 'Pomar', name: 'Reserva', vintage: 2021,
  offers: [{ establishmentId: 'e1', storeName: 'Licorería Centro', price: '12.50', status: 'DISPONIBLE', lat: 10.5, lng: -66.85 }],
};

test('incluye el id del vino (bug R8)', () => {
  const out = toCheckoutWine(wine, null);
  assert.equal(out.id, 'w1');
  assert.equal(out.winery, 'Pomar');
});

test('dist es null sin ubicación y 0 en el mismo punto', () => {
  assert.equal(toCheckoutWine(wine, null).offers[0].dist, null);
  const withLoc = toCheckoutWine(wine, { lat: 10.5, lng: -66.85 });
  assert.equal(withLoc.offers[0].dist, 0);
});

test('propaga storeId, price numérico y status', () => {
  const o = toCheckoutWine(wine, null).offers[0];
  assert.equal(o.storeId, 'e1');
  assert.equal(o.price, 12.5);
  assert.equal(o.status, 'DISPONIBLE');
});
