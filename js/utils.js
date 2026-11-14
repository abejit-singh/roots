/**
 * Small helpers used everywhere: text, numbers, countries and flags,
 * element lookup. None of them reads or changes the app's data.
 */

import { COUNTRIES, COUNTRY_ALIASES, INTERVAL_RANGE, LIMITS, MIN_YEAR, THIS_YEAR } from './config.js';

/** Shorthand for document.getElementById. */
export function $(id) {
  return document.getElementById(id);
}

/** Trims and shortens a piece of user text; anything that isn't a string becomes ''. */
export function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** A whole year between MIN_YEAR and this year, or null. */
export function cleanYear(value) {
  const n = parseInt(value, 10);
  return isFinite(n) && n >= MIN_YEAR && n <= THIS_YEAR ? n : null;
}

/** A years-per-generation value inside the slider's range, or null. */
export function cleanInterval(value) {
  const n = parseInt(value, 10);
  return n >= INTERVAL_RANGE[0] && n <= INTERVAL_RANGE[1] ? n : null;
}

/**
 * Escapes text for safe insertion into HTML and SVG markup, element content
 * and attribute values alike (quotes included). Every piece of user text
 * passes through here before it touches innerHTML.
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Rounds and formats a number with thousands separators, e.g. 1048576 → "1,048,576". */
export function fmtInt(v) {
  return Math.round(v).toLocaleString('en-US');
}

/** English plural helper: plural(3, 'country', 'countries') → "3 countries". */
export function plural(n, one, many) {
  return `${fmtInt(n)} ${n === 1 ? one : many || `${one}s`}`;
}

/** One decimal place, for SVG coordinates. */
export function f1(v) {
  return Math.round(v * 10) / 10;
}

/** Shortens text to `max` characters with an ellipsis. */
export function trunc(text, max) {
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
}

/** Lower case, accents removed, single spaces: the key used to compare place names. */
export function normKey(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

/** Country name or alias → its [name, code] entry. */
const COUNTRY_BY_KEY = (() => {
  const map = {};
  COUNTRIES.forEach((c) => {
    map[normKey(c[0])] = c;
  });
  Object.keys(COUNTRY_ALIASES).forEach((key) => {
    const c = map[normKey(COUNTRY_ALIASES[key])];
    if (c) map[key] = c;
  });
  return map;
})();

/** The standard spelling of a country if ROOTS knows it ("italia" → "Italy"), otherwise the text as typed. */
export function canonicalCountry(text) {
  const t = cleanText(text, LIMITS.place);
  const c = t && COUNTRY_BY_KEY[normKey(t)];
  return c ? c[0] : t;
}

/**
 * Turns an ISO code into a flag emoji: each letter becomes a "regional
 * indicator" character (offset 127397), and a pair of them is a flag.
 * @param {string} iso
 * @returns {string} '' for unknown places
 */
function flagEmoji(iso) {
  if (!iso || iso.length !== 2) return '';
  return String.fromCodePoint(127397 + iso.charCodeAt(0), 127397 + iso.charCodeAt(1));
}

/** The flag for a country name, or '' if it isn't one ROOTS knows (e.g. a country that no longer exists). */
export function flagFor(country) {
  const c = COUNTRY_BY_KEY[normKey(country)];
  return c ? flagEmoji(c[1]) : '';
}

/** True when the user has asked their system for reduced motion. */
export function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/**
 * A small seeded random generator (mulberry32). The same seed always gives
 * the same numbers, so the hand-drawn details of the roots (their hairs, the
 * roots in the hero) look the same on every visit.
 * @param {number} seed
 * @returns {function():number} values in [0, 1)
 */
export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Today's date as 'YYYY-MM-DD' in the user's own time zone. */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
