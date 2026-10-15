"""Prepare supplied eight-pose PNG sheets for the offline browser renderer.

Retains original PNGs. Pose isolation changes no painted RGB pixels; compact WebP
atlases and portraits are build derivatives. Requires Pillow, numpy and scipy.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
DEFAULT = ['idle', 'walk', 'block', 'crouch', 'punch', 'kick', 'hit', 'ko']
ORDERS = {
    **dict.fromkeys(['mk'],
                    ['idle', 'punch', 'kick', 'punch', 'crouch', 'lowPunch', 'jump', 'down']),
    **dict.fromkeys(['mm', 'nr', 'np', 'nz', 'kp'],
                    ['idle', 'punch', 'block', 'crouch', 'punch', 'kick', 'hit', 'ko']),
    'nl': ['idle', 'punch', 'block', 'kick', 'punch', 'crouch', 'hit', 'ko'],
    'ni': ['idle', 'punch', 'block', 'kick', 'crouch', 'lowPunch', 'hit', 'ko'],
    **dict.fromkeys(['na', 'ne'],
                    ['idle', 'punch', 'kick', 'block', 'crouch', 'lowPunch', 'hit', 'ko']),
    'no': ['idle', 'punch', 'kick', 'punch', 'crouch', 'lowPunch', 'hit', 'down'],
    'ph': ['idle', 'punch', 'kick', 'block', 'crouch', 'lowPunch', 'jump', 'ko'],
    'pl': ['idle', 'punch', 'kick', 'block', 'crouch', 'lowPunch', 'hit', 'down'],
}
# Touching figures in these supplied sheets require an explicit separation seam.
SPLITS = {'pl': [465], 'ru': [390, 1085], 'ws': [1085],
          **dict.fromkeys(['mx','om','pw','pa','pe','sb'], [1140])}
FOUR_POSE_COUNTRIES = {'tr'}
SPLIT_PATHS = {
    **dict.fromkeys([(c,1140) for c in ['mx','om','pw','pa','pe','sb']],
                   [(0,1180),(900,1160),(980,1110),(1010,1080),(1045,930),(1086,930)]),
    ('ru',390): [(0,390),(590,390),(650,418),(664,390),(850,395),(1020,445),(1086,445)],
    ('ru',1085): [(0,1190),(820,1170),(910,1100),(980,1020),(1086,1015)],
    ('ws',1085): [(0,1160),(800,1160),(900,1130),(980,1090),(1086,1080)],
}


def separation_seam(mask, center):
    """Follow transparent gaps around touching feet, cutting minimal opaque pixels.

    A reviewed corridor keeps the path between the hit and KO figures. Dynamic
    programming avoids the broad straight cuts that would amputate their boots.
    """
    height, width = mask.shape
    x0 = max(0, int(center.min())-180)
    x1 = min(width, int(center.max())+181)
    xx = np.arange(x0, x1)
    cost = mask[:,x0:x1].astype(float)*10000 + (xx[None,:]-center[:,None])**2*.0005
    cost[abs(xx[None,:]-center[:,None])>180] = 1e12
    previous = cost[0].copy()
    parents = np.zeros((height,len(xx)),np.int16)
    steps = np.arange(-6,7)
    for y in range(1,height):
        choices = np.full((len(steps),len(xx)),1e15)
        for n, step in enumerate(steps):
            if step<0: choices[n,:step] = previous[-step:]+abs(step)*.1
            elif step>0: choices[n,step:] = previous[:-step]+step*.1
            else: choices[n] = previous
        best = choices.argmin(axis=0)
        parents[y] = xx-steps[best]
        previous = cost[y]+choices[best,np.arange(len(xx))]
    seam = np.zeros(height,np.int16)
    seam[-1] = xx[previous.argmin()]
    for y in range(height-1,0,-1):seam[y-1] = parents[y,seam[y]-x0]
    return seam


def isolate(rgba, code):
    alpha = rgba[:, :, 3]
    labels, _ = ndimage.label(alpha > 100)
    counts = np.bincount(labels.ravel())
    owners = np.zeros(labels.shape, np.int16)
    next_id = 1
    for old in np.flatnonzero(counts > 1200):
        if not old:
            continue
        mask = labels == old
        ys, xs = np.where(mask)
        if xs.max() - xs.min() > rgba.shape[1] * .42:
            cuts = [cut for cut in SPLITS.get(code, []) if xs.min() < cut < xs.max()]
            if len(cuts) != 1:
                raise ValueError(f'{code}: unreviewed touching figures')
            cut = cuts[0]
            xx = np.arange(mask.shape[1])[None, :]
            path = SPLIT_PATHS.get((code,cut), [(0,cut),(mask.shape[0],cut)])
            seam = np.interp(np.arange(mask.shape[0]), [p[0] for p in path], [p[1] for p in path])
            if code in ['mx','om','pw','pa','pe','sb']:
                seam = separation_seam(mask, seam)
            seam = seam[:,None]
            for region in [xx < seam, xx >= seam]:
                owners[mask & region] = next_id
                next_id += 1
        else:
            owners[mask] = next_id
            next_id += 1
    expected = 4 if code in FOUR_POSE_COUNTRIES else 8
    if next_id != expected + 1:
        raise ValueError(f'{code}: expected {expected} figures, found {next_id - 1}')
    # Assign detached tassels and translucent edges to the nearest actual figure.
    distance, nearest = ndimage.distance_transform_edt(owners == 0, return_indices=True)
    owners = owners[tuple(nearest)]
    parts = []
    for number in range(1, expected + 1):
        mask = (owners == number) & (alpha > 0) & (distance <= 6)
        ys, xs = np.where(mask)
        x, y, right, bottom = int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)
        pixels = rgba[y:bottom, x:right].copy()
        pixels[:, :, 3] = np.where(mask[y:bottom, x:right], pixels[:, :, 3], 0)
        parts.append({'box': [x, y, right-x, bottom-y], 'pixels': pixels})
    if expected == 4:
        return sorted(parts, key=lambda p: p['box'][0])
    # The ground KO is shorter, so its top is much lower than the other row.
    by_top = sorted(parts, key=lambda p: p['box'][1])
    return (sorted(by_top[:4], key=lambda p: p['box'][0]) +
            sorted(by_top[4:], key=lambda p: p['box'][0]))


def pivot(pixels, pose, standing_height):
    alpha = pixels[:, :, 3]
    ys, xs = np.where(alpha > 100)
    bottom = int(np.percentile(ys, 99.8))
    if pose in ['ko', 'down']:
        return float(pixels.shape[1] * .53), bottom
    low_band = (ys > bottom - standing_height * .18)
    feet = xs[low_band]
    return float((np.percentile(feet, 5) + np.percentile(feet, 95)) / 2), bottom


def tip(pixels, baseline, standing_height, pose):
    alpha = pixels[:, :, 3]
    yy = np.arange(alpha.shape[0])[:, None]
    if pose == 'lowPunch':
        region = (yy < baseline - standing_height * .12) & (yy > baseline - standing_height * .75)
    else:
        region = (yy < baseline - standing_height * .32) & (yy > baseline - standing_height * 1.12)
    mask = (alpha > 150) & region
    ys, xs = np.where(mask)
    right = int(xs.max())
    candidates = ys[xs >= right - 3]
    y = int(np.median(candidates))
    # Store a contact point on an actual opaque knuckle/toe boundary pixel.
    near = np.flatnonzero(mask[:, right])
    y = int(near[np.argmin(abs(near-y))])
    return right, y


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path)
    parser.add_argument('--inventory', type=Path)
    args = parser.parse_args()
    original = ROOT / 'artwork/country-fighters/source'
    original.mkdir(parents=True, exist_ok=True)
    intake = ROOT / 'artwork/country-fighters/intake.json'
    if args.inventory:
        shutil.copyfile(args.inventory, intake)
    inventory = json.loads(intake.read_text())
    if args.source_dir:
        for entry in inventory['images']:
            shutil.copyfile(args.source_dir / (entry['id']+'.png'), original / (entry['id']+'.png'))
    output = ROOT / 'browser/assets/countries'
    output.mkdir(parents=True, exist_ok=True)
    metadata = {}
    worker = os.environ.get('NATION_ART_WORKER')
    workers = 4
    entries = sorted(inventory['images'], key=lambda e: e['id'])
    if worker is None:
        processes = [subprocess.Popen([sys.executable, '-u', __file__],
                     env={**os.environ, 'NATION_ART_WORKER': str(i)}) for i in range(workers)]
        failures = [process.wait() for process in processes]
        if any(failures):
            raise RuntimeError('Country artwork preparation worker failed')
        metadata = {entry['id']: json.loads((output/(entry['id']+'.json')).read_text())
                    for entry in entries}
        entries = []
    else:
        entries = entries[int(worker)::workers]
        only = set(filter(None,os.environ.get('NATION_ART_ONLY','').split(',')))
        if only:
            entries = [e for e in entries if e['id'] in only]
    for entry in entries:
        code = entry['id']
        source = original / (code+'.png')
        if hashlib.sha256(source.read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError(f'{code}: original source checksum mismatch')
        with Image.open(source) as image:
            rgba = np.array(image.convert('RGBA'))
        parts = isolate(rgba, code)
        order = ['idle','punch','kick','block'] if code in FOUR_POSE_COUNTRIES else ORDERS.get(code, DEFAULT)
        standing_height = parts[0]['pixels'].shape[0]
        ratio = min(1, 360 / standing_height)
        cell_w = max(round(p['pixels'].shape[1] * ratio) for p in parts) + 16
        cell_h = max(round(p['pixels'].shape[0] * ratio) for p in parts) + 16
        atlas = Image.new('RGBA', (cell_w*4, cell_h*((len(parts)+3)//4)))
        frames = {}
        records = []
        for i, (part, pose) in enumerate(zip(parts, order)):
            pixels = part['pixels']
            px, baseline = pivot(pixels, pose, standing_height)
            picture = Image.fromarray(pixels)
            new_w, new_h = max(1, round(picture.width*ratio)), max(1, round(picture.height*ratio))
            picture = picture.resize((new_w, new_h), Image.Resampling.LANCZOS)
            x, y = (i % 4)*cell_w+8, (i//4)*cell_h+8
            atlas.paste(picture, (x, y))
            frame = {'x': x, 'y': y, 'w': new_w, 'h': new_h,
                     'pivot': round(x+px*ratio, 3), 'baseline': round(y+baseline*ratio, 3),
                     'sourceIndex': i}
            if pose in ['punch', 'kick', 'lowPunch']:
                tx, ty = tip(np.array(picture), baseline*ratio, standing_height*ratio, pose)
                frame.update(tipX=x+tx, tipY=y+ty)
            records.append({'index': i, 'pose': pose, 'sourceBounds': part['box'], 'frame': frame})
            if pose == 'punch' and pose in frames:
                frames['powerPunch'] = frame
            else:
                frames[pose] = frame
        for pose, fallback in [('walk','idle'), ('block','idle'), ('hit','idle'), ('ko','down')]:
            if pose not in frames:
                frames[pose] = frames.get(fallback, frames['idle'])
        if 'crouch' not in frames:
            frames['crouch'] = {**frames['block'], 'drawScaleY': .62}
        # A short low foot strike uses the supplied crouch's forward ankle/toe.
        # This is explicitly an adapted pose, not an invented source low kick.
        crouch = frames['crouch']
        foot_options=[]
        for base in [crouch]+([frames['lowPunch']] if 'lowPunch' in frames else []):
            cp=np.array(atlas.crop((base['x'],base['y'],base['x']+base['w'],base['y']+base['h'])))
            cb=base['baseline']-base['y']; yy=np.arange(cp.shape[0])[:,None]
            candidates=(cp[:,:,3]>180)&(yy>cb-standing_height*ratio*.10)&(yy<cb-standing_height*ratio*.025)
            cy,cx=np.where(candidates);tx=int(cx.max());possible=cy[cx==tx]
            ty=int(possible[np.argmin(abs(possible-np.median(possible)))])
            foot_options.append({**base,'tipX':base['x']+tx,'tipY':base['y']+ty})
        frames['lowKick']=foot_options[0]
        if (frames['lowKick']['tipX']-frames['lowKick']['pivot'])*2.65/(standing_height*ratio)<.55:
            frames['lowKick']=max(foot_options,key=lambda f:f['tipX']-f['pivot'])
        # Dedicated low-punch poses are used where supplied. Other low strikes
        # retain the normal authored contact and use a documented crouch warp.
        entry_meta = {'width': atlas.width, 'height': atlas.height,
                      'scale': round(2.65/(standing_height*ratio), 9),
                      'frames': frames, 'poseRecords': records, 'sourcePoseCount': len(records),
                      'adaptedCrouch': 'crouch' not in order, 'adaptedKo': 'ko' not in order and 'down' not in order,
                      'hasWalkPose': 'walk' in order, 'hasHitPose': 'hit' in order,
                      'hasGroundKo': 'ko' in order, 'hasLowPunch': 'lowPunch' in order,
                      'crouchHeight': round(crouch['h']*2.65/(standing_height*ratio)*crouch.get('drawScaleY',1),4),
                      'sourceName': entry['originalName'], 'sourceSha256': entry['sha256']}
        metadata[code] = entry_meta
        atlas.save(output/(code+'.webp'), 'WEBP', quality=88, method=4)
        idle = Image.fromarray(parts[0]['pixels'])
        portrait = Image.new('RGBA', (240,270))
        thumb_ratio = 330 / idle.height
        idle = idle.resize((round(idle.width*thumb_ratio), 330), Image.Resampling.LANCZOS)
        root_x = pivot(parts[0]['pixels'], 'idle', standing_height)[0]*thumb_ratio
        portrait.paste(idle, (round(120-root_x), 4))
        portrait.save(output/(code+'-portrait.webp'), 'WEBP', quality=88, method=4)
        (output/(code+'.json')).write_text(json.dumps(entry_meta,separators=(',',':'))+'\n')
        print(code, entry['country'], len(records), 'poses', 'source verified', flush=True)
    if worker is not None:
        return
    # Keep per-source derivatives stable. Assign reviewed flag swap cycles only
    # in the combined runtime table; originals and their filenames stay intact.
    assignment = json.loads((ROOT/'artwork/country-fighters/assignments.json').read_text())
    overrides = assignment['overrides']
    ids = set(metadata)
    if not set(overrides).issubset(ids):
        raise ValueError('Unknown assignment destination')
    source_ids = [overrides.get(code, {}).get('sourceId', code) for code in metadata]
    if set(source_ids) != ids or len(set(source_ids)) != len(source_ids):
        raise ValueError('Assignments must use every source exactly once')
    metadata = {code: {**metadata[overrides.get(code, {}).get('sourceId', code)],
                      'sourceCountryId': overrides.get(code, {}).get('sourceId', code),
                      'assignmentReason': overrides.get(code, {}).get('reason', 'Original filename')}
                for code in metadata}
    (output/'metadata.json').write_text(json.dumps(metadata, separators=(',',':'))+'\n')
    js = "// Generated by tools/prepare-country-art.py from user-supplied country PNGs.\n"
    js += "(function(root){'use strict';const METADATA="+json.dumps(metadata, separators=(',',':'))+";"
    js += "const api={METADATA};root.NationCountryArt=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis);\n"
    (ROOT/'browser/src/country-art.js').write_text(js)
    print('Prepared',len(metadata),'country atlases; missing',len(inventory['missing']),flush=True)


if __name__ == '__main__':
    main()
