/**
 * ROOTS — a family tree that grows downwards, like roots.
 *
 * Entry point. The code is split into small ES modules that the browser loads
 * as they are: no build step, no framework, no backend.
 *
 *   config.js       constants, countries, colours, questions
 *   utils.js        small helpers: text, numbers, countries and flags
 *   slots.js        the numbering of the tree (Ahnentafel)
 *   state.js        the saved data: load, check, save
 *   family.js       questions about the family: who is known, generations
 *   effects.js      motion and light: counters, toast, reveal, pointer
 *   tree.js         the root system, drawn in SVG
 *   generations.js  the generations behind you
 *   origins.js      where the family was born
 *   numbers.js      ancestors doubling at every generation
 *   lifelines.js    every life on one timeline
 *   finale.js       the closing screen and "Who should I ask about?"
 *   panel.js        the person panel
 *   flow.js         setup, rendering, save a copy / load a copy
 *   events.js       every event listener
 *   main.js         this file: start-up
 *
 * How it fits together
 * - All user data lives in one `state` object, saved to localStorage after
 *   every change. Render functions only ever READ from `state` and rebuild
 *   their own section, so what's on screen always matches what's saved.
 * - Slots: every place in the tree has a number (see slots.js). Your parents
 *   are 2 and 3, your grandparents 4–7, and generation g holds the numbers
 *   2^g … 2^(g+1) − 1. A person's generation, side of the family and exact
 *   relationship to you can all be read from their number alone, so they are
 *   never stored.
 * - The tree is drawn in SVG from scratch on every change: at most 63
 *   people, so a full redraw is instant and keeps the code simple.
 */

import { COUNTRIES, MIN_YEAR, THIS_YEAR } from './config.js';
import { $, escapeHtml } from './utils.js';
import { state } from './state.js';
import { growHeroRoots, setupPointerEffects, setupScrollProgress } from './effects.js';
import { renderSetup, revealResults } from './flow.js';
import { bindEvents } from './events.js';

/**
 * Start-up: load the saved tree, fill the form and the country suggestions,
 * wire the events and, for a returning visitor, show their tree straight away.
 */
function init() {
  $('countryList').innerHTML = COUNTRIES.map((c) => `<option value="${escapeHtml(c[0])}">`).join('');
  $('youBorn').min = MIN_YEAR;
  $('youBorn').max = THIS_YEAR;
  renderSetup();
  growHeroRoots();
  bindEvents();
  setupScrollProgress();
  setupPointerEffects();
  if (state.people[1]) revealResults(false);
}

// A module script runs once the document has been parsed, so the page is ready.
init();

// Service worker: makes the app installable and lets it open offline once visited.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      /* offline mode unavailable; the app still works online */
    });
  });
}
