/**
 * The closing screen and "Who should I ask about?".
 */

import { MAX_SLOT, QUESTIONS, STORY_QUESTIONS } from './config.js';
import { $, escapeHtml } from './utils.js';
import { gen, isFather, pronouns, relationLower } from './slots.js';
import { state } from './state.js';
import { ancestorsKnown, displayName, knownSlots, missingSlots } from './family.js';

/** The closing line: how many people stand behind you, and how many of them you know. */
export function renderFinale() {
  $('finaleText').innerHTML =
    `<b>${MAX_SLOT - 1} people</b> stand behind you in just five generations, and every one of them had to happen for you to be here. You know <b>${ancestorsKnown()}</b> of them.`;
}

/**
 * "Who should I ask about?": someone missing from the nearest generation
 * that still has gaps, with a question to ask the family. Once every place
 * is filled, someone without a story instead.
 */
export function askSomeone() {
  const card = $('askCard');
  const missing = missingSlots();
  let html;
  if (missing.length) {
    const nearest = Math.min(...missing.map(gen));
    const pool = missing.filter((n) => gen(n) === nearest);
    const n = pool[Math.floor(Math.random() * pool.length)];
    html =
      `<div class="ask-who">Ask about ${escapeHtml(relationLower(n))}</div>` +
      `<p class="ask-q">` +
      escapeHtml(pronouns(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)], n)) +
      `</p>` +
      `<button class="btn btn-ghost btn-sm" type="button" data-open="${n}">Add ${isFather(n) ? 'him' : 'her'} to your roots</button>`;
  } else {
    const quiet = knownSlots().filter((k) => k > 1 && !state.people[k].note);
    if (quiet.length) {
      const k = quiet[Math.floor(Math.random() * quiet.length)];
      html =
        `<div class="ask-who">Ask for a story about ${escapeHtml(displayName(k))}</div>` +
        `<p class="ask-q">` +
        escapeHtml(pronouns(STORY_QUESTIONS[Math.floor(Math.random() * STORY_QUESTIONS.length)], k)) +
        `</p>` +
        `<button class="btn btn-ghost btn-sm" type="button" data-open="${k}">Add the story</button>`;
    } else {
      html =
        '<div class="ask-who">Every root is traced</div><p class="ask-q">Five generations, every name, every story. Now tell them to someone younger.</p>';
    }
  }
  card.innerHTML = html;
  card.hidden = false;
  card.classList.remove('show');
  void card.offsetWidth; // restart the arrival animation
  card.classList.add('show');
}
