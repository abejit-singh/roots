/**
 * The person panel: adding, editing and removing someone, with the checks
 * on their years.
 */

import { GEN_NAMES, LIMITS, MAX_SLOT, MIN_YEAR, THIS_YEAR } from './config.js';
import { $, canonicalCountry, escapeHtml, plural } from './utils.js';
import { gen, genTitle, relationLower, sideOf } from './slots.js';
import { sanitizePerson, saveState, state } from './state.js';
import { displayName } from './family.js';
import { toast } from './effects.js';
import { setLastAdded } from './tree.js';
import { renderAll, renderSetup } from './flow.js';
import { hideTip } from './events.js';

export let panelN = null; // slot shown in the panel

let returnFocusN = null; // slot whose node gets keyboard focus back when the panel closes

/** A labelled form field. `control` is trusted markup built by the caller. */
function field(id, label, control) {
  return `<div class="field"><label for="${id}">${label}</label>${control}</div>`;
}

/**
 * Checks a person before saving. Two kinds of check: the values themselves
 * (real years, at least one detail), and the order of the generations (a
 * parent must be born before their child), so the tree can never contradict
 * itself.
 * @param {number} n
 * @param {object} raw - the form's values
 * @returns {string|null} the first problem found, or null
 */
export function validatePerson(n, raw) {
  const bornS = String(raw.born == null ? '' : raw.born).trim();
  let born = null;
  if (bornS !== '') {
    born = Number(bornS);
    if (!/^\d{4}$/.test(bornS) || born < MIN_YEAR || born > THIS_YEAR)
      return `Enter a year of birth between ${MIN_YEAR} and ${THIS_YEAR}.`;
  }
  if (n === 1 && born === null) return 'Your year of birth is needed: everything else is measured from it.';
  if (n !== 1) {
    const diedS = String(raw.died == null ? '' : raw.died).trim();
    if (raw.living) {
      if (born !== null && THIS_YEAR - born > 120)
        return 'Still living, and born more than 120 years ago? Please check the year.';
    } else if (diedS !== '') {
      const died = Number(diedS);
      if (!/^\d{4}$/.test(diedS) || died < MIN_YEAR || died > THIS_YEAR)
        return `Enter a year of death between ${MIN_YEAR} and ${THIS_YEAR}.`;
      if (born !== null && died < born) return 'The year of death comes before the year of birth.';
    }
    if (
      !String(raw.name || '').trim() &&
      born === null &&
      !String(raw.place || '').trim() &&
      !String(raw.country || '').trim()
    ) {
      return 'Add at least a name, a year or a place.';
    }
  }
  if (born !== null) {
    const child = n > 1 ? state.people[n >> 1] : null;
    if (child && child.born !== null && born >= child.born) {
      return `A parent has to be born before their child: ${displayName(n >> 1)} was born in ${child.born}.`;
    }
    for (let k = 2 * n; k <= Math.min(2 * n + 1, MAX_SLOT); k++) {
      const parent = state.people[k];
      if (parent && parent.born !== null && parent.born >= born) {
        return `${displayName(k)} was born in ${parent.born}, so this year would make them younger than their child.`;
      }
    }
  }
  return null;
}

/**
 * Opens the panel for a slot: a form to add someone to an empty place, or to
 * edit (or remove) someone already there.
 * @param {number} n
 */
