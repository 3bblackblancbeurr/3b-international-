import { useEffect, useRef, useState } from 'react';
import { createMatrixDepthRenderer } from './matrix-depth-renderer.js';

export default function DirectorMatrixDepth({ levels, animated }) {
  const canvas = useRef(null);
  const renderer = useRef(null);
  const enabled = useRef(animated);
  enabled.current = animated;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const current = createMatrixDepthRenderer(canvas.current, levels, setReady);
    renderer.current = current;
    current?.setAnimated(enabled.current);
    return () => { current?.dispose(); renderer.current = null; };
  }, [levels]);
  useEffect(() => { renderer.current?.setAnimated(animated); }, [animated]);
  return <canvas ref={canvas} className="director-matrix-depth" data-ready={ready} role="img" aria-label="Visage composé de caractères Matrix bleus animés" aria-hidden={!ready}/>;
}
