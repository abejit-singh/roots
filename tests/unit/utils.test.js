// The small helpers: user text, years, country names and flags.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  canonicalCountry,
  cleanInterval,
  cleanText,
  cleanYear,
  escapeHtml,
  flagFor,
  fmtInt,
  mulberry32,
  normKey,
  plural,
  trunc
} from '../../js/utils.js';

test('cleanText trims, shortens and refuses anything that is not text', () => {
  assert.equal(cleanText('  Turin  ', 10), 'Turin');
  assert.equal(cleanText('abcdefgh', 3), 'abc');
  assert.equal(cleanText(42, 10), '');
  assert.equal(cleanText(null, 10), '');
});

test('cleanYear accepts whole years up to this one', () => {
  assert.equal(cleanYear('1912'), 1912);
  assert.equal(cleanYear(new Date().getFullYear()), new Date().getFullYear());
  assert.equal(cleanYear(new Date().getFullYear() + 1), null);
  assert.equal(cleanYear('soon'), null);
  assert.equal(cleanYear(''), null);
});

test('cleanInterval stays inside the slider', () => {
  assert.equal(cleanInterval(28), 28);
  assert.equal(cleanInterval(1), null);
  assert.equal(cleanInterval(500), null);
  assert.equal(cleanInterval(null), null);
});

test('escapeHtml makes user text safe inside markup and attributes', () => {
  assert.equal(
    escapeHtml('<b onclick="x">Tom & \'Jerry\'</b>'),
    '&lt;b onclick=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/b&gt;'
  );
  assert.equal(escapeHtml(null), '');
});

test('numbers are written with thousands separators', () => {
  assert.equal(fmtInt(1073741824), '1,073,741,824');
  assert.equal(plural(1, 'country', 'countries'), '1 country');
  assert.equal(plural(3, 'country', 'countries'), '3 countries');
  assert.equal(plural(2, 'town'), '2 towns');
});

test('trunc shortens with an ellipsis', () => {
  assert.equal(trunc('Giuseppe', 20), 'Giuseppe');
  assert.equal(trunc('Giuseppe', 5), 'Gius…');
});

test('place names are compared without accents, case or extra spaces', () => {
  assert.equal(normKey('  São   Paulo '), 'sao paulo');
  assert.equal(normKey('MÜNCHEN'), 'munchen');
});

test('countries typed in Italian are stored with their English name', () => {
  assert.equal(canonicalCountry('italia'), 'Italy');
  assert.equal(canonicalCountry('Germania'), 'Germany');
  assert.equal(canonicalCountry('ITALY'), 'Italy');
});

test('a country ROOTS does not know is kept as typed', () => {
  assert.equal(canonicalCountry(' Yugoslavia '), 'Yugoslavia');
  assert.equal(flagFor('Yugoslavia'), '');
});

test('a known country has its flag', () => {
  assert.equal(flagFor('Italy'), '🇮🇹');
  assert.equal(flagFor('germania'), '🇩🇪');
});

test('the seeded random generator repeats itself', () => {
  const a = mulberry32(7);
  const b = mulberry32(7);
  const first = [a(), a(), a()];
  assert.deepEqual(first, [b(), b(), b()]);
  assert.ok(first.every((v) => v >= 0 && v < 1));
  assert.notDeepEqual(first, [mulberry32(8)(), mulberry32(8)(), mulberry32(8)()]);
});
