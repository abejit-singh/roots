/**
 * Their lifetimes: every life in the tree on one timeline.
 */

import { THIS_YEAR } from './config.js';
import { $, escapeHtml, plural } from './utils.js';
import { genTitle, sideOf } from './slots.js';
import { state } from './state.js';
import { displayName, knownSlots } from './family.js';

/** Everyone with a year of birth, on one timeline from the earliest birth to today. */
export function renderLifelines() {
  const you = state.people[1],
    chart = $('lifeChart');
  // 1. Everyone with a year of birth, oldest first; a chart needs at least two lives.
  const list = knownSlots()
    .filter((n) => state.people[n].born !== null)
    .sort((a, b) => state.people[a].born - state.people[b].born || a - b);
  if (list.length < 2) {
    chart.classList.add('is-empty');
    chart.innerHTML =
      '<p class="empty-state">Add your family’s years of birth to see their lifetimes side by side with yours.</p>';
    $('lifeLede').textContent = 'Every life in your tree, on one line of time.';
    return;
  }
  chart.classList.remove('is-empty');
  // 2. The time span: from the decade of the first birth to this year, with ticks.
  const start = Math.floor(state.people[list[0]].born / 10) * 10,
    end = THIS_YEAR,
    span = Math.max(1, end - start);
  // A year's position along the chart, as a percentage of its width.
  function pct(year) {
    return (((year - start) / span) * 100).toFixed(3);
  }
  const step = span > 160 ? 50 : span > 90 ? 25 : span > 40 ? 10 : 5;
  let ticks = '';
  for (let t = Math.ceil(start / step) * step; t <= end; t += step)
    ticks += `<div class="lc-tick" style="left:${pct(t)}%"><span>${t}</span></div>`;

  // 3. A name and a bar for each life.
  let labels = '',
    bars = '';
  list.forEach((n, i) => {
    const p = state.people[n];
    const s = sideOf(n);
    let stop;
    let cls = `lc-bar side-${s}`;
    let desc;
    if (p.living) {
      stop = end;
      cls += ' living';
      desc = `living · ${end - p.born} years`;
    } else if (p.died !== null) {
      stop = p.died;
      desc = `${p.born}–${p.died} · ${p.died - p.born} years`;
    } else {
      stop = Math.min(end, p.born + 30);
      cls += ' open';
      desc = `born ${p.born} · year of death not added`;
    }
    labels +=
      `<div class="lc-label${n === 1 ? ' you' : ''}">` +
      `<b>${escapeHtml(displayName(n))}</b>` +
      `<small>${escapeHtml(n === 1 ? 'You' : genTitle(n))}</small></div>`;
    bars += `<span class="${cls}" style="top:calc(${i} * var(--row));left:${pct(p.born)}%;width:${Math.max(0.8, ((stop - p.born) / span) * 100).toFixed(3)}%" data-name="${escapeHtml(displayName(n))}" data-desc="${escapeHtml(desc)}"></span>`;
  });
  // 4. On the page.
  chart.style.setProperty('--rows', list.length);
  chart.innerHTML =
    `<div class="lc-labels">${labels}</div>` +
    `<div class="lc-plot">${ticks}<div class="lc-you-line" style="left:${pct(you.born)}%"></div>${bars}</div>`;

  // 5. The sentence above: how many lives overlap with yours, and the longest one.
  const overlap = list.filter((n) => {
    const p = state.people[n];
    return n !== 1 && (p.living || (p.died !== null && p.died >= you.born));
  }).length;
  let longest = null;
  list.forEach((n) => {
    const p = state.people[n];
    if (
      n !== 1 &&
      p.died !== null &&
      (longest === null || p.died - p.born > state.people[longest].died - state.people[longest].born)
    )
      longest = n;
  });
  $('lifeLede').innerHTML =
    `Your life overlaps with <b>${overlap}</b> of the ${plural(list.length - 1, 'other life', 'other lives')} here.${longest !== null ? ` The longest so far: <b>${escapeHtml(displayName(longest))}</b>, ${state.people[longest].died - state.people[longest].born} years.` : ''}`;
}
