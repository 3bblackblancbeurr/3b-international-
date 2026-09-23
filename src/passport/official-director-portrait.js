import { isDirectorPortraitIdentity, normalizeAppearance } from './appearance-store.js';

// Public artwork approved for this holder. This association grants no rights.
const DIRECTOR_OWNER_ID = '864dc1e7-292a-4165-aec6-4420eae64ce7';
export const OFFICIAL_DIRECTOR_PORTRAIT = '/passport/director-matrix-20260924.png';

export function officialDirectorPortrait(identity) {
  return identity?.userId === DIRECTOR_OWNER_ID && isDirectorPortraitIdentity(identity)
    ? OFFICIAL_DIRECTOR_PORTRAIT : '';
}

export function matrixPortraitSource(identity, value) {
  const appearance = normalizeAppearance(value, identity);
  if (appearance.mode !== 'matrix') return '';
  return appearance.photo || officialDirectorPortrait(identity);
}

// Local photos remain data URLs. Only this exact published asset is also allowed;
// neither profile data nor local storage can supply arbitrary remote image URLs.
export function loadMatrixPortraitImage(source, { createImage = () => new Image(), timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof source !== 'string' || (source !== OFFICIAL_DIRECTOR_PORTRAIT &&
      !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(source))) {
      reject(new Error('Photo illisible'));
      return;
    }
    const image = createImage();
    image.decoding = 'async';
    let timer;
    const release = () => { clearTimeout(timer); image.onload = null; image.onerror = null; };
    const fail = () => { release(); reject(new Error('Photo illisible')); };
    image.onerror = fail;
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) { fail(); return; }
      release();
      resolve(image);
    };
    timer = setTimeout(() => { fail(); image.src = ''; }, timeoutMs);
    try { image.src = source; }
    catch { fail(); }
  });
}
