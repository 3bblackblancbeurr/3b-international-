"""Resolve the reviewed France/City import conflict; refuse every other conflict."""
from pathlib import Path
import re
import subprocess

paths = subprocess.check_output(
    ['git', 'diff', '--name-only', '--diff-filter=U'], text=True
).splitlines()
if not paths:
    raise SystemExit(0)
if paths != ['src/world/WorldPage.jsx']:
    raise SystemExit('Unreviewed conflict paths: ' + ', '.join(paths))

path = Path(paths[0])
text = path.read_text(encoding='utf-8')
expected = (
    '<<<<<<< HEAD\n'
    "import {City3BPanel} from '../city/City3BPanel.jsx';\n"
    '=======\n'
    "import {cityUnlockGuide,cityUnlockGuideRequested,cityUnlockGuideStorage} from './city-unlock-guide.js';\n"
    '>>>>>>> ba1f8d2ec7892d79738c21e6e4665142e863231e\n'
)
replacement = (
    "import {City3BPanel} from '../city/City3BPanel.jsx';\n"
    "import {cityUnlockGuide,cityUnlockGuideRequested,cityUnlockGuideStorage} from './city-unlock-guide.js';\n"
)
if text.count(expected) != 1:
    raise SystemExit('The reviewed import conflict changed; manual review required.')
resolved = text.replace(expected, replacement, 1)
if re.search(r'^(<<<<<<< |=======$|>>>>>>> )', resolved, re.MULTILINE):
    raise SystemExit('Unreviewed conflict markers remain; refusing to stage.')
path.write_text(resolved, encoding='utf-8')
subprocess.run(['git', 'add', '--', str(path)], check=True)
print('Preserved both the City panel and guided unlock imports. No executable code was discarded.')
