/**
 * The app's data: loaded from localStorage and checked person by person,
 * saved after every change.
 */

import { LIMITS, MAX_SLOT, STORAGE_KEY } from './config.js';
import { cleanInterval, cleanText, cleanYear } from './utils.js';

/**
 * Shape of the saved state:
 *   { people: { [slot]: { name, born, died, living, place, country, note } },
 *     interval: years per generation chosen with the slider, or null for automatic }
 * A slot with no entry is a place not added yet. Slot 1 (you) always has a
 * year of birth once the setup form is done.
 */
export const state = loadState();

/**
 * Cleans one person: keeps only known fields with valid values. Run on
 * everything that comes from storage, from a loaded file and from the forms,
 * so corrupted or hand-edited data can never crash the app or inject markup.
 * @param {*} raw
 * @param {number} n - the person's slot
 * @returns {object|null} a clean person, or null if there is nothing to keep
 */
export function sanitizePerson(raw, n) {
  if (!raw || typeof raw !== 'object') return null;
  const p = {
    name: cleanText(raw.name, LIMITS.name),
    born: cleanYear(raw.born),
    died: null,
    living: false,
    place: cleanText(raw.place, LIMITS.place),
    country: cleanText(raw.country, LIMITS.place),
    note: cleanText(raw.note, LIMITS.note)
  };
  if (n === 1) {
    p.living = true; // you
    if (p.born === null) return null; // everything is measured from your year of birth
  } else {
    p.living = raw.living === true;
    if (!p.living) {
      const died = cleanYear(raw.died);
      if (died !== null && (p.born === null || died >= p.born)) p.died = died;
    }
    if (!p.name && p.born === null && !p.place && !p.country) return null;
  }
  return p;
}

/**
 * Cleans a whole family: valid slots only, and nobody whose child is
 * missing, so the tree always stays connected to you. Slots are walked in
 * increasing order, and a child's number is always smaller than its
 * parents', so removing one person also removes everyone above them.
 * @param {*} raw - { [slot]: person }
 * @returns {Object<number,object>}
 */
export function sanitizePeople(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  Object.keys(raw).forEach((key) => {
    if (!/^\d{1,2}$/.test(key)) return;
    const n = +key;
    if (n < 1 || n > MAX_SLOT) return;
    const p = sanitizePerson(raw[key], n);
    if (p) out[n] = p;
  });
  for (let n = 2; n <= MAX_SLOT; n++) if (out[n] && !out[n >> 1]) delete out[n];
  return out;
}

/** Reads the saved state; unreadable data simply starts an empty tree. */
function loadState() {
  const fresh = { people: {}, interval: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) || {};
    fresh.people = sanitizePeople(parsed.people);
    fresh.interval = cleanInterval(parsed.interval);
  } catch {
    /* unreadable data: start fresh rather than crash */
  }
  return fresh;
}

/**
 * Writes the state to localStorage.
 * @returns {boolean} false if the browser refused (some private modes): the
 *   app keeps working, and the caller tells the user it isn't being saved.
 */
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
