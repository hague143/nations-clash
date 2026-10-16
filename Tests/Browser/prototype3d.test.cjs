'use strict';

// These tests exercise the independent 3D combat simulation. They deliberately
// inspect outcomes and joint geometry, rather than reproducing its collision code.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../browser3d/src/combat.js');
const { Fight, FIGHTERS, samplePose, contact, getHurtboxes } = C;
const tick = (fight, count, a = {}, b = {}) => {
  for (let i = 0; i < count; i++) fight.step(a, b);
};
function fresh(left = 'pk', right = 'jp', distance = 1.35) {
  const f = new Fight(left, right, { mode: 'training', intro: 0, seconds: 600 });
  f.left.x = -distance / 2;
  f.right.x = distance / 2;
  f.left.facing = 1;
  f.right.facing = -1;
  return f;
}
function point(value) {
  return Array.isArray(value) ? value : [value.x, value.y, value.z ?? 0];
}

test('close low kicks connect with the visible shin even when the foot passes the opponent',()=>{
 for(const id of ['pk','jp'])for(const side of [0,1]){
  const f=fresh(side?(id==='pk'?'jp':'pk'):id,side?id:(id==='pk'?'jp':'pk'),1.25),target=side?f.left:f.right;
  f.step(side?{}:{low:true,action:'kick'},side?{low:true,action:'kick'}:{});tick(f,90);
  assert.ok(target.hp<1000);assert.equal(f.events.filter(e=>e.type==='hit').length,1);
 }
});

test('fighters separate immediately at either wall without leaving the arena',()=>{
 for(const edge of [-4.4,4.4])for(const mirrored of [false,true]){
  const f=fresh();f.left.x=edge;f.right.x=edge+(edge>0?-.02:.02);if(mirrored)[f.left.x,f.right.x]=[f.right.x,f.left.x];
  f.step();assert.ok(Math.abs(f.left.x-f.right.x)>=.88-1e-10);for(const a of [f.left,f.right])assert.ok(a.x>=-4.4&&a.x<=4.4);
 }
});

test('grounded and airborne deciding KOs settle without changing the recorded outcome',()=>{
 for(const side of [0,1])for(const airborne of [false,true]){
  const f=fresh(),loser=side?f.left:f.right,winner=side?f.right:f.left;f.phase='complete';f.winner=side;f.wins=side?[0,2]:[2,0];
  loser.hp=0;loser.deadAt=f.frame;loser.flash=9;loser.y=airborne?1.1:0;loser.vy=airborne?2.5:0;winner.move={...C.MOVES.kick};winner.moveFrame=C.MOVES.kick.start;winner.y=airborne?.5:0;
  const result={hp:[f.left.hp,f.right.hp],wins:[...f.wins],time:f.time,cooldown:[f.left.signatureCooldown,f.right.signatureCooldown]};tick(f,100);
  assert.equal(loser.y,0);assert.equal(winner.y,0);assert.equal(loser.flash,0);assert.equal(winner.move,null);assert.equal(f.phase,'complete');
  assert.deepEqual({hp:[f.left.hp,f.right.hp],wins:[...f.wins],time:f.time,cooldown:[f.left.signatureCooldown,f.right.signatureCooldown]},result);
 }
});
function assertPoint(value, label) {
  const p = point(value);
  assert.equal(p.length, 3, label);
  p.forEach((v, i) => assert.ok(Number.isFinite(v), label + '[' + i + '] is finite'));
  return p;
}

test('3D prototype has distinct Pakistan and Japan identities and resources', () => {
  const fighters = Array.isArray(FIGHTERS) ? FIGHTERS : Object.values(FIGHTERS);
  assert.deepEqual(fighters.map(f => f.id).sort(), ['jp', 'pk']);
  assert.notDeepEqual(fighters[0], fighters[1]);
  const f = fresh();
  assert.equal(f.left.id, 'pk');
  assert.equal(f.right.id, 'jp');
  for (const a of [f.left, f.right]) {
    assert.ok(a.hp > 0);
    assert.ok(a.meter >= 0 && a.meter <= 100);
  }
});

test('animated anatomical joints are finite for both fighters and facings', () => {
  for (const id of ['pk', 'jp']) for (const facing of [-1, 1]) {
    const f = fresh(id, id === 'pk' ? 'jp' : 'pk');
    const a = f.left;
    a.facing = facing;
    for (const action of [null, 'punch', 'kick', 'special']) {
      if (action) f.step({ action });
      for (let frame = 0; frame < 80; frame++) {
        const pose = samplePose(a, f.frame);
        for (const name of ['hip', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR',
          'elbowL', 'elbowR', 'handL', 'handR', 'kneeL', 'kneeR', 'footL', 'footR']) {
          assertPoint(pose[name], id + '/' + action + '/' + name);
        }
        f.step();
      }
    }
  }
});

