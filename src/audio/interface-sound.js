// The application shell owns one audio context. All sounds are short, original
// synthesized cues: no downloads, microphone access, timers playing music or
// interaction with the independently mixed game audio.
export const COMPANION_SPEAKING_EVENT = 'threeb:companion-speaking';
export const COMPANION_ACTION_EVENT = 'threeb:companion-action';
export const INTERFACE_SOUND_EVENT = 'threeb:interface-sound';

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : 0));
const note = (frequency, duration, gain, delay = 0, end = frequency, type = 'sine', pan = 0) => ({ frequency, duration, gain, delay, end, type, pan });
const freezeCue = (priority, cooldown, notes, air) => Object.freeze({ priority, cooldown, notes: Object.freeze(notes.map(Object.freeze)), air: air ? Object.freeze(air) : null });

// A restrained G/D harmonic family, with low tactile attacks and soft upper
// partials. Long accents are reserved for deliberate entry and celebrations.
export const INTERFACE_CUES = Object.freeze({
  press: freezeCue(1, 105, [note(587.33, .075, .072, 0, 523.25), note(1174.66, .045, .013, .003)]),
  navigate: freezeCue(2, 180, [note(293.66, .16, .072, 0, 392, 'triangle', -.1), note(587.33, .2, .036, .035, 659.25, 'sine', .12)]),
  open: freezeCue(2, 150, [note(196, .17, .068, 0, 293.66, 'triangle'), note(783.99, .23, .03, .04, 880, 'sine', .12)]),
  close: freezeCue(2, 150, [note(392, .14, .067, 0, 196), note(783.99, .09, .014, 0, 587.33)]),
  toggleOn: freezeCue(2, 140, [note(392, .105, .06), note(587.33, .17, .052, .045)]),
  toggleOff: freezeCue(2, 140, [note(392, .11, .055, 0, 293.66)]),
  success: freezeCue(4, 950, [note(392, .32, .068, 0, 392, 'sine', -.18), note(587.33, .35, .051, .07), note(783.99, .42, .036, .14, 783.99, 'sine', .2)]),
  portal: freezeCue(3, 720, [note(98, .4, .075, 0, 146.83, 'triangle'), note(293.66, .43, .042, .045), note(783.99, .4, .021, .12, 587.33, 'sine', .22)], { duration: .42, gain: .018, frequency: 1350 }),
  entry: freezeCue(4, 2200, [note(98, .64, .072, 0, 98, 'triangle'), note(196, .62, .049, .06, 196, 'sine', -.18), note(293.66, .6, .038, .15), note(587.33, .55, .022, .24, 587.33, 'sine', .22)], { duration: .6, gain: .011, frequency: 1700 }),
  constellation: freezeCue(1, 1100, [note(1174.66, .37, .032, 0, 1174.66, 'sine', -.12), note(1567.98, .4, .014, .075, 1567.98, 'sine', .15)]),
  pocket: freezeCue(2, 650, [note(196, .09, .065, 0, 392, 'triangle'), note(1046.5, .24, .028, .065, 783.99, 'sine', .16)]),
  land: freezeCue(1, 450, [note(123.47, .1, .055, 0, 65.41, 'triangle')]),
  question: freezeCue(2, 900, [note(392, .13, .038), note(587.33, .18, .032, .085, 659.25)]),
  dance: freezeCue(3, 1600, [note(150, .12, .105, 0, 52), note(392, .14, .036, .125, 392, 'triangle', -.2), note(196, .065, .049, .25, 110, 'triangle'), note(587.33, .17, .032, .375, 587.33, 'triangle', .2), note(150, .12, .089, .5, 52), note(196, .065, .043, .75, 110, 'triangle'), note(783.99, .25, .021, .875, 587.33, 'sine', .18)]),
});

const ALIASES = Object.freeze({ route: 'navigate', milestone: 'success', 'toggle-on': 'toggleOn', 'toggle-off': 'toggleOff' });
const ACTION_CUES = Object.freeze({ dance: 'dance', breakdance: 'dance', pocket: 'pocket', hologram: 'constellation', land: 'land', question: 'question' });
export const companionActionCue = action => ACTION_CUES[action] || null;
export const canonicalInterfaceCue = kind => ALIASES[kind] || (Object.hasOwn(INTERFACE_CUES, kind) ? kind : null);

