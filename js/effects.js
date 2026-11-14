/**
 * Motion and light: counting numbers, filled sliders, the toast, sections
 * revealed on scroll, the roots behind the title and the pointer effects.
 */

import { $, escapeHtml, f1, mulberry32, prefersReducedMotion } from './utils.js';

/**
 * Lights the part of a range slider left of its thumb: CSS draws the track
 * as a gradient that stops at --fill, kept here in step with the value.
 * @param {HTMLInputElement} el
 */
export function paintRange(el) {
  const min = parseFloat(el.min) || 0;
  let max = parseFloat(el.max);
  const v = parseFloat(el.value) || 0;
  if (!isFinite(max)) max = 100;
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 100;
  el.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct))}%`);
}

/**
 * Animates a number from whatever it shows to `target` (ease-out cubic), so
 * it rolls 512 → 1,024 instead of jumping. The last value is kept on the element.
 * @param {HTMLElement} el
 * @param {number} target
 * @param {function(number):string} format
 * @param {number} [duration=700]
 */
export function animateNumber(el, target, format, duration) {
  const from = typeof el._value === 'number' ? el._value : 0;
  el._value = target;
  if (from === target || prefersReducedMotion()) {
    el.textContent = format(target);
    return;
  }
  let start = null;
  duration = duration || 700;
  // One frame: the eased value for the time elapsed, until the target is reached.
  function tick(ts) {
    if (start === null) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    el.textContent = format(from + (target - from) * (1 - (1 - p) ** 3));
    if (p < 1 && el._value === target) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let toastTimer = null;

/** Shows a short message at the bottom of the screen. */
export function toast(title, body) {
  const el = $('toast');
  el.innerHTML = `<strong>${escapeHtml(title)}</strong>${escapeHtml(body)}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 3000);
}

// ---------- Reveal, roots and pointer effects ----------
/**
 * Fades each gated section in the first time it scrolls into view; the tree
 * then grows its roots in. Without IntersectionObserver everything simply shows.
 */
const revealObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
            if (entry.target.id === 'tree') growTreeIn();
          });
        },
        { threshold: 0.08 }
      )
    : null;

// Reveals an element when it scrolls into view (straight away without IntersectionObserver).
export function observeReveal(el) {
  if (revealObserver) revealObserver.observe(el);
  else el.classList.add('is-visible');
}

/** Plays the tree's growing animation once (see .roots-svg.grow-in). */
function growTreeIn() {
  const svg = $('rootsSvg');
  svg.classList.add('grow-in');
  setTimeout(() => {
    svg.classList.remove('grow-in');
  }, 3200);
}

/**
 * The roots behind the hero title: a branching system grown from one point
 * at the top, each branch splitting into one or two thinner ones. Seeded, so
 * it is the same drawing on every visit.
 */
export function growHeroRoots() {
  const svg = $('heroRoots');
  const rnd = mulberry32(20260101);
  let out = '';
  // One root: a curved stroke that splits into one or two thinner roots until depth runs out.
  function branch(x, y, angle, len, width, depth) {
    const x2 = x + Math.cos(angle) * len,
      y2 = y + Math.sin(angle) * len;
    const bend = (rnd() - 0.5) * len * 0.6;
    const cx = (x + x2) / 2 - Math.sin(angle) * bend,
      cy = (y + y2) / 2 + Math.cos(angle) * bend;
    out += `<path d="M${f1(x)} ${f1(y)}Q${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}" stroke-width="${width.toFixed(2)}" pathLength="1" style="--d:${depth}"/>`;
    if (depth >= 7 || width < 0.45) return;
    const kids = depth < 3 ? 2 : rnd() < 0.62 ? 2 : 1;
    for (let i = 0; i < kids; i++) {
      const turn = kids === 1 ? (rnd() - 0.5) * 0.7 : (i ? 1 : -1) * (0.25 + rnd() * 0.45);
      const a = Math.max(0.3, Math.min(Math.PI - 0.3, angle + turn)); // keep growing downwards
      branch(x2, y2, a, len * (0.7 + rnd() * 0.18), width * 0.66, depth + 1);
    }
  }
  branch(300, -10, Math.PI / 2, 118, 8, 0);
  svg.innerHTML =
    `<defs>` +
    `<linearGradient id="heroRootGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="760">` +
    `<stop offset="0" class="hr-0"/>` +
    `<stop offset="1" class="hr-1"/></linearGradient></defs>${out}`;
}

/** Cards a warm light follows across (see "Surfaces & light" in the stylesheet). */
const LIGHT_SELECTOR = '.soil, .card, .stat-card, .gen-row, .place-card';

/** Cards that also lean towards the mouse in 3D. */
const TILT_SELECTOR = '.numbers-result';

/** Buttons that lean a few pixels towards the cursor. */
const MAGNET_SELECTOR = '.btn-primary';

/**
 * Pointer effects, for mouse users only. One listener for the page writes the
 * pointer position into CSS variables on the element under it: --px / --py (the
 * light on a card), --rx / --ry (a slight tilt), --mx / --my (a button's pull).
 * Tilt and pull are skipped when reduced motion is on.
 */
export function setupPointerEffects() {
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const still = prefersReducedMotion();
  let last = null,
    queued = false,
    tilted = null,
    pulled = null;
  // Drops a pair of CSS variables, so the element eases back to rest.
  function clear(el, a, b) {
    if (el) {
      el.style.removeProperty(a);
      el.style.removeProperty(b);
    }
  }
  // Once per frame: light, tilt and pull for whatever is under the pointer now.
  function apply() {
    queued = false;
    const t = last.target && last.target.closest ? last.target : null;
    const x = last.clientX,
      y = last.clientY;
    const lit = t && t.closest(LIGHT_SELECTOR);
    if (lit) {
      const r = lit.getBoundingClientRect();
      lit.style.setProperty('--px', `${x - r.left}px`);
      lit.style.setProperty('--py', `${y - r.top}px`);
    }
    if (still) return;
    const tilt = t && t.closest(TILT_SELECTOR);
    if (tilted !== tilt) clear(tilted, '--rx', '--ry');
    tilted = tilt;
    if (tilt) {
      const b = tilt.getBoundingClientRect();
      tilt.style.setProperty('--rx', `${(((y - b.top) / b.height - 0.5) * -5).toFixed(2)}deg`);
      tilt.style.setProperty('--ry', `${(((x - b.left) / b.width - 0.5) * 6).toFixed(2)}deg`);
    }
    const btn = t && t.closest(MAGNET_SELECTOR);
    if (pulled !== btn) clear(pulled, '--mx', '--my');
    pulled = btn;
    if (btn) {
      const c = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', `${(((x - c.left) / c.width - 0.5) * 8).toFixed(1)}px`);
      btn.style.setProperty('--my', `${(((y - c.top) / c.height - 0.5) * 6).toFixed(1)}px`);
    }
  }
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      last = e;
      if (!queued) {
        queued = true;
        requestAnimationFrame(apply);
      }
    },
    { passive: true }
  );
  document.documentElement.addEventListener('mouseleave', () => {
    clear(tilted, '--rx', '--ry');
    clear(pulled, '--mx', '--my');
    tilted = pulled = null;
  });
}

/** The thin bar at the top of the screen showing how far down the page you are. */
export function setupScrollProgress() {
  const bar = $('progressBar');
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // at most one layout read per frame
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
        ticking = false;
      });
    },
    { passive: true }
  );
}
