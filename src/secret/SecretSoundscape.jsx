import { useEffect, useRef } from "react";

function makeNoiseBuffer(context, seconds = 2) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 137;
  for (let index = 0; index < length; index += 1) {
    seed = (seed * 16807) % 2147483647;
    const white = (seed / 2147483647) * 2 - 1;
    const envelope = 0.55 + Math.sin(index * 0.00019) * 0.08;
    data[index] = white * envelope;
  }
  return buffer;
}

export default function SecretSoundscape({ enabled, stage }) {
  const engineRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return undefined;

    let cancelled = false;
    const context = new AudioContext();
    const master = context.createGain();
    const ambience = context.createGain();
    const resonance = context.createBiquadFilter();
    const airFilter = context.createBiquadFilter();

    master.gain.value = 0.0001;
    ambience.gain.value = 0.22;

    resonance.type = "lowpass";
    resonance.frequency.value = 210;
    resonance.Q.value = 0.75;

    airFilter.type = "bandpass";
    airFilter.frequency.value = 740;
    airFilter.Q.value = 0.42;

    const low = context.createOscillator();
    low.type = "sine";
    low.frequency.value = 43;

    const body = context.createOscillator();
    body.type = "triangle";
    body.frequency.value = 64.5;

    const shimmer = context.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = 172;

    const lowGain = context.createGain();
    const bodyGain = context.createGain();
    const shimmerGain = context.createGain();
    lowGain.gain.value = 0.22;
    bodyGain.gain.value = 0.07;
    shimmerGain.gain.value = 0.012;

    low.connect(lowGain).connect(resonance);
    body.connect(bodyGain).connect(resonance);
    shimmer.connect(shimmerGain).connect(airFilter);

    const noise = context.createBufferSource();
    noise.buffer = makeNoiseBuffer(context);
    noise.loop = true;
    const noiseGain = context.createGain();
    noiseGain.gain.value = 0.018;
    noise.connect(noiseGain).connect(airFilter);

    resonance.connect(ambience);
    airFilter.connect(ambience);
    ambience.connect(master);
    master.connect(context.destination);

    low.start();
    body.start();
    shimmer.start();
    noise.start();

    context.resume().catch(() => {});
    const now = context.currentTime;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.018, now + 0.9);

    engineRef.current = {
      context,
      master,
      ambience,
      resonance,
      airFilter,
      low,
      body,
      shimmer,
      lowGain,
      bodyGain,
      shimmerGain,
      noise,
      noiseGain,
    };

    return () => {
      cancelled = true;
      const engine = engineRef.current;
      if (engine?.context === context) engineRef.current = null;
      try {
        const stopAt = context.currentTime + 0.06;
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setTargetAtTime(0.0001, context.currentTime, 0.02);
        low.stop(stopAt);
        body.stop(stopAt);
        shimmer.stop(stopAt);
        noise.stop(stopAt);
      } catch {
        // Audio cleanup is best-effort.
      }
      window.setTimeout(() => {
        if (!cancelled || context.state !== "closed") context.close().catch(() => {});
      }, 100);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const engine = engineRef.current;
    if (!engine) return;
    const { context, master, resonance, airFilter, low, body, shimmer, noiseGain } = engine;
    const now = context.currentTime;
    const intensity = stage === 8 ? 1.22 : stage > 0 ? 1 : 0.72;
    const base = [42, 44, 46, 47, 49, 48, 51, 52, 54][stage] || 43;

    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(0.018 * intensity, now, 0.45);
    low.frequency.setTargetAtTime(base, now, 0.5);
    body.frequency.setTargetAtTime(base * 1.5, now, 0.55);
    shimmer.frequency.setTargetAtTime(166 + stage * 7, now, 0.6);
    resonance.frequency.setTargetAtTime(190 + stage * 18, now, 0.55);
    airFilter.frequency.setTargetAtTime(680 + stage * 38, now, 0.65);
    noiseGain.gain.setTargetAtTime(stage === 8 ? 0.026 : stage > 0 ? 0.018 : 0.012, now, 0.5);
  }, [enabled, stage]);

  return null;
}
