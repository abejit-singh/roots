/**
 * The generations behind you: figures and one row per generation.
 */

import { GEN_NAMES, MAX_GEN, MAX_SLOT, THIS_YEAR } from './config.js';
import { $, escapeHtml, plural } from './utils.js';
import { genTitle, sideOf } from './slots.js';
import { state } from './state.js';
import { ancestorsKnown, birthRange, deepestGen, displayName, intervalStats, knownSlots } from './family.js';

/** The four headline figures and one row of squares per generation. */
export function renderGenerations() {
  // 1. The figures: how many added, how deep, the earliest birth, years per generation.
  const added = ancestorsKnown();
  const deepest = deepestGen();
  const stats = intervalStats();
  let earliest = null;
  knownSlots().forEach((n) => {
    const p = state.people[n];
    if (n > 1 && p.born !== null && (earliest === null || p.born < state.people[earliest].born)) earliest = n;
  });
  // One stat card.
  function card(label, value, sub) {
    return (
      `<div class="stat-card">` +
      `<span class="stat-label">${label}</span>` +
      `<span class="stat-value">${value}</span>` +
      `<span class="stat-sub">${sub}</span></div>`
    );
  }
  // 2. The four stat cards.
  const first = earliest !== null ? state.people[earliest].born : null;
  $('genStats').innerHTML =
    card(
      'Ancestors added',
      `${added} <small>/ ${MAX_SLOT - 1}</small>`,
      added ? `${plural(deepest, 'generation')} deep` : 'Start with your parents'
    ) +
    card(
      'Earliest birth',
      first !== null ? first : '—',
      first !== null ? escapeHtml(displayName(earliest)) : 'Add their years of birth'
    ) +
    card(
      'Family history',
      first !== null ? `${THIS_YEAR - first} <small>years</small>` : '—',
      first !== null ? `from ${first} to today` : 'Known so far'
    ) +
    card(
      'Years per generation',
      stats.avg ? `${Math.round(stats.avg)} <small>years</small>` : '—',
      stats.pairs ? `from ${plural(stats.pairs, 'parent–child pair')}` : 'Needs years of birth in a line'
    );

  // 3. One row per generation: a square per place, lit for the people added.
  let rows = '';
  for (let g = 1; g <= MAX_GEN; g++) {
    const start = 2 ** g;
    let count = 0;
    let cells = '';
    for (let n = start; n < start * 2; n++) {
      const p = state.people[n];
      const cls = p ? `known side-${sideOf(n)}` : state.people[n >> 1] ? 'open' : '';
      if (p) count++;
      const title = p
        ? `${displayName(n)} · ${genTitle(n)}`
        : `${genTitle(n)} · ${sideOf(n) === 'a' ? 'father’s side' : 'mother’s side'}`;
      cells += `<i class="cell ${cls}" title="${escapeHtml(title)}"></i>`;
    }
    const range = birthRange(g);
    rows +=
      `<div class="gen-row">` +
      `<div class="gen-name">${GEN_NAMES[g]}</div>` +
      `<div class="gen-cells" style="--n:${start}">${cells}</div>` +
      `<div class="gen-meta">` +
      `<b>${count}</b> of ${start}${range ? `<br>born ${range}` : ''}</div></div>`;
  }
  $('genList').innerHTML = rows;
}
