import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, passwordStrength } from '../js/validators.js';

test('isValidEmail acepta correos válidos', () => {
  assert.equal(isValidEmail('ana@example.com'), true);
  assert.equal(isValidEmail('a.b-c@sub.dominio.co'), true);
});

test('isValidEmail rechaza inválidos', () => {
  assert.equal(isValidEmail('ana@'), false);
  assert.equal(isValidEmail('ana example.com'), false);
  assert.equal(isValidEmail(''), false);
});

test('passwordStrength marca inválida si <6 chars', () => {
  const r = passwordStrength('abc');
  assert.equal(r.valid, false);
});

test('passwordStrength sube de score con largo+variedad', () => {
  assert.equal(passwordStrength('abcdef').valid, true);
  assert.ok(passwordStrength('Abcdef1!').score >= passwordStrength('abcdef').score);
});
