/**
 * The root system: the family drawn in SVG as roots under the ground,
 * redrawn from scratch on every change.
 */

import { GEN_NAMES, MAX_SLOT } from './config.js';
import { $, escapeHtml, f1, mulberry32, trunc } from './utils.js';
import { gen, genTitle, isFather, relationLower, sideOf } from './slots.js';
import { state } from './state.js';
import { ancestorsKnown, birthRange, displayName, initials, yearsText } from './family.js';

let lastAdded = null; // slot just added, so it can sprout on the next draw

/** Sets lastAdded (imported bindings are read-only in other modules). */
export function setLastAdded(value) {
  lastAdded = value;
}

let lastTreeWidth = 0; // to centre the view when the drawing changes width

/** Sets lastTreeWidth (imported bindings are read-only in other modules). */
export function setLastTreeWidth(value) {
  lastTreeWidth = value;
}

let litN = 0; // slot whose line to you is lit (0: none)

/** A point on a cubic Bézier curve at t (0–1). */
function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
  ];
}

/** The direction of a cubic Bézier curve at t (its derivative). */
function bezierTangent(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
  ];
}

/**
 * Fine root hairs along a root: two or three short curved strokes leaving
 * it sideways. Seeded by the slot, so each root keeps the same hairs.
 */
function rootlets(n, p0, p1, p2, p3, g) {
  if (g > 4) return '';
  const rnd = mulberry32(n * 7919 + 13);
  let out = '';
  const count = g <= 2 ? 3 : 2;
  for (let i = 0; i < count; i++) {
    const t = 0.22 + rnd() * 0.56;
    const pt = bezier(p0, p1, p2, p3, t),
      tg = bezierTangent(p0, p1, p2, p3, t);
    const ang = Math.atan2(tg[1], tg[0]) + (rnd() < 0.5 ? -1 : 1) * (0.7 + rnd() * 0.55);
    const len = 16 - g * 2.5 + rnd() * 9;
    const ex = pt[0] + Math.cos(ang) * len,
      ey = pt[1] + Math.sin(ang) * len;
    const bend = (rnd() - 0.5) * len * 0.6;
    const qx = (pt[0] + ex) / 2 - Math.sin(ang) * bend,
      qy = (pt[1] + ey) / 2 + Math.cos(ang) * bend;
    out += `<path class="rootlet" d="M${f1(pt[0])} ${f1(pt[1])}Q${f1(qx)} ${f1(qy)} ${f1(ex)} ${f1(ey)}" stroke-width="${g <= 2 ? 1.1 : 0.8}"/>`;
  }
  return out;
}

/**
 * Draws the tree as a root system: you at the surface, every generation a
 * layer deeper, each person joined to their child above by a root.
 *  - Drawn: everyone added, plus an empty place for each missing parent of
 *    someone added, so the tree grows a generation at a time.
 *  - Width: a person sits in the middle of the space their two parents
 *    share. When the deepest generation would be too cramped, the drawing
 *    becomes wider than the screen and scrolls sideways, centred on you.
 *  - Names appear under people when there is room for them; otherwise
 *    their initials, the tooltip and the panel carry the details.
 */
