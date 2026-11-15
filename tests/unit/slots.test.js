// The numbering of the tree: you are 1, a father is 2n, a mother 2n + 1.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { gen, genTitle, isFather, pronouns, relationLower, sideOf } from '../../js/slots.js';

test('the generation is read from the number: 2–3 parents, 4–7 grandparents…', () => {
  assert.equal(gen(1), 0);
  assert.deepEqual([2, 3].map(gen), [1, 1]);
  assert.deepEqual([4, 5, 6, 7].map(gen), [2, 2, 2, 2]);
  assert.equal(gen(8), 3);
  assert.equal(gen(63), 5);
});

test('the side of the family: everyone above your father is on his side', () => {
  assert.equal(sideOf(1), 'y');
  assert.equal(sideOf(2), 'a');
  assert.equal(sideOf(3), 'b');
  assert.deepEqual([4, 5, 6, 7].map(sideOf), ['a', 'a', 'b', 'b']);
  assert.deepEqual([8, 11, 12, 15].map(sideOf), ['a', 'a', 'b', 'b']);
  assert.equal(sideOf(32), 'a');
  assert.equal(sideOf(63), 'b');
});

test('even numbers are fathers, odd numbers mothers', () => {
  assert.equal(isFather(2), true);
  assert.equal(isFather(3), false);
  assert.equal(isFather(10), true);
  assert.equal(isFather(11), false);
});

test('titles by generation', () => {
  assert.equal(genTitle(1), 'You');
  assert.equal(genTitle(2), 'Father');
  assert.equal(genTitle(3), 'Mother');
  assert.equal(genTitle(4), 'Grandfather');
  assert.equal(genTitle(7), 'Grandmother');
  assert.equal(genTitle(8), 'Great-grandfather');
  assert.equal(genTitle(17), 'Great-great-grandmother');
  assert.equal(genTitle(32), '3× great-grandfather');
});

test('the exact relationship is spelled out from the bits of the number', () => {
  assert.equal(relationLower(1), 'You');
  assert.equal(relationLower(2), 'your father');
  assert.equal(relationLower(5), 'your father’s mother');
  assert.equal(relationLower(6), 'your mother’s father');
  assert.equal(relationLower(11), 'your father’s mother’s mother');
});

test('questions use the right pronouns', () => {
  assert.equal(
    pronouns('Where was {he} born? Ask about {his} work, and who knew {him}.', 4),
    'Where was he born? Ask about his work, and who knew him.'
  );
  assert.equal(
    pronouns('Where was {he} born? Ask about {his} work, and who knew {him}.', 5),
    'Where was she born? Ask about her work, and who knew her.'
  );
});
