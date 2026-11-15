// What is saved, or loaded from a file, is never trusted: every person goes through sanitizePerson.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sanitizePeople, sanitizePerson } from '../../js/state.js';

test('you (slot 1) need a year of birth and are always living', () => {
  assert.equal(sanitizePerson({ name: 'Sofia' }, 1), null);
  const you = sanitizePerson({ name: 'Sofia', born: 2003, died: 2020 }, 1);
  assert.equal(you.living, true);
  assert.equal(you.died, null);
});

test('an ancestor with nothing known is dropped', () => {
  assert.equal(sanitizePerson({}, 2), null);
  assert.equal(sanitizePerson({ note: 'a story with no name' }, 2), null);
  assert.equal(sanitizePerson('Marco', 2), null);
});

test('only known fields are kept, trimmed and with the right type', () => {
  const p = sanitizePerson({ name: '  Marco Rossi ', born: '1971', place: 7, admin: true }, 2);
  assert.deepEqual(p, {
    name: 'Marco Rossi',
    born: 1971,
    died: null,
    living: false,
    place: '',
    country: '',
    note: ''
  });
});

test('a year of death before the year of birth is ignored', () => {
  assert.equal(sanitizePerson({ name: 'Giuseppe', born: 1940, died: 1930 }, 4).died, null);
  assert.equal(sanitizePerson({ name: 'Giuseppe', born: 1940, died: 2015 }, 4).died, 2015);
});

test('someone still living has no year of death', () => {
  const p = sanitizePerson({ name: 'Anna', born: 1943, died: 2010, living: true }, 5);
  assert.equal(p.living, true);
  assert.equal(p.died, null);
});

test('years outside the allowed range are dropped', () => {
  assert.equal(sanitizePerson({ name: 'Nobody', born: 3000 }, 2).born, null);
  assert.equal(sanitizePerson({ name: 'Nobody', born: 'abc' }, 2).born, null);
});

test('a family keeps only valid slots', () => {
  const people = sanitizePeople({
    1: { name: 'Sofia', born: 2003 },
    2: { name: 'Marco', born: 1971 },
    0: { name: 'Nobody' },
    64: { name: 'Too far back' },
    father: { name: 'Not a slot' }
  });
  assert.deepEqual(Object.keys(people), ['1', '2']);
});

test('nobody stays in the tree without their child', () => {
  // 8 is the father of 4, who is missing: 8 would float, so it is removed. 3 stays.
  const people = sanitizePeople({
    1: { name: 'Sofia', born: 2003 },
    3: { name: 'Elena', born: 1974 },
    8: { name: 'Antonio', born: 1912 }
  });
  assert.deepEqual(Object.keys(people), ['1', '3']);
});

test('anything that is not a family gives an empty tree', () => {
  assert.deepEqual(sanitizePeople(null), {});
  assert.deepEqual(sanitizePeople('people'), {});
});
