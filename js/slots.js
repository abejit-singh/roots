/**
 * Slots: every place in the tree has a number (the Ahnentafel numbering).
 * You are 1; anyone's father is 2 × their number, their mother 2 × + 1.
 * Generation, side of the family and relationship are read from the number.
 */

/** A slot's generation: 0 for you, 1 for your parents… (the position of its highest bit). */
export function gen(n) {
  return 31 - Math.clz32(n);
}

/**
 * Which side of the family a slot is on: 'y' for you, 'a' for your father's
 * side, 'b' for your mother's. It is the bit just below the highest one.
 */
export function sideOf(n) {
  return n === 1 ? 'y' : (n >> (gen(n) - 1)) & 1 ? 'b' : 'a';
}

/** Even slots are fathers, odd slots (other than you) mothers. */
export function isFather(n) {
  return n % 2 === 0;
}

/** "Grandmother", "Great-grandfather", "3× great-grandmother"… */
export function genTitle(n) {
  const g = gen(n),
    father = isFather(n);
  if (g === 0) return 'You';
  if (g === 1) return father ? 'Father' : 'Mother';
  const base = father ? 'grandfather' : 'grandmother';
  if (g === 2) return father ? 'Grandfather' : 'Grandmother';
  if (g === 3) return `Great-${base}`;
  if (g === 4) return `Great-great-${base}`;
  return `${g - 2}× great-${base}`;
}

/** The exact path from you: slot 11 → "Your father’s mother’s mother". Read from the bits below the highest one. */
function relationPath(n) {
  if (n === 1) return 'You';
  const parts = [];
  for (let b = gen(n) - 1; b >= 0; b--) parts.push((n >> b) & 1 ? 'mother' : 'father');
  return `Your ${parts.join('’s ')}`;
}

/** The same, mid-sentence: "your father’s mother". */
export function relationLower(n) {
  return relationPath(n).replace(/^Your /, 'your ');
}

/** "he/his/him" or "she/her/her" in a question, following the person's slot. */
export function pronouns(text, n) {
  const f = isFather(n);
  return text
    .replace(/\{he\}/g, f ? 'he' : 'she')
    .replace(/\{his\}/g, f ? 'his' : 'her')
    .replace(/\{him\}/g, f ? 'him' : 'her');
}
