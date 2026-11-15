// The app as a visitor uses it: you start the tree, then add the people above you one at a time.
// Places in the tree are numbered: 1 is you, 2 your father, 3 your mother, 4 and 5 your father's parents…
import { readFileSync, writeFileSync } from 'node:fs';

import { expect, setRange, test } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const known = (page) => page.locator('#rootsSvg .node.known');
const place = (page, n) => page.locator(`#rootsSvg .node[data-n="${n}"]`);
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('roots_state_v1')));

/** Fills in the setup form for Sofia, born in Turin in 2003, and grows the tree. */
async function growTree(page) {
  await page.fill('#youName', 'Sofia Rossi');
  await page.fill('#youBorn', '2003');
  await page.fill('#youPlace', 'Turin');
  await page.fill('#youCountry', 'italia');
  await page.click('#ctaGrow');
  await expect(page.locator('#tree')).toBeVisible();
  await expect(known(page)).toHaveCount(1);
}

/** Opens a place in the tree and saves a person there. `fields` maps input ids to values. */
async function addPerson(page, n, fields) {
  await place(page, n).click();
  await expect(page.locator('#panel')).toHaveClass(/open/);
  for (const [id, value] of Object.entries(fields)) {
    if (id === 'pLiving') await page.locator('#pLiving').check();
    else await page.fill(`#${id}`, String(value));
  }
  await page.click('#personForm button[type=submit]');
  await expect(page.locator('#panel')).not.toHaveClass(/open/);
}

/** Sofia's family: both parents, her father's parents and one great-grandfather. */
async function growFamily(page) {
  await growTree(page);
  await addPerson(page, 2, { pName: 'Marco Rossi', pBorn: 1971, pLiving: true });
  await addPerson(page, 3, {
    pName: 'Elena Weber',
    pBorn: 1974,
    pPlace: 'Munich',
    pCountry: 'Germania',
    pLiving: true
  });
  await addPerson(page, 4, {
    pName: 'Giuseppe Rossi',
    pBorn: 1940,
    pDied: 2015,
    pPlace: 'Naples',
    pCountry: 'Italy'
  });
  await addPerson(page, 5, {
    pName: 'Anna Esposito',
    pBorn: 1943,
    pPlace: 'Naples',
    pCountry: 'Italy',
    pLiving: true
  });
  await addPerson(page, 8, { pName: 'Antonio Rossi', pBorn: 1912, pDied: 1988 });
  await expect(known(page)).toHaveCount(6);
}

test('the tree stays hidden until you give your year of birth', async ({ page }) => {
  await expect(page.locator('#tree')).toBeHidden();
  await expect(page.locator('#finale')).toBeHidden();
  await page.click('#ctaGrow');
  await expect(page.locator('#setupError')).toContainText('year of birth is needed');
  await page.fill('#youBorn', '2099');
  await page.click('#ctaGrow');
  await expect(page.locator('#setupError')).toContainText('between');
  await expect(page.locator('#tree')).toBeHidden();
});

test('the tree starts with you and two empty places for your parents', async ({ page }) => {
  await growTree(page);
  await expect(page.locator('#rootsSvg .node.empty')).toHaveCount(2);
  // A country typed in Italian is stored with its English name.
  expect((await saved(page)).people[1]).toMatchObject({ name: 'Sofia Rossi', born: 2003, country: 'Italy' });
});

test('a parent cannot be born after their child', async ({ page }) => {
  await growTree(page);
  await place(page, 2).click();
  await expect(page.locator('#panelTitle')).toContainText('Add your father');
  await page.fill('#pName', 'Marco Rossi');
  await page.fill('#pBorn', '2010');
  await page.click('#personForm button[type=submit]');
  await expect(page.locator('#panelError')).toContainText('born before their child');

  await page.fill('#pBorn', '1971');
  await page.locator('#pLiving').check();
  await expect(page.locator('#pDied')).toBeDisabled();
  await page.click('#personForm button[type=submit]');
  await expect(page.locator('#panel')).not.toHaveClass(/open/);
  // The father is in the tree, and the places of his own parents have opened.
  await expect(place(page, 2)).toHaveClass(/known/);
  await expect(place(page, 4)).toHaveClass(/empty/);
  await expect(place(page, 5)).toHaveClass(/empty/);
});

test('a person can be added with the keyboard alone', async ({ page }) => {
  await growTree(page);
  await place(page, 3).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#panel')).toHaveClass(/open/);
  await page.fill('#pName', 'Elena Weber');
  await page.fill('#pBorn', '1974');
  await page.fill('#pCountry', 'Germania');
  await page.keyboard.press('Enter');
  await expect(page.locator('#panel')).not.toHaveClass(/open/);
  expect((await saved(page)).people[3]).toMatchObject({ name: 'Elena Weber', country: 'Germany' });
});