export function renderTree() {
  const scroller = $('soilScroll'),
    svg = $('rootsSvg');
  // 1. The tree needs a visible box to measure, and at least you in it.
  const cw = scroller.clientWidth;
  if (!cw || !state.people[1]) return;
  const people = state.people;
  // 2. Places to draw: everyone added, plus the empty places right above them.
  const slots = [];
  let maxG = 0;
  for (let n = 1; n <= MAX_SLOT; n++) {
    if (people[n] || (n > 1 && people[n >> 1])) {
      slots.push(n);
      maxG = Math.max(maxG, gen(n));
    }
  }
  // 3. Sizes: smaller rows, discs and roots on narrow screens; the drawing widens to fit the deepest generation.
  const narrow = cw < 640;
  const ROW = narrow ? 104 : 118,
    TOP = 78,
    PAD = narrow ? 12 : 28;
  const R = narrow ? [17, 15, 12, 10, 7, 5] : [17, 15, 13, 11, 9, 7]; // disc radius by generation
  const SW = narrow ? [0, 5, 3.6, 2.6, 1.8, 1.3] : [0, 5.5, 4, 2.9, 2.1, 1.5]; // root width by generation
  const minSlot = 2 * R[maxG] + (narrow ? 4 : 14); // room each place of the deepest generation needs
  const W = Math.max(cw, 2 ** maxG * minSlot + PAD * 2);
  const H = TOP + maxG * ROW + 72;
  // Horizontal centre of place k: generation g splits the width into 2^g equal places.
  function x(k) {
    const g = gen(k),
      first = 2 ** g;
    return PAD + ((k - first + 0.5) / first) * (W - PAD * 2);
  }
  // Vertical position of place k: one row per generation below the surface.
  function y(k) {
    return TOP + gen(k) * ROW;
  }
  // Width of one place in generation g.
  function slotW(g) {
    return (W - PAD * 2) / 2 ** g;
  }
  // 4. The person just added, if any, grows in with an animation.
  const fresh = lastAdded;
  lastAdded = null;
  litN = 0;

  // 5. Gradients and the shadow under the discs.
  const defs =
    `<defs>` +
    `<linearGradient id="groundGlow" x1="0" x2="1">` +
    `<stop offset="0" class="gg-0"/>` +
    `<stop offset=".5" class="gg-1"/>` +
    `<stop offset="1" class="gg-0"/></linearGradient>` +
    `<linearGradient id="rootA" gradientUnits="userSpaceOnUse" x1="0" y1="${TOP}" x2="0" y2="${H}">` +
    `<stop offset="0" class="sa-hi"/>` +
    `<stop offset="1" class="sa-lo"/></linearGradient>` +
    `<linearGradient id="rootB" gradientUnits="userSpaceOnUse" x1="0" y1="${TOP}" x2="0" y2="${H}">` +
    `<stop offset="0" class="sb-hi"/>` +
    `<stop offset="1" class="sb-lo"/></linearGradient>` +
    `<radialGradient id="discA" cx="35%" cy="30%" r="80%">` +
    `<stop offset="0" class="da-hi"/>` +
    `<stop offset="1" class="da-lo"/></radialGradient>` +
    `<radialGradient id="discB" cx="35%" cy="30%" r="80%">` +
    `<stop offset="0" class="db-hi"/>` +
    `<stop offset="1" class="db-lo"/></radialGradient>` +
    `<radialGradient id="discY" cx="35%" cy="30%" r="80%">` +
    `<stop offset="0" class="sy-hi"/>` +
    `<stop offset="1" class="sy-lo"/></radialGradient>` +
    `<filter id="discShadow" x="-60%" y="-60%" width="220%" height="220%">` +
    `<feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity=".6"/></filter></defs>`;

  // Soil layers, one per generation, and the surface you stand on.
  let bands = `<rect class="air" x="0" y="0" width="${W}" height="${TOP}"/>`,
    labels = '';
  for (let level = 1; level <= maxG; level++) {
    const top = TOP + (level - 0.5) * ROW;
    bands += `<rect class="band${level % 2 ? ' odd' : ''}" x="0" y="${f1(top)}" width="${W}" height="${f1(level === maxG ? H - top : ROW)}"/>`;
    const range = birthRange(level);
    labels +=
      `<div class="band-label" style="top:${f1(top + 10)}px">` +
      `<span>${GEN_NAMES[level]}</span>` +
      `<span>${range ? `born ${range}` : ''}</span></div>`;
  }
  bands += `<rect x="0" y="${TOP - 0.5}" width="${W}" height="1" fill="url(#groundGlow)"/>`;

  // 6. Roots and nodes, one place at a time.
  let edges = '',
    nodes = '';
  slots.forEach((k) => {
    const g = gen(k),
      p = people[k],
      s = sideOf(k),
      cx = x(k),
      cy = y(k),
      r = R[g],
      sw = slotW(g);

    // The root joining this person (or empty place) to their child above.
    if (k > 1) {
      const c = k >> 1,
        x1 = x(c),
        y1 = y(c) + R[gen(c)] - 1,
        y2 = cy - r + 1,
        dy = y2 - y1;
      const p0 = [x1, y1],
        p1 = [x1, y1 + dy * 0.55],
        p2 = [cx, y2 - dy * 0.6],
        p3 = [cx, y2];
      const d = `M${f1(x1)} ${f1(y1)}C${f1(p1[0])} ${f1(p1[1])} ${f1(p2[0])} ${f1(p2[1])} ${f1(cx)} ${f1(y2)}`;
      if (p) {
        edges +=
          `<g class="edge known side-${s}${k === fresh ? ' fresh' : ''}" data-n="${k}" style="--g:${g}">` +
          `<path class="root-shadow" d="${d}" pathLength="1" stroke-width="${SW[g] + 2.5}"/>` +
          `<path class="root" d="${d}" pathLength="1" stroke-width="${SW[g]}" stroke="url(#root${s.toUpperCase()})"/>${rootlets(k, p0, p1, p2, p3, g)}</g>`;
      } else {
        edges += `<path class="edge empty side-${s}${c === fresh ? ' fresh' : ''}" data-n="${k}" d="${d}" style="--g:${g}"/>`;
      }
    }

    // The person, or the empty place waiting for them.
    const hit = Math.min(Math.max(r + 7, 16), sw / 2 - 1);
    if (!p) {
      nodes +=
        `<g class="node empty side-${s}${k >> 1 === fresh ? ' fresh' : ''}" data-n="${k}" tabindex="0" role="button" aria-label="${escapeHtml(`Add ${relationLower(k)}`)}" style="--g:${g}">` +
        `<circle class="hit" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(hit)}"/>` +
        `<circle class="disc" cx="${f1(cx)}" cy="${f1(cy)}" r="${r - 1}"/>` +
        `<text class="plus" x="${f1(cx)}" y="${f1(cy)}" dy=".36em" style="font-size:${f1(r * 1.15)}px">+</text>` +
        (sw >= 60
          ? `<text class="add-lbl" x="${f1(cx)}" y="${f1(cy + r + 16)}">${isFather(k) ? 'FATHER' : 'MOTHER'}</text>`
          : '') +
        `</g>`;
      return;
    }
    const name = p.name || (k === 1 ? 'You' : genTitle(k));
    const ini = p.name ? initials(p.name) : k === 1 ? 'Y' : '?';
    let html =
      `<g class="node known side-${s}${k === fresh ? ' fresh' : ''}" data-n="${k}" tabindex="0" role="button" aria-label="${escapeHtml(`${name}, ${k === 1 ? 'you' : genTitle(k).toLowerCase()}${yearsText(p) ? `, ${yearsText(p)}` : ''}. Open`)}" style="--g:${g}">` +
      `<circle class="hit" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(hit)}"/>`;
    if (k === 1) html += `<circle class="halo" cx="${f1(cx)}" cy="${f1(cy)}" r="${r + 8}"/>`;
    html += `<circle class="disc" cx="${f1(cx)}" cy="${f1(cy)}" r="${r}" fill="url(#disc${s.toUpperCase()})" filter="url(#discShadow)"/>`;
    if (r >= 11)
      html += `<text class="ini" x="${f1(cx)}" y="${f1(cy)}" dy=".36em" style="font-size:${f1(r * 0.78)}px">${escapeHtml(ini)}</text>`;
    if (k === 1) {
      const where = p.place || p.country;
      html +=
        `<text class="nm start" x="${f1(cx + r + 12)}" y="${f1(cy - 3)}" style="font-size:17px;font-style:italic">${escapeHtml(trunc(name, 18))}</text>` +
        `<text class="yr start" x="${f1(cx + r + 12)}" y="${f1(cy + 13)}">` +
        escapeHtml(trunc(yearsText(p) + (where ? ` · ${where}` : ''), 26)) +
        `</text>`;
    } else if (sw >= 74) {
      const font = sw >= 110 ? 14 : 12.5;
      html +=
        `<text class="nm" x="${f1(cx)}" y="${f1(cy + r + 17)}" style="font-size:${font}px">` +
        escapeHtml(trunc(name, Math.floor((sw - 10) / (font * 0.55)))) +
        `</text>`;
      if (yearsText(p))
        html += `<text class="yr" x="${f1(cx)}" y="${f1(cy + r + 31)}">${escapeHtml(yearsText(p))}</text>`;
    } else if (sw >= 52) {
      // Not much room: the first name and the year of birth only.
      const first = p.name ? p.name.split(/\s+/)[0] : genTitle(k);
      html += `<text class="nm" x="${f1(cx)}" y="${f1(cy + r + 15)}" style="font-size:11px">${escapeHtml(trunc(first, Math.floor((sw - 6) / 6)))}</text>`;
      if (p.born !== null)
        html += `<text class="yr" x="${f1(cx)}" y="${f1(cy + r + 27)}" style="font-size:9px">${p.born}</text>`;
    }
    nodes += `${html}</g>`;
  });

  // The sprout above you: the part of the tree that is still growing.
  const sprout =
    `<g transform="translate(${f1(x(1))} ${TOP - R[0] + 1})">` +
    `<g class="sprout">` +
    `<path class="stem" d="M0 0C0-8 1-15 0-22"/>` +
    `<path class="leaf" d="M0-13C-5-20-15-22-21-17C-15-11-6-10 0-13Z"/>` +
    `<path class="leaf" d="M0-19C5-27 15-30 21-25C15-18 6-16 0-19Z"/></g></g>`;

  // 7. On the page: centre the view if the tree is wider than the screen.
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.classList.remove('focusing');
  svg.innerHTML = defs + bands + edges + sprout + nodes;
  $('bandLabels').innerHTML = labels;
  if (W > cw && W !== lastTreeWidth) scroller.scrollLeft = (W - cw) / 2;
  lastTreeWidth = W;
  scroller.classList.toggle('scrollable', W > cw);
  // 8. The help under the tree and the count of ancestors.
  const canHover = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
  $('treeHelp').textContent =
    (W > cw
      ? canHover
        ? 'Scroll sideways to see the whole tree. '
        : 'Swipe sideways to see the whole tree. '
      : '') +
    (canHover
      ? 'Hover anyone to light up the line that connects them to you. Tab and Enter move through the tree with the keyboard.'
      : 'Tap anyone to open them, or an empty place to add someone.');
  const added = ancestorsKnown();
  $('treeCount').textContent = `${added} of ${MAX_SLOT - 1} ancestors added`;
}

/**
 * Lights up the line between a person and you (and dims the rest), or
 * clears it when n is 0.
 * @param {number} n
 */
export function lightLineage(n) {
  if (n === litN) return;
  litN = n;
  const svg = $('rootsSvg'),
    set = {};
  for (let k = n; k >= 1; k >>= 1) set[k] = true;
  svg.classList.toggle('focusing', n > 1);
  svg.querySelectorAll('.edge, .node').forEach((el) => {
    el.classList.toggle('lit', !!set[+el.getAttribute('data-n')]);
  });
}

/** The tooltip for a slot: name, title, years, place. */
export function tipHtml(n) {
  const p = state.people[n];
  if (!p) return `<b>${escapeHtml(`Add ${relationLower(n)}`)}</b>${escapeHtml(genTitle(n))}`;
  const lines = [n === 1 ? 'You' : genTitle(n)];
  if (yearsText(p)) lines.push(yearsText(p));
  const where = [p.place, p.country].filter(Boolean).join(', ');
  if (where) lines.push(where);
  return `<b>${escapeHtml(displayName(n))}</b>${escapeHtml(lines.join(' · '))}`;
}
