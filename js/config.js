/**
 * Constants: the size of the tree, limits, generation names, the list of
 * countries and their alternative names, colours and the questions to ask.
 */

export const STORAGE_KEY = 'roots_state_v1';

/** Generations in the tree: you (0), your parents (1) … your 3× great-grandparents (5). */
export const MAX_GEN = 5;

/** The highest slot number, i.e. the last place of the last generation (63). */
export const MAX_SLOT = 2 ** (MAX_GEN + 1) - 1;

export const THIS_YEAR = new Date().getFullYear();

export const MIN_YEAR = 1000;

/** Years between generations when the tree has no birth years to measure it from (a common estimate). */
export const DEFAULT_INTERVAL = 28;

export const INTERVAL_RANGE = [18, 40];

/** Limits applied to everything the user can type, so no field can break the layout or fill the storage. */
export const LIMITS = { name: 60, place: 60, note: 400, fileBytes: 1000000 };

export const GEN_NAMES = [
  'You',
  'Parents',
  'Grandparents',
  'Great-grandparents',
  '2× great-grandparents',
  '3× great-grandparents'
];

/** Countries suggested in the "country of birth" fields: [name, ISO 3166-1 code]. The code only builds a flag. */
// prettier-ignore
export const COUNTRIES = [
  ['Afghanistan', 'AF'], ['Albania', 'AL'], ['Algeria', 'DZ'], ['Andorra', 'AD'], ['Angola', 'AO'],
  ['Antigua and Barbuda', 'AG'], ['Argentina', 'AR'], ['Armenia', 'AM'], ['Australia', 'AU'],
  ['Austria', 'AT'], ['Azerbaijan', 'AZ'], ['Bahamas', 'BS'], ['Bahrain', 'BH'], ['Bangladesh', 'BD'],
  ['Barbados', 'BB'], ['Belarus', 'BY'], ['Belgium', 'BE'], ['Belize', 'BZ'], ['Benin', 'BJ'],
  ['Bhutan', 'BT'], ['Bolivia', 'BO'], ['Bosnia and Herzegovina', 'BA'], ['Botswana', 'BW'],
  ['Brazil', 'BR'], ['Brunei', 'BN'], ['Bulgaria', 'BG'], ['Burkina Faso', 'BF'], ['Burundi', 'BI'],
  ['Cabo Verde', 'CV'], ['Cambodia', 'KH'], ['Cameroon', 'CM'], ['Canada', 'CA'],
  ['Central African Republic', 'CF'], ['Chad', 'TD'], ['Chile', 'CL'], ['China', 'CN'], ['Colombia', 'CO'],
  ['Comoros', 'KM'], ['Congo', 'CG'], ['Costa Rica', 'CR'], ['Croatia', 'HR'], ['Cuba', 'CU'],
  ['Cyprus', 'CY'], ['Czechia', 'CZ'], ["Côte d'Ivoire", 'CI'], ['Denmark', 'DK'], ['Djibouti', 'DJ'],
  ['Dominica', 'DM'], ['Dominican Republic', 'DO'], ['DR Congo', 'CD'], ['Ecuador', 'EC'], ['Egypt', 'EG'],
  ['El Salvador', 'SV'], ['Equatorial Guinea', 'GQ'], ['Eritrea', 'ER'], ['Estonia', 'EE'],
  ['Eswatini', 'SZ'], ['Ethiopia', 'ET'], ['Fiji', 'FJ'], ['Finland', 'FI'], ['France', 'FR'],
  ['Gabon', 'GA'], ['Gambia', 'GM'], ['Georgia', 'GE'], ['Germany', 'DE'], ['Ghana', 'GH'],
  ['Greece', 'GR'], ['Greenland', 'GL'], ['Grenada', 'GD'], ['Guatemala', 'GT'], ['Guinea', 'GN'],
  ['Guinea-Bissau', 'GW'], ['Guyana', 'GY'], ['Haiti', 'HT'], ['Honduras', 'HN'], ['Hong Kong', 'HK'],
  ['Hungary', 'HU'], ['Iceland', 'IS'], ['India', 'IN'], ['Indonesia', 'ID'], ['Iran', 'IR'],
  ['Iraq', 'IQ'], ['Ireland', 'IE'], ['Israel', 'IL'], ['Italy', 'IT'], ['Jamaica', 'JM'], ['Japan', 'JP'],
  ['Jordan', 'JO'], ['Kazakhstan', 'KZ'], ['Kenya', 'KE'], ['Kiribati', 'KI'], ['Kosovo', 'XK'],
  ['Kuwait', 'KW'], ['Kyrgyzstan', 'KG'], ['Laos', 'LA'], ['Latvia', 'LV'], ['Lebanon', 'LB'],
  ['Lesotho', 'LS'], ['Liberia', 'LR'], ['Libya', 'LY'], ['Liechtenstein', 'LI'], ['Lithuania', 'LT'],
  ['Luxembourg', 'LU'], ['Madagascar', 'MG'], ['Malawi', 'MW'], ['Malaysia', 'MY'], ['Maldives', 'MV'],
  ['Mali', 'ML'], ['Malta', 'MT'], ['Marshall Islands', 'MH'], ['Mauritania', 'MR'], ['Mauritius', 'MU'],
  ['Mexico', 'MX'], ['Micronesia', 'FM'], ['Moldova', 'MD'], ['Monaco', 'MC'], ['Mongolia', 'MN'],
  ['Montenegro', 'ME'], ['Morocco', 'MA'], ['Mozambique', 'MZ'], ['Myanmar', 'MM'], ['Namibia', 'NA'],
  ['Nauru', 'NR'], ['Nepal', 'NP'], ['Netherlands', 'NL'], ['New Zealand', 'NZ'], ['Nicaragua', 'NI'],
  ['Niger', 'NE'], ['Nigeria', 'NG'], ['North Korea', 'KP'], ['North Macedonia', 'MK'], ['Norway', 'NO'],
  ['Oman', 'OM'], ['Pakistan', 'PK'], ['Palau', 'PW'], ['Palestine', 'PS'], ['Panama', 'PA'],
  ['Papua New Guinea', 'PG'], ['Paraguay', 'PY'], ['Peru', 'PE'], ['Philippines', 'PH'], ['Poland', 'PL'],
  ['Portugal', 'PT'], ['Puerto Rico', 'PR'], ['Qatar', 'QA'], ['Romania', 'RO'], ['Russia', 'RU'],
  ['Rwanda', 'RW'], ['Saint Kitts and Nevis', 'KN'], ['Saint Lucia', 'LC'],
  ['Saint Vincent and the Grenadines', 'VC'], ['Samoa', 'WS'], ['San Marino', 'SM'], ['Saudi Arabia', 'SA'],
  ['Senegal', 'SN'], ['Serbia', 'RS'], ['Seychelles', 'SC'], ['Sierra Leone', 'SL'], ['Singapore', 'SG'],
  ['Slovakia', 'SK'], ['Slovenia', 'SI'], ['Solomon Islands', 'SB'], ['Somalia', 'SO'],
  ['South Africa', 'ZA'], ['South Korea', 'KR'], ['South Sudan', 'SS'], ['Spain', 'ES'],
  ['Sri Lanka', 'LK'], ['Sudan', 'SD'], ['Suriname', 'SR'], ['Sweden', 'SE'], ['Switzerland', 'CH'],
  ['Syria', 'SY'], ['São Tomé and Príncipe', 'ST'], ['Taiwan', 'TW'], ['Tajikistan', 'TJ'],
  ['Tanzania', 'TZ'], ['Thailand', 'TH'], ['Timor-Leste', 'TL'], ['Togo', 'TG'], ['Tonga', 'TO'],
  ['Trinidad and Tobago', 'TT'], ['Tunisia', 'TN'], ['Turkey', 'TR'], ['Turkmenistan', 'TM'],
  ['Tuvalu', 'TV'], ['Uganda', 'UG'], ['Ukraine', 'UA'], ['United Arab Emirates', 'AE'],
  ['United Kingdom', 'GB'], ['United States', 'US'], ['Uruguay', 'UY'], ['Uzbekistan', 'UZ'],
  ['Vanuatu', 'VU'], ['Vatican City', 'VA'], ['Venezuela', 'VE'], ['Vietnam', 'VN'], ['Yemen', 'YE'],
  ['Zambia', 'ZM'], ['Zimbabwe', 'ZW']
];

