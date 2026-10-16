'use strict';

// Integration checks use an actual Chromium WebGL renderer. SwiftShader is used
// in CI only; the shipped game uses the device GPU through WebGL.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const file = path.resolve(process.env.NATIONCLASH_3D_HTML || 'browser3d/index.html');
const directory = path.dirname(file);
const out = path.resolve(process.env.NATIONCLASH_3D_ARTIFACT_DIR || 'artifacts/prototype3d');
const html = fs.readFileSync(file);
const report = {
  status: 'running',
  document: { path: file, bytes: html.length, sha256: crypto.createHash('sha256').update(html).digest('hex') },
  checks: [], errors: [], externalRequests: [], screenshots: [], cases: []
};
let server, browser, url, page;
function check(name, details = {}) {
  report.checks.push({ name, status: 'passed', ...details });
  console.log('PASS ' + name);
}
function serve(req, res) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  const candidate = pathname === '/' ? file : path.resolve(directory, '.' + pathname);
  if (candidate !== file && !candidate.startsWith(directory + path.sep)) {
    res.writeHead(403); res.end(); return;
  }
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    res.writeHead(404); res.end(); return;
  }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[path.extname(candidate)] || 'application/octet-stream' });
  fs.createReadStream(candidate).pipe(res);
}
async function screenshot(page, name) {
  const target = path.join(out, name + '.png');
  await page.screenshot({ path: target, fullPage: true });
  report.screenshots.push(target);
}
async function setup(page) {
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith(url)) {
      report.externalRequests.push(request.url());
    }
  });
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.NationClash3D?.ready, {}, { timeout: 90000 });
}
async function start(page, mode = 'local', fighter = 'pk') {
  await page.selectOption('#mode', mode);
  await page.selectOption('#fighter', fighter);
  await page.locator('#start').click();
  await page.waitForFunction(() => NationClash3D.fight?.phase === 'fight', {}, { timeout: 30000 });
}
async function fixture(page, config = {}) {
  return page.evaluate(config => {
    const api = NationClash3D;
    api.resetFixture({ mode: 'local', intro: 0, paused: true, ...config });
    return { phase: api.fight.phase, hp: [api.fight.left.hp, api.fight.right.hp] };
  }, config);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  server = http.createServer(serve);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = 'http://127.0.0.1:' + server.address().port + '/';
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await setup(page);
  assert.equal(await page.locator('#start').isEnabled(), true);
  await screenshot(page, 'landing-desktop');
  check('offline prototype opens with both country choices and an enabled start action');

  await start(page);
  await screenshot(page, 'arena-desktop');
  const initial = await page.evaluate(() => ({
    debug: NationClash3D.debug,
    ids: [NationClash3D.fight.left.id, NationClash3D.fight.right.id],
    canvas: { width: document.querySelector('#arena3d').width,
      height: document.querySelector('#arena3d').height }
  }));
  report.scene = initial;
  assert.deepEqual(initial.ids, ['pk', 'jp']);
  assert.ok(initial.canvas.width >= 640 && initial.canvas.height >= 360);
  check('Pakistan versus Japan match renders in the live canvas', initial.canvas);

  assert.equal(initial.debug.isWebGLRenderer, true);
  assert.equal(initial.debug.isPerspectiveCamera, true);
  assert.match(initial.debug.webglVersion, /WebGL/);
  assert.ok(initial.debug.drawCalls > 50);
  assert.ok(initial.debug.triangles > 20000);
  assert.equal(initial.debug.arena.landmark, 'Minar-e-Pakistan');
  assert.equal(initial.debug.arena.geometry, true);
  assert.ok(initial.debug.arena.tower.meshCount >= 15);
  assert.ok(initial.debug.arena.tower.bounds.width > 2);
  assert.ok(initial.debug.arena.tower.bounds.height > 8);
  assert.ok(initial.debug.arena.tower.bounds.depth > 2);
  for (const rig of initial.debug.fighters) {
    assert.equal(rig.sprites, 0, rig.id + ' is not a sprite billboard');
    assert.ok(rig.meshes > 80, rig.id + ' has actual articulated mesh geometry');
    assert.ok(rig.bounds[0] > .4 && rig.bounds[1] > 2 && rig.bounds[2] > .5,
      rig.id + ' occupies three spatial dimensions');
  }
  check('real WebGL perspective scene contains two volumetric fighters and the modelled Minar landmark',
    { fighters: initial.debug.fighters.map(f => ({ id: f.id, meshes: f.meshes, bounds: f.bounds })),
      landmark: initial.debug.arena.tower });

  const geometry = await page.evaluate(() => {
    const api = NationClash3D, C = Nation3DCombat, results = [];
    for (const id of ['pk', 'jp']) for (const side of [0, 1]) for (const action of ['punch', 'kick']) {
      api.resetFixture({ leftId: side ? (id === 'pk' ? 'jp' : 'pk') : id,
        rightId: side ? id : (id === 'pk' ? 'jp' : 'pk'), left: { x: -3.5 }, right: { x: 3.5 } });
      const inputs = side ? { right: { action } } : { left: { action } };
      api.stepFrames(C.MOVES[action].start + 2, inputs);
      const actor = side ? api.fight.right : api.fight.left;
      const contact = C.contact(actor, api.fight.frame);
      const actual = api.debug.fighters[side].strikePoints[action];
      results.push({ id, side, action, frame: api.fight.frame, contact,
        meshWorldPoint: actual, error: Math.hypot(actual[0] - contact.x,
          actual[1] - contact.y, actual[2] - contact.z) });
    }
    return results;
  });
  for (const item of geometry) assert.ok(item.error < 1e-6,
    item.id + '/' + item.side + '/' + item.action + ' collision follows actual rendered mesh');
  report.cases.push(...geometry);
  check('every country and facing uses the actual animated fist or foot mesh as its strike point',
    { cases: geometry.length, maximumError: Math.max(...geometry.map(g => g.error)) });

  for (const action of ['punch','kick']) {
    await fixture(page,{left:{x:-.72},right:{x:.72}});
    await page.evaluate(action=>{NationClash3D.stepFrames(Nation3DCombat.MOVES[action].start+1,{left:{action}});document.getElementById('announcement').style.visibility='hidden';},action);
    await screenshot(page,'contact-'+action);
    await page.locator('#announcement').evaluate(e=>e.style.visibility='');
  }

  const powers = await page.evaluate(() => {
    const api = NationClash3D, C = Nation3DCombat, results = [];
    for (const id of ['pk', 'jp']) for (const side of [0, 1]) {
      api.resetFixture({ leftId: side ? (id === 'pk' ? 'jp' : 'pk') : id,
        rightId: side ? id : (id === 'pk' ? 'jp' : 'pk'), left: { x: -3.5 }, right: { x: 3.5 } });
      api.stepFrames(C.MOVES.special.start + 2, side ? { right: { action: 'special' } } : { left: { action: 'special' } });
      const first = api.fight.projectiles[0], rendered = api.debug.projectiles[0];
      if (!first || !rendered) throw new Error(id + ' power has no live mesh');
      const snapshot = { id, side, simulation: { ...first }, rendered: { ...rendered } };
      api.stepFrames(12);
      const second = api.fight.projectiles[0], after = api.debug.projectiles[0];
      snapshot.travel = second.x - snapshot.simulation.x;
      snapshot.after = after;
      snapshot.expected = [second.x, second.y, second.z];
      results.push(snapshot);
    }
    return results;
  });
  for (const item of powers) {
    const p = item.simulation;
    assert.deepEqual(item.rendered.position, [p.x, p.y, p.z]);
    assert.equal(item.rendered.coreRadius, p.radius);
    assert.deepEqual(item.after.position, item.expected);
    assert.ok(Math.abs(Math.abs(item.travel) - 1.4) < 1e-8);
    assert.equal(Math.sign(item.travel), item.side ? -1 : 1);
  }
  report.powers = powers;
  check('both national powers have moving 3D collision cores at their simulation positions', { cases: powers.length });

  await fixture(page, { left: { x: -.65 }, right: { x: .65 }, paused: false });
  await page.locator('#arena3d').focus();
  await page.keyboard.press('j');
  await page.waitForFunction(() => NationClash3D.fight.right.hp < 1000, {}, { timeout: 15000 });
  await page.evaluate(() => NationClash3D.pause(true));
  let outcome = await page.evaluate(() => ({ hp: NationClash3D.fight.right.hp,
    hits: NationClash3D.fight.events.filter(e => e.type === 'hit' && e.actor === 'pk') }));
  assert.equal(outcome.hits.length, 1);
  assert.equal(outcome.hits[0].action, 'punch');
  assert.ok(outcome.hp < 1000);
  await screenshot(page, 'actual-keyboard-punch');

  await fixture(page, { left: { x: -.65 }, right: { x: .65 }, paused: false });
  await page.locator('#arena3d').focus();
  await page.keyboard.press('Numpad2');
  await page.waitForFunction(() => NationClash3D.fight.left.hp < 1000, {}, { timeout: 15000 });
  await page.evaluate(() => NationClash3D.pause(true));
  outcome = await page.evaluate(() => ({ hp: NationClash3D.fight.left.hp,
    hits: NationClash3D.fight.events.filter(e => e.type === 'hit' && e.actor === 'jp') }));
  assert.equal(outcome.hits.length, 1);
  assert.equal(outcome.hits[0].action, 'kick');
  check('real J and player-two Numpad2 keyboard inputs land one punch and one mirrored kick');

  const frozen = await page.evaluate(() => ({ frame: NationClash3D.fight.frame,
    time: NationClash3D.fight.time, hp: [NationClash3D.fight.left.hp, NationClash3D.fight.right.hp],
    points: NationClash3D.debug.fighters.map(f => f.strikePoints) }));
  await page.waitForTimeout(350);
  assert.deepEqual(await page.evaluate(() => ({ frame: NationClash3D.fight.frame,
    time: NationClash3D.fight.time, hp: [NationClash3D.fight.left.hp, NationClash3D.fight.right.hp],
    points: NationClash3D.debug.fighters.map(f => f.strikePoints) })), frozen);
  await page.locator('#resume').click();
  await page.waitForFunction(frame => NationClash3D.fight.frame > frame, frozen.frame);
  assert.equal(await page.evaluate(() => NationClash3D.paused), false);
  check('pause freezes combat and articulated poses, and resume advances the live loop');

  await fixture(page, { left: { x: -.65 }, right: { x: .65, hp: 1 }, wins: [1, 0], paused: false });
  await page.locator('#arena3d').focus();
  await page.keyboard.press('j');
  await page.waitForFunction(() => NationClash3D.fight.phase === 'complete', {}, { timeout: 15000 });
  assert.equal(await page.locator('#overlay').isVisible(), true);
  assert.match(await page.locator('#result-title').textContent(), /PAKISTAN WINS/);
  const locked=await page.evaluate(()=>({hp:[NationClash3D.fight.left.hp,NationClash3D.fight.right.hp],wins:[...NationClash3D.fight.wins],time:NationClash3D.fight.time}));
  await page.waitForFunction(()=>{const f=NationClash3D.fight;return f.frame-f.right.deadAt>=60&&f.left.y===0&&f.right.y===0&&f.right.flash===0&&!f.left.move;},null,{timeout:20000});
  assert.deepEqual(await page.evaluate(()=>({hp:[NationClash3D.fight.left.hp,NationClash3D.fight.right.hp],wins:[...NationClash3D.fight.wins],time:NationClash3D.fight.time})),locked);
  await screenshot(page, 'deciding-ko');
  await page.locator('#rematch').click();
  await page.waitForFunction(() => NationClash3D.fight.phase === 'fight', {}, { timeout: 30000 });
  assert.deepEqual(await page.evaluate(() => ({ hp: [NationClash3D.fight.left.hp,
    NationClash3D.fight.right.hp], wins: NationClash3D.fight.wins })), { hp: [1000, 1000], wins: [0, 0] });
  check('real lethal keyboard contact shows a deciding KO and rematch restores both fighters');

  await page.evaluate(() => NationClash3D.back());
  await start(page, 'ai', 'jp');
  await page.waitForFunction(() => NationClash3D.fight.left.hp < 1000, {}, { timeout: 25000 });
  assert.deepEqual(await page.evaluate(() => [NationClash3D.fight.left.id, NationClash3D.fight.right.id]), ['jp', 'pk']);
  assert.match(await page.locator('#left-power').textContent(), /Sakura Burst/);
  assert.match(await page.locator('#right-power').textContent(), /Emerald Crescent/);
  await page.evaluate(() => NationClash3D.pause(true));
  check('choosing Japan swaps the actual rigs and the live computer opponent closes in and attacks');

  const soundBefore = await page.locator('#sound').getAttribute('aria-pressed');
  await page.locator('#sound').click();
  assert.notEqual(await page.locator('#sound').getAttribute('aria-pressed'), soundBefore);
  await page.locator('#sound').click();
  await page.locator('#music-volume').fill('20');
  await page.locator('#effects-volume').fill('35');
  assert.equal(await page.locator('#music-volume').inputValue(), '20');
  assert.equal(await page.locator('#effects-volume').inputValue(), '35');
  check('sound toggle and independent music and effects controls respond');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await setup(mobile);
  await screenshot(mobile, 'landing-mobile');
  await start(mobile, 'training');
  await fixture(mobile, { mode: 'training', left: { x: -.65 }, right: { x: .65 }, paused: false });
  assert.equal(await mobile.locator('#touch').isVisible(), true);
  const layout = await mobile.evaluate(() => ({ width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    buttons: [...document.querySelectorAll('#touch button')].map(b => ({
      width: b.getBoundingClientRect().width, height: b.getBoundingClientRect().height })) }));
  assert.ok(layout.scrollWidth <= layout.width);
  assert.equal(layout.buttons.length, 8);
  for (const b of layout.buttons) assert.ok(b.width >= 44 && b.height >= 44);
  await mobile.locator('[data-action="punch"]').tap();
  await mobile.waitForFunction(() => NationClash3D.fight.right.hp < 1000, {}, { timeout: 15000 });
  await mobile.evaluate(() => NationClash3D.pause(true));
  await screenshot(mobile, 'arena-mobile');
  check('mobile portrait has usable touch controls without horizontal overflow and touch punch hits', layout);

  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.evaluate(() => NationClash3D.pause(false));
  await mobile.waitForTimeout(200);
  const landscape = await mobile.evaluate(() => {
    const arena = document.querySelector('#viewport').getBoundingClientRect(),
      controls = document.querySelector('#touch').getBoundingClientRect();
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      arena: { right: arena.right, bottom: arena.bottom, width: arena.width, height: arena.height },
      controls: { left: controls.left, right: controls.right, bottom: controls.bottom } };
  });
  assert.ok(landscape.scrollWidth <= landscape.width);
  assert.ok(landscape.controls.left >= landscape.arena.right);
  assert.ok(landscape.controls.right <= landscape.width);
  assert.ok(landscape.controls.bottom <= landscape.height);
  assert.ok(landscape.arena.height >= 220);
  await screenshot(mobile, 'arena-landscape');
  check('mobile landscape keeps the fight and touch controls visible side by side', landscape);
  await mobile.close();

  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRequests, []);
  check('no browser runtime errors or external asset dependencies');
  report.status = 'passed';
})().catch(error => {
  report.status = 'failed';
  report.failure = { message: error.message, stack: error.stack };
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (report.status === 'failed' && page) {
    report.lastState = await page.evaluate(() => ({ ready: window.NationClash3D?.ready,
      phase: window.NationClash3D?.fight?.phase, frame: window.NationClash3D?.fight?.frame,
      paused: window.NationClash3D?.paused, debug: window.NationClash3D?.debug })).catch(() => null);
    await screenshot(page, 'failure').catch(() => {});
  }
  report.finishedAt = new Date().toISOString();
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'prototype3d-acceptance.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
