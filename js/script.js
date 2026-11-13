/**
 * ROOTS — a family tree that grows downwards, like roots.
 *
 * Architecture
 * ------------
 * - Three plain files: index.html (markup), css/style.css and this script.
 *   No build step, no framework, no backend.
 * - All user data lives in one `state` object, saved to localStorage after
 *   every change. Render functions only ever READ from `state` and rebuild
 *   their own section, so what's on screen always matches what's saved.
 * - Slots: every place in the tree has a number (the Ahnentafel numbering
 *   genealogists use). You are 1; anyone's father is 2 × their number and
 *   their mother 2 × their number + 1. So your parents are 2 and 3, your
 *   grandparents 4–7, and generation g holds the numbers 2^g … 2^(g+1) − 1.
 *   A person's generation, side of the family and exact relationship to you
 *   can all be read from their number alone, so they are never stored.
 * - The tree is drawn in SVG from scratch on every change: at most 63
 *   people, so a full redraw is instant and keeps the code simple.
 * - Code order: constants, state & persistence, helpers, derived figures,
 *   one render function per section, the person panel, flow, events, init.
 * - Modern JavaScript that every current browser runs natively (const/let,
 *   arrow functions, template literals), so there is nothing to transpile.
 */
(() => {
  'use strict';

  /* ============================================================================
     CONSTANTS
     ============================================================================ */

  const STORAGE_KEY = 'roots_state_v1';
  /** Generations in the tree: you (0), your parents (1) … your 3× great-grandparents (5). */
  const MAX_GEN = 5;
  /** The highest slot number, i.e. the last place of the last generation (63). */
  const MAX_SLOT = 2 ** (MAX_GEN + 1) - 1;
  const THIS_YEAR = new Date().getFullYear();
  const MIN_YEAR = 1000;
  /** Years between generations when the tree has no birth years to measure it from (a common estimate). */
  const DEFAULT_INTERVAL = 28;
  const INTERVAL_RANGE = [18, 40];
  /** Limits applied to everything the user can type, so no field can break the layout or fill the storage. */
  const LIMITS = { name: 60, place: 60, note: 400, fileBytes: 1000000 };

  const GEN_NAMES = [
    'You',
    'Parents',
    'Grandparents',
    'Great-grandparents',
    '2× great-grandparents',
    '3× great-grandparents'
  ];

  /** Countries suggested in the "country of birth" fields: [name, ISO 3166-1 code]. The code only builds a flag. */
  const COUNTRIES = [
    ['Afghanistan', 'AF'],
    ['Albania', 'AL'],
    ['Algeria', 'DZ'],
    ['Andorra', 'AD'],
    ['Angola', 'AO'],
    ['Antigua and Barbuda', 'AG'],
    ['Argentina', 'AR'],
    ['Armenia', 'AM'],
    ['Australia', 'AU'],
    ['Austria', 'AT'],
    ['Azerbaijan', 'AZ'],
    ['Bahamas', 'BS'],
    ['Bahrain', 'BH'],
    ['Bangladesh', 'BD'],
    ['Barbados', 'BB'],
    ['Belarus', 'BY'],
    ['Belgium', 'BE'],
    ['Belize', 'BZ'],
    ['Benin', 'BJ'],
    ['Bhutan', 'BT'],
    ['Bolivia', 'BO'],
    ['Bosnia and Herzegovina', 'BA'],
    ['Botswana', 'BW'],
    ['Brazil', 'BR'],
    ['Brunei', 'BN'],
    ['Bulgaria', 'BG'],
    ['Burkina Faso', 'BF'],
    ['Burundi', 'BI'],
    ['Cabo Verde', 'CV'],
    ['Cambodia', 'KH'],
    ['Cameroon', 'CM'],
    ['Canada', 'CA'],
    ['Central African Republic', 'CF'],
    ['Chad', 'TD'],
    ['Chile', 'CL'],
    ['China', 'CN'],
    ['Colombia', 'CO'],
    ['Comoros', 'KM'],
    ['Congo', 'CG'],
    ['Costa Rica', 'CR'],
    ['Croatia', 'HR'],
    ['Cuba', 'CU'],
    ['Cyprus', 'CY'],
    ['Czechia', 'CZ'],
    ["Côte d'Ivoire", 'CI'],
    ['Denmark', 'DK'],
    ['Djibouti', 'DJ'],
    ['Dominica', 'DM'],
    ['Dominican Republic', 'DO'],
    ['DR Congo', 'CD'],
    ['Ecuador', 'EC'],
    ['Egypt', 'EG'],
    ['El Salvador', 'SV'],
    ['Equatorial Guinea', 'GQ'],
    ['Eritrea', 'ER'],
    ['Estonia', 'EE'],
    ['Eswatini', 'SZ'],
    ['Ethiopia', 'ET'],
    ['Fiji', 'FJ'],
    ['Finland', 'FI'],
    ['France', 'FR'],
    ['Gabon', 'GA'],
    ['Gambia', 'GM'],
    ['Georgia', 'GE'],
    ['Germany', 'DE'],
    ['Ghana', 'GH'],
    ['Greece', 'GR'],
    ['Greenland', 'GL'],
    ['Grenada', 'GD'],
    ['Guatemala', 'GT'],
    ['Guinea', 'GN'],
    ['Guinea-Bissau', 'GW'],
    ['Guyana', 'GY'],
    ['Haiti', 'HT'],
    ['Honduras', 'HN'],
    ['Hong Kong', 'HK'],
    ['Hungary', 'HU'],
    ['Iceland', 'IS'],
    ['India', 'IN'],
    ['Indonesia', 'ID'],
    ['Iran', 'IR'],
    ['Iraq', 'IQ'],
    ['Ireland', 'IE'],
    ['Israel', 'IL'],
    ['Italy', 'IT'],
    ['Jamaica', 'JM'],
    ['Japan', 'JP'],
    ['Jordan', 'JO'],
    ['Kazakhstan', 'KZ'],
    ['Kenya', 'KE'],
    ['Kiribati', 'KI'],
    ['Kosovo', 'XK'],
    ['Kuwait', 'KW'],
    ['Kyrgyzstan', 'KG'],
    ['Laos', 'LA'],
    ['Latvia', 'LV'],
    ['Lebanon', 'LB'],
    ['Lesotho', 'LS'],
    ['Liberia', 'LR'],
    ['Libya', 'LY'],
    ['Liechtenstein', 'LI'],
    ['Lithuania', 'LT'],
    ['Luxembourg', 'LU'],
    ['Madagascar', 'MG'],
    ['Malawi', 'MW'],
    ['Malaysia', 'MY'],
    ['Maldives', 'MV'],
    ['Mali', 'ML'],
    ['Malta', 'MT'],
    ['Marshall Islands', 'MH'],
    ['Mauritania', 'MR'],
    ['Mauritius', 'MU'],
    ['Mexico', 'MX'],
    ['Micronesia', 'FM'],
    ['Moldova', 'MD'],
    ['Monaco', 'MC'],
    ['Mongolia', 'MN'],
    ['Montenegro', 'ME'],
    ['Morocco', 'MA'],
    ['Mozambique', 'MZ'],
    ['Myanmar', 'MM'],
    ['Namibia', 'NA'],
    ['Nauru', 'NR'],
    ['Nepal', 'NP'],
    ['Netherlands', 'NL'],
    ['New Zealand', 'NZ'],
    ['Nicaragua', 'NI'],
    ['Niger', 'NE'],
    ['Nigeria', 'NG'],
    ['North Korea', 'KP'],
    ['North Macedonia', 'MK'],
    ['Norway', 'NO'],
    ['Oman', 'OM'],
    ['Pakistan', 'PK'],
    ['Palau', 'PW'],
    ['Palestine', 'PS'],
    ['Panama', 'PA'],
    ['Papua New Guinea', 'PG'],
    ['Paraguay', 'PY'],
    ['Peru', 'PE'],
    ['Philippines', 'PH'],
    ['Poland', 'PL'],
    ['Portugal', 'PT'],
    ['Puerto Rico', 'PR'],
    ['Qatar', 'QA'],
    ['Romania', 'RO'],
    ['Russia', 'RU'],
    ['Rwanda', 'RW'],
    ['Saint Kitts and Nevis', 'KN'],
    ['Saint Lucia', 'LC'],
    ['Saint Vincent and the Grenadines', 'VC'],
    ['Samoa', 'WS'],
    ['San Marino', 'SM'],
    ['Saudi Arabia', 'SA'],
    ['Senegal', 'SN'],
    ['Serbia', 'RS'],
    ['Seychelles', 'SC'],
    ['Sierra Leone', 'SL'],
    ['Singapore', 'SG'],
    ['Slovakia', 'SK'],
    ['Slovenia', 'SI'],
    ['Solomon Islands', 'SB'],
    ['Somalia', 'SO'],
    ['South Africa', 'ZA'],
    ['South Korea', 'KR'],
    ['South Sudan', 'SS'],
    ['Spain', 'ES'],
    ['Sri Lanka', 'LK'],
    ['Sudan', 'SD'],
    ['Suriname', 'SR'],
    ['Sweden', 'SE'],
    ['Switzerland', 'CH'],
    ['Syria', 'SY'],
    ['São Tomé and Príncipe', 'ST'],
    ['Taiwan', 'TW'],
    ['Tajikistan', 'TJ'],
    ['Tanzania', 'TZ'],
    ['Thailand', 'TH'],
    ['Timor-Leste', 'TL'],
    ['Togo', 'TG'],
    ['Tonga', 'TO'],
    ['Trinidad and Tobago', 'TT'],
    ['Tunisia', 'TN'],
    ['Turkey', 'TR'],
    ['Turkmenistan', 'TM'],
    ['Tuvalu', 'TV'],
    ['Uganda', 'UG'],
    ['Ukraine', 'UA'],
    ['United Arab Emirates', 'AE'],
    ['United Kingdom', 'GB'],
    ['United States', 'US'],
    ['Uruguay', 'UY'],
    ['Uzbekistan', 'UZ'],
    ['Vanuatu', 'VU'],
    ['Vatican City', 'VA'],
    ['Venezuela', 'VE'],
    ['Vietnam', 'VN'],
    ['Yemen', 'YE'],
    ['Zambia', 'ZM'],
    ['Zimbabwe', 'ZW']
  ];

  /**
   * Other names people type for the same country, including the Italian ones,
   * so that "Italia" and "Italy" are counted as one place. Keys are written
   * the way normKey() leaves them: lower case, without accents.
   */
  const COUNTRY_ALIASES = {
    usa: 'United States',
    'u.s.a.': 'United States',
    us: 'United States',
    'u.s.': 'United States',
    america: 'United States',
    'united states of america': 'United States',
    uk: 'United Kingdom',
    'u.k.': 'United Kingdom',
    'great britain': 'United Kingdom',
    britain: 'United Kingdom',
    holland: 'Netherlands',
    'the netherlands': 'Netherlands',
    'czech republic': 'Czechia',
    'ivory coast': "Côte d'Ivoire",
    burma: 'Myanmar',
    swaziland: 'Eswatini',
    macedonia: 'North Macedonia',
    turkiye: 'Turkey',
    'east timor': 'Timor-Leste',
    'democratic republic of the congo': 'DR Congo',
    vatican: 'Vatican City',
    'holy see': 'Vatican City',
    italia: 'Italy',
    francia: 'France',
    germania: 'Germany',
    spagna: 'Spain',
    svizzera: 'Switzerland',
    'stati uniti': 'United States',
    'regno unito': 'United Kingdom',
    brasile: 'Brazil',
    belgio: 'Belgium',
    grecia: 'Greece',
    croazia: 'Croatia',
    marocco: 'Morocco',
    egitto: 'Egypt',
    cina: 'China',
    giappone: 'Japan',
    polonia: 'Poland',
    ucraina: 'Ukraine',
    messico: 'Mexico',
    'paesi bassi': 'Netherlands',
    olanda: 'Netherlands',
    portogallo: 'Portugal',
    irlanda: 'Ireland',
    turchia: 'Turkey',
    filippine: 'Philippines',
    cile: 'Chile',
    svezia: 'Sweden',
    norvegia: 'Norway',
    danimarca: 'Denmark',
    finlandia: 'Finland',
    ungheria: 'Hungary',
    'repubblica ceca': 'Czechia',
    slovacchia: 'Slovakia',
    libia: 'Libya',
    etiopia: 'Ethiopia',
    moldavia: 'Moldova',
    lussemburgo: 'Luxembourg',
    russia: 'Russia',
    bosnia: 'Bosnia and Herzegovina'
  };

  /** Colours for the countries of origin, in order of how many people were born there. Earthy, but told apart easily. */
  const COUNTRY_COLORS = [
    '#A3C46F',
    '#D9A066',
    '#CB7A5D',
    '#E3CBA2',
    '#86A88F',
    '#9A7454',
    '#DE9473',
    '#B98E5E'
  ];

  /** Questions to ask the family about someone not yet in the tree. {he}/{his}/{him} follow the person's place. */
  const QUESTIONS = [
    'What was {his} name, and where was {he} born?',
    'What work did {he} do?',
    'Where did {he} grow up?',
    'What does the family still say about {him}?',
    'Is there a photo of {him} somewhere?'
  ];
  /** Questions for someone already in the tree who has no story yet. */
  const STORY_QUESTIONS = [
    'What was {he} like?',
    'What is the first thing anyone remembers about {him}?',
    'What did {he} leave to the family?'
  ];

  /* ============================================================================
     STATE & PERSISTENCE
     ============================================================================ */

  /**
   * Shape of the saved state:
   *   { people: { [slot]: { name, born, died, living, place, country, note } },
   *     interval: years per generation chosen with the slider, or null for automatic }
   * A slot with no entry is a place not added yet. Slot 1 (you) always has a
   * year of birth once the setup form is done.
   */
  let state = { people: {}, interval: null };

  /** Shorthand for document.getElementById. */
  function $(id) {
    return document.getElementById(id);
  }

  /** Trims and shortens a piece of user text; anything that isn't a string becomes ''. */
  function cleanText(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
  }

  /** A whole year between MIN_YEAR and this year, or null. */
  function cleanYear(value) {
    const n = parseInt(value, 10);
    return isFinite(n) && n >= MIN_YEAR && n <= THIS_YEAR ? n : null;
  }

  /** A years-per-generation value inside the slider's range, or null. */
  function cleanInterval(value) {
    const n = parseInt(value, 10);
    return n >= INTERVAL_RANGE[0] && n <= INTERVAL_RANGE[1] ? n : null;
  }

  /**
   * Cleans one person: keeps only known fields with valid values. Run on
   * everything that comes from storage, from a loaded file and from the forms,
   * so corrupted or hand-edited data can never crash the app or inject markup.
   * @param {*} raw
   * @param {number} n - the person's slot
   * @returns {object|null} a clean person, or null if there is nothing to keep
   */
  function sanitizePerson(raw, n) {
    if (!raw || typeof raw !== 'object') return null;
    const p = {
      name: cleanText(raw.name, LIMITS.name),
      born: cleanYear(raw.born),
      died: null,
      living: false,
      place: cleanText(raw.place, LIMITS.place),
      country: cleanText(raw.country, LIMITS.place),
      note: cleanText(raw.note, LIMITS.note)
    };
    if (n === 1) {
      p.living = true; // you
      if (p.born === null) return null; // everything is measured from your year of birth
    } else {
      p.living = raw.living === true;
      if (!p.living) {
        const died = cleanYear(raw.died);
        if (died !== null && (p.born === null || died >= p.born)) p.died = died;
      }
      if (!p.name && p.born === null && !p.place && !p.country) return null;
    }
    return p;
  }

  /**
   * Cleans a whole family: valid slots only, and nobody whose child is
   * missing, so the tree always stays connected to you. Slots are walked in
   * increasing order, and a child's number is always smaller than its
   * parents', so removing one person also removes everyone above them.
   * @param {*} raw - { [slot]: person }
   * @returns {Object<number,object>}
   */
  function sanitizePeople(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach((key) => {
      if (!/^\d{1,2}$/.test(key)) return;
      const n = +key;
      if (n < 1 || n > MAX_SLOT) return;
      const p = sanitizePerson(raw[key], n);
      if (p) out[n] = p;
    });
    for (let n = 2; n <= MAX_SLOT; n++) if (out[n] && !out[n >> 1]) delete out[n];
    return out;
  }

  /** Reads the saved state; unreadable data simply starts an empty tree. */
  function loadState() {
    const fresh = { people: {}, interval: null };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fresh;
      const parsed = JSON.parse(raw) || {};
      fresh.people = sanitizePeople(parsed.people);
      fresh.interval = cleanInterval(parsed.interval);
    } catch (e) {
      /* unreadable data: start fresh rather than crash */
    }
    return fresh;
  }

  /**
   * Writes the state to localStorage.
   * @returns {boolean} false if the browser refused (some private modes): the
   *   app keeps working, and the caller tells the user it isn't being saved.
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ============================================================================
     HELPERS
     ============================================================================ */

  /**
   * Escapes text for safe insertion into HTML and SVG markup, element content
   * and attribute values alike (quotes included). Every piece of user text
   * passes through here before it touches innerHTML.
   * @param {*} value
   * @returns {string}
   */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Rounds and formats a number with thousands separators, e.g. 1048576 → "1,048,576". */
  function fmtInt(v) {
    return Math.round(v).toLocaleString('en-US');
  }

  /** English plural helper: plural(3, 'country', 'countries') → "3 countries". */
  function plural(n, one, many) {
    return `${fmtInt(n)} ${n === 1 ? one : many || `${one}s`}`;
  }

  /** One decimal place, for SVG coordinates. */
  function f1(v) {
    return Math.round(v * 10) / 10;
  }

  /** A slot's generation: 0 for you, 1 for your parents… (the position of its highest bit). */
  function gen(n) {
    return 31 - Math.clz32(n);
  }

  /**
   * Which side of the family a slot is on: 'y' for you, 'a' for your father's
   * side, 'b' for your mother's. It is the bit just below the highest one.
   */
  function sideOf(n) {
    return n === 1 ? 'y' : (n >> (gen(n) - 1)) & 1 ? 'b' : 'a';
  }

  /** Even slots are fathers, odd slots (other than you) mothers. */
  function isFather(n) {
    return n % 2 === 0;
  }

  /** "Grandmother", "Great-grandfather", "3× great-grandmother"… */
  function genTitle(n) {
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
  function relationLower(n) {
    return relationPath(n).replace(/^Your /, 'your ');
  }

  /** The name to show for a slot: the person's name, or their title ("Grandmother") if it isn't known. */
  function displayName(n) {
    const p = state.people[n];
    return (p && p.name) || (n === 1 ? 'You' : genTitle(n));
  }

  /** "Maria Bianchi" → "MB"; one word → its first letter. */
  function initials(text) {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    return (words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : '')).toUpperCase();
  }

  /** "1931–2009", "b. 1931" or "" for a person. */
  function yearsText(p) {
    if (p.born === null) return p.died !== null ? `died ${p.died}` : '';
    if (!p.living && p.died !== null) return `${p.born}–${p.died}`;
    return `b. ${p.born}`;
  }

  /** Shortens text to `max` characters with an ellipsis. */
  function trunc(text, max) {
    return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
  }

  /** Lower case, accents removed, single spaces: the key used to compare place names. */
  function normKey(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ');
  }

  /** Country name or alias → its [name, code] entry. */
  const COUNTRY_BY_KEY = (() => {
    const map = {};
    COUNTRIES.forEach((c) => {
      map[normKey(c[0])] = c;
    });
    Object.keys(COUNTRY_ALIASES).forEach((key) => {
      const c = map[normKey(COUNTRY_ALIASES[key])];
      if (c) map[key] = c;
    });
    return map;
  })();

  /** The standard spelling of a country if ROOTS knows it ("italia" → "Italy"), otherwise the text as typed. */
  function canonicalCountry(text) {
    const t = cleanText(text, LIMITS.place);
    const c = t && COUNTRY_BY_KEY[normKey(t)];
    return c ? c[0] : t;
  }

  /**
   * Turns an ISO code into a flag emoji: each letter becomes a "regional
   * indicator" character (offset 127397), and a pair of them is a flag.
   * @param {string} iso
   * @returns {string} '' for unknown places
   */
  function flagEmoji(iso) {
    if (!iso || iso.length !== 2) return '';
    return String.fromCodePoint(127397 + iso.charCodeAt(0), 127397 + iso.charCodeAt(1));
  }

  /** The flag for a country name, or '' if it isn't one ROOTS knows (e.g. a country that no longer exists). */
  function flagFor(country) {
    const c = COUNTRY_BY_KEY[normKey(country)];
    return c ? flagEmoji(c[1]) : '';
  }

  /** "he/his/him" or "she/her/her" in a question, following the person's slot. */
  function pronouns(text, n) {
    const f = isFather(n);
    return text
      .replace(/\{he\}/g, f ? 'he' : 'she')
      .replace(/\{his\}/g, f ? 'his' : 'her')
      .replace(/\{him\}/g, f ? 'him' : 'her');
  }

  /** True when the user has asked their system for reduced motion. */
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /**
   * Lights the part of a range slider left of its thumb: CSS draws the track
   * as a gradient that stops at --fill, kept here in step with the value.
   * @param {HTMLInputElement} el
   */
  function paintRange(el) {
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
  function animateNumber(el, target, format, duration) {
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

  /**
   * A small seeded random generator (mulberry32). The same seed always gives
   * the same numbers, so the hand-drawn details of the roots (their hairs, the
   * roots in the hero) look the same on every visit.
   * @param {number} seed
   * @returns {function():number} values in [0, 1)
   */
  function mulberry32(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Today's date as 'YYYY-MM-DD' in the user's own time zone. */
  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  let toastTimer = null;
  /** Shows a short message at the bottom of the screen. */
  function toast(title, body) {
    const el = $('toast');
    el.innerHTML = `<strong>${escapeHtml(title)}</strong>${escapeHtml(body)}`;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 3000);
  }

  /* ============================================================================
     DERIVED FIGURES
     The single source of every number on the page.
     ============================================================================ */

  /** Every slot with a person in it, in order. */
  function knownSlots() {
    const out = [];
    for (let n = 1; n <= MAX_SLOT; n++) if (state.people[n]) out.push(n);
    return out;
  }

  /** How many ancestors have been added (everyone but you). */
  function ancestorsKnown() {
    return Math.max(0, knownSlots().length - 1);
  }

  /** The people added in generation g. */
  function knownInGen(g) {
    const out = [];
    for (let n = 2 ** g; n < 2 ** (g + 1); n++) if (state.people[n]) out.push(n);
    return out;
  }

  /** The deepest generation with anyone in it. */
  function deepestGen() {
    return knownSlots().reduce((d, n) => Math.max(d, gen(n)), 0);
  }

  /** "1931–1940" (or one year) for the people of generation g with a year of birth; '' if none. */
  function birthRange(g) {
    const ys = knownInGen(g)
      .map((n) => state.people[n].born)
      .filter((y) => y !== null);
    if (!ys.length) return '';
    const a = Math.min(...ys),
      b = Math.max(...ys);
    return a === b ? String(a) : `${a}–${b}`;
  }

  /** Places that can be added now: empty slots whose child is in the tree. */
  function missingSlots() {
    const out = [];
    for (let n = 2; n <= MAX_SLOT; n++) if (!state.people[n] && state.people[n >> 1]) out.push(n);
    return out;
  }

  /**
   * Your family's own generation length: the average gap between a parent's
   * year of birth and their child's, over every pair where both are known.
   * @returns {{avg:(number|null), pairs:number}}
   */
  function intervalStats() {
    let sum = 0,
      pairs = 0;
    for (let n = 2; n <= MAX_SLOT; n++) {
      const parent = state.people[n],
        child = state.people[n >> 1];
      if (parent && child && parent.born !== null && child.born !== null && child.born > parent.born) {
        sum += child.born - parent.born;
        pairs++;
      }
    }
    return { avg: pairs ? sum / pairs : null, pairs };
  }

  /** Years per generation used for estimates: the slider's value, else the family average, else the common estimate. */
  function currentInterval() {
    const s = intervalStats();
    const v = state.interval !== null ? state.interval : s.avg ? Math.round(s.avg) : DEFAULT_INTERVAL;
    return Math.max(INTERVAL_RANGE[0], Math.min(INTERVAL_RANGE[1], v));
  }

  /* ============================================================================
     RENDER: THE ROOT SYSTEM
     ============================================================================ */

  let lastAdded = null; // slot just added, so it can sprout on the next draw
  let lastTreeWidth = 0; // to centre the view when the drawing changes width
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
  function renderTree() {
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
  function lightLineage(n) {
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
  function tipHtml(n) {
    const p = state.people[n];
    if (!p) return `<b>${escapeHtml(`Add ${relationLower(n)}`)}</b>${escapeHtml(genTitle(n))}`;
    const lines = [n === 1 ? 'You' : genTitle(n)];
    if (yearsText(p)) lines.push(yearsText(p));
    const where = [p.place, p.country].filter(Boolean).join(', ');
    if (where) lines.push(where);
    return `<b>${escapeHtml(displayName(n))}</b>${escapeHtml(lines.join(' · '))}`;
  }

  /* ============================================================================
     RENDER: GENERATIONS
     ============================================================================ */

  /** The four headline figures and one row of squares per generation. */
  function renderGenerations() {
    // 1. The figures: how many added, how deep, the earliest birth, years per generation.
    const added = ancestorsKnown();
    const deepest = deepestGen();
    const stats = intervalStats();
    let earliest = null;
    knownSlots().forEach((n) => {
      const p = state.people[n];
      if (n > 1 && p.born !== null && (earliest === null || p.born < state.people[earliest].born))
        earliest = n;
    });
    // One stat card.
    function card(label, value, sub) {
      return (
        `<div class="stat-card">` +
        `<span class="stat-label">${label}</span>` +
        `<span class="stat-value">${value}</span>` +
        `<span class="stat-sub">${sub}</span></div>`
      );
    }
    // 2. The four stat cards.
    const first = earliest !== null ? state.people[earliest].born : null;
    $('genStats').innerHTML =
      card(
        'Ancestors added',
        `${added} <small>/ ${MAX_SLOT - 1}</small>`,
        added ? `${plural(deepest, 'generation')} deep` : 'Start with your parents'
      ) +
      card(
        'Earliest birth',
        first !== null ? first : '—',
        first !== null ? escapeHtml(displayName(earliest)) : 'Add their years of birth'
      ) +
      card(
        'Family history',
        first !== null ? `${THIS_YEAR - first} <small>years</small>` : '—',
        first !== null ? `from ${first} to today` : 'Known so far'
      ) +
      card(
        'Years per generation',
        stats.avg ? `${Math.round(stats.avg)} <small>years</small>` : '—',
        stats.pairs ? `from ${plural(stats.pairs, 'parent–child pair')}` : 'Needs years of birth in a line'
      );

    // 3. One row per generation: a square per place, lit for the people added.
    let rows = '';
    for (let g = 1; g <= MAX_GEN; g++) {
      const start = 2 ** g;
      let count = 0;
      let cells = '';
      for (let n = start; n < start * 2; n++) {
        const p = state.people[n];
        const cls = p ? `known side-${sideOf(n)}` : state.people[n >> 1] ? 'open' : '';
        if (p) count++;
        const title = p
          ? `${displayName(n)} · ${genTitle(n)}`
          : `${genTitle(n)} · ${sideOf(n) === 'a' ? 'father’s side' : 'mother’s side'}`;
        cells += `<i class="cell ${cls}" title="${escapeHtml(title)}"></i>`;
      }
      const range = birthRange(g);
      rows +=
        `<div class="gen-row">` +
        `<div class="gen-name">${GEN_NAMES[g]}</div>` +
        `<div class="gen-cells" style="--n:${start}">${cells}</div>` +
        `<div class="gen-meta">` +
        `<b>${count}</b> of ${start}${range ? `<br>born ${range}` : ''}</div></div>`;
    }
    $('genList').innerHTML = rows;
  }

  /* ============================================================================
     RENDER: ORIGINS
     ============================================================================ */

  /**
   * Where the family was born: a bar per generation split by country, a
   * legend of every country, and a card for every town.
   */
  function renderOrigins() {
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

  /* ============================================================================
     RENDER: THE NUMBERS BEHIND YOU
     ============================================================================ */

  /**
   * The doubling: 2^g places in your tree g generations back, roughly when
   * they were born, a dot for each (up to 1,024; beyond that each dot stands
   * for more people), and what happens when the numbers outgrow the world.
   */
  function renderNumbers() {
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

  /* ============================================================================
     RENDER: THEIR LIFETIMES
     ============================================================================ */

  /** Everyone with a year of birth, on one timeline from the earliest birth to today. */
  function renderLifelines() {
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

  /* ============================================================================
     RENDER: FINALE
     ============================================================================ */

  /** The closing line: how many people stand behind you, and how many of them you know. */
  function renderFinale() {
    $('finaleText').innerHTML =
      `<b>${MAX_SLOT - 1} people</b> stand behind you in just five generations, and every one of them had to happen for you to be here. You know <b>${ancestorsKnown()}</b> of them.`;
  }

  /**
   * "Who should I ask about?": someone missing from the nearest generation
   * that still has gaps, with a question to ask the family. Once every place
   * is filled, someone without a story instead.
   */
  function askSomeone() {
    const card = $('askCard');
    const missing = missingSlots();
    let html;
    if (missing.length) {
      const nearest = Math.min(...missing.map(gen));
      const pool = missing.filter((n) => gen(n) === nearest);
      const n = pool[Math.floor(Math.random() * pool.length)];
      html =
        `<div class="ask-who">Ask about ${escapeHtml(relationLower(n))}</div>` +
        `<p class="ask-q">` +
        escapeHtml(pronouns(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)], n)) +
        `</p>` +
        `<button class="btn btn-ghost btn-sm" type="button" data-open="${n}">Add ${isFather(n) ? 'him' : 'her'} to your roots</button>`;
    } else {
      const quiet = knownSlots().filter((k) => k > 1 && !state.people[k].note);
      if (quiet.length) {
        const k = quiet[Math.floor(Math.random() * quiet.length)];
        html =
          `<div class="ask-who">Ask for a story about ${escapeHtml(displayName(k))}</div>` +
          `<p class="ask-q">` +
          escapeHtml(pronouns(STORY_QUESTIONS[Math.floor(Math.random() * STORY_QUESTIONS.length)], k)) +
          `</p>` +
          `<button class="btn btn-ghost btn-sm" type="button" data-open="${k}">Add the story</button>`;
      } else {
        html =
          '<div class="ask-who">Every root is traced</div><p class="ask-q">Five generations, every name, every story. Now tell them to someone younger.</p>';
      }
    }
    card.innerHTML = html;
    card.hidden = false;
    card.classList.remove('show');
    void card.offsetWidth; // restart the arrival animation
    card.classList.add('show');
  }

  /** Redraws every section from the state. */
  function renderAll() {
    renderTree();
    renderGenerations();
    renderOrigins();
    renderNumbers();
    renderLifelines();
    renderFinale();
  }

  /** Fills the setup form with what is saved about you (leaving alone a field being typed in). */
  function renderSetup() {
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

  /* ============================================================================
     THE PERSON PANEL
     ============================================================================ */

  let panelN = null; // slot shown in the panel
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
  function validatePerson(n, raw) {
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
  function openPanel(n) {
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
  function closePanel() {
    if (panelN === null) return;
    panelN = null;
    $('panel').classList.remove('open');
    $('panelScrim').classList.remove('open');
    const back = document.querySelector(`#rootsSvg .node[data-n="${returnFocusN}"]`);
    if (back && back.focus) back.focus({ preventScroll: true });
  }

  /** Saves the panel's form: checks it, stores the person, redraws, and lets the new person sprout. */
  function savePanel() {
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
    if (isNew) lastAdded = n;
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
  function removePerson(n) {
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

  /* ============================================================================
     FLOW
     ============================================================================ */

  const GATED_IDS = ['tree', 'generations', 'origins', 'numbers', 'lifelines', 'finale'];
  let revealed = false;

  /**
   * Shows the sections that need you in the tree, draws them, and hands them
   * to the reveal observer.
   * @param {boolean} scroll - scroll to the tree (after the setup form; not on a return visit)
   */
  function revealResults(scroll) {
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
  function handleGrow() {
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
  function exportFamily() {
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
  function importFamily(file) {
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
      } catch (e) {
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
      lastTreeWidth = 0;
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

  /* ============================================================================
     EVENTS
     ============================================================================ */

  /** Shows the shared tooltip at a point. */
  function showTip(x, y, html) {
    const tip = $('tooltip');
    tip.innerHTML = html;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.style.opacity = 1;
  }
  // Hides the tree tooltip.
  function hideTip() {
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
      let visible = false;
      try {
        visible = node && node.matches(':focus-visible');
      } catch (err) {
        visible = !!node;
      }
      if (visible)
        lightLineage(state.people[+node.getAttribute('data-n')] ? +node.getAttribute('data-n') : 0);
    });
    svg.addEventListener('focusout', () => {
      lightLineage(0);
    });
  }

  /** Wires every control on the page. Called once at start-up. */
  function bindEvents() {
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
      if (
        !confirm('Erase your whole ROOTS tree? This can’t be undone. (Use "Save a copy" first to keep it.)')
      )
        return;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
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

  /* ============================================================================
     MOTION & LIGHT
     ============================================================================ */

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
  function observeReveal(el) {
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
  function growHeroRoots() {
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
  function setupPointerEffects() {
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
  function setupScrollProgress() {
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

  /* ============================================================================
     INIT
     ============================================================================ */

  /**
   * Start-up: load the saved tree, fill the form and the country suggestions,
   * wire the events and, for a returning visitor, show their tree straight away.
   */
  function init() {
    state = loadState();
    $('countryList').innerHTML = COUNTRIES.map((c) => `<option value="${escapeHtml(c[0])}">`).join('');
    $('youBorn').min = MIN_YEAR;
    $('youBorn').max = THIS_YEAR;
    renderSetup();
    growHeroRoots();
    bindEvents();
    setupScrollProgress();
    setupPointerEffects();
    if (state.people[1]) revealResults(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*
   Service worker: makes the app installable and lets it open offline once
   visited. Only registered over http(s) — browsers don't allow service
   workers on file:// pages, where the app still works normally.
*/
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      /* offline mode unavailable; the app still works online */
    });
  });
}
