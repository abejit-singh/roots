// Questions about the family in the tree. Each test starts from the same small family.
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
  ancestorsKnown,
  birthRange,
  currentInterval,
  deepestGen,
  displayName,
  initials,
  intervalStats,
  knownInGen,
  knownSlots,
  missingSlots,
  yearsText
} from '../../js/family.js';
import { state } from '../../js/state.js';

const person = (name, born, extra = {}) => ({
  name,
  born,
  died: null,
  living: false,
  place: '',
  country: '',
  note: '',
  ...extra
});

beforeEach(() => {
  state.interval = null;
  state.people = {
    1: person('Sofia Rossi', 2003, { living: true }),
    2: person('Marco Rossi', 1971, { living: true }),
    3: person('Elena Weber', 1974, { living: true }),
    4: person('Giuseppe Rossi', 1940, { died: 2015 }),
    8: person('Antonio Rossi', 1912, { died: 1988 })
  };
});

test('who has been added, and how deep the tree goes', () => {
  assert.deepEqual(knownSlots(), [1, 2, 3, 4, 8]);
  assert.equal(ancestorsKnown(), 4); // you are not your own ancestor
  assert.deepEqual(knownInGen(1), [2, 3]);
  assert.deepEqual(knownInGen(2), [4]);
  assert.equal(deepestGen(), 3);
});

test('the places that can be filled next are the parents of the people added', () => {
  assert.deepEqual(missingSlots(), [5, 6, 7, 9, 16, 17]);
});

test('years of birth per generation', () => {
  assert.equal(birthRange(1), '1971–1974');
  assert.equal(birthRange(2), '1940');
  assert.equal(birthRange(4), '');
});

test("the family's own gap between generations is the average over every parent and child", () => {
  // Sofia–Marco 32, Sofia–Elena 29, Marco–Giuseppe 31, Giuseppe–Antonio 28.
  assert.deepEqual(intervalStats(), { avg: 30, pairs: 4 });
  assert.equal(currentInterval(), 30);
});

test('with no pairs the common estimate of 28 years is used, and the slider overrides both', () => {
  state.people = { 1: person('Sofia Rossi', 2003, { living: true }) };
  assert.deepEqual(intervalStats(), { avg: null, pairs: 0 });
  assert.equal(currentInterval(), 28);
  state.interval = 35;
  assert.equal(currentInterval(), 35);
});

test('a pair with an unknown year is left out of the average', () => {
  state.people[3].born = null;
  assert.equal(intervalStats().pairs, 3);
});

test('names, initials and years as shown on the tree', () => {
  assert.equal(displayName(2), 'Marco Rossi');
  assert.equal(initials('Marco Rossi'), 'MR');
  assert.equal(initials('Maria Grazia De Luca'), 'ML');
  assert.equal(initials('Cher'), 'C');
  assert.equal(yearsText(state.people[4]), '1940–2015');
  assert.equal(yearsText(state.people[2]), 'b. 1971');
  assert.equal(yearsText(person('', null, { died: 1960 })), 'died 1960');
  assert.equal(yearsText(person('', null)), '');
});