export const SOUND_ACTION_SELECTOR = 'button:not(:disabled), a[href], [role="button"], summary, [data-sound]';
const SILENT_SURFACES = '[data-feedback="off"], [data-sound="off"], [data-audio-managed="true"], [inert], .world-play, .dada3b-shell, .penalty-shell, .penalty-match';
const TEXT_INPUTS = 'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"], [role="slider"]';

// The sole shell click listener uses semantics. Typing, focus, scrolling and
// pointer hover never emit sound; completed success is explicitly signalled.
export function interfaceSoundIntent(target, event = {}, viewportWidth = globalThis.innerWidth || 1) {
  if (!target || target.disabled || target.getAttribute?.('aria-disabled') === 'true' || target.closest?.(SILENT_SURFACES) || target.closest?.(TEXT_INPUTS)) return null;
  if (target.getAttribute?.('aria-current') === 'page' || target.classList?.contains('skip-link')) return null;
  const explicit = target.getAttribute?.('data-sound');
  if (explicit === 'off') return null;
  const expanded = target.getAttribute?.('aria-expanded');
  const pressed = target.getAttribute?.('aria-pressed');
  const href = target.getAttribute?.('href') || '';
  const label = target.getAttribute?.('aria-label') || '';
  let kind = canonicalInterfaceCue(explicit);
  if (!kind) {
    if (target.classList?.contains('intro3b-enter')) kind = 'entry';
    else if (target.tagName === 'A') kind = /#(?:secret|monde-3b)$/.test(href) ? 'portal' : 'navigate';
    else if (target.tagName === 'SUMMARY') kind = target.parentElement?.open ? 'close' : 'open';
    else if (expanded === 'true' || expanded === 'false') kind = expanded === 'true' ? 'close' : 'open';
    else if (pressed === 'true' || pressed === 'false') kind = pressed === 'true' ? 'toggleOff' : 'toggleOn';
    else if (/^(?:fermer|annuler|retour|quitter)\b/i.test(label)) kind = 'close';
    else kind = 'press';
  }
  const pan = event.detail !== 0 && Number.isFinite(event.clientX) && viewportWidth > 0 ? clamp((event.clientX / viewportWidth - .5) * .9, -.45, .45) : 0;
  const enabled = target.getAttribute?.('data-sound-toggle') === 'interfaceSound' ? pressed !== 'true' : undefined;
  return { kind, pan, enabled };
}

const resolveContext = () => {
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  return Audio ? new Audio({ latencyHint: 'interactive' }) : null;
};
const settle = promise => promise?.catch?.(() => {});
const safeDisconnect = node => { try { node?.disconnect(); } catch { /* Already disconnected. */ } };

