export function narratedCinematic(presentation, manifest) {
 if (!presentation) return null;
 const text = presentation.title + '. ' + presentation.detail;
 const clip = presentation.kind === 'country-first-entry'
  ? manifest.clips.find(entry => entry.id === 'entry-' + presentation.region && entry.text === text) : null;
 const readingDuration = presentation.kind === 'world-opening' ? presentation.duration
  : Math.min(30000, Math.ceil(text.length / 17 * 1000) + 700);
 return {...presentation, narration: clip || null,
  duration: Math.max(presentation.duration, clip ? clip.durationMs + 600 : readingDuration)};
}
