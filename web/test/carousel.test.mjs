import test from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, prevIndex } from '../js/carousel.js';

test('nextIndex avanza y da la vuelta', () => {
  assert.equal(nextIndex(0, 3), 1);
  assert.equal(nextIndex(2, 3), 0);
});

test('prevIndex retrocede y da la vuelta', () => {
  assert.equal(prevIndex(0, 3), 2);
  assert.equal(prevIndex(2, 3), 1);
});
