/**
 * Questions about the family in the tree: who has been added, how deep it
 * goes, years of birth per generation, the gap between generations.
 */

import { DEFAULT_INTERVAL, INTERVAL_RANGE, MAX_SLOT } from './config.js';
import { gen, genTitle } from './slots.js';
import { state } from './state.js';

/** The name to show for a slot: the person's name, or their title ("Grandmother") if it isn't known. */
export function displayName(n) {
  const p = state.people[n];
  return (p && p.name) || (n === 1 ? 'You' : genTitle(n));
}

/** "Maria Bianchi" → "MB"; one word → its first letter. */
export function initials(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return (words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : '')).toUpperCase();
}

/** "1931–2009", "b. 1931" or "" for a person. */
export function yearsText(p) {
  if (p.born === null) return p.died !== null ? `died ${p.died}` : '';
  if (!p.living && p.died !== null) return `${p.born}–${p.died}`;
  return `b. ${p.born}`;
}

/** Every slot with a person in it, in order. */
export function knownSlots() {
  const out = [];
  for (let n = 1; n <= MAX_SLOT; n++) if (state.people[n]) out.push(n);
  return out;
}

/** How many ancestors have been added (everyone but you). */
export function ancestorsKnown() {
  return Math.max(0, knownSlots().length - 1);
}

/** The people added in generation g. */
export function knownInGen(g) {
  const out = [];
  for (let n = 2 ** g; n < 2 ** (g + 1); n++) if (state.people[n]) out.push(n);
  return out;
}

/** The deepest generation with anyone in it. */
export function deepestGen() {
  return knownSlots().reduce((d, n) => Math.max(d, gen(n)), 0);
}

/** "1931–1940" (or one year) for the people of generation g with a year of birth; '' if none. */
export function birthRange(g) {
  const ys = knownInGen(g)
    .map((n) => state.people[n].born)
    .filter((y) => y !== null);
  if (!ys.length) return '';
  const a = Math.min(...ys),
    b = Math.max(...ys);
  return a === b ? String(a) : `${a}–${b}`;
}

/** Places that can be added now: empty slots whose child is in the tree. */
export function missingSlots() {
  const out = [];
  for (let n = 2; n <= MAX_SLOT; n++) if (!state.people[n] && state.people[n >> 1]) out.push(n);
  return out;
}

/**
 * Your family's own generation length: the average gap between a parent's
 * year of birth and their child's, over every pair where both are known.
 * @returns {{avg:(number|null), pairs:number}}
 */
export function intervalStats() {
  let sum = 0,
    pairs = 0;
  for (let n = 2; n <= MAX_SLOT; n++) {
    const parent = state.people[n],
      child = state.people[n >> 1];
    if (parent && child && parent.born !== null && child.born !== null && child.born > parent.born) {
      sum += child.born - parent.born;
      pairs++;
    }
  }
  return { avg: pairs ? sum / pairs : null, pairs };
}

/** Years per generation used for estimates: the slider's value, else the family average, else the common estimate. */
export function currentInterval() {
  const s = intervalStats();
  const v = state.interval !== null ? state.interval : s.avg ? Math.round(s.avg) : DEFAULT_INTERVAL;
  return Math.max(INTERVAL_RANGE[0], Math.min(INTERVAL_RANGE[1], v));
}
