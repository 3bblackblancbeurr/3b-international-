import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Maximize,
  Sword,
  Swords,
  Zap,
  Footprints,
  ArrowRight,
  Lock,
  Star,
  Settings2,
  RotateCcw,
  FlaskConical,
  Hand,
  ChevronDown,
} from 'lucide-react';
import { OriginsGame } from './origins/engine.js';
import { ZONES } from './origins/level.js';
import { screenMovement } from './origins/motion.js';
import { createOriginsAudio } from './origins/audio.js';
import { createStepper } from './runtime.js';
import { DragControl } from './touchControls.js';
import { DOOR_CHAPTERS, doorUnlocked } from './door-campaign.js';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import { useGameRewards } from '../loyalty/useGameRewards.js';
import './origins/origins.css';

const stored = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};
function CampaignMenu({ game: g, onStart, onSelect, onBenefits, profile }) {
  const [chapter, setChapter] = useState(Math.floor((g.stageNumber - 1) / 10)),
    c = g.campaign,
    unlocked = doorUnlocked(c);
  return (
    <section className="origins-menu">
      <div className="origins-brand">
        <span className="origins-mark">3B</span>
        <span>
          ORIGINS<span>LE CERCLE BRISÉ</span>
        </span>
      </div>
      <p className="origins-kicker">ACTION · EXPLORATION · MÉMOIRE</p>
      <h1>
        LA PORTE
        <br />
        <em>INTERDITE.</em>
      </h1>
      <p className="origins-menu-copy">
        Certains secrets n’attendent pas d’être découverts.
        <br />
        Ils attendent que tu sois prêt.
      </p>
      <button className="origins-primary" disabled={!g} onClick={onStart}>
        <Play size={17} />
        {g.time > 0 ? 'Reprendre au dernier seuil' : 'Entrer dans l’aventure'}
        <ArrowRight size={18} />
      </button>
      <p className="origins-start-note">Niveau {g.stageNumber} / 100 · Cinq zones · Une Porte</p>
      <details className="origins-campaign">
        <summary>
          Le voyage de Kaïs <span>{c.completed.length} / 100</span>
          <ChevronDown size={14} />
        </summary>
        <nav aria-label="Chapitres de La Porte interdite">
          {DOOR_CHAPTERS.map((title, i) => (
            <button
              key={title}
              onClick={() => setChapter(i)}
              aria-pressed={chapter === i}
              aria-label={`Chapitre ${i + 1} : ${title}`}
            >
              {String(i + 1).padStart(2, '0')}
            </button>
          ))}
        </nav>
        <p>{DOOR_CHAPTERS[chapter]}</p>
        <div className="origins-levels">
          {Array.from({ length: 10 }, (_, i) => chapter * 10 + i + 1).map((n) => (
            <button
              key={n}
              disabled={n > unlocked}
              aria-label={`Niveau ${n}${n > unlocked ? ' · verrouillé' : ''}`}
              aria-pressed={n === g.stageNumber}
              onClick={() => onSelect(n)}
            >
              <strong>{n}</strong>
              {n > unlocked ? (
                <Lock size={10} />
              ) : c.best[n] ? (
                <small>{'★'.repeat(c.best[n].stars)}</small>
              ) : (
                <Play size={10} />
              )}
            </button>
          ))}
        </div>
        <p className="origins-menu-small">
          Étoiles : terminer, aucun dégât ni chute, aucun élixir. Les talents des niveaux 10, 25, 50 et
          75 renforcent Kaïs. Ta campagne et tes records précédents sont conservés.
        </p>
      </details>
      <details className="origins-controls-help">
        <summary>Commandes & talents</summary>
        <p>
          Flèches / ZQSD / WASD : déplacement · Maj : courir · J ou clic : frappe · K maintenu ou clic
          droit : frappe lourde / chargée · Espace : esquive · R : Fracture Matrix · F : parade · E :
          interaction · P / Échap : pause.
        </p>
        <p>
          Enchaîne les frappes, esquive au dernier instant puis riposte. Les coups et les esquives
          parfaites chargent Fracture Matrix. Une attaque en esquive devient aérienne. Lis l’inscription
          du passage pour activer les runes.
        </p>
        <p>
          Talents permanents : +10 vitalité au niveau 10, +2 dégâts au niveau 25, +20 énergie maximale au
          niveau 50, deuxième élixir au niveau 75. La progression se sauvegarde aux seuils.
        </p>
      </details>
      <button className="origins-benefits" onClick={onBenefits}>
        {profile
          ? `${profile.xp.toLocaleString('fr-FR')} XP 3B · Mes avantages`
          : 'Compte 3B · XP & avantages'}
        <ArrowRight size={13} />
      </button>
    </section>
  );
}
export default function DoorPlayer({ saved, onClose, onBenefits, onCheckpoint, saveMessage }) {
  const engine = useRef(null);
  if (!engine.current) engine.current = new OriginsGame(saved);
  const canvas = useRef(),
    shell = useRef(),
    scene = useRef(),
    audio = useRef(),
    keys = useRef(new Set()),
    stick = useRef(new DragControl()),
    thumb = useRef(),
    heavyPointer = useRef(null),
    capture = useRef(null),
    ready = useRef(false),
    pausedRef = useRef(false),
    activity = useRef(Date.now()),
    checkpoint = useRef(onCheckpoint),
    counted = useRef(false),
    lastInput = useRef({ x: 0, z: 0 }),
    control = useRef({}),
    began = useRef(false);
  checkpoint.current = onCheckpoint;
  const [view, setView] = useState(0),
    [started, setStarted] = useState(false),
    [loaded, setLoaded] = useState(false),
    [progress, setProgress] = useState(0),
    [paused, setPaused] = useState(false),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [sound, setSound] = useState(() => stored('3b-door-sound', 'off') === 'on'),
    [quality, setQuality] = useState(() => stored('3b-door-quality', 'auto')),
    [stats, setStats] = useState({ fps: 0, drawCalls: 0, resolution: 100 }),
    [notice, setNotice] = useState('');
  const rewardsReady = useRef(false);
  const account = useLoyalty(),
    rewards = useGameRewards('tower', engine, pausedRef, rewardsReady, activity),
    g = engine.current,
    interaction = g.closestInteraction();
  const refresh = () => setView((v) => v + 1);
  const clear = () => {
    rewardsReady.current = false;
    keys.current.clear();
    stick.current.cancel();
    lastInput.current = { x: 0, z: 0 };
    engine.current.cancelCharge();
    if (thumb.current) thumb.current.style.transform = 'translate(0px,0px)';
    for (const ref of [capture, heavyPointer]) {
      const held = ref.current;
      if (held?.target?.hasPointerCapture(held.id)) held.target.releasePointerCapture(held.id);
      ref.current = null;
    }
  };
  const pause = () => {
    if (!began.current || engine.current.status === 'ended') return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    audio.current?.pause(pausedRef.current);
    clear();
  };
  const invoke = (method, ...args) => {
    if (!ready.current || pausedRef.current || engine.current.status === 'ended') return;
    activity.current = Date.now();
    engine.current[method]?.(...args);
    refresh();
  };
  const begin = () => {
    began.current = true;
    ready.current = true;
    pausedRef.current = false;
    setPaused(false);
    setStarted(true);
    activity.current = Date.now();
    audio.current?.enable(sound);
    audio.current?.pause(false);
    shell.current.focus();
  };
  const replace = (level, { restart = false, start = true } = {}) => {
    clear();
    checkpoint.current(engine.current, 'tower', false);
    const save = engine.current.snapshot();
    engine.current = new OriginsGame(save, level, { restart, skipIntro: start && began.current });
    counted.current = false;
    ready.current = false;
    began.current = start;
    setStarted(start);
    pausedRef.current = false;
    setPaused(false);
    setLoaded(false);
    setError('');
    setProgress(0);
    setRevision((v) => v + 1);
    refresh();
  };
  const menu = () => {
    clear();
    began.current = false;
    ready.current = false;
    pausedRef.current = false;
    setPaused(false);
    setStarted(false);
    audio.current?.pause(true);
    if (g.status === 'ended') replace(g.campaign.selected, { start: false });
  };
  control.current = { pause, invoke, clear };
  useEffect(() => {
    const previous = document.activeElement,
      root = document.getElementById('root'),
      overflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    shell.current.focus();
    audio.current = createOriginsAudio();
    const persist = (record = false) => {
      const game = engine.current;
      if (record) {
        if (counted.current || game.time < 0.15) return;
        counted.current = true;
      }
      checkpoint.current(game, 'tower', record);
    };
    const down = (e) => {
      if (e.key === 'Tab') {
        const buttons = [
            ...shell.current.querySelectorAll('button:not(:disabled),summary,select'),
          ].filter((el) => el.getClientRects().length),
          first = buttons[0],
          last = buttons.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === shell.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
        return;
      }
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['Escape', 'p'].includes(k)) {
        e.preventDefault();
        if (!e.repeat) control.current.pause();
        return;
      }
      if (!ready.current || pausedRef.current) return;
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'w',
          'a',
          's',
          'd',
          'z',
          'q',
          'Shift',
        ].includes(k)
      ) {
        e.preventDefault();
        keys.current.add(k);
        activity.current = Date.now();
        return;
      }
      if (e.repeat) return;
      const actions = {
        j: 'attack',
        f: 'parry',
        r: 'power',
        e: 'interact',
        ' ': 'dodge',
        k: 'startCharge',
      };
      if (actions[k]) {
        e.preventDefault();
        control.current.invoke(actions[k], ...(k === ' ' ? [lastInput.current] : []));
      }
    };
    const up = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keys.current.delete(k);
      if (k === 'k') control.current.invoke('releaseCharge');
    };
    const blur = () => {
      control.current.clear();
      if (began.current && engine.current.status === 'playing') {
        pausedRef.current = true;
        setPaused(true);
        audio.current?.pause(true);
      }
    };
    const visibility = () => {
        if (document.hidden) blur();
      },
      pagehide = () => persist(false),
      timer = setInterval(() => persist(false), 12000);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    window.addEventListener('pagehide', pagehide);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      control.current.clear();
      persist(engine.current.time > 0.15);
      clearInterval(timer);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pagehide', pagehide);
      document.removeEventListener('visibilitychange', visibility);
      audio.current?.close();
      document.body.style.overflow = overflow;
      if (root) root.inert = false;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    let live = true,
      frame,
      last = 0,
      hud = 0,
      lastEvent = 0,
      lastSave = engine.current.saveRevision;
    const element = canvas.current,
      gameAtStart = engine.current,
      stepper = createStepper(),
      motion = matchMedia('(prefers-reduced-motion: reduce)');
    import('./origins/scene.js')
      .then(({ createOriginsScene }) =>
        live
          ? createOriginsScene(element, gameAtStart, {
              quality,
              onProgress: (n) => {
                if (live) setProgress(n);
              },
              onStats: (s) => {
                if (live) setStats(s);
              },
            })
          : null,
      )
      .then((view) => {
        if (!view) return;
        if (!live) {
          view.dispose();
          return;
        }
        scene.current = view;
        setLoaded(true);
        ready.current = began.current;
        audio.current?.pause(!began.current);
        last = performance.now();
        function loop(now) {
          if (!live) return;
          const dt = Math.min(0.15, (now - last) / 1000);
          last = now;
          const game = engine.current,
            k = keys.current;
          game.reducedMotion = motion.matches;
          const localX =
              (k.has('ArrowRight') || k.has('d') ? 1 : 0) -
              (k.has('ArrowLeft') || k.has('a') || k.has('q') ? 1 : 0) +
              stick.current.input.x,
            localZ =
              (k.has('ArrowUp') || k.has('w') || k.has('z') ? 1 : 0) -
              (k.has('ArrowDown') || k.has('s') ? 1 : 0) -
              stick.current.input.y,
            input = { ...screenMovement(localX, localZ, view.yaw), sprint: k.has('Shift') };
          lastInput.current = input;
          if (ready.current && !pausedRef.current && game.status === 'playing') {
            if (Math.hypot(input.x, input.z) > 0.07) activity.current = Date.now();
            stepper.advance(dt, (step) => {
              game.update(step, input);
              return game.status === 'playing';
            });
          } else stepper.reset();
          game.renderAlpha =
            ready.current && !pausedRef.current && game.status === 'playing' ? stepper.alpha : 1;
          rewardsReady.current = ready.current && !pausedRef.current && game.mode === 'play';
          if (game.status === 'ended' && !counted.current && game.time > 0.15) {
            counted.current = true;
            checkpoint.current(game, 'tower', true);
          } else if (game.saveRevision !== lastSave) {
            lastSave = game.saveRevision;
            checkpoint.current(game, 'tower', false);
          }
          for (const e of game.events)
            if (e.id > lastEvent) {
              lastEvent = e.id;
              audio.current?.event(e);
            }
          if (ready.current && !pausedRef.current) audio.current?.update(game);
          view.render(game, dt, !ready.current || pausedRef.current || game.status === 'ended');
          hud += dt;
          if (hud > 0.085) {
            hud = 0;
            refresh();
          }
          frame = requestAnimationFrame(loop);
        }
        frame = requestAnimationFrame(loop);
      })
      .catch((e) => {
        if (live) {
          setError(e.message || 'Le rendu 3D ne peut pas démarrer sur cet appareil.');
          ready.current = false;
        }
      });
    const lost = (e) => {
      e.preventDefault();
      if (live) {
        ready.current = false;
        rewardsReady.current = false;
        pausedRef.current = began.current;
        setPaused(began.current);
        setError('Le rendu graphique a été interrompu. Relance la scène pour reprendre.');
      }
    };
    element.addEventListener('webglcontextlost', lost);
    return () => {
      live = false;
      rewardsReady.current = false;
      cancelAnimationFrame(frame);
      element.removeEventListener('webglcontextlost', lost);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [revision]);
  const stickDown = (e) => {
    if (!ready.current || pausedRef.current || !g.canAct) return;
    e.preventDefault();
    if (!stick.current.begin(e.pointerId, e.clientX, e.clientY)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    capture.current = { target: e.currentTarget, id: e.pointerId };
    activity.current = Date.now();
  };
  const stickMove = (e) => {
    if (stick.current.move(e.pointerId, e.clientX, e.clientY)) {
      e.preventDefault();
      activity.current = Date.now();
      const v = stick.current.visual();
      if (thumb.current) thumb.current.style.transform = `translate(${v.dx}px,${v.dy}px)`;
    }
  };
  const stickEnd = (e) => {
    if (stick.current.end(e.pointerId)) {
      capture.current = null;
      if (thumb.current) thumb.current.style.transform = 'translate(0px,0px)';
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };
  const heavyDown = (e) => {
    if (!ready.current || pausedRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    heavyPointer.current = { target: e.currentTarget, id: e.pointerId };
    invoke('startCharge');
  };
  const heavyUp = (e) => {
    if (heavyPointer.current?.id !== e.pointerId) return;
    heavyPointer.current = null;
    invoke('releaseCharge');
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const heavyCancel = () => {
    heavyPointer.current = null;
    engine.current.cancelCharge();
  };
  const playing = started && !paused && g.canAct;
  return (
    <div
      ref={shell}
      className="origins-shell"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="La Porte interdite"
      data-state={!started ? 'menu' : paused ? 'paused' : g.mode}
      data-zone={g.zone}
      data-view={view}
    >
      <canvas
        key={revision}
        ref={canvas}
        className="origins-canvas"
        aria-label="La Porte interdite — aventure 3D jouable"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || !playing) return;
          e.preventDefault();
          if (e.button === 0) invoke('attack');
          if (e.button === 2) heavyDown(e);
        }}
        onPointerUp={(e) => {
          if (e.button === 2) heavyUp(e);
        }}
        onPointerCancel={heavyCancel}
        onLostPointerCapture={heavyCancel}
      />
      <header className="origins-header">
        <button aria-label="Quitter le jeu" onClick={onClose}>
          <X size={19} />
        </button>
        <div className="origins-header-title">
          <b>3B</b>
          <span>
            LA PORTE INTERDITE<small>{started ? ZONES[g.zone].name : 'LE CERCLE BRISÉ'}</small>
          </span>
        </div>
        <nav aria-label="Réglages du jeu">
          <button
            aria-label={sound ? 'Couper le son' : 'Activer le son'}
            onClick={() => {
              const value = !sound;
              setSound(value);
              audio.current?.enable(value);
              try {
                localStorage.setItem('3b-door-sound', value ? 'on' : 'off');
              } catch {}
            }}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="origins-fullscreen"
            aria-label="Plein écran"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
              else
                shell.current
                  .requestFullscreen?.()
                  .catch(() => setNotice('Le plein écran n’est pas disponible ici.'));
            }}
          >
            <Maximize size={17} />
          </button>
          <button
            disabled={!started || g.status === 'ended'}
            aria-label={paused ? 'Reprendre' : 'Pause'}
            onClick={pause}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
        </nav>
      </header>
      {(!loaded || error) && (
        <div className="origins-overlay origins-loading">
          <span className="origins-mark">3B</span>
          <p className="origins-kicker">LA PORTE INTERDITE</p>
          <h2>{error ? 'Le passage attend.' : 'Le monde se souvient…'}</h2>
          <p>{error || 'Préparation des ruines, de Kaïs et de leurs mémoires.'}</p>
          <div className="origins-loading-track">
            <i style={{ width: progress * 100 + '%' }} />
          </div>
          {error && (
            <button
              className="origins-primary"
              onClick={() => {
                setError('');
                setLoaded(false);
                setRevision((v) => v + 1);
              }}
            >
              Relancer la scène
            </button>
          )}
        </div>
      )}
      {loaded && !started && !error && (
        <CampaignMenu
          game={g}
          profile={account.profile}
          onStart={begin}
          onSelect={(level) => replace(level, { start: false })}
          onBenefits={onBenefits}
        />
      )}
      {loaded && started && g.mode === 'intro' && !paused && (
        <div className="origins-intro">
          <span className="origins-kicker">3B ORIGINS</span>
          <h2>
            {g.introTime < 1.55
              ? 'CERTAINES PORTES PROTÈGENT LE MONDE.'
              : g.introTime < 2.9
                ? 'D’AUTRES L’EMPÊCHENT DE SE SOUVENIR.'
                : 'LE CERCLE BRISÉ'}
          </h2>
          <button onClick={() => invoke('skipIntro')}>
            Commencer <ArrowRight size={14} />
          </button>
        </div>
      )}
      {loaded && started && !paused && g.mode === 'play' && (
        <>
          <div className="origins-hud">
            <div className="origins-vitality">
              <span>
                KAÏS <small>NIV. {g.stageNumber}</small>
                <b>
                  {Math.ceil(g.player.hp)} <em>/ {g.player.maxHp}</em>
                </b>
              </span>
              <i>
                <b style={{ width: (g.player.hp / g.player.maxHp) * 100 + '%' }} />
              </i>
            </div>
            <div className="origins-energy">
              <span>
                ÉNERGIE DU FRAGMENT <b>{Math.floor(g.player.energy)}</b>
              </span>
              <i>
                <b style={{ width: (g.player.energy / g.maxEnergy) * 100 + '%' }} />
              </i>
              {g.player.energy >= 75 && <small>FRACTURE MATRIX PRÊTE</small>}
            </div>
          </div>
          <div className="origins-objective">
            <span>
              0{g.zone + 1} / 05 · {ZONES[g.zone].name}
            </span>
            <p>{g.objective}</p>
            <div aria-label={g.fragments + ' fragments sur 8'}>
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} data-filled={i < g.fragments} />
              ))}
            </div>
          </div>
          {g.zone === 3 && g.boss.hp > 0 && (
            <div className="origins-boss">
              <span>
                LE GARDIEN SANS NOM <small>PHASE {g.boss.phase} / 3</small>
              </span>
              <div>
                <i style={{ width: (g.boss.hp / g.boss.maxHp) * 100 + '%' }} />
              </div>
            </div>
          )}
          {g.combo >= 2 && (
            <div className="origins-combo">
              <strong>×{g.combo}</strong>
              <span>COMBO</span>
              <i style={{ width: (g.comboTime / 3) * 100 + '%' }} />
            </div>
          )}
          {g.player.counter > 0 && (
            <div className="origins-perfect">
              ESQUIVE / PARADE PARFAITE<span>Riposte disponible</span>
            </div>
          )}
          {g.player.charge >= 0 && (
            <div className="origins-charge">
              <span>{g.player.charge >= 0.65 ? 'RELÂCHE POUR BRISER' : 'CONCENTRATION'}</span>
              <i>
                <b style={{ width: Math.min(1, g.player.charge / 0.65) * 100 + '%' }} />
              </i>
            </div>
          )}
          {interaction && (
            <button className="origins-interact" onClick={() => invoke('interact')}>
              <Hand size={17} />
              <span>{interaction.label}</span>
              <kbd>E</kbd>
            </button>
          )}
          <div className="origins-touch">
            <div
              className="origins-stick"
              role="group"
              aria-label="Joystick de déplacement"
              onPointerDown={stickDown}
              onPointerMove={stickMove}
              onPointerUp={stickEnd}
              onPointerCancel={stickEnd}
              onLostPointerCapture={stickEnd}
            >
              <span className="origins-stick-ring" />
              <i ref={thumb} />
            </div>
            <div className="origins-touch-actions">
              <button
                className="origins-heavy"
                aria-label="Attaque lourde · maintenir pour charger"
                onPointerDown={heavyDown}
                onPointerUp={heavyUp}
                onPointerCancel={heavyCancel}
                onLostPointerCapture={heavyCancel}
                onClick={(e) => {
                  if (e.detail === 0) invoke('attack', 'heavy');
                }}
              >
                <Swords size={23} />
                <span>Lourde</span>
              </button>
              <button
                className="origins-power"
                aria-label="Fracture Matrix"
                disabled={g.player.energy < 75}
                onClick={() => invoke('power')}
              >
                <Zap size={24} />
                <span>Fragment</span>
              </button>
              <button
                className="origins-dodge"
                aria-label="Esquiver"
                disabled={g.player.dodgeCooldown > 0}
                onClick={() => invoke('dodge', lastInput.current)}
              >
                <Footprints size={22} />
                <span>Esquive</span>
              </button>
              <button
                className="origins-attack"
                aria-label="Attaque rapide"
                onClick={() => invoke('attack')}
              >
                <Sword size={25} />
                <span>Attaque</span>
              </button>
            </div>
          </div>
          <div className="origins-desktop-keys">
            <span>
              <kbd>W A S D</kbd> Déplacer
            </span>
            <span>
              <kbd>J</kbd> Frappe
            </span>
            <span>
              <kbd>K</kbd> Charger
            </span>
            <span>
              <kbd>ESPACE</kbd> Esquive
            </span>
            <span>
              <kbd>R</kbd> Fragment
            </span>
            <span>
              <kbd>F</kbd> Parade
            </span>
          </div>
          {g.messageTime > 0 && g.message && (
            <p className="origins-notice" role="status">
              {g.message}
            </p>
          )}
        </>
      )}
      {started && g.mode === 'gate' && !paused && (
        <div className="origins-cinematic" aria-live="polite">
          <span>LE CERCLE BRISÉ</span>
          <h2>
            {g.gateTime < 1.4
              ? 'LE SILENCE.'
              : g.gateTime < 3
                ? 'LA MÉMOIRE S’ÉVEILLE.'
                : 'QUELQUE CHOSE SE SOUVIENT.'}
          </h2>
        </div>
      )}
      {loaded && started && paused && g.status !== 'ended' && !error && (
        <div className="origins-overlay">
          <div className="origins-pause-card">
            <span className="origins-kicker">LE TEMPS EST SUSPENDU</span>
            <h2>Une pause dans l’Oubli.</h2>
            <button className="origins-primary" onClick={pause}>
              <Play size={17} />
              Reprendre
            </button>
            <div className="origins-pause-actions">
              <button
                disabled={g.elixirs === 0 || g.player.hp >= g.player.maxHp}
                onClick={() => {
                  pausedRef.current = false;
                  g.heal();
                  pausedRef.current = true;
                  refresh();
                }}
              >
                <FlaskConical size={18} />
                Élixir ×{g.elixirs}
                <small>+35 vitalité</small>
              </button>
              <button onClick={menu}>
                <Lock size={17} />
                Les 100 niveaux
              </button>
              <button onClick={() => replace(g.stageNumber, { restart: true })}>
                <RotateCcw size={17} />
                Recommencer
              </button>
            </div>
            <label className="origins-quality">
              <Settings2 size={16} />
              Qualité graphique
              <select
                value={quality}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuality(value);
                  scene.current?.setQuality(value);
                  try {
                    localStorage.setItem('3b-door-quality', value);
                  } catch {}
                }}
              >
                <option value="auto">Automatique</option>
                <option value="economy">Économie</option>
                <option value="standard">Standard</option>
                <option value="ultra">Ultra</option>
              </select>
            </label>
            <p className="origins-diagnostics">
              {stats.fps} images/s · résolution {stats.resolution} %
            </p>
            <p className="origins-menu-small">
              J : frappe · K maintenu : charge · Espace : esquive · R : Fragment · F : parade · E :
              interaction. Déplacement au clavier ou au joystick tactile.
            </p>
            <p className="origins-menu-small">{notice || saveMessage}</p>
            <button className="origins-text" onClick={onClose}>
              Retour aux jeux
            </button>
          </div>
        </div>
      )}
      {loaded && g.status === 'ended' && !error && (
        <div className="origins-overlay origins-ending">
          <span className="origins-mark">3B</span>
          <p className="origins-kicker">{g.won ? 'FRAGMENT RÉCUPÉRÉ' : 'LA LUMIÈRE DEMEURE'}</p>
          <h2>
            {g.won ? (
              <>
                LE CERCLE N’EST
                <br />
                TOUJOURS PAS COMPLET.
              </>
            ) : (
              <>
                LE SEUIL
                <br />
                TE RÉSISTE.
              </>
            )}
          </h2>
          {g.won && (
            <div className="origins-result-stars" aria-label={g.stars + ' étoiles'}>
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  size={22}
                  fill={n <= g.stars ? 'currentColor' : 'none'}
                  opacity={n <= g.stars ? 1 : 0.25}
                />
              ))}
            </div>
          )}
          <p>
            Niveau {g.stageNumber} · {g.score} fragments de score · {g.bestCombo} coups enchaînés
          </p>
          {g.won && g.stageNumber < 100 ? (
            <button className="origins-primary" onClick={() => replace(g.stageNumber + 1)}>
              Continuer · niveau {g.stageNumber + 1}
              <ArrowRight size={17} />
            </button>
          ) : !g.won ? (
            <button className="origins-primary" onClick={() => replace(g.stageNumber)}>
              Reprendre au dernier seuil
              <RotateCcw size={17} />
            </button>
          ) : (
            <p>Les 100 niveaux sont achevés.</p>
          )}
          <button className="origins-text" onClick={menu}>
            Les 100 niveaux
          </button>
          <button className="origins-text" onClick={onClose}>
            Retour aux jeux
          </button>
        </div>
      )}
      <footer className="origins-rewards">
        <span role="status">{rewards}</span>
        {!started && <span>{saveMessage}</span>}
      </footer>
    </div>
  );
}
