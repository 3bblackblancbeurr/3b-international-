"""One-time, hash-verified import of the artwork explicitly supplied by the owner.
No runtime external image dependency. Keep the original portrait and world engine.
Usage: python scripts/materialize-nexus-cinema.py <approved-image-url-or-path>
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import sys
import urllib.request
from PIL import Image

EXPECTED = 'bee77ce31f829943bf157cf55e3397eaa8dd21375298a96f2bc88390066edb97'
source = sys.argv[1]
if source.startswith('https://'):
    if not source.startswith('https://d2jqrm6oza8nb6.cloudfront.net/'):
        raise ValueError('Only the approved artwork upload host is allowed')
    with urllib.request.urlopen(source, timeout=60) as response:
        data = response.read(12_000_001)
else:
    data = Path(source).read_bytes()
if len(data) > 12_000_000 or hashlib.sha256(data).hexdigest() != EXPECTED:
    raise ValueError('Artwork integrity check failed')
im = Image.open(BytesIO(data)).convert('RGB')
if im.size != (941, 1672):
    raise ValueError('Unexpected source dimensions')
out = Path('public/nexus/cinema-v1')
out.mkdir(parents=True, exist_ok=True)
rects = {
    'hall': (0,236,941,1352),
    'FR': (114,438,246,552), 'DZ': (300,448,429,556),
    'ES': (520,447,648,556), 'MA': (706,441,837,553),
    'IT': (25,774,155,886), 'TN': (198,778,306,884),
    'TR': (639,779,749,884), 'EE': (805,772,912,891),
}
assets = {}
for name, rect in rects.items():
    picture = im.crop(rect)
    path = out / f'{name}.webp'
    picture.save(path, format='WEBP', quality=88 if name == 'hall' else 90, method=6)
    assets[path.name] = {'width':picture.width, 'height':picture.height, 'bytes':path.stat().st_size, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    if name == 'hall':
        mobile = picture.resize((564, round(picture.height*564/picture.width)), Image.Resampling.LANCZOS)
        path = out / 'hall-mobile.webp'
        mobile.save(path, format='WEBP', quality=87, method=6)
        assets[path.name] = {'width':mobile.width,'height':mobile.height,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(out / 'manifest.json').write_text(json.dumps({'source':'Owner-provided Nexus reference, approved in conversation','sourceSha256':EXPECTED,'version':'cinema-reference-20260913','note':'Cropped and compressed artwork; dynamic UI and canonical progression are separate React layers. Not a newly modeled photorealistic 3D world.','assets':assets}, indent=2)+'\n')

path = Path('src/components/PassportNexus.jsx')
text = path.read_text()
if 'cinema-reference-20260913' not in text:
    changes = [
        ("import '../styles/nexus-journey.css';", "import '../styles/nexus-journey.css';\nimport { NexusCinemaHall, NexusTransitDecor } from './NexusCinema.jsx';\nimport { nexusDoorImage } from './nexus-cinema.js';\nimport '../styles/nexus-cinema.css';"),
        ("const [paused, setPaused] = useState(false), [quality, setQuality] = useState('auto');", "const [paused, setPaused] = useState(false), [quality, setQuality] = useState('auto');\n  const [visualMode, setVisualMode] = useState('cinema');"),
        ("if (!open || reducedMotion || phase === 'nexus') return undefined;", "if (!open || reducedMotion || paused || phase === 'nexus') return undefined;"),
        ("[open, reducedMotion, phase, replay]);", "[open, reducedMotion, phase, replay, paused]);"),
        ("const statusLabel = rendererStatus === 'fallback' ?", "const statusLabel = visualMode === 'cinema' ? (economy ? 'Décor cinéma · économie' : 'Décor cinéma · interactif') : rendererStatus === 'fallback' ?"),
        ('data-nexus-version="heritage-3d-canonical"', 'data-nexus-version="cinema-reference-20260913" data-visual-mode={visualMode} data-economy={economy}'),
        ('<NexusStage phase={phase} selected={selected} paused={paused}', "<div className=\"nexus-cinematic-backdrop\" aria-hidden=\"true\" />\n    {phase !== 'nexus' && <NexusTransitDecor />}\n    <NexusStage phase={phase} selected={selected} paused={paused || (phase === 'nexus' && visualMode === 'cinema')}"),
        ('<button type="button" className="nexus-skip" data-nexus-skip="true" onClick={skip}>Passer l’introduction <ArrowRight size={16} /></button>', '<div className="nexus-intro-controls"><button type="button" className="nexus-skip" data-nexus-skip="true" onClick={skip}>Passer l’introduction <ArrowRight size={16} /></button><button type="button" className="nexus-icon-button" aria-label={paused ? \'Reprendre les animations\' : \'Mettre les animations en pause\'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button></div>'),
        ('</section><div className="nexus-scene-caption"', "</section>{visualMode === 'cinema' && <NexusCinemaHall selected={selected} onSelect={selectDoor} doors={journey.progress.doors} originEnabled={journey.originEnabled} economy={economy} onFailure={() => setVisualMode('3d')} />}<div className=\"nexus-scene-caption\""),
        ('<span className="nexus-door-index">{world.number}</span><GateGlyph', '<img className="nexus-door-art" src={nexusDoorImage(world.code)} alt="" width="132" height="132" decoding="async" onError={event => { event.currentTarget.style.display = \'none\'; }} /><span className="nexus-door-index">{world.number}</span><GateGlyph'),
        ('<div className="nexus-render-controls"><span', '<div className="nexus-render-controls"><button type="button" className="nexus-visual-toggle" onClick={() => setVisualMode(mode => mode === \'cinema\' ? \'3d\' : \'cinema\')}>{visualMode === \'cinema\' ? \'Voir le sanctuaire en 3D\' : \'Activer le décor cinéma\'}</button><span'),
    ]
    for before, after in changes:
        if text.count(before) != 1:
            raise ValueError('Source changed; refusing an ambiguous patch: ' + before[:100])
        text = text.replace(before, after, 1)
    path.write_text(text)
print(json.dumps({'materializedAssets':len(assets),'totalBytes':sum(a['bytes'] for a in assets.values()),'sourceVerified':True},indent=2))
