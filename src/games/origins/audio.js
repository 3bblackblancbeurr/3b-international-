// Layered, synthesized ambience keeps the score replaceable without introducing downloads.
// Optional licensed 3B stems can be supplied per exploration/combat/boss/gate state.
export function createOriginsAudio(stems = {}) {
  let ctx,
    master,
    enabled = false,
    suspended = false,
    mode = 'exploration',
    noise,
    pad = [],
    wind,
    windGain,
    lastStep = 0,
    lastBeat = -1,
    beat = 0,
    voices = new Set(),
    stem = null;
  function init() {
    if (ctx) return;
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let v = 0;
    for (let i = 0; i < data.length; i++) {
      v = (v + (Math.random() * 2 - 1) * 0.04) / 1.02;
      data[i] = v * 3;
    }
    for (const ratio of [1, 1.5, 2, 3]) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 55 * ratio;
      g.gain.value = 0.025 / ratio;
      o.connect(g).connect(master);
      o.start();
      pad.push({ o, g, ratio });
    }
    wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    windGain = ctx.createGain();
    windGain.gain.value = 0.11;
    wind.connect(filter).connect(windGain).connect(master);
    wind.start();
  }
  function tone(freq, seconds, volume = 0.12, type = 'sine', end = freq * 0.5) {
    if (!ctx || !enabled || suspended || voices.size > 24) return;
    const o = ctx.createOscillator(),
      g = ctx.createGain(),
      t = ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + seconds);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    o.connect(g).connect(master);
    o.start();
    o.stop(t + seconds + 0.03);
    voices.add(o);
    o.onended = () => {
      voices.delete(o);
      o.disconnect();
      g.disconnect();
    };
  }
  function air(seconds, volume, freq) {
    if (!ctx || !enabled || suspended || voices.size > 24) return;
    const o = ctx.createBufferSource(),
      g = ctx.createGain(),
      filter = ctx.createBiquadFilter(),
      t = ctx.currentTime;
    o.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.5;
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    o.connect(filter).connect(g).connect(master);
    o.start();
    o.stop(t + seconds);
    voices.add(o);
    o.onended = () => {
      voices.delete(o);
      o.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
  function scene(next) {
    if (next === mode) return;
    mode = next;
    if (ctx) {
      for (const { o, g, ratio } of pad) {
        o.frequency.setTargetAtTime(
          (next === 'boss' ? 41.2 : next === 'combat' ? 65.4 : next === 'gate' ? 36.7 : 55) * ratio,
          ctx.currentTime,
          0.8,
        );
        g.gain.setTargetAtTime(
          (next === 'boss' ? 0.045 : next === 'combat' ? 0.035 : 0.025) / ratio,
          ctx.currentTime,
          0.7,
        );
      }
      windGain.gain.setTargetAtTime(next === 'gate' ? 0.18 : 0.1, ctx.currentTime, 0.6);
    }
    if (stems[next]) {
      stem?.pause();
      stem = new Audio(stems[next]);
      stem.loop = true;
      stem.volume = 0.35;
      if (enabled && !suspended) stem.play().catch(() => {});
    }
  }
  return {
    enable(value) {
      enabled = value;
      if (value) {
        try {
          init();
          const currentMode = mode;
          mode = null;
          scene(currentMode);
          if (!suspended) ctx?.resume().catch(() => {});
          stem?.play().catch(() => {});
        } catch {}
      } else {
        ctx?.suspend().catch(() => {});
        stem?.pause();
      }
    },
    pause(value) {
      suspended = value;
      if (value) {
        ctx?.suspend().catch(() => {});
        stem?.pause();
      } else if (enabled) {
        ctx?.resume().catch(() => {});
        stem?.play().catch(() => {});
      }
    },
    scene,
    event(e) {
      switch (e.type) {
        case 'light':
          air(0.14, 0.19, 1800);
          break;
        case 'heavy':
        case 'charged':
          air(0.28, 0.24, 650);
          tone(90, 0.23, 0.14, 'triangle');
          break;
        case 'impact':
          tone(95 + e.power, 0.16, 0.22, 'triangle');
          air(0.12, 0.22, 900);
          break;
        case 'dodge':
          air(0.27, 0.16, 1400);
          break;
        case 'perfect':
          tone(420, 0.4, 0.13, 'sine', 840);
          tone(660, 0.45, 0.1);
          break;
        case 'matrix':
          air(0.95, 0.3, 550);
          tone(55, 0.9, 0.25, 'triangle');
          tone(160, 0.75, 0.1, 'sine', 640);
          break;
        case 'hurt':
          tone(78, 0.21, 0.2, 'triangle');
          air(0.14, 0.14, 470);
          break;
        case 'pickup':
        case 'rune':
        case 'seal':
        case 'ready':
          tone(660, 0.35, 0.12, 'sine', 880);
          tone(990, 0.42, 0.06);
          break;
        case 'gate-silence':
          if (ctx) master.gain.setTargetAtTime(0.035, ctx.currentTime, 0.05);
          break;
        case 'gate-wake':
          if (ctx) master.gain.setTargetAtTime(0.32, ctx.currentTime, 0.3);
          tone(34, 2, 0.3);
          air(1.8, 0.2, 180);
          break;
        case 'gate-beam':
          tone(55, 1.7, 0.3, 'triangle', 220);
          air(1.7, 0.23, 1300);
          break;
        case 'gate-shadow':
          tone(27, 0.9, 0.25);
          break;
        case 'boss-phase':
          tone(42, 0.9, 0.2);
          air(0.7, 0.17, 500);
          break;
        case 'cache':
        case 'heal':
          tone(440, 0.35, 0.1, 'sine', 660);
          break;
        case 'land':
          air(0.1, 0.075, 250);
          break;
        default:
          break;
      }
    },
    update(g) {
      scene(
        g.mode === 'gate'
          ? 'gate'
          : g.zone === 3 && g.boss.hp > 0
            ? 'boss'
            : g.enemies.some(
                  (e) =>
                    e.hp > 0 && e.zone === g.zone && Math.hypot(e.x - g.player.x, e.z - g.player.z) < 8,
                )
              ? 'combat'
              : 'exploration',
      );
      // A sparse minor motif gains a bass pulse and percussion in danger.
      // The audio clock pauses with the context, so there is no timer left running in menus.
      if (enabled && !suspended && ctx && !stem && mode !== 'gate') {
        const interval = mode === 'boss' ? 0.3 : mode === 'combat' ? 0.42 : 1.2;
        if (ctx.currentTime - lastBeat >= interval) {
          lastBeat = ctx.currentTime;
          const note = [0, 7, 12, 10, 3, 7, 0, 5][beat % 8];
          const pitch = 110 * 2 ** (note / 12);
          tone(pitch, interval * 1.8, 0.042, 'sine', pitch);
          if (mode !== 'exploration' && beat % 2 === 0) tone(66, 0.22, 0.09, 'triangle', 32);
          if (mode === 'boss' && beat % 2 === 1) air(0.055, 0.045, 2700);
          beat++;
        }
      }
      if (g.time < lastStep) lastStep = 0;
      if (Math.hypot(g.player.vx, g.player.vz) > 1 && g.player.y === 0 && g.time - lastStep > 0.3) {
        lastStep = g.time;
        air(0.07, 0.045, 1000);
      }
    },
    close() {
      enabled = false;
      stem?.pause();
      for (const v of voices) {
        try {
          v.stop();
        } catch {}
      }
      voices.clear();
      pad.forEach(({ o }) => o.stop());
      wind?.stop();
      ctx?.close().catch(() => {});
      pad = [];
    },
  };
}