test('a year of death before the year of birth is refused, and a story can be added', async ({ page }) => {
  await growFamily(page);
  await expect(page.locator('#treeCount')).toHaveText(/^5 of 62/);

  await place(page, 4).click();
  await page.fill('#pDied', '1930');
  await page.click('#personForm button[type=submit]');
  await expect(page.locator('#panelError')).toContainText('death comes before');
  await page.fill('#pDied', '2015');
  await page.fill('#pNote', 'Repaired bicycles by the port.');
  await page.click('#personForm button[type=submit]');
  await expect(page.locator('#panel')).not.toHaveClass(/open/);
  expect((await saved(page)).people[4].note).toBe('Repaired bicycles by the port.');

  await place(page, 9).click();
  await expect(page.locator('#panel')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#panel')).not.toHaveClass(/open/);
});

test('generations and origins are counted from the people in the tree', async ({ page }) => {
  await growFamily(page);
  await expect(page.locator('#genStats')).toContainText('5 / 62');
  await expect(page.locator('#genStats')).toContainText('1912');
  await expect(page.locator('#genList .gen-row')).toHaveCount(5);
  await expect(page.locator('#genList .cell.known')).toHaveCount(5);
  await expect(page.locator('#originsLede')).toContainText('2 countries');
  await expect(page.locator('#originLegend .chip')).toHaveCount(2);
  await expect(page.locator('#placeGrid .place-card')).toHaveCount(3); // Turin, Munich, Naples
});

test('the numbers double with every generation: 2 parents, over a billion places 30 back', async ({
  page
}) => {
  await growFamily(page);
  await setRange(page.locator('#genSlider'), 1);
  await expect(page.locator('#ancestorsNum')).toHaveText('2');
  await expect(page.locator('#ancestorsLabel')).toHaveText(/^parents/);
  await expect(page.locator('#ancestorDots i.a, #ancestorDots i.b')).toHaveCount(2);

  await setRange(page.locator('#genSlider'), 30);
  await expect(page.locator('#ancestorsNum')).toHaveText('1,073,741,824');
  await expect(page.locator('#collapseNote')).toContainText('More places');
  await expect(page.locator('#ancestorDots i')).toHaveCount(1024); // the dots stop there
  await expect(page.locator('#dotsCaption')).toContainText('stands for');
});

test('the years per generation can be changed and put back to the family average', async ({ page }) => {
  await growFamily(page);
  await expect(page.locator('#intervalReset')).toBeHidden();
  await setRange(page.locator('#intervalSlider'), 35);
  await expect(page.locator('#intervalVal')).toHaveText('35');
  await page.click('#intervalReset');
  await expect(page.locator('#intervalReset')).toBeHidden();
});

test('lifelines: one bar for each person, and the lives that overlap with yours', async ({ page }) => {
  await growFamily(page);
  await expect(page.locator('#lifeChart .lc-bar')).toHaveCount(6);
  await expect(page.locator('#lifeChart .lc-bar.living')).toHaveCount(4);
  await expect(page.locator('#lifeLede')).toContainText('overlaps with 4');
});

test('the closing button suggests who to ask about and opens their place', async ({ page }) => {
  await growFamily(page);
  await page.click('#ctaAsk');
  await expect(page.locator('#askCard')).toContainText('Ask about your');
  await page.click('#askCard [data-open]');
  await expect(page.locator('#panel')).toHaveClass(/open/);
  await expect(page.locator('#panelTitle')).toHaveText(/^Add your/);
  await page.click('#panelCancel');
  await expect(page.locator('#panel')).not.toHaveClass(/open/);
});

test('a copy of the tree can be saved, and loading it brings back a removed branch', async ({
  page
}, testInfo) => {
  await growFamily(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#exportBtn')]);
  const file = testInfo.outputPath('tree.json');
  await download.saveAs(file);
  const copy = JSON.parse(readFileSync(file, 'utf8'));
  expect(copy.app).toBe('ROOTS');
  expect(Object.keys(copy.people)).toHaveLength(6);

  // Removing the father removes everyone above him too.
  await place(page, 2).click();
  await page.click('#panelRemove'); // the confirmation is accepted by the test helper
  await expect(known(page)).toHaveCount(2);

  await page.setInputFiles('#importInput', file);
  await expect(known(page)).toHaveCount(6);
});

test('a file that is not a ROOTS tree is refused', async ({ page }, testInfo) => {
  await growFamily(page);
  const file = testInfo.outputPath('other.json');
  writeFileSync(file, '{"hello":1}');
  await page.setInputFiles('#importInput', file);
  await expect(page.locator('#toast')).toContainText('isn’t a ROOTS family');
  await expect(known(page)).toHaveCount(6);
});

test('everything is still there after a reload, and reset clears it', async ({ page }) => {
  await growFamily(page);
  await page.reload();
  await expect(page.locator('#tree')).toBeVisible();
  await expect(known(page)).toHaveCount(6);
  await expect(page.locator('#youName')).toHaveValue('Sofia Rossi');

  await page.click('#resetBtn'); // the confirmation is accepted by the test helper
  await expect(page.locator('#tree')).toBeHidden();
  await expect(page.locator('#youName')).toHaveValue('');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the tree grows without animations', async ({ page }) => {
    await page.fill('#youBorn', '1990');
    await page.click('#ctaGrow');
    await expect(page.locator('#rootsSvg .node')).toHaveCount(3);
  });
});