export function openPanel(n) {
  // 1. Only you, someone in the tree, or an empty place right above someone.
  if (n < 1 || n > MAX_SLOT || (n > 1 && !state.people[n] && !state.people[n >> 1])) return;
  const p = state.people[n],
    editing = !!p,
    you = n === 1,
    s = sideOf(n),
    g = gen(n);
  const v = p || { name: '', born: null, died: null, living: false, place: '', country: '', note: '' };
  panelN = n;
  returnFocusN = n;
  // 2. Texts for the header: badge, title, relationship.
  const badge = you ? 'You' : `${s === 'a' ? 'Father’s side' : 'Mother’s side'} · ${GEN_NAMES[g]}`;
  const title = editing ? displayName(n) : `Add ${relationLower(n)}`;
  const rel = you
    ? 'The first person in your tree'
    : editing
      ? genTitle(n) + (g > 1 ? ` · ${relationLower(n)}` : '')
      : genTitle(n);
  // 3. The form, filled in with the saved values when editing.
  const yearAttrs = ` type="number" inputmode="numeric" min="${MIN_YEAR}" max="${THIS_YEAR}"`;
  const html =
    `<div class="panel-inner">` +
    `<button class="panel-close" id="panelClose" type="button" aria-label="Close">×</button>` +
    `<div class="panel-badge side-${s}">${escapeHtml(badge)}</div>` +
    `<h2 class="panel-name" id="panelTitle">${escapeHtml(title)}</h2>` +
    `<p class="panel-rel">${escapeHtml(rel)}</p>` +
    `<form id="personForm" novalidate>` +
    field(
      'pName',
      you ? 'Your name' : 'Name',
      `<input type="text" id="pName" maxlength="${LIMITS.name}" autocomplete="off" value="${escapeHtml(v.name)}" placeholder="${you ? 'e.g. Sofia Rossi' : 'First and last name'}">`
    ) +
    `<div class="field-row">` +
    field(
      'pBorn',
      'Year of birth',
      `<input id="pBorn"${yearAttrs} value="${v.born === null ? '' : v.born}" placeholder="e.g. 1931">`
    ) +
    (you
      ? ''
      : field(
          'pDied',
          'Year of death',
          `<input id="pDied"${yearAttrs} value="${v.died === null ? '' : v.died}" placeholder="If known"${v.living ? ' disabled' : ''}>`
        )) +
    `</div>` +
    (you
      ? ''
      : `<label class="check">` +
        `<input type="checkbox" id="pLiving"${v.living ? ' checked' : ''}> Still living</label>`) +
    `<div class="field-row">` +
    field(
      'pPlace',
      'Town of birth',
      `<input type="text" id="pPlace" maxlength="${LIMITS.place}" autocomplete="off" value="${escapeHtml(v.place)}" placeholder="e.g. Naples">`
    ) +
    field(
      'pCountry',
      'Country',
      `<input type="text" id="pCountry" list="countryList" maxlength="${LIMITS.place}" autocomplete="off" value="${escapeHtml(v.country)}" placeholder="Start typing…">`
    ) +
    `</div>` +
    field(
      'pNote',
      you ? 'Something about you' : 'A story about them',
      `<textarea id="pNote" maxlength="${LIMITS.note}" placeholder="${you ? 'Where you live now, what you do…' : 'A habit, a saying, the work they did…'}">${escapeHtml(v.note)}</textarea>`
    ) +
    `<p class="error-msg" id="panelError" role="alert" hidden></p>` +
    `<div class="panel-actions">` +
    `<button class="btn btn-primary" type="submit">${editing ? 'Save changes' : 'Add to your roots'}</button>` +
    `<button class="btn btn-ghost" id="panelCancel" type="button">Cancel</button></div></form>` +
    (editing && !you
      ? '<div class="panel-footer"><button class="link-btn danger" id="panelRemove" type="button">Remove from the tree</button></div>'
      : '') +
    `</div>`;
  // 4. Show it and move focus to the name field.
  const panel = $('panel');
  panel.innerHTML = html;
  panel.scrollTop = 0;
  panel.classList.add('open');
  $('panelScrim').classList.add('open');
  hideTip();
  $('pName').focus({ preventScroll: true });
}

/** Closes the panel and gives keyboard focus back to the person it was opened from. */
export function closePanel() {
  if (panelN === null) return;
  panelN = null;
  $('panel').classList.remove('open');
  $('panelScrim').classList.remove('open');
  const back = document.querySelector(`#rootsSvg .node[data-n="${returnFocusN}"]`);
  if (back && back.focus) back.focus({ preventScroll: true });
}

/** Saves the panel's form: checks it, stores the person, redraws, and lets the new person sprout. */
export function savePanel() {
  const n = panelN;
  if (n === null) return;
  const raw = {
    name: $('pName').value,
    born: $('pBorn').value,
    place: $('pPlace').value,
    country: $('pCountry').value,
    note: $('pNote').value
  };
  if (n !== 1) {
    raw.living = $('pLiving').checked;
    raw.died = $('pDied').value;
  }
  const err = validatePerson(n, raw);
  if (err) {
    const box = $('panelError');
    box.textContent = err;
    box.hidden = false;
    return;
  }
  raw.country = canonicalCountry(raw.country);
  const isNew = !state.people[n];
  state.people[n] = sanitizePerson(raw, n);
  const saved = saveState();
  if (isNew) setLastAdded(n);
  renderAll();
  if (n === 1) renderSetup();
  closePanel();
  if (!saved)
    toast('Not saved', 'This browser isn’t letting ROOTS save. Use "Save a copy" before you leave.');
  else if (isNew) toast('Added', `${displayName(n)} is now part of your roots.`);
}

/**
 * Removes someone and everyone added above them (their parents, and theirs…),
 * after asking, since the tree has to stay connected to you.
 * @param {number} n
 */
export function removePerson(n) {
  if (n === null || n === 1 || !state.people[n]) return;
  const branch = [];
  (function walk(k) {
    if (k > MAX_SLOT || !state.people[k]) return;
    branch.push(k);
    walk(2 * k);
    walk(2 * k + 1);
  })(n);
  const name = displayName(n),
    extra = branch.length - 1;
  if (
    !confirm(
      `Remove ${name}${extra ? ` and the ${plural(extra, 'person', 'people')} added above them` : ''} from your tree?`
    )
  )
    return;
  branch.forEach((k) => {
    delete state.people[k];
  });
  saveState();
  returnFocusN = n >> 1;
  renderAll();
  closePanel();
  toast(
    'Removed',
    `${name + (extra ? ` and ${plural(extra, 'person', 'people')} above them` : '')} removed from your tree.`
  );
}