test('punches and kicks have startup and can only damage once per committed move', () => {
  for (const id of ['pk', 'jp']) for (const side of [0, 1]) for (const action of ['punch', 'kick']) {
    const f = fresh(side ? (id === 'pk' ? 'jp' : 'pk') : id,
      side ? id : (id === 'pk' ? 'jp' : 'pk'));
    const attacker = side ? f.right : f.left;
    const defender = side ? f.left : f.right;
    const initial = defender.hp;
    f.step(side ? {} : { action }, side ? { action } : {});
    assert.equal(defender.hp, initial, id + '/' + side + '/' + action + ' startup');
    let damageTicks = 0, last = initial;
    for (let i = 0; i < 150; i++) {
      f.step();
      if (defender.hp < last) damageTicks++;
      last = defender.hp;
    }
    assert.equal(damageTicks, 1, id + '/' + side + '/' + action + ' lands once');
    assert.ok(defender.hp < initial);
    assert.ok(!attacker.move, 'attack exits recovery');
  }
});

test('distant melee attacks genuinely miss without invisible range damage', () => {
  for (const action of ['punch', 'kick']) for (const side of [0, 1]) {
    const f = fresh('pk', 'jp', 7);
    const hp = [f.left.hp, f.right.hp];
    f.step(side ? {} : { action }, side ? { action } : {});
    tick(f, 120);
    assert.deepEqual([f.left.hp, f.right.hp], hp, action + ' whiffs');
  }
});

test('guard materially protects a defender against actual close strikes', () => {
  for (const action of ['punch', 'kick']) {
    const open = fresh(), blocked = fresh();
    const initial = open.right.hp;
    open.step({ action });
    blocked.step({ action }, { guard: true });
    tick(open, 120);
    tick(blocked, 120, {}, { guard: true });
    assert.ok(open.right.hp < initial, 'unguarded strike lands');
    assert.ok(blocked.right.hp > open.right.hp, 'guard reduces or prevents damage');
  }
});

test('low attacks reach the legs, beat standing guard, and respect crouching guard', () => {
  for (const action of ['punch', 'kick']) for (const side of [0, 1]) {
    for (const defense of ['open', 'standing', 'crouching']) {
      const f = fresh('pk', 'jp', action === 'kick' ? 1.75 : 1.35);
      const defender = side ? f.left : f.right;
      const hp = defender.hp;
      const defend = defense === 'open' ? {} : { guard: true, low: defense === 'crouching' };
      const attack = { action, low: true };
      f.step(side ? defend : attack, side ? attack : defend);
      tick(f, 120, side ? defend : { low: true }, side ? { low: true } : defend);
      if (defense === 'crouching') assert.equal(defender.hp, hp, action + ' is low-blocked');
      else assert.ok(defender.hp < hp, action + ' hits ' + defense + ' defense');
    }
  }
});

test('both national specials launch a real ranged strike and consume their resource', () => {
  for (const id of ['pk', 'jp']) for (const side of [0, 1]) {
    const f = fresh(side ? (id === 'pk' ? 'jp' : 'pk') : id,
      side ? id : (id === 'pk' ? 'jp' : 'pk'), 4);
    const a = side ? f.right : f.left, d = side ? f.left : f.right;
    a.meter = 100;
    a.signatureCooldown = 0;
    const hp = d.hp;
    f.step(side ? {} : { action: 'special' }, side ? { action: 'special' } : {});
    let damageTicks = 0, last = hp;
    for (let i = 0; i < 180; i++) {
      f.step();
      if (d.hp < last) damageTicks++;
      last = d.hp;
    }
    assert.equal(damageTicks, 1, id + '/' + side + ' special lands once at range');
    assert.ok(d.hp < hp);
    assert.ok(a.meter < 100 || a.signatureCooldown > 0, 'special has an actual resource cost');
  }
});

test('special cooldown rejects a second attack and expires for both fighters', () => {
  for (const id of ['pk', 'jp']) {
    const f = fresh(id, id === 'pk' ? 'jp' : 'pk', 7);
    f.step({ action: 'special' });
    tick(f, 80);
    assert.ok(f.left.signatureCooldown > 0);
    assert.ok(!f.left.move);
    const count = f.events.filter(e => e.type === 'launch').length;
    f.step({ action: 'special' });
    tick(f, 70);
    assert.equal(f.events.filter(e => e.type === 'launch').length, count,
      'cooldown cannot be bypassed by another button press');
    tick(f, 120);
    assert.equal(f.left.signatureCooldown, 0);
    f.step({ action: 'special' });
    tick(f, 40);
    assert.equal(f.events.filter(e => e.type === 'launch').length, count + 1);
  }
});

test('a hit during special startup cancels its future projectile', () => {
  const f = fresh();
  f.step({ action: 'punch' }, { action: 'special' });
  tick(f, 90);
  assert.ok(f.right.hp < f.right.data.hp);
  assert.equal(f.events.filter(e => e.type === 'launch' && e.actor === f.right.id).length, 0);
  assert.equal(f.left.hp, f.left.data.hp, 'cancelled projectile causes no delayed damage');
});

test('an airborne opponent above the actual limb cannot be hit by a ground punch', () => {
  const f = fresh();
  f.right.y = 3;
  const hp = f.right.hp;
  f.step({ action: 'punch' });
  tick(f, 65);
  assert.equal(f.right.hp, hp);
});

