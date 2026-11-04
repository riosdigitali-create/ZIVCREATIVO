"""Export the hosted journey as one HTML file, including the renderer and maps."""
from pathlib import Path
import base64
import json
import sys

root = Path(__file__).resolve().parents[1]
html = (root / 'horizontes.html').read_text(encoding='utf-8')
renderer = (root / 'horizons.js').read_text(encoding='utf-8')
maps = {
    path.name: 'data:image/jpeg;base64,' + base64.b64encode(path.read_bytes()).decode()
    for path in (root / 'assets/horizons').glob('*.jpg')
}
fallback = root / 'assets/horizons/earth-fallback.webp'
html = html.replace('assets/horizons/earth-fallback.webp', 'data:image/webp;base64,' + base64.b64encode(fallback.read_bytes()).decode())
html = html.replace("import {Horizons,planets} from './horizons.js';", renderer)
html = html.replace('const sources={};', 'const sources=' + json.dumps(maps) + ';')
target = Path(sys.argv[1])
target.write_text(html, encoding='utf-8')
print(f'Exported: {target} ({target.stat().st_size:,} bytes)')
