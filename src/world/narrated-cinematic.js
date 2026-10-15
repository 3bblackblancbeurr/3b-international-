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

export function cinematicPhase(elapsed, duration, {paused = false, narration = null} = {}) {
 if (paused) return 'reveal';
 const progress = Math.max(0, elapsed / duration);
 const handoff = narration ? Math.min(duration, narration.durationMs) : duration * .72;
 return progress < .16 ? 'ignite' : elapsed < handoff ? 'reveal' : 'handoff';
}
