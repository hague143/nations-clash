const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { ROSTER, FLAG_SVGS } = require('../../browser/src/roster.js');
const rosterBefore = JSON.stringify(ROSTER);
const flagsBefore = JSON.stringify(FLAG_SVGS);
const { POWERS, get } = require('../../browser/src/powers.js');
const source = fs.readFileSync(path.resolve(__dirname, '../../browser/src/powers.js'), 'utf8');

test('every playable country has exactly one signature without changing country or flag mappings', () => {
  assert.equal(ROSTER.length, 196);
  assert.equal(Object.keys(POWERS).length, 196);
  assert.deepEqual(Object.keys(POWERS).sort(), ROSTER.map(country => country.id).sort());
  for (const country of ROSTER) {
    assert.equal(get(country.id), POWERS[country.id]);
    assert.equal(get(country.id).id, country.id);
    assert.equal(country.flagCode, country.id);
    assert.equal(country.flag, country.id.toUpperCase());
    assert.ok(FLAG_SVGS[country.id]);
  }
  assert.equal(JSON.stringify(ROSTER), rosterBefore);
  assert.equal(JSON.stringify(FLAG_SVGS), flagsBefore);
});

test('all 196 signatures have individual names, motifs and explicit inspirations', () => {
  const powers = Object.values(POWERS);
  for (const field of ['name', 'motif', 'description']) {
    assert.equal(new Set(powers.map(power => power[field])).size, 196, field + ' must be unique');
  }
  for (const power of powers) {
    assert.deepEqual(Object.keys(power).sort(), [
      'id', 'name', 'kind', 'color', 'accent', 'motif', 'seed', 'sound', 'description'
    ].sort());
    assert.match(power.id, /^[a-z]{2}$/);
    assert.ok(power.name.length >= 8 && power.name.length <= 28, power.name);
    assert.match(power.motif, /^[a-z0-9]+(?:-[a-z0-9]+)+$/);
    assert.ok(power.description.length >= 60, power.id + ' needs a concrete inspiration');
    assert.doesNotMatch(power.description, /generic|placeholder|todo|tbd/i);
  }
  // Small states and similar names have their own choices, rather than a fallback.
  assert.match(get('nr').description, /Buada Lagoon/);
  assert.match(get('li').description, /postage stamps/);
  assert.match(get('sz').description, /recycled-glass/);
  assert.match(get('cd').description, /cobalt/);
  assert.match(get('cg').description, /Odzala/);
  assert.match(get('gw').description, /Bijagós/);
  assert.match(get('gn').description, /Fouta Djallon/);
});

test('every signature supplies valid colors, repeatable seeds and supported visual and sound families', () => {
  const kinds = ['energy', 'crystal', 'metal', 'leaf', 'sand', 'water', 'wind', 'ember', 'star'];
  const sounds = ['energy', 'metal', 'water', 'wind', 'fire', 'earth', 'ice', 'lightning'];
  const powers = Object.values(POWERS);
  assert.deepEqual([...new Set(powers.map(power => power.kind))].sort(), kinds.slice().sort());
  assert.deepEqual([...new Set(powers.map(power => power.sound))].sort(), sounds.slice().sort());
  assert.equal(new Set(powers.map(power => power.seed)).size, 196);
  for (const power of powers) {
    assert.ok(kinds.includes(power.kind), power.id);
    assert.ok(sounds.includes(power.sound), power.id);
    assert.match(power.color, /^#[0-9a-f]{6}$/i);
    assert.match(power.accent, /^#[0-9a-f]{6}$/i);
    assert.notEqual(power.color, power.accent, power.id + ' needs a visible accent');
    assert.ok(Number.isInteger(power.seed) && power.seed >= 0 && power.seed <= 0xffffffff, power.id);
  }
});

test('requested country themes retain clear and distinct fantasy identities', () => {
  assert.equal(get('ir').name, 'Uranium Pulse');
  assert.equal(get('ir').kind, 'energy');
  const green = parseInt(get('ir').color.slice(3, 5), 16);
  assert.ok(green >= 240);
  assert.ok(green > parseInt(get('ir').color.slice(1, 3), 16) + 80);
  assert.ok(green > parseInt(get('ir').color.slice(5, 7), 16) + 80);
  assert.match(get('ir').description, /fictional energy pulse/);
  assert.match(get('pk').motif, /emerald-crescent/);
  assert.match(get('jp').motif, /sakura.*light/);
  assert.equal(get('iq').name, 'Tigris Wave');
  assert.equal(get('iq').kind, 'water');
  assert.deepEqual(['ae', 'sa', 'qa'].map(id => get(id).name), [
    'Golden Falcon', 'Gilded Dune', 'Pearl-Gold Comet'
  ]);
  for (const id of ['ae', 'sa', 'qa']) {
    const color = get(id).color;
    assert.ok(parseInt(color.slice(1, 3), 16) >= 230, id + ' uses a gold palette');
    assert.ok(parseInt(color.slice(3, 5), 16) >= 180, id + ' uses a gold palette');
    assert.ok(parseInt(color.slice(5, 7), 16) < 110, id + ' uses a gold palette');
  }
  assert.equal(new Set(['ae', 'sa', 'qa'].map(id => get(id).motif)).size, 3);
});

test('browser and CommonJS load identical self-contained data and stable visual seeds', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { timeout: 1000 });
  const browser = sandbox.window.NationPowers;
  assert.equal(typeof browser.get, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(browser.POWERS)), POWERS);
  for (const id of Object.keys(POWERS)) {
    assert.equal(browser.get(id).seed, get(id).seed);
    assert.equal(browser.get(id).motif, get(id).motif);
  }
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
});

test('catalog is immutable and unknown or inherited IDs never select a fallback country', () => {
  assert.ok(Object.isFrozen(POWERS));
  for (const power of Object.values(POWERS)) assert.ok(Object.isFrozen(power));
  for (const unknown of ['xx', 'JP', '', '__proto__', 'constructor', 'toString', undefined, null]) {
    assert.equal(get(unknown), undefined);
  }
});
