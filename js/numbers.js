/**
 * The numbers behind you: ancestors doubling at every generation.
 */

import { DEFAULT_INTERVAL, MAX_GEN } from './config.js';
import { $, fmtInt, plural } from './utils.js';
import { sideOf } from './slots.js';
import { state } from './state.js';
import { currentInterval, intervalStats, knownInGen } from './family.js';
import { animateNumber, paintRange } from './effects.js';

/**
 * The doubling: 2^g places in your tree g generations back, roughly when
 * they were born, a dot for each (up to 1,024; beyond that each dot stands
 * for more people), and what happens when the numbers outgrow the world.
 */
export function renderNumbers() {
  // 1. How many ancestors g generations back, and roughly when they were born.
  const slider = $('genSlider');
  const g = parseInt(slider.value, 10) || 10;
  const count = 2 ** g,
    total = 2 ** (g + 1) - 2;
  const interval = currentInterval(),
    stats = intervalStats();
  const roundTo = g >= 6 ? 10 : g >= 3 ? 5 : 1;
  const about = Math.round((state.people[1].born - g * interval) / roundTo) * roundTo;
  // 2. Slider, big number and labels.
  $('genSliderVal').textContent = g;
  paintRange(slider);
  animateNumber($('ancestorsNum'), count, fmtInt, 600);
  $('ancestorsLabel').textContent =
    `${g === 1 ? 'parents' : g === 2 ? 'grandparents' : `ancestors ${g} generations back`}, born around ${about}`;
  $('ancestorsTotal').textContent = `${fmtInt(total)} people in total between you and them.`;

  // A dot per place (each one standing for more people past 1,024), lit when that person is in your tree.
  const shown = Math.min(count, 1024),
    per = count / shown;
  const size = shown <= 4 ? 22 : shown <= 16 ? 16 : shown <= 64 ? 11 : shown <= 256 ? 8 : 5.5;
  let html = '';
  for (let i = 0; i < shown; i++) {
    const n = count + i;
    html += g <= MAX_GEN && state.people[n] ? `<i class="${sideOf(n)}"></i>` : '<i></i>';
  }
  const dots = $('ancestorDots');
  dots.innerHTML = html;
  dots.style.setProperty('--cols', 2 ** Math.ceil(Math.log2(shown) / 2)); // as wide as it is tall, or twice as wide
  dots.style.setProperty('--s', `${size}px`);
  dots.style.setProperty('--gap', `${size >= 11 ? 4 : size >= 7 ? 3 : 2}px`);
  // 3. The caption: how many of these places you have filled.
  const here = g <= MAX_GEN ? knownInGen(g).length : 0;
  $('dotsCaption').textContent =
    per > 1
      ? `Each dot stands for ${fmtInt(per)} people.`
      : `Each dot is one person.${g <= MAX_GEN ? ' The lit ones are already in your tree.' : ''}`;

  // 4. Why the doubling has to stop, depending on how far back you go.
  let note;
  if (g <= MAX_GEN)
    note =
      here === count
        ? 'You know every one of them. Very few people can say that.'
        : `You know ${here} of them. Every name you add is one that won’t be lost.`;
  else if (g < 20)
    note = `Every one of these ${fmtInt(count)} places was a real person, with a name, a home and a life. Without any one of them, you wouldn’t be here.`;
  else if (g < 30)
    note =
      'Over a million places in your tree. In reality many of them are filled by the same people: go back far enough and family trees start to fold into each other.';
  else
    note =
      'More places than there were people alive on Earth at the time. So the same ancestors must fill many places in your tree: far enough back, everyone’s family trees overlap.';
  $('collapseNote').textContent = note;

  // Years per generation: the slider shows the value in use.
  const iv = $('intervalSlider');
  if (document.activeElement !== iv) iv.value = interval;
  paintRange(iv);
  $('intervalVal').textContent = interval;
  $('intervalHint').textContent = stats.avg
    ? `Your family’s own average is ${Math.round(stats.avg)} years, from ${plural(stats.pairs, 'parent–child pair')}.`
    : `${DEFAULT_INTERVAL} years is a common estimate. Add years of birth to your tree to use your own family’s average.`;
  const reset = $('intervalReset');
  reset.hidden = state.interval === null;
  reset.textContent = stats.avg ? 'Use my family’s average' : 'Use the common estimate';
}
