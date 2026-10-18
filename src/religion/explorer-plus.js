// Keep the original renderer, source corpus and every existing feature intact.
import './tree.js';
import corpus from './corpus.json';
// Public ES modules are copied unchanged by Vite. Resolve this fixed same-origin
// URL at runtime rather than asking Rollup to bundle a public-directory import.
// The absolute same-origin URL also avoids Vite's development-only ?import
// rewriting, which cannot transform modules intentionally served from public/.
const discoveryModuleUrl = new URL('/religion/discovery-plus.js', window.location.origin).href;
import(/* @vite-ignore */ discoveryModuleUrl)
  .then(({ mountTree }) => mountTree(corpus))
  .catch(error => {
    console.error('3B Religion: documentary enhancements unavailable; base tree preserved.', error);
    const notice = document.createElement('p');
    notice.className = 'discovery-footnote';
    notice.textContent = 'Les compléments documentaires ne se sont pas chargés. L’arbre et ses fiches restent disponibles.';
    document.querySelector('.tree-caption')?.append(notice);
  });
