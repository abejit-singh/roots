/**
 * Event wiring: every listener of the page is attached here.
 */

import { STORAGE_KEY } from './config.js';
import { $, cleanInterval, escapeHtml, prefersReducedMotion } from './utils.js';
import { saveState, state } from './state.js';
import { lightLineage, renderTree, tipHtml } from './tree.js';
import { renderNumbers } from './numbers.js';
import { askSomeone } from './finale.js';
import { closePanel, openPanel, panelN, removePerson, savePanel } from './panel.js';
import { exportFamily, handleGrow, importFamily, revealed } from './flow.js';

/** Shows the shared tooltip at a point. */
function showTip(x, y, html) {
  const tip = $('tooltip');
  tip.innerHTML = html;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
  tip.style.opacity = 1;
}

// Hides the tree tooltip.
export function hideTip() {
  $('tooltip').style.opacity = 0;
}

/** The tree: one set of delegated listeners on the SVG, which is redrawn on every change. */
function bindTree() {
  const svg = $('rootsSvg');
  // The person or empty place an event came from, if any.
  function nodeOf(target) {
    return target && target.closest ? target.closest('.node') : null;
  }
  svg.addEventListener('click', (e) => {
    const node = nodeOf(e.target);
    if (node) openPanel(+node.getAttribute('data-n'));
  });
  svg.addEventListener('keydown', (e) => {
    const node = nodeOf(e.target);
    if (node && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openPanel(+node.getAttribute('data-n'));
    }
  });
  svg.addEventListener('mousemove', (e) => {
    const node = nodeOf(e.target);
    if (!node) {
      hideTip();
      lightLineage(0);
      return;
    }
    const n = +node.getAttribute('data-n');
    lightLineage(state.people[n] ? n : 0);
    showTip(e.clientX, e.clientY, tipHtml(n));
  });
  svg.addEventListener('mouseleave', () => {
    hideTip();
    lightLineage(0);
  });
  // With the keyboard, the person in focus lights their line too.
  svg.addEventListener('focusin', (e) => {
    const node = nodeOf(e.target);
    let visible;
    try {
      visible = node && node.matches(':focus-visible');
    } catch {
      visible = !!node;
    }
    if (visible) lightLineage(state.people[+node.getAttribute('data-n')] ? +node.getAttribute('data-n') : 0);
  });
  svg.addEventListener('focusout', () => {
    lightLineage(0);
  });
}

/** Wires every control on the page. Called once at start-up. */
export function bindEvents() {
  // Hero and setup form.
  $('ctaStart').addEventListener('click', () => {
    $('setup').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => {
      $('youName').focus({ preventScroll: true });
    }, 650);
  });
  $('setupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleGrow();
  });

  // The tree: clicks, keyboard and hover (see bindTree).
  bindTree();

  // Person panel: save, its buttons, the "Still living" box; the scrim and Escape close it.
  const panel = $('panel');
  panel.addEventListener('submit', (e) => {
    e.preventDefault();
    savePanel();
  });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'panelClose' || b.id === 'panelCancel') closePanel();
    else if (b.id === 'panelRemove') removePerson(panelN);
  });
  panel.addEventListener('change', (e) => {
    if (e.target.id !== 'pLiving') return;
    const died = $('pDied');
    died.disabled = e.target.checked;
    if (e.target.checked) died.value = '';
  });
  $('panelScrim').addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // The numbers: the generations slider, the years-per-generation slider and its reset.
  $('genSlider').addEventListener('input', renderNumbers);
  $('intervalSlider').addEventListener('input', (e) => {
    state.interval = cleanInterval(e.target.value);
    saveState();
    renderNumbers();
  });
  $('intervalReset').addEventListener('click', () => {
    state.interval = null;
    saveState();
    renderNumbers();
  });

  // Lifetimes: a tooltip on each bar.
  $('lifeChart').addEventListener('mousemove', (e) => {
    const bar = e.target.closest && e.target.closest('.lc-bar');
    if (!bar) {
      hideTip();
      return;
    }
    showTip(
      e.clientX,
      e.clientY,
      `<b>${escapeHtml(bar.getAttribute('data-name'))}</b>${escapeHtml(bar.getAttribute('data-desc'))}`
    );
  });
  $('lifeChart').addEventListener('mouseleave', hideTip);

  // Finale: who to ask about, and opening that person from the card.
  $('ctaAsk').addEventListener('click', askSomeone);
  $('askCard').addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    const n = +b.getAttribute('data-open');
    $('tree').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    setTimeout(
      () => {
        openPanel(n);
      },
      prefersReducedMotion() ? 0 : 450
    );
  });

  // Save a copy / Load a copy.
  $('exportBtn').addEventListener('click', exportFamily);
  $('importInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // so the same file can be chosen again
    if (file) importFamily(file);
  });

  // Reset: erase the tree after a confirmation.
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Erase your whole ROOTS tree? This can’t be undone. (Use "Save a copy" first to keep it.)'))
      return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable: nothing to erase */
    }
    location.reload();
  });

  // Redraw the tree at the new width when the screen turns or the window is resized.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (revealed) renderTree();
    }, 150);
  });
}
