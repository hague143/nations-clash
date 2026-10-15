const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const childProcess = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const { ROSTER, COUNTRIES, FLAG_SVGS, source } = require('../../browser/src/roster.js');
const provenance = JSON.parse(fs.readFileSync(path.join(root, 'browser/assets/flags/source.json')));
const digest = raw => crypto.createHash('sha256').update(raw).digest('hex');

test('explicit 196-country roster is complete and excludes dependent territories', () => {
  assert.equal(ROSTER.length, 196);
  assert.equal(COUNTRIES.length, 196);
  assert.equal(new Set(ROSTER.map(c => c.id)).size, 196);
  assert.deepEqual(ROSTER.map(c => c.id).sort(), provenance.countryIds.slice().sort());
  for (const id of ['ps', 'va', 'tw', 'nr', 'tv', 'ki', 'fm', 'mh', 'pw', 'sm', 'li', 'ad', 'st', 'kn', 'vc'])
    assert.ok(ROSTER.some(c => c.id === id), 'Missing playable country: ' + id);
  for (const id of ['xk', 'pr', 'hk', 'mo', 'gl', 'gu', 'as', 'ax'])
    assert.ok(!ROSTER.some(c => c.id === id), 'Unexpected dependent territory or extra roster entry: ' + id);
  assert.deepEqual(ROSTER.slice(0, 2).map(c => c.id), ['jp', 'pk']);
});

test('all fighters have original short names and usable balanced combat data', () => {
  assert.equal(new Set(ROSTER.map(c => c.name)).size, 196);
  assert.equal(new Set(ROSTER.map(c => c.style)).size, 8);
  for (const c of ROSTER) {
    assert.match(c.id, /^[a-z]{2}$/);
    assert.equal(c.flag, c.id.toUpperCase());
    assert.equal(c.flagCode, c.id);
    assert.ok(c.name.length <= 20);
    assert.ok(c.country && c.stage && c.quote);
    assert.ok(c.hp >= 950 && c.hp <= 1100);
    assert.ok(c.speed >= 2.8 && c.speed <= 4.5);
    assert.ok(['light', 'medium', 'heavy'].includes(c.weight));
    assert.equal(c.colors.length, 2);
    c.colors.forEach(color => assert.match(color, /^#[a-f0-9]{6}$/i));
  }
  assert.equal(ROSTER[0].name, 'Horizon Sentinel');
  assert.deepEqual([ROSTER[0].hp, ROSTER[0].speed, ROSTER[0].weight, ROSTER[0].style], [1000, 3.7, 'medium', 'Striker']);
  assert.equal(ROSTER[1].name, 'Crescent Vanguard');
  assert.deepEqual([ROSTER[1].hp, ROSTER[1].speed, ROSTER[1].weight, ROSTER[1].style], [1050, 3.1, 'heavy', 'Grappler']);
});

test('196 appearance configurations are unique and cover all detailed face frames', () => {
  const faceSkins = ['#cd8860', '#ce906e', '#9b5b41', '#c88a6e', '#c58262', '#bd704b', '#c58a6c', '#b66447', '#89523f', '#de9e81', '#c37d5e', '#e0a083', '#d59375', '#b86f49', '#d08f68', '#97573f'];
  assert.equal(new Set(ROSTER.map(c => c.look.signature)).size, 196);
  assert.equal(new Set(ROSTER.map(c => c.look.faceIndex)).size, 16);
  assert.ok(new Set(ROSTER.map(c => c.look.skin)).size >= 8);
  for (const c of ROSTER) {
    const look = c.look;
    assert.ok(Number.isInteger(look.faceIndex) && look.faceIndex >= 0 && look.faceIndex < 16);
    assert.match(look.skin, /^#[a-f0-9]{6}$/i);
    assert.equal(look.skin, faceSkins[look.faceIndex], 'Body skin matches the assigned atlas head.');
    assert.match(look.hairColor, /^#[a-f0-9]{6}$/i);
    assert.ok(['crop', 'curls', 'swept', 'long', 'braid', 'shaved', 'mohawk', 'tied'].includes(look.hairstyle));
    assert.ok(['none', 'stubble', 'goatee', 'full'].includes(look.beard));
    assert.ok(['lean', 'athletic', 'broad', 'powerful'].includes(look.physique));
    assert.ok(['gi', 'vest', 'mantle', 'jacket', 'armored', 'sash'].includes(look.costumeCut));
    assert.ok(['headband', 'shoulder-guard', 'arm-wrap', 'belt', 'scarf', 'wrist-wrap'].includes(look.accessory));
  }
});

test('actual national SVG artwork is complete, self-contained and unchanged', () => {
  assert.equal(Object.keys(FLAG_SVGS).length, 196);
  for (const c of ROSTER) {
    const svg = FLAG_SVGS[c.id];
    assert.ok(svg.startsWith('<svg'));
    assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.doesNotMatch(svg, /<script|\bon[a-z]+\s*=|(?:href|src)=["'](?:https?:)?\/\//i);
    assert.equal(digest(svg), provenance.files[c.id].sha256);
    assert.equal(svg, fs.readFileSync(path.join(root, 'browser/assets/flags', c.id + '.svg'), 'utf8'));
  }
  assert.match(FLAG_SVGS.pk, /m403\.7 225\.4/); // Source crescent/star paths.
  assert.match(FLAG_SVGS.jp, /<circle/);
  assert.match(FLAG_SVGS.np, /stroke="#000063"/);
  assert.ok(FLAG_SVGS.va.length > 25000); // Preserve the detailed keys/emblem.
  assert.match(FLAG_SVGS.sy, /#007a3d/);
  assert.match(ROSTER.find(c => c.id === 'af').flagVariant, /2004.*not the current de facto government flag/);
});

test('country metadata supports regions, small-state discovery and spelling aliases', () => {
  const regions = Object.fromEntries(['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].map(r => [r, ROSTER.filter(c => c.region === r).length]));
  assert.deepEqual(regions, { Africa: 54, Americas: 35, Asia: 48, Europe: 45, Oceania: 14 });
  const country = id => COUNTRIES.find(c => c.id === id);
  assert.ok(country('va').aliases.includes('Holy See'));
  assert.ok(country('us').aliases.includes('USA'));
  assert.ok(country('tr').aliases.includes('Turkey'));
  assert.ok(country('sz').aliases.includes('Swaziland'));
  assert.ok(country('mm').aliases.includes('Burma'));
  assert.ok(country('tl').aliases.includes('East Timor'));
  assert.ok(country('ci').aliases.includes('Ivory Coast'));
});

test('browser and Node expose the same roster API without external fetches', () => {
  const content = fs.readFileSync(path.join(root, 'browser/src/roster.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(content, sandbox);
  assert.equal(sandbox.window.NationRoster.ROSTER.length, 196);
  assert.equal(sandbox.window.NationRoster.FLAG_SVGS.pk, FLAG_SVGS.pk);
  assert.equal(sandbox.window.NationRoster.source.commit, source.commit);
  assert.equal(source.license, 'MIT');
  assert.match(source.licenseText, /Copyright \(c\) 2013 Panayiotis Lipiridis/);
  assert.match(source.licenseText, /Permission is hereby granted/);
});

test('local reproducible builder gives identical output and verifies the pinned source files', () => {
  const output = path.join(root, 'browser/src/roster.js');
  const before = fs.readFileSync(output);
  childProcess.execFileSync(process.execPath, ['tools/build-roster.mjs'], { cwd: root, stdio: 'pipe' });
  assert.deepEqual(fs.readFileSync(output), before);
});
