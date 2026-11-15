/**
 * From the setup form to the tree: the first person, rendering every
 * section, revealing the results, and saving or loading a copy.
 */

import { LIMITS } from './config.js';
import { $, canonicalCountry, cleanInterval, plural, prefersReducedMotion, todayIso } from './utils.js';
import { sanitizePeople, sanitizePerson, saveState, state } from './state.js';
import { observeReveal, toast } from './effects.js';
import { renderTree, setLastTreeWidth } from './tree.js';
import { renderGenerations } from './generations.js';
import { renderOrigins } from './origins.js';
import { renderNumbers } from './numbers.js';
import { renderLifelines } from './lifelines.js';
import { renderFinale } from './finale.js';
import { validatePerson } from './panel.js';

// ---------- Rendering ----------
/** Redraws every section from the state. */
export function renderAll() {
  renderTree();
  renderGenerations();
  renderOrigins();
  renderNumbers();
  renderLifelines();
  renderFinale();
}

/** Fills the setup form with what is saved about you (leaving alone a field being typed in). */
export function renderSetup() {
  const p = state.people[1];
  if (!p) return;
  [
    ['youName', p.name],
    ['youBorn', p.born],
    ['youPlace', p.place],
    ['youCountry', p.country]
  ].forEach((f) => {
    const el = $(f[0]);
    if (document.activeElement !== el) el.value = f[1] === null ? '' : f[1];
  });
}

// ---------- Setup, reveal, save and load ----------
const GATED_IDS = ['tree', 'generations', 'origins', 'numbers', 'lifelines', 'finale'];

export let revealed = false;

/**
 * Shows the sections that need you in the tree, draws them, and hands them
 * to the reveal observer.
 * @param {boolean} scroll - scroll to the tree (after the setup form; not on a return visit)
 */
export function revealResults(scroll) {
  GATED_IDS.forEach((id) => {
    $(id).hidden = false;
  });
  revealed = true;
  renderAll(); // after un-hiding, so the tree can measure its width
  GATED_IDS.forEach((id) => {
    observeReveal($(id));
  });
  if (scroll)
    $('tree').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/** The setup form: checks your details, saves you as slot 1, and grows the tree. */
export function handleGrow() {
  const old = state.people[1];
  const raw = {
    name: $('youName').value,
    born: $('youBorn').value,
    place: $('youPlace').value,
    country: $('youCountry').value,
    note: old ? old.note : ''
  };
  const err = validatePerson(1, raw),
    box = $('setupError');
  if (err) {
    box.textContent = err;
    box.hidden = false;
    return;
  }
  box.hidden = true;
  raw.country = canonicalCountry(raw.country);
  state.people[1] = sanitizePerson(raw, 1);
  saveState();
  renderSetup();
  if (revealed) {
    renderAll();
    $('tree').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  } else {
    revealResults(true);
  }
}

/** Downloads the whole tree as a JSON file, to keep or to load on another device. */
export function exportFamily() {
  const data = {
    app: 'ROOTS',
    version: 1,
    exported: new Date().toISOString(),
    people: state.people,
    interval: state.interval
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roots-family-${todayIso()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
  toast('Saved', 'A copy of your tree is in your downloads.');
}

/**
 * Loads a tree saved with "Save a copy". The file goes through the same
 * cleaning as saved data, and replaces the current tree only after asking.
 * @param {File} file
 */
export function importFamily(file) {
  if (file.size > LIMITS.fileBytes) {
    toast('Load a copy', 'That file is too large to be a ROOTS family.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    let data, people;
    try {
      data = JSON.parse(reader.result);
      people = sanitizePeople(data && data.people);
    } catch {
      people = {};
    }
    if (!people[1]) {
      toast('Load a copy', 'That file isn’t a ROOTS family.');
      return;
    }
    if (state.people[1] && !confirm('Replace your current tree with the one in this file?')) return;
    state.people = people;
    state.interval = cleanInterval(data.interval);
    saveState();
    setLastTreeWidth(0);
    renderSetup();
    if (revealed) renderAll();
    else revealResults(false);
    toast('Loaded', `${plural(Object.keys(people).length, 'person', 'people')} loaded from the file.`);
  };
  reader.onerror = () => {
    toast('Load a copy', 'That file couldn’t be read.');
  };
  reader.readAsText(file);
}
