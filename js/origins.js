/**
 * Origins: where the family was born, by generation, country and town.
 */

import { COUNTRY_COLORS, GEN_NAMES, MAX_GEN } from './config.js';
import { $, escapeHtml, flagFor, normKey, plural } from './utils.js';
import { state } from './state.js';
import { displayName, knownInGen, knownSlots } from './family.js';

/**
 * Where the family was born: a bar per generation split by country, a
 * legend of every country, and a card for every town.
 */
export function renderOrigins() {
  // 1. Count people per country and per town, in the order they first appear.
  const tally = {},
    order = [],
    towns = {},
    townOrder = [];
  knownSlots().forEach((n) => {
    const p = state.people[n];
    if (p.country) {
      const key = normKey(p.country);
      if (!tally[key]) {
        tally[key] = { name: p.country, count: 0, first: n };
        order.push(key);
      }
      tally[key].count++;
    }
    if (p.place) {
      const tk = `${normKey(p.place)}|${normKey(p.country)}`;
      if (!towns[tk]) {
        towns[tk] = { place: p.place, country: p.country, people: [] };
        townOrder.push(tk);
      }
      towns[tk].people.push(n);
    }
  });
  // 2. Countries with the most people first; each one gets its colour.
  order.sort((a, b) => tally[b].count - tally[a].count || tally[a].first - tally[b].first);
  const color = {};
  order.forEach((k, i) => {
    color[k] = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
  });

  // 3. The sentence at the top.
  $('originsLede').innerHTML = order.length
    ? `Your known family was born in <b>${plural(order.length, 'country', 'countries')}</b>` +
      `${townOrder.length ? ` and <b>${plural(townOrder.length, 'town')}</b>` : ''}.`
    : 'Add where your family was born (open anyone in the tree above) to see where your roots are.';

  // 4. One bar per generation, split by country.
  let rows = '';
  for (let g = 0; g <= MAX_GEN; g++) {
    const list = knownInGen(g);
    if (!list.length) continue;
    const groups = {};
    const gOrder = [];
    let unknown = 0;
    list.forEach((n) => {
      const c = state.people[n].country;
      if (!c) {
        unknown++;
        return;
      }
      const k = normKey(c);
      if (!groups[k]) {
        groups[k] = 0;
        gOrder.push(k);
      }
      groups[k]++;
    });
    gOrder.sort((a, b) => groups[b] - groups[a] || order.indexOf(a) - order.indexOf(b));
    const segs =
      gOrder
        .map(
          (k) =>
            `<span class="seg" style="--f:${groups[k]};--c:${color[k]}" title="${escapeHtml(`${tally[k].name} · ${groups[k]}`)}"></span>`
        )
        .join('') +
      (unknown
        ? `<span class="seg unknown" style="--f:${unknown}" title="${escapeHtml(`Country not added · ${unknown}`)}"></span>`
        : '');
    const words =
      g === 0
        ? [gOrder.length ? tally[gOrder[0]].name : 'not added']
        : gOrder
            .map((k) => `${groups[k]} in ${tally[k].name}`)
            .concat(unknown ? [`${unknown} not added`] : []);
    rows +=
      `<div class="origin-row">` +
      `<div class="origin-head">` +
      `<span class="origin-gen">${GEN_NAMES[g]}</span>` +
      `<span class="origin-text">${escapeHtml(words.join(' · '))}</span></div>` +
      `<div class="origin-bar">${segs}</div></div>`;
  }
  $('originBars').innerHTML = rows;
  // 5. The countries as chips.
  $('originLegend').innerHTML = order
    .map((k) => {
      const t = tally[k],
        flag = flagFor(t.name);
      return (
        `<span class="chip" style="--c:${color[k]}">` +
        `<i></i>${flag ? `${flag} ` : ''}${escapeHtml(t.name)} <b>${t.count}</b></span>`
      );
    })
    .join('');

  // Towns: the most people first, then the earliest-added.
  townOrder.sort(
    (a, b) => towns[b].people.length - towns[a].people.length || towns[a].people[0] - towns[b].people[0]
  );
  $('placesWrap').hidden = !townOrder.length;
  $('placeGrid').innerHTML = townOrder
    .map((k) => {
      const t = towns[k],
        flag = flagFor(t.country);
      return (
        `<article class="place-card">` +
        `<h3>${escapeHtml(t.place)}</h3>` +
        (t.country
          ? `<div class="place-country">${flag ? `${flag} ` : ''}${escapeHtml(t.country)}</div>`
          : '') +
        `<div class="place-people">${t.people.map((n) => escapeHtml(displayName(n))).join(' · ')}</div></article>`
      );
    })
    .join('');
}
