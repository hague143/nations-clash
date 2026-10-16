/* Original, articulated mesh fighters. No sprite planes or imported game assets. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  function basePose() {
    return {
      hip: [0, 1.25, 0], chest: [0.025, 1.96, 0], neck: [0.055, 2.28, 0], head: [0.07, 2.51, 0],
      shoulderL: [0, 2.055, -0.34], shoulderR: [0.035, 2.055, 0.34],
      elbowL: [0.18, 1.77, -0.37], elbowR: [0.25, 1.81, 0.39],
      handL: [0.46, 2.10, -0.23], handR: [0.54, 2.16, 0.24],
      kneeL: [-0.24, 0.69, -0.22], kneeR: [0.30, 0.68, 0.23],
      footL: [-0.43, 0.12, -0.24], footR: [0.48, 0.12, 0.25]
    };
  }

  function createFighter(THREE, id) {
    const pakistan = id === 'pk';
    const group = new THREE.Group();
    group.name = pakistan ? 'Pakistan · falcon champion' : 'Japan · rising sun champion';
    const geometries = new Set(), materials = new Set(), textures = new Set();
    const sphere = new THREE.SphereGeometry(1, 16, 12);
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
    const cone = new THREE.ConeGeometry(1, 1, 7);
    const torus = new THREE.TorusGeometry(1, 0.08, 5, 22);
    [sphere, cylinder, cone, torus].forEach(g => geometries.add(g));
    const color = pakistan ? '#08613e' : '#e3e0d6';
    function material(c, options) {
      const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.76, metalness: 0.02, ...options });
      materials.add(m); return m;
    }
    const skin = material(pakistan ? '#b8794d' : '#d79a71', { roughness: 0.69 });
    const skinShadow = material(pakistan ? '#9b603b' : '#ba7853');
    const lip = material('#754732');
    const hair = material(pakistan ? '#21160f' : '#14151d', { roughness: 0.92 });
    const hairLight = material(pakistan ? '#443023' : '#292731');
    const fabric = material(color, { roughness: 0.97 });
    const fabricDark = material(pakistan ? '#073b2b' : '#bbbcb8');
    const white = material('#eeeadd', { roughness: 0.94 });
    const gold = material(pakistan ? '#d8b254' : '#c69a57', { metalness: 0.72, roughness: 0.34 });
    const beltMat = material(pakistan ? '#114f36' : '#a31424', { roughness: 0.82 });
    const red = material('#b61b2e', { roughness: 0.87 });
    const glove = material('#171c20', { roughness: 0.58 });
    const eyeWhite = material('#e6ddd0', { roughness: 0.3 });
    const iris = material('#30251d', { roughness: 0.3 });
    // A fine woven bump is shared by garments; colour stays in the material.
    const weaveCanvas = document.createElement('canvas'); weaveCanvas.width = weaveCanvas.height = 128;
    const weaveContext = weaveCanvas.getContext('2d');
    weaveContext.fillStyle = '#888888'; weaveContext.fillRect(0, 0, 128, 128);
    for (let n = 0; n < 128; n += 4) {
      weaveContext.fillStyle = n % 8 ? '#989898' : '#777777'; weaveContext.fillRect(n, 0, 1, 128);
      weaveContext.fillStyle = n % 8 ? '#777777' : '#999999'; weaveContext.fillRect(0, n, 128, 1);
    }
    const weave = new THREE.CanvasTexture(weaveCanvas); weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
    weave.repeat.set(3, 4); textures.add(weave);
    [fabric, fabricDark, white, beltMat, red].forEach(m => { m.bumpMap = weave; m.bumpScale = 0.009; });
    const joints = {};
    const v = new THREE.Vector3(), w = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0);
    function mesh(parent, geometry, mat, pos, scale) {
      const o = new THREE.Mesh(geometry, mat);
      if (pos) o.position.set(...pos);
      if (scale) o.scale.set(...scale);
      o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
    }
    function ball(parent, mat, pos, scale) { return mesh(parent, sphere, mat, pos, scale); }
    function node(name) { const g = new THREE.Group(); g.name = name; group.add(g); joints[name] = g; return g; }
    function ring(parent, mat, pos, radius, rotation) {
      const r = mesh(parent, torus, mat, pos, [radius, radius, radius]);
      r.rotation.set(...(rotation || [Math.PI / 2, 0, 0])); return r;
    }
    function segment(name, r1, r2, mat, options) {
      const g = node(name);
      const geo = new THREE.CylinderGeometry(r2, r1, 1, 12, 1);
      geometries.add(geo); mesh(g, geo, mat);
      if (options?.muscle) {
        ball(g, mat, [0.012, 0.035, 0], [r1 * 1.14, 0.42, r1 * 1.10]);
        ball(g, skinShadow, [-r1 * 0.53, 0.10, 0], [r1 * 0.55, 0.28, r1 * 0.81]);
      }
      return g;
    }
    function put(name, a, b) {
      v.set(...a); w.set(...b); const d = w.sub(v), length = d.length();
      const g = joints[name]; g.position.copy(v).addScaledVector(d, 0.5);
      g.quaternion.setFromUnitVectors(yAxis, d.normalize()); g.scale.y = length;
    }
    function setNode(name, p) { joints[name].position.set(...p); }

    // Broad ribs, tapered waist, independent pectorals and abdominal volumes.
    const torso = node('torso');
    ball(torso, skin, [0, 0.54, 0], [0.235, 0.43, 0.355]);
    ball(torso, skin, [0.045, 0.26, 0], [0.185, 0.29, 0.245]);
    [-1, 1].forEach(side => {
      const pec = ball(torso, skin, [0.18, 0.69, side * 0.166], [0.104, 0.177, 0.172]);
      pec.rotation.x = side * 0.12;
      for (let row = 0; row < 3; row++) {
        ball(torso, skin, [0.180 - row * 0.006, 0.43 - row * 0.12, side * 0.087], [0.052, 0.075, 0.080]);
      }
      ball(torso, skinShadow, [0.065, 0.34, side * 0.205], [0.12, 0.26, 0.064]);
    });
    const pelvis = node('pelvis');
    ball(pelvis, fabric, [0, 0, 0], [0.23, 0.24, 0.30]);
    ball(pelvis, beltMat, [0, 0.13, 0], [0.245, 0.10, 0.31]);
    if (pakistan) {
      [-0.045, 0.04, 0.105].forEach(h => {
        const r = ring(pelvis, gold, [0, h, 0], 0.265);
        r.scale.x *= 0.84; r.scale.y *= 1.17;
      });
      const buckle = ball(pelvis, gold, [0.25, 0.12, 0], [0.035, 0.11, 0.105]);
      ring(buckle, fabricDark, [0.75, 0, 0], 0.6, [0, Math.PI / 2, 0]);
    } else {
      ball(pelvis, red, [0.247, 0.12, 0.005], [0.055, 0.095, 0.10]);
      [-1, 1].forEach(s => {
        const tie = mesh(pelvis, cylinder, red, [0.24 + s * 0.04, -0.10, s * 0.055], [0.045, 0.39, 0.023]);
        tie.rotation.x = s * 0.15; tie.rotation.z = s * 0.15;
      });
    }

    // Sleeveless gi: actual cloth volumes over the back and ribs, open at the chest.
    if (!pakistan) {
      ball(torso, fabric, [-0.12, 0.59, 0], [0.16, 0.39, 0.35]);
      for (const s of [-1, 1]) {
        ball(torso, fabric, [0.035, 0.58, s * 0.275], [0.19, 0.34, 0.095]);
        const lapel = mesh(torso, cylinder, white, [0.215, 0.65, s * 0.115], [0.043, 0.50, 0.065]);
        lapel.rotation.x = s * 0.39;
        const seam = mesh(torso, cylinder, red, [0.25, 0.65, s * 0.13], [0.010, 0.52, 0.012]);
        seam.rotation.x = s * 0.39;
      }
      const sunGeo = new THREE.CircleGeometry(0.145, 28); geometries.add(sunGeo);
      const sun = mesh(torso, sunGeo, red, [-0.282, 0.64, 0]); sun.rotation.y = -Math.PI / 2;
      const flagPatchGeo = new THREE.PlaneGeometry(0.23, 0.16); geometries.add(flagPatchGeo);
      mesh(torso, flagPatchGeo, white, [0.04, 0.76, 0.366]);
      const patchSunGeo = new THREE.CircleGeometry(0.055, 24); geometries.add(patchSunGeo);
      mesh(torso, patchSunGeo, red, [0.04, 0.76, 0.368]);
    }

    // Two independently articulated arms, knees and feet follow combat joint data.
    for (const side of ['L', 'R']) {
      const shoulder = node('shoulder' + side);
      ball(shoulder, skin, null, [0.175, 0.18, 0.18]);
      segment('upperArm' + side, 0.125, 0.105, skin, { muscle: true });
      const elbow = node('elbow' + side); ball(elbow, skin, null, [0.106, 0.115, 0.107]);
      const forearm = segment('forearm' + side, 0.106, 0.082, skin);
      ball(forearm, skin, [0.015, 0.12, 0], [0.115, 0.34, 0.11]);
      mesh(forearm, cylinder, glove, [0, 0.25, 0], [0.108, 0.45, 0.112]);
      for (const h of [0.05, 0.20, 0.40]) {
        mesh(forearm, cylinder, pakistan ? gold : red, [0, h, 0], [0.112, 0.025, 0.116]);
      }
      const hand = node('hand' + side);
      ball(hand, glove, null, [0.142, 0.132, 0.12]);
      for (let f = 0; f < 4; f++) {
        ball(hand, pakistan ? skin : glove, [0.045, 0.035, (f - 1.5) * 0.052], [0.085, 0.069, 0.030]);
      }
      ball(hand, glove, [-0.015, -0.085, 0.09], [0.075, 0.073, 0.055]);
      const thigh = segment('thigh' + side, pakistan ? 0.245 : 0.20, pakistan ? 0.19 : 0.16, fabric);
      ball(thigh, fabric, [0, 0.02, 0], [pakistan ? 0.245 : 0.21, 0.47, pakistan ? 0.235 : 0.20]);
      if (pakistan) {
        ball(thigh, white, [0.16, 0.01, 0], [0.074, 0.41, 0.13]);
        mesh(thigh, cylinder, gold, [0.183, 0, 0.095], [0.015, 0.80, 0.012]);
        mesh(thigh, cylinder, gold, [0.183, 0, -0.095], [0.015, 0.80, 0.012]);
      } else {
        mesh(thigh, cylinder, red, [-0.12, 0, side === 'R' ? 0.14 : -0.14], [0.018, 0.9, 0.025]);
      }
      const knee = node('knee' + side); ball(knee, fabric, null, [0.17, 0.165, 0.17]);
      const shin = segment('shin' + side, pakistan ? 0.18 : 0.155, 0.10, fabric);
      ball(shin, fabric, [0, -0.03, 0], [pakistan ? 0.18 : 0.15, 0.42, 0.15]);
      mesh(shin, cylinder, glove, [0, 0.30, 0], [0.108, 0.40, 0.108]);
      for (const h of [0.43, 0.30, 0.17]) {
        mesh(shin, cylinder, pakistan ? gold : red, [0, h, 0], [0.113, 0.026, 0.113]);
      }
      const foot = node('foot' + side);
      ball(foot, skin, [0, 0, 0], [0.185, 0.102, 0.115]);
      ball(foot, glove, [-0.015, 0.025, 0], [0.105, 0.10, 0.12]);
      for (let toe = 0; toe < 3; toe++) {
        ball(foot, skin, [0.175 - toe * 0.012, -0.028, (toe - 1) * 0.061], [0.040, 0.044, 0.036]);
      }
    }

    const neck = node('neck'); ball(neck, skin, null, [0.11, 0.18, 0.12]);
    const head = node('head');
    const face = new THREE.Group(); face.rotation.y = -0.35; head.add(face);
    const skull = new THREE.SphereGeometry(1, 24, 18); geometries.add(skull);
    const skullPositions = skull.attributes.position;
    for (let i = 0; i < skullPositions.count; i++) {
      const x = skullPositions.getX(i), y = skullPositions.getY(i), z = skullPositions.getZ(i);
      const jaw = y < -0.2 ? Math.max(0.78, 1 + (y + 0.2) * 0.27) : 1;
      const forward = (x > 0.15 && y < 0.25 ? 0.015 * (1 - y * y) : 0) + Math.max(0, -0.2 - y) * 0.025;
      skullPositions.setXYZ(i, x * 0.175 + forward, y * 0.238, z * 0.164 * jaw);
    }
    skull.computeVertexNormals(); mesh(face, skull, skin);
    for (const s of [-1, 1]) {
      ball(face, skin, [-0.005, -0.015, s * 0.161], [0.037, 0.068, 0.024]);
      ball(face, eyeWhite, [0.164, 0.044, s * 0.076], [0.011, pakistan ? 0.016 : 0.012, 0.030]);
      ball(face, iris, [0.174, 0.044, s * 0.076], [0.008, 0.012, 0.014]);
      const brow = ball(face, hair, [0.160, 0.085, s * 0.077], [0.030, 0.020, 0.057]); brow.rotation.x = s * 0.20;
    }
    ball(face, skin, [0.184, 0.002, 0], [0.047, 0.064, 0.032]);
    ball(face, lip, [0.184, -0.105, 0], [0.010, 0.011, 0.055]);
    ball(face, hair, [-0.035, 0.136, 0], [0.18, 0.145, 0.179]);
    // Swept individual locks, deliberately different silhouettes for the two champions.
    for (let i = 0; i < (pakistan ? 13 : 12); i++) {
      const angle = i * 2.399963;
      const length = pakistan ? 0.10 + (i % 3) * 0.021 : 0.14 + (i % 3) * 0.025;
      const lock = mesh(face, pakistan ? sphere : cone, i % 3 ? hair : hairLight,
        [Math.sin(angle) * 0.13 - 0.025, 0.20 + (i % 3) * 0.017, Math.cos(angle) * 0.13],
        [pakistan ? 0.061 : 0.063, pakistan ? 0.049 : length, 0.060]);
      lock.rotation.z = 0.3 + Math.sin(angle) * 0.65; lock.rotation.x = Math.cos(angle) * 0.70;
    }
    if (pakistan) {
      ball(face, hair, [0.126, -0.15, 0], [0.068, 0.073, 0.116]);
      ball(face, hair, [0.181, -0.085, 0], [0.017, 0.015, 0.061]);
      for (const s of [-1, 1]) {
        ball(face, hair, [0.12, -0.10, s * 0.119], [0.038, 0.074, 0.028]);
      }
    } else {
      const band = mesh(face, cylinder, red, [0, 0.12, 0], [0.183, 0.045, 0.181]);
      const foreheadSun = mesh(face, new THREE.CircleGeometry(0.035, 16), red, [0.184, 0.105, 0]);
      geometries.add(foreheadSun.geometry); foreheadSun.rotation.y = Math.PI / 2;
      // Pale patch makes the red sun readable on the white national headband.
      band.material = white;
    }

    function clothTexture() {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 640;
      const c = canvas.getContext('2d');
      c.fillStyle = '#075238'; c.fillRect(0, 0, 512, 640);
      c.fillStyle = '#e7e7d9'; c.fillRect(0, 0, 84, 640);
      for (let i = 0; i < 18; i++) {
        const gradient = c.createLinearGradient(i * 32, 0, i * 32 + 32, 0);
        gradient.addColorStop(0, 'rgba(255,255,255,.10)'); gradient.addColorStop(0.5, 'rgba(0,0,0,.08)');
        gradient.addColorStop(1, 'rgba(255,255,255,.03)'); c.fillStyle = gradient; c.fillRect(i * 32, 0, 32, 640);
      }
      c.fillStyle = '#f1efe0'; c.beginPath(); c.arc(285, 295, 115, 0, TAU); c.fill();
      c.fillStyle = '#075238'; c.beginPath(); c.arc(321, 271, 100, 0, TAU); c.fill();
      c.fillStyle = '#f1efe0'; c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 20 : 48;
        const x = 367 + Math.cos(a) * r, y = 221 + Math.sin(a) * r;
        if (!i) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.closePath(); c.fill();
      c.strokeStyle = '#c9a34d'; c.lineWidth = 14; c.strokeRect(7, 7, 498, 626);
      c.lineWidth = 3; c.strokeRect(25, 25, 462, 590);
      for (let y = 45; y < 620; y += 36) {
        for (const x of [20, 492]) { c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 7, y); c.lineTo(x, y + 9); c.lineTo(x - 7, y); c.closePath(); c.stroke(); }
      }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4; textures.add(tex); return tex;
    }
    let cape = null, capeBase = null, capeGeo = null;
    if (pakistan) {
      capeGeo = new THREE.PlaneGeometry(1, 1, 10, 15); geometries.add(capeGeo);
      const pos = capeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i), t = 0.5 - pos.getY(i);
        pos.setXYZ(i, -0.22 - t * 0.40 + Math.cos(u * 12) * 0.025, 0.94 - t * 1.47, u * (0.81 + t * 0.35));
      }
      capeGeo.computeVertexNormals(); capeBase = new Float32Array(pos.array);
      const capeMat = material('#ffffff', { map: clothTexture(), side: THREE.DoubleSide, roughness: 0.95 });
      cape = mesh(torso, capeGeo, capeMat);
      for (const s of [-1, 1]) {
        const clasp = ball(torso, gold, [-0.04, 0.89, s * 0.30], [0.11, 0.055, 0.09]);
        const sash = mesh(torso, cylinder, fabric, [0.20, 0.65, s * 0.17], [0.046, 0.55, 0.078]);
        sash.rotation.x = s * 0.50;
        mesh(clasp, torus, fabricDark, [0, 0, 0.2], [0.6, 0.6, 0.6]);
      }
      // Crescent/star shoulder badge faces the player camera as well as the cape.
      const badgeGeo = new THREE.PlaneGeometry(0.28, 0.35); geometries.add(badgeGeo);
      const badge = mesh(torso, badgeGeo, material('#ffffff', { map: clothTexture(), side: THREE.DoubleSide }), [0.018, 0.79, 0.365]);
      badge.rotation.y = -0.1;
    }
    const ribbons = [];
    if (!pakistan) {
      for (const s of [-1, 1]) {
        const geo = new THREE.PlaneGeometry(0.045, 0.64, 1, 6); geometries.add(geo);
        const m = material('#aa172a', { side: THREE.DoubleSide });
        const ribbon = mesh(head, geo, m, [-0.22, -0.02, s * 0.06]);
        ribbon.rotation.z = -1.0 - s * 0.12; ribbons.push(ribbon);
      }
    }

    let updates = 0;
    const rest = basePose();
    function update(pose) {
      const p = { ...rest, ...pose };
      setNode('pelvis', p.hip);
      // Torso follows the supplied hip/chest line, keeping girth independent of height.
      v.set(...p.hip); w.set(...p.chest).sub(v); torso.position.copy(v);
      torso.quaternion.setFromUnitVectors(yAxis, w.clone().normalize());
      torso.scale.y = w.length() / 0.71;
      pelvis.quaternion.copy(torso.quaternion);
      for (const s of ['L', 'R']) {
        const sh = p['shoulder' + s], el = p['elbow' + s], ha = p['hand' + s];
        setNode('shoulder' + s, sh); setNode('elbow' + s, el); setNode('hand' + s, ha);
        put('upperArm' + s, sh, el); put('forearm' + s, el, ha);
        joints['hand' + s].quaternion.copy(joints['forearm' + s].quaternion);
        const hip = [p.hip[0], p.hip[1] - 0.025, p.hip[2] + (s === 'R' ? 0.18 : -0.18)];
        const kn = p['knee' + s], ft = p['foot' + s];
        put('thigh' + s, hip, kn); put('shin' + s, kn, ft); setNode('knee' + s, kn); setNode('foot' + s, ft);
        // Feet remain flat in guard; raised kicking feet turn with the shin.
        const lift = Math.max(0, Math.min(1, (ft[1] - 0.25) / 0.6));
        joints['foot' + s].quaternion.identity().slerp(joints['shin' + s].quaternion, lift * 0.7);
      }
      setNode('neck', p.neck); setNode('head', p.head);
      neck.quaternion.copy(torso.quaternion);
      head.quaternion.copy(torso.quaternion);
      head.rotateZ(Number(p.headTilt) || 0);
      head.rotateY(Number(p.headYaw) || 0);
      const time = Number.isFinite(p.time) ? p.time : updates / 60;
      if (cape) {
        const positions = capeGeo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const off = i * 3, t = (0.94 - capeBase[off + 1]) / 1.47;
          positions.array[off] = capeBase[off] + Math.sin(time * 3.2 + t * 4 + capeBase[off + 2] * 5) * 0.045 * t;
          positions.array[off + 2] = capeBase[off + 2] + Math.sin(time * 2.5 + t * 5) * 0.035 * t;
        }
        positions.needsUpdate = true;
        if ((updates & 3) === 0) capeGeo.computeVertexNormals();
      }
      ribbons.forEach((r, i) => { r.rotation.x = Math.sin(time * 4 + i) * 0.17; r.rotation.z = -1.0 - i * 0.22 + Math.cos(time * 3 + i) * 0.12; });
      updates++;
    }
    update(rest);
    return {
      root: group, joints, update, basePose,
      strikeMeshes: { punch: joints.handR.children[0], kick: joints.footR.children[0] },
      getStrikePoint(action, target) {
        const kick = action === 'kick' || action === 'heavy';
        group.updateWorldMatrix(true, true);
        return (kick ? joints.footR.children[0] : joints.handR.children[0]).getWorldPosition(target || new THREE.Vector3());
      },
      setFlash(amount) {
        const a = Math.max(0, Math.min(1, Number(amount) || 0));
        for (const m of materials) { m.emissive.setRGB(a * 0.65, a * 0.11, a * 0.05); }
      },
      debug: { country: id, type: 'articulated-three-dimensional-mesh', original: true,
        flagCostume: pakistan ? 'Green and white crescent-star cape; gold trim' : 'White sleeveless gi; red sun headband and red belt',
        meshCount: (() => { let n = 0; group.traverse(o => { if (o.isMesh) n++; }); return n; })() },
      dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); }
    };
  }
  root.Nation3DModels = { createFighter, basePose };
})(typeof window !== 'undefined' ? window : globalThis);