test('swept collision handles crossing, separated, point and parallel segments', () => {
  const v = (x, y, z = 0) => ({ x, y, z });
  for (const [a, b, c, d, expected] of [
    [v(-1, 0), v(1, 0), v(0, -1), v(0, 1), 0],
    [v(-1, 0), v(1, 0), v(0, -1, .7), v(0, 1, .7), .7],
    [v(0, 0), v(0, 0), v(-1, 2), v(1, 2), 2],
    [v(-1, 0), v(1, 0), v(-1, .8), v(1, .8), .8],
    [v(0, 0), v(1, 0), v(2, 1), v(3, 1), Math.SQRT2]
  ]) assert.ok(Math.abs(C.segmentDistance(a, b, c, d) - expected) < 1e-8);
});

test('lethal contact ends the match once and a fresh match resets combat resources', () => {
  const f = fresh(), a = f.left, d = f.right;
  f.wins = [1, 0];
  d.hp = 1;
  f.step({ action: 'punch' });
  tick(f, 120);
  assert.equal(d.hp, 0);
  assert.equal(f.phase, 'complete');
  const result = { hp: [a.hp, d.hp], winner: f.winner };
  tick(f, 180, { action: 'punch' }, { action: 'special' });
  assert.deepEqual({ hp: [a.hp, d.hp], winner: f.winner }, result,
    'post-result input cannot change the outcome');
  const rematch = fresh();
  assert.ok(rematch.left.hp > 0 && rematch.right.hp > 0);
  assert.ok(rematch.left.hp > 0 && rematch.right.hp > 0);
  assert.ok(!rematch.left.move && !rematch.right.move);
});

test('jumping leaves the floor once, does not reset in midair, and lands safely', () => {
  const f = fresh('pk', 'jp', 7);
  f.step({ action: 'jump' });
  tick(f, 5);
  assert.ok(f.left.y > 0);
  const airborne = f.left.y;
  const velocity = f.left.vy;
  f.step({ action: 'jump' });
  assert.ok(f.left.y > 0 && f.left.y < airborne + .5, 'second input does not teleport upward');
  if (Number.isFinite(velocity)) assert.ok(f.left.vy < velocity, 'second jump does not reset upward velocity');
  tick(f, 150);
  assert.equal(f.left.y, 0);
});

test('movement stays within the arena and never passes through the opponent', () => {
  const f = fresh();
  tick(f, 900, { axis: -1 }, { axis: 1 });
  assert.ok(Number.isFinite(f.left.x) && Number.isFinite(f.right.x));
  assert.ok(Math.abs(f.left.x) <= 4.5 && Math.abs(f.right.x) <= 4.5);
  tick(f, 900, { axis: 1 }, { axis: -1 });
  assert.ok(f.left.x < f.right.x, 'grounded fighters retain collision separation');
  assert.ok(f.right.x - f.left.x > .1);
});

test('world contact follows actual animated hand or foot and mirrors in world space', () => {
  for (const action of ['punch', 'kick']) for (const facing of [1, -1]) {
    const f = fresh('pk', 'jp', 7), a = f.left;
    a.x = facing === 1 ? -2 : 2;
    f.right.x = -a.x;
    a.facing = facing;
    f.right.facing = -facing;
    f.step({ action });
    for (let i = 0; i < 40 && a.move; i++) {
      const p = assertPoint(contact(a, f.frame), 'world contact');
      const pose = samplePose(a, f.frame);
      const names = action === 'kick' ? ['footL', 'footR'] : ['handL', 'handR'];
      const candidates = names.map(name => {
        const q = point(pose[name]);
        return [a.x + a.facing * q[0], a.y + q[1], q[2]];
      });
      assert.ok(candidates.some(q => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-6),
        action + ' contact coincides with an actual animated extremity');
      f.step();
    }
  }
});

test('hurt capsules remain finite through jump, crouch, block and knockback', () => {
  const f = fresh();
  for (const input of [{}, { low: true }, { guard: true }, { action: 'jump' }]) {
    f.step(input);
    for (const actor of [f.left, f.right]) {
      const boxes = getHurtboxes(actor, f.frame);
      assert.ok(Array.isArray(boxes) && boxes.length > 0);
      for (const box of boxes) {
        assertPoint(box.a, 'hurt capsule start');
        assertPoint(box.b, 'hurt capsule end');
        assert.ok(Number.isFinite(box.radius) && box.radius > 0, 'positive finite capsule radius');
      }
    }
    tick(f, 90);
  }
});

test('AI uses real moves to finish a match and preserves finite state', () => {
  const f = new Fight('pk', 'jp', { mode: 'ai', intro: 0, seconds: 90 });
  const initial = f.left.hp;
  for (let i = 0; i < 18000 && f.phase !== 'complete'; i++) {
    f.step({}, f.ai(1));
    for (const a of [f.left, f.right]) {
      assert.ok(Number.isFinite(a.hp) && a.hp >= 0);
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y) && a.y >= 0);
      assert.ok(a.meter >= 0 && a.meter <= 100);
    }
  }
  assert.ok(f.left.hp < initial, 'AI closes distance and lands a strike');
  assert.equal(f.phase, 'complete', 'AI wins a complete best-of-three match');
});
