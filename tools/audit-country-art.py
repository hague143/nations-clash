"""Audit source preservation, country coverage and exact/near duplicate PNGs.

Perceptual matches are review candidates, never proof of duplicate characters or
national flag identity. Transparent RGB is cleared before canonical pixel hashes.
"""
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.fft import dctn

ROOT = Path(__file__).resolve().parent.parent

def audit():
    intake = json.loads((ROOT/'artwork/country-fighters/intake.json').read_text())
    sources = []; byte_groups = defaultdict(list); pixel_groups = defaultdict(list)
    for entry in intake['images']:
        data = (ROOT/'artwork/country-fighters/source'/(entry['id']+'.png')).read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        if digest != entry['sha256']:
            raise ValueError('Original source changed: '+entry['originalName'])
        with Image.open(ROOT/'artwork/country-fighters/source'/(entry['id']+'.png')) as opened:
            image = opened.convert('RGBA'); pixels = np.array(image)
        pixels[pixels[:,:,3]==0,:3]=0
        canonical = hashlib.sha256(str(image.size).encode()+pixels.tobytes()).hexdigest()
        byte_groups[digest].append(entry['id']); pixel_groups[canonical].append(entry['id'])
        matte = Image.new('RGBA',image.size,'#18232e'); matte.alpha_composite(image)
        small = np.asarray(matte.convert('L').resize((64,64),Image.Resampling.LANCZOS),dtype=float)
        coeff = dctn(small,type=2,norm='ortho')[:16,:16].ravel()[1:]
        phash = coeff > np.median(coeff)
        sources.append({'id':entry['id'],'country':entry['country'],'sourceName':entry['originalName'],
                        'sha256':digest,'pixelSha256':canonical,'size':list(image.size),'hash':phash})
    pairs = []
    for i,a in enumerate(sources):
        for b in sources[i+1:]:
            distance = int(np.count_nonzero(a['hash']!=b['hash']))
            pairs.append({'a':a['id'],'b':b['id'],'perceptualDistanceOf255':distance})
    pairs.sort(key=lambda p:(p['perceptualDistanceOf255'],p['a'],p['b']))
    for source in sources: source.pop('hash')
    result = {'sourceSheets':len(sources),'rosterCountries':len(sources)+len(intake['missing']),
              'missingSourceSheets':intake['missing'],
              'repeatedCountryAssignments':[c for c,n in __import__('collections').Counter(e['id'] for e in intake['images']).items() if n>1],
              'exactFileDuplicateGroups':[v for v in byte_groups.values() if len(v)>1],
              'exactVisiblePixelDuplicateGroups':[v for v in pixel_groups.values() if len(v)>1],
              'comparedPairs':len(pairs),
              'perceptualMethod':'255 low-frequency DCT bits of the complete sheet on a fixed matte. Nearest pairs are candidates only; common pose layout lowers distance.',
              'nearestPairsForVisualReview':pairs[:40], 'sources':sources}
    (ROOT/'artwork/country-fighters/duplicate-audit.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k not in ['sources','nearestPairsForVisualReview']},indent=2))
    print('Nearest 15:',pairs[:15])

if __name__=='__main__':audit()