export function createInterfaceSound({
  createContext = resolveContext,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  isHidden = () => globalThis.document?.hidden === true,
  isSpeaking = () => globalThis.speechSynthesis?.speaking === true,
  schedule = (callback, delay) => setTimeout(callback, delay),
  unschedule = timer => clearTimeout(timer),
} = {}) {
  let context = null, bus = null, compressor = null, wet = null, reverb = null, airBuffer = null;
  let enabled = false, unlocked = false, hidden = isHidden(), speaking = false, closed = false;
  let resuming = null, pending = null, suspendTimer = null, epoch = 0, lastAt = -Infinity, lastPriority = 0;
  const cooldowns = new Map(), active = new Set(), releasing = new Set();
  const MASTER_GAIN = .34, MAX_CUES = 3, MAX_SOURCES = 14;

  function setGain(value, timeConstant = .018) {
    if (!context || !bus) return;
    try {
      const at = context.currentTime, currentGain = bus.gain.value;
      if (bus.gain.cancelAndHoldAtTime) bus.gain.cancelAndHoldAtTime(at);
      else { bus.gain.cancelScheduledValues(at); bus.gain.setValueAtTime(currentGain, at); }
      bus.gain.setTargetAtTime(value, at, timeConstant);
    } catch { /* Closed context. */ }
  }
  function mix() { setGain(enabled && unlocked && !hidden ? MASTER_GAIN * (speaking || isSpeaking() ? .15 : 1) : 0, speaking || isSpeaking() ? .014 : .075); }
  function cancelSuspend() { if (suspendTimer !== null) unschedule(suspendTimer); suspendTimer = null; }
  function release(record, immediate = false) {
    if (record.cleaned || (record.released && !immediate)) return;
    record.released = true;
    active.delete(record);
    releasing.add(record);
    const at = context?.currentTime || 0;
    if (!immediate) {
      try { record.gain.gain.cancelScheduledValues(at); record.gain.gain.setTargetAtTime(0, at, .004); } catch { /* Ended. */ }
      record.until = at + .025;
    }
    for (const source of [...record.sources]) { try { source.stop(immediate ? at : at + .018); } catch { /* Already stopped. */ } }
    if (immediate) { record.nodes.forEach(safeDisconnect); record.cleaned = true; releasing.delete(record); }
  }
  function quiet() {
    pending = null;
    epoch++;
    setGain(0, .004);
    for (const record of [...active]) release(record);
    cancelSuspend();
    if (context && context.state !== 'closed') suspendTimer = schedule(() => {
      suspendTimer = null;
      if (!enabled || hidden || !unlocked) {
        // No old voices may survive a suspended clock and play on re-entry.
        for (const record of [...active, ...releasing]) release(record, true);
        settle(context?.suspend?.());
      }
    }, 32);
  }
  function initialize() {
    if (context) return context.state !== 'closed';
    try {
      context = createContext();
      if (!context) return false;
      bus = context.createGain();
      bus.gain.setValueAtTime(MASTER_GAIN * (speaking || isSpeaking() ? .15 : 1), context.currentTime);
      compressor = context.createDynamicsCompressor();
      for (const [key, value] of Object.entries({ threshold: -18, knee: 12, ratio: 8, attack: .003, release: .11 })) compressor[key].setValueAtTime(value, context.currentTime);
      bus.connect(compressor); compressor.connect(context.destination);
      // One short, feedback-free stereo room serves all cues. It is generated
      // once; the decaying wet tail cannot grow or keep an oscillator alive.
      if (context.createConvolver) {
        reverb = context.createConvolver(); wet = context.createGain(); wet.gain.value = .11;
        const length = Math.ceil(context.sampleRate * .32), impulse = context.createBuffer(2, length, context.sampleRate);
        let seed = 0x3b2026;
        for (let channel = 0; channel < 2; channel++) {
          const samples = impulse.getChannelData(channel);
          for (let i = 0; i < length; i++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            samples[i] = i < context.sampleRate * .012 ? 0 : (seed / 4294967296 * 2 - 1) * Math.pow(1 - i / length, 3.5) * .2;
          }
        }
        reverb.buffer = impulse; reverb.connect(wet); wet.connect(bus);
      }
      const airLength = Math.ceil(context.sampleRate * .7);
      airBuffer = context.createBuffer(1, airLength, context.sampleRate);
      let airSeed = 0x3b310;
      const air = airBuffer.getChannelData(0);
      for (let i = 0; i < airLength; i++) { airSeed = (Math.imul(airSeed, 1664525) + 1013904223) >>> 0; air[i] = airSeed / 4294967296 * 2 - 1; }
      return true;
    } catch {
      [bus, compressor, wet, reverb].forEach(safeDisconnect);
      settle(context?.close?.()); context = bus = compressor = wet = reverb = airBuffer = null;
      return false;
    }
  }
  function unlock(event) {
    if (closed || event?.isTrusted !== true || hidden || isHidden()) return false;
    unlocked = true;
    if (!enabled) return false;
    cancelSuspend();
    if (!initialize()) return false;
    mix();
    if (context.state === 'running') return true;
    if (resuming) return true;
    const token = epoch;
    try {
      const resumed = context.resume();
      resuming = Promise.resolve(resumed).then(() => {
        resuming = null;
        const queued = pending; pending = null;
        if (!closed && token === epoch && enabled && !hidden && !isHidden() && context?.state === 'running' && queued && now() - queued.at < 240) play(queued.kind, queued.options);
      }).catch(() => { resuming = null; pending = null; });
      return true;
    } catch { resuming = null; return false; }
  }
  function envelope(gain, peak, start, duration) {
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + Math.min(.013, duration * .2));
    gain.gain.exponentialRampToValueAtTime(.00008, start + duration - .008);
    gain.gain.linearRampToValueAtTime(0, start + duration);
  }
  function play(requested, options = {}) {
    const kind = canonicalInterfaceCue(requested), spec = kind && INTERFACE_CUES[kind];
    if (!spec || closed || !enabled || !unlocked || hidden || isHidden() || !context) return false;
    if ((speaking || isSpeaking()) && (kind === 'constellation' || kind === 'dance')) return false;
    if (context.state !== 'running') {
      if (resuming) { pending = { kind, options, at: now() }; return true; }
      return false;
    }
    const wallTime = now();
    if (wallTime - (cooldowns.get(kind) ?? -Infinity) < spec.cooldown) return false;
    const replacingPress = wallTime - lastAt < 100 && spec.priority > lastPriority;
    if (wallTime - lastAt < 90 && !replacingPress) return false;
    for (const record of [...active, ...releasing]) if (record.until < context.currentTime) release(record, true);
    if (replacingPress) for (const record of [...active]) if (record.priority < spec.priority) release(record);
    const sourceCount = spec.notes.length + (spec.air ? 1 : 0);
    if (active.size + releasing.size >= MAX_CUES || [...active, ...releasing].reduce((sum, record) => sum + record.sources.length, 0) + sourceCount > MAX_SOURCES) return false;
    cooldowns.set(kind, wallTime); lastAt = wallTime; lastPriority = spec.priority; mix();
    const start = context.currentTime + .006, nodes = [], sources = [];
    let record;
    try {
      const groupGain = context.createGain(); nodes.push(groupGain); groupGain.gain.value = clamp(options.level ?? 1, 0, 1);
      groupGain.connect(bus); if (reverb) groupGain.connect(reverb);
      record = { kind, priority: spec.priority, sources, nodes, gain: groupGain, until: start, released: false };
      active.add(record);
      const attach = (source, gain, panning, extra = []) => {
        nodes.push(source, gain, ...extra); sources.push(source);
        let end = source;
        for (const node of extra) { end.connect(node); end = node; }
        end.connect(gain);
        if (context.createStereoPanner) {
          const pan = context.createStereoPanner(); nodes.push(pan); pan.pan.setValueAtTime(clamp((options.pan || 0) + panning, -.6, .6), start); gain.connect(pan); pan.connect(groupGain);
        } else gain.connect(groupGain);
        source.onended = () => {
          safeDisconnect(source); safeDisconnect(gain); extra.forEach(safeDisconnect);
          sources.splice(sources.indexOf(source), 1);
          if (sources.length === 0) { nodes.forEach(safeDisconnect); active.delete(record); releasing.delete(record); }
        };
      };
      for (const tone of spec.notes) {
        const source = context.createOscillator(), gain = context.createGain(), at = start + tone.delay;
        source.type = tone.type; source.frequency.setValueAtTime(tone.frequency, at); source.frequency.exponentialRampToValueAtTime(tone.end, at + tone.duration);
        envelope(gain, tone.gain, at, tone.duration); attach(source, gain, tone.pan);
        source.start(at); source.stop(at + tone.duration + .012); record.until = Math.max(record.until, at + tone.duration + .035);
      }
      if (spec.air) {
        const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
        source.buffer = airBuffer; filter.type = 'bandpass'; filter.frequency.setValueAtTime(spec.air.frequency, start); filter.Q.value = .65;
        envelope(gain, spec.air.gain, start, spec.air.duration); attach(source, gain, -.1, [filter]);
        source.start(start); source.stop(start + spec.air.duration + .012); record.until = Math.max(record.until, start + spec.air.duration + .035);
      }
      return true;
    } catch {
      if (record) release(record, true); else nodes.forEach(safeDisconnect);
      return false;
    }
  }
  return {
    setEnabled(value) { const next = value === true; if (closed || next === enabled) return; enabled = next; if (!enabled) quiet(); else { cancelSuspend(); mix(); } },
    unlock,
    play,
    setSpeaking(value) { if (closed) return; speaking = value === true; mix(); },
    visibility(value) {
      const next = value === true;
      if (closed || next === hidden) return;
      hidden = next;
      // Returning to the app does not automatically restart an audio context.
      if (hidden) { unlocked = false; quiet(); } else mix();
    },
    close() {
      if (closed) return;
      closed = true; enabled = false; pending = null; epoch++; cancelSuspend();
      for (const record of [...active, ...releasing]) release(record, true);
      [bus, compressor, wet, reverb].forEach(safeDisconnect);
      settle(context?.close?.()); context = bus = compressor = wet = reverb = airBuffer = null;
    },
    // Aggregate diagnostics are useful for bounded-lifecycle tests, without
    // exposing any interaction history or keeping analytics about the user.
    snapshot: () => ({ enabled, unlocked, hidden, closed, state: context?.state || 'uninitialized', activeCues: active.size, sources: [...active, ...releasing].reduce((sum, record) => sum + record.sources.length, 0), queued: !!pending }),
  };
}
