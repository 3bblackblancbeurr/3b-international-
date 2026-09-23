import { useEffect, useId, useState } from 'react';
import './director-matrix-portrait.css';

// Share the one-time conversion between the card and settings previews.
// At most three source photos and their glyph rasters remain in memory.
const rasterCache = new Map();
const LIGHT_COLUMNS = Array.from({ length: 8 }, (_, index) => ({
  '--director-column': index,
  '--director-delay': `${-(index * 1.73 % 8)}s`,
  '--director-duration': `${6.4 + index % 4 * .65}s`,
}));

function rasterizePhoto(photo) {
  return new Promise((resolve, reject) => {
    if (!/^data:image\/(?:jpeg|png|webp);base64,/i.test(photo)) {
      reject(new Error('Photo illisible'));
      return;
    }
    const image = new Image();
    image.decoding = 'async';
    const release = () => { image.onload = null; image.onerror = null; };
    image.onerror = () => { release(); reject(new Error('Photo illisible')); };
    image.onload = () => {
      try {
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('Photo illisible');
        const columns = 64, rows = 70, cell = 10;
        const sample = document.createElement('canvas');
        sample.width = columns; sample.height = rows;
        const input = sample.getContext('2d', { willReadFrequently: true });
        const glyphs = document.createElement('canvas');
        glyphs.width = columns * cell; glyphs.height = rows * cell;
        const output = glyphs.getContext('2d');
        if (!input || !output) throw new Error('Conversion indisponible');
        const scale = Math.max(columns / image.naturalWidth, rows / image.naturalHeight);
        const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
        input.drawImage(image, (columns - width) / 2, (rows - height) / 2, width, height);
        const { data } = input.getImageData(0, 0, columns, rows);
        const luminance = Array.from({ length: columns * rows }, (_, index) => {
          const pixel = index * 4;
          return (.2126 * data[pixel] + .7152 * data[pixel + 1] + .0722 * data[pixel + 2]) * data[pixel + 3] / 255;
        });
        const sorted = [...luminance].sort((a, b) => a - b);
        const dark = sorted[Math.floor(sorted.length * .02)];
        const light = sorted[Math.floor(sorted.length * .98)];
        const range = light - dark;
        output.font = '700 12px "Courier New", monospace';
        output.textAlign = 'center'; output.textBaseline = 'middle';
        for (let row = 0; row < rows; row++) {
          for (let column = 0; column < columns; column++) {
            const value = luminance[row * columns + column];
            // Flat images stay valid; do not divide by zero or invent contrast.
            const level = Math.pow(Math.max(0, Math.min(1, range < 32 ? value / 255 : (value - dark) / range)), .82);
            if (level < .025) continue;
            output.fillStyle = `rgba(${Math.round(12 + level * 165)},${Math.round(68 + level * 173)},${Math.round(132 + level * 123)},${.12 + level * .88})`;
            output.fillText((column * 7 + row * 13) % 3 ? '0' : '1', (column + .5) * cell, (row + .5) * cell);
          }
        }
        resolve(glyphs.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      } finally {
        release();
      }
    };
    image.src = photo;
  });
}

function cachedRaster(photo) {
  let pending = rasterCache.get(photo);
  if (pending) rasterCache.delete(photo);
  else {
    pending = rasterizePhoto(photo);
    pending.catch(() => { if (rasterCache.get(photo) === pending) rasterCache.delete(photo); });
  }
  rasterCache.set(photo, pending);
  while (rasterCache.size > 3) rasterCache.delete(rasterCache.keys().next().value);
  return pending;
}

function DigitalDirectorFace({ id }) {
  return <svg className="director-matrix-face" viewBox="0 0 240 270" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#064773"/><stop offset=".5" stopColor="#072336"/><stop offset="1" stopColor="#03111d"/>
      </linearGradient>
      <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2=".8">
        <stop stopColor="#d0fcff"/><stop offset=".45" stopColor="#55d8ff"/><stop offset="1" stopColor="#177abe"/>
      </linearGradient>
    </defs>
    <g fill="none" stroke="#43b5e9" strokeWidth=".6" opacity=".35">
      <ellipse cx="120" cy="119" rx="90" ry="102"/>
      <path d="M30 119H210M120 17V221M47 58L193 180M47 180L193 58"/>
      <path d="M21 43V26H39M201 26H219V43M21 215V232H39M201 232H219V215"/>
    </g>
    <path d="M77 204L79 227L44 246L31 269H209L196 246L161 227L163 204" fill="#06304a" stroke="#3fa9db" strokeWidth="1"/>
    <path d="M120 29L155 39L176 64L181 102L172 156L154 192L133 211H107L86 192L68 156L59 102L64 64L85 39Z" fill={`url(#${id}-face)`} stroke={`url(#${id}-line)`} strokeWidth="1.4"/>
    <g fill="none" stroke={`url(#${id}-line)`} strokeWidth=".9" strokeLinejoin="round">
      <path d="M85 39L97 77L120 63L143 77L155 39M64 64L97 77L80 108L59 102M176 64L143 77L160 108L181 102"/>
      <path d="M97 77L120 95L143 77M80 108L96 128L68 156L106 154L120 167L134 154L172 156L144 128L160 108"/>
      <path d="M120 95L112 139L106 154M120 95L128 139L134 154M96 128L86 192L109 180M144 128L154 192L131 180"/>
      <path d="M106 154L120 158L134 154M109 180L120 177L131 180L120 185ZM107 211L120 185L133 211M79 227L120 241L161 227M44 246L120 259L196 246"/>
    </g>
    <g fill="#b9f7ff" opacity=".9">
      <path d="M78 107L104 103L107 110L84 112ZM162 107L136 103L133 110L156 112Z"/>
      <circle cx="97" cy="77" r="2"/><circle cx="143" cy="77" r="2"/>
      <circle cx="68" cy="156" r="1.8"/><circle cx="172" cy="156" r="1.8"/><circle cx="120" cy="185" r="1.8"/>
    </g>
    <path d="M89 94L105 92M151 94L135 92" fill="none" stroke="#e1c582" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>;
}

export default function DirectorMatrixPortrait({ photo = '', name = '', animated = true }) {
  const id = useId().replaceAll(':', '');
  const [result, setResult] = useState({ photo: null, raster: '', error: false });
  const hasPhoto = typeof photo === 'string' && photo.length > 0;
  const current = result.photo === photo ? result : { raster: '', error: false };
  useEffect(() => {
    if (!hasPhoto) return;
    let live = true;
    cachedRaster(photo).then(
      raster => { if (live) setResult({ photo, raster, error: false }); },
      () => { if (live) setResult({ photo, raster: '', error: true }); },
    );
    return () => { live = false; };
  }, [photo, hasPhoto]);
  const mask = current.raster ? `url("${current.raster}")` : undefined;

  return <div className="director-matrix-portrait" data-animated={animated} data-has-photo={!!current.raster}>
    {current.raster
      ? <><img className="director-matrix-glyph-face" src={current.raster} alt={name ? `Visage de ${name} composé de caractères Matrix bleus` : 'Visage composé de caractères Matrix bleus'} draggable="false"/>
        <div className="director-matrix-light-mask" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true">{LIGHT_COLUMNS.map((style, index) => <i key={index} className="director-matrix-light" style={style}/>)}</div></>
      : <DigitalDirectorFace id={id}/>}
    <div className="director-matrix-frame" aria-hidden="true"/>
    <span className="director-matrix-signature" aria-hidden="true"><b>3B</b><small>DIRECTEUR</small></span>
    {hasPhoto && !current.raster && <span className="director-matrix-state" role="status">{current.error ? 'Photo illisible' : 'Conversion Matrix…'}</span>}
  </div>;
}
