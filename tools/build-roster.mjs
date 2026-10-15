import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// This builder reads the pinned, vendored assets. It never needs a network call.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'browser/assets/flags');
const provenance = JSON.parse(await readFile(path.join(assets, 'source.json'), 'utf8'));
const metadataRaw = await readFile(path.join(assets, 'countries-source.json'));
const licenseRaw = await readFile(path.join(assets, 'LICENSE.txt'));
const sha256 = value => createHash('sha256').update(value).digest('hex');
if (sha256(metadataRaw) !== provenance.metadataSha256 || sha256(licenseRaw) !== provenance.licenseSha256)
  throw new Error('Pinned country metadata or license checksum does not match source.json.');

// Explicit membership avoids treating dependent territories as independent states.
const ids = provenance.countryIds;
if (ids.length !== 196 || new Set(ids).size !== 196 || !ids.every(id => /^[a-z]{2}$/.test(id)))
  throw new Error('The roster must contain exactly 196 unique, lowercase ISO2 IDs.');
const sourceCountries = new Map(JSON.parse(metadataRaw.toString()).map(c => [c.code, c]));
const flagSvgs = {};
for (const id of [...ids].sort()) {
  const raw = await readFile(path.join(assets, id + '.svg'));
  if (sha256(raw) !== provenance.files[id]?.sha256)
    throw new Error('Pinned flag checksum does not match: ' + id);
  const svg = raw.toString();
  if (!svg.trimStart().startsWith('<svg') || /<script|\bon[a-z]+\s*=|(?:href|src)=["'](?:https?:)?\/\//i.test(svg))
    throw new Error('The flag must be a self-contained SVG: ' + id);
  flagSvgs[id] = svg;
}

const legacy = {
  jp: { name: 'Horizon Sentinel', style: 'Striker', colors: ['#ff596c', '#ffe2cc'], hp: 1000, speed: 3.7, weight: 'medium', stage: 'Crimson Skyline', quote: 'Focus finds the opening.' },
  pk: { name: 'Crescent Vanguard', style: 'Grappler', colors: ['#36d997', '#d8f9e8'], hp: 1050, speed: 3.1, weight: 'heavy', stage: 'Emerald Pavilion', quote: 'Every round is a new beginning.' },
  br: { name: 'Aurora Flow', style: 'Trickster', colors: ['#f2d35c', '#68dcad'], hp: 950, speed: 4.5, weight: 'light', stage: 'Golden Coast', quote: 'Keep moving. Keep growing.' },
  kr: { name: 'Skyward Pulse', style: 'Kicker', colors: ['#8eadff', '#f3f7ff'], hp: 1000, speed: 4, weight: 'light', stage: 'Azure Terrace', quote: 'A little higher, every time.' },
  fr: { name: 'Lumière', style: 'Duelist', colors: ['#8d9aff', '#ffb8c8'], hp: 1000, speed: 3.6, weight: 'medium', stage: 'Violet Promenade', quote: 'Precision speaks for itself.' },
  ng: { name: 'Jade Titan', style: 'Brawler', colors: ['#6ce5a3', '#f3dfb7'], hp: 1100, speed: 2.8, weight: 'heavy', stage: 'Jade Coliseum', quote: 'Stand tall. Fight with heart.' },
  cn: { name: 'Ember Balance', style: 'Dual-Stance', colors: ['#ff915e', '#ffe19a'], hp: 1000, speed: 3.8, weight: 'medium', stage: 'Amber Summit', quote: 'Balance is a strength of its own.' },
  us: { name: 'Neon Comet', style: 'Zoner', colors: ['#64d9ff', '#ff88b4'], hp: 950, speed: 3.5, weight: 'light', stage: 'Neon Circuit', quote: 'Make the next moment count.' }
};
const presets = Object.values(legacy).map(({ style, hp, speed, weight }) => ({ style, hp, speed, weight }));
const nameFirst = ['Aether', 'Astral', 'Beacon', 'Cinder', 'Echo', 'Ember', 'Falcon', 'Halo', 'Iron', 'Lunar', 'Nova', 'Onyx', 'Orbit', 'Prism', 'Quartz', 'Solar', 'Tempest', 'Vesper', 'Zenith', 'Zephyr'];
const nameLast = ['Aegis', 'Anchor', 'Blade', 'Champion', 'Cipher', 'Crest', 'Guardian', 'Legend', 'Lance', 'Pulse', 'Ranger', 'Sentinel', 'Striker', 'Titan', 'Valor', 'Warden'];
// Cheek tones sampled from the original 4x4 detailed-head atlas, row-major.
// Matching the torso to its assigned head prevents visible skin-color seams.
const faceSkinColors = ['#cd8860', '#ce906e', '#9b5b41', '#c88a6e', '#c58262', '#bd704b', '#c58a6c', '#b66447', '#89523f', '#de9e81', '#c37d5e', '#e0a083', '#d59375', '#b86f49', '#d08f68', '#97573f'];
const hairColors = ['#17171a', '#322118', '#563324', '#865634', '#c19160', '#b9ada2', '#a73532', '#282348'];
const hairstyles = ['crop', 'curls', 'swept', 'long', 'braid', 'shaved', 'mohawk', 'tied'];
const beards = ['none', 'stubble', 'goatee', 'full'];
const physiques = ['lean', 'athletic', 'broad', 'powerful'];
const costumeCuts = ['gi', 'vest', 'mantle', 'jacket', 'armored', 'sash'];
const accessories = ['headband', 'shoulder-guard', 'arm-wrap', 'belt', 'scarf', 'wrist-wrap'];
const quotes = ['Every round is a new beginning.', 'Find your rhythm. Trust your training.', 'Keep moving. Keep growing.', 'Fight with focus. Finish with respect.', 'Precision speaks for itself.', 'Make the next moment count.', 'Stay ready for the next opening.', 'Stand tall. Fight with heart.'];

function hash(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return value;
}
function random(seed) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function makeLook(id) {
  // Selection does not use ethnicity, continent, demography or gender assumptions.
  const rng = random(hash('NationClash/original-look/' + id));
  const choose = values => values[Math.floor(rng() * values.length)];
  const faceIndex = Math.floor(rng() * 16);
  const look = {
    faceIndex, skin: faceSkinColors[faceIndex], hairColor: choose(hairColors),
    hairstyle: choose(hairstyles), beard: choose(beards), physique: choose(physiques),
    costumeCut: choose(costumeCuts), accessory: choose(accessories)
  };
  look.signature = [look.faceIndex, look.skin, look.hairColor, look.hairstyle, look.beard, look.physique, look.costumeCut, look.accessory].join('|');
  return look;
}
function fullHex(color) {
  if (/^#[\da-f]{3}$/i.test(color)) return '#' + [...color.slice(1)].map(x => x + x).join('');
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  return ({ white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000', blue: '#0000ff', gold: '#ffd700' })[color.toLowerCase()];
}
function accentColors(svg) {
  // These are UI accents only; the fighter wears the full source flag SVG.
  const found = [...svg.matchAll(/\b(?:fill|stroke)=["']([^"']+)["']/g)].map(m => fullHex(m[1])).filter(Boolean);
  const unique = [...new Set(found.map(x => x.toLowerCase()))];
  const colorful = unique.filter(x => !/^#(?:0{6}|f{6}|ccc(?:ccc)?|333(?:333)?)$/.test(x));
  return [colorful[0] || unique[0] || '#d4f681', unique.find(c => c !== colorful[0]) || '#e9edf0'];
}

const nameOverrides = { ci: "Côte d’Ivoire", cv: 'Cabo Verde', cd: 'Democratic Republic of the Congo', cg: 'Republic of the Congo', cz: 'Czechia', fm: 'Micronesia', va: 'Vatican City', tr: 'Türkiye', kr: 'South Korea', kp: 'North Korea', tl: 'Timor-Leste' };
const aliasOverrides = {
  ci: ['Ivory Coast', 'Cote d Ivoire', 'Cote dIvoire'], cv: ['Cape Verde'], cd: ['DR Congo', 'DRC', 'Congo Kinshasa'], cg: ['Congo', 'Congo Brazzaville'],
  cz: ['Czech Republic'], fm: ['Federated States of Micronesia'], gb: ['UK', 'Britain', 'Great Britain'], ir: ['Islamic Republic of Iran'],
  kr: ['Republic of Korea', 'Korea South'], kp: ['DPRK', 'Democratic Peoples Republic of Korea', 'Korea North'], la: ['Lao PDR', 'Lao People’s Democratic Republic'],
  md: ['Republic of Moldova'], mm: ['Burma'], mk: ['Macedonia'], ps: ['State of Palestine'], ru: ['Russian Federation'], sz: ['Swaziland'],
  st: ['Sao Tome and Principe'], sy: ['Syrian Arab Republic'], tl: ['East Timor'], tr: ['Turkey'], tw: ['Republic of China'],
  tz: ['United Republic of Tanzania'], us: ['USA', 'United States of America', 'America'], va: ['Holy See', 'The Vatican'], vn: ['Viet Nam'], ve: ['Bolivarian Republic of Venezuela']
};
const alphabetical = [...ids].sort((a, b) => {
  const left = nameOverrides[a] || sourceCountries.get(a)?.name;
  const right = nameOverrides[b] || sourceCountries.get(b)?.name;
  if (!left || !right) throw new Error('Missing country metadata.');
  return left.localeCompare(right, 'en');
});
const ordered = ['jp', 'pk', ...alphabetical.filter(id => id !== 'jp' && id !== 'pk')];
const roster = ordered.map(id => {
  const metadata = sourceCountries.get(id);
  if (!metadata) throw new Error('Missing country metadata: ' + id);
  const country = nameOverrides[id] || metadata.name;
  const nameIndex = alphabetical.indexOf(id) * 73 % (nameFirst.length * nameLast.length);
  const seed = hash('NationClash/balanced-style/' + id);
  const region = ['North America', 'South America'].includes(metadata.continent) ? 'Americas' : metadata.continent;
  if (!['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].includes(region)) throw new Error('Unknown region: ' + id);
  const aliases = [...new Set([...(aliasOverrides[id] || []), metadata.name, metadata.capital || '', metadata.code.toUpperCase()].filter(Boolean))];
  return {
    id, country, flag: id.toUpperCase(), flagCode: id, region, subregion: metadata.continent, capital: metadata.capital || '', aliases,
    name: nameFirst[Math.floor(nameIndex / nameLast.length)] + ' ' + nameLast[nameIndex % nameLast.length],
    ...presets[seed % presets.length], colors: accentColors(flagSvgs[id]), stage: 'World Arena', quote: quotes[seed % quotes.length],
    ...legacy[id], lookSeed: hash('NationClash/original-look/' + id), look: makeLook(id),
    ...(provenance.flagVariants[id] ? { flagVariant: provenance.flagVariants[id] } : {})
  };
});
for (const field of ['id', 'name']) if (new Set(roster.map(c => c[field])).size !== 196) throw new Error('Duplicate fighter ' + field);
if (new Set(roster.map(c => c.look.signature)).size !== 196) throw new Error('Duplicate fighter appearance.');
if (roster.some(c => c.name.length > 20)) throw new Error('Champion names should stay short.');
const countries = roster.map(({ id, country, flag, flagCode, region, subregion, capital, aliases }) => ({ id, name: country, country, code: flag, flagCode, region, subregion, capital, aliases }));
const source = {
  name: provenance.name, version: provenance.version, repository: provenance.repository, commit: provenance.commit,
  license: provenance.license, copyright: provenance.copyright, rosterDefinition: provenance.rosterDefinition,
  countryCount: 196, flagVariants: provenance.flagVariants, licenseText: licenseRaw.toString(),
  appearanceMethod: '196 deterministic original appearances using shared rigs and 16 detailed face frames; no nationality-to-ethnicity assumptions.'
};
const serialized = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const output = `// Generated by tools/build-roster.mjs from pinned MIT-licensed flag-icons assets.\n// ${provenance.copyright}. The full MIT notice is included in source.licenseText.\n(function(root){\n'use strict';\nconst ROSTER=${serialized(roster)};\nconst COUNTRIES=${serialized(countries)};\nconst FLAG_SVGS=${serialized(flagSvgs)};\nconst source=${serialized(source)};\nconst api={ROSTER,COUNTRIES,FLAG_SVGS,source};\nroot.NationRoster=api;\nif(typeof module!=='undefined'&&module.exports)module.exports=api;\n})(typeof window!=='undefined'?window:globalThis);\n`;
await writeFile(path.join(root, 'browser/src/roster.js'), output);
console.log(`Built roster.js: ${roster.length} countries, ${Object.keys(flagSvgs).length} verified SVG flags, ${Buffer.byteLength(output)} bytes.`);