/**
 * Other names people type for the same country, including the Italian ones,
 * so that "Italia" and "Italy" are counted as one place. Keys are written
 * the way normKey() leaves them: lower case, without accents.
 */
// prettier-ignore
export const COUNTRY_ALIASES = {
  usa: 'United States', 'u.s.a.': 'United States', us: 'United States', 'u.s.': 'United States',
  america: 'United States', 'united states of america': 'United States', uk: 'United Kingdom',
  'u.k.': 'United Kingdom', 'great britain': 'United Kingdom', britain: 'United Kingdom',
  holland: 'Netherlands', 'the netherlands': 'Netherlands', 'czech republic': 'Czechia',
  'ivory coast': "Côte d'Ivoire", burma: 'Myanmar', swaziland: 'Eswatini', macedonia: 'North Macedonia',
  turkiye: 'Turkey', 'east timor': 'Timor-Leste', 'democratic republic of the congo': 'DR Congo',
  vatican: 'Vatican City', 'holy see': 'Vatican City', italia: 'Italy', francia: 'France',
  germania: 'Germany', spagna: 'Spain', svizzera: 'Switzerland', 'stati uniti': 'United States',
  'regno unito': 'United Kingdom', brasile: 'Brazil', belgio: 'Belgium', grecia: 'Greece',
  croazia: 'Croatia', marocco: 'Morocco', egitto: 'Egypt', cina: 'China', giappone: 'Japan',
  polonia: 'Poland', ucraina: 'Ukraine', messico: 'Mexico', 'paesi bassi': 'Netherlands',
  olanda: 'Netherlands', portogallo: 'Portugal', irlanda: 'Ireland', turchia: 'Turkey',
  filippine: 'Philippines', cile: 'Chile', svezia: 'Sweden', norvegia: 'Norway', danimarca: 'Denmark',
  finlandia: 'Finland', ungheria: 'Hungary', 'repubblica ceca': 'Czechia', slovacchia: 'Slovakia',
  libia: 'Libya', etiopia: 'Ethiopia', moldavia: 'Moldova', lussemburgo: 'Luxembourg', russia: 'Russia',
  bosnia: 'Bosnia and Herzegovina'
};

/** Colours for the countries of origin, in order of how many people were born there. Earthy, but told apart easily. */
export const COUNTRY_COLORS = [
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
export const QUESTIONS = [
  'What was {his} name, and where was {he} born?',
  'What work did {he} do?',
  'Where did {he} grow up?',
  'What does the family still say about {him}?',
  'Is there a photo of {him} somewhere?'
];

/** Questions for someone already in the tree who has no story yet. */
export const STORY_QUESTIONS = [
  'What was {he} like?',
  'What is the first thing anyone remembers about {him}?',
  'What did {he} leave to the family?'
];
