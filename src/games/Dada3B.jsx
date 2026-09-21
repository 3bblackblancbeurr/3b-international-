import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import {
  AI_LEVELS,
  BOARD_THEMES,
  COUNTRIES_3B,
  DEFAULT_RULES,
  FINISH_STEP,
  HOME_LENGTH,
  SANCTUARY_CELLS,
  STABLE,
  TRACK_LENGTH,
  achievementsFor,
  blockadeOwnerAt,
  countryFor,
  createMatch,
  currentPlayer,
  finishByTime,
  globalCellFor,
  homeIndexFor,
  movePiece,
  readMatchSnapshot,
  resolveTimeout,
  rollTurn,
  scoreFor,
  secureRoll,
  selectBotMove,
  serializeMatch,
} from './dada3b/engine.js';
import {
  createDadaFeedback,
  readDadaFeedbackPreferences,
} from './dada3b/feedback.js';
import DadaOnline from './dada3b/DadaOnline.jsx';
import './dada3b.css';

const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TUTORIAL_KEY = '3b_dada_tutorial_v1';

const THEME_LABELS = {
  nexus: 'Nexus 3B',
  fr: 'France · Justice',
  dz: 'Algérie · Loyauté',
  es: 'Espagne · Passion',
  ma: 'Maroc · Noblesse',
  it: 'Italie · Espoir',
  tn: 'Tunisie · Courage',
  tr: 'Turquie · Foi',
  ee: 'Estonie · Sagesse',
};

const TUTORIAL = [
  ['1 · Ouvre l’écurie', 'Appuie sur le dé. Un 6 libère automatiquement un totem quand les choix sont équivalents.'],
  ['2 · Choisis ta route', 'Quand plusieurs totems peuvent jouer, seuls les mouvements légaux brillent. Les déplacements se font case par case.'],
  ['3 · Défends-toi', 'Les Portes de départ sont des Sanctuaires. Deux totems alliés sur une même case forment un Bouclier 3B infranchissable.'],
  ['4 · Fracture Matrix', 'Tombe sur un adversaire hors Sanctuaire pour le renvoyer à l’écurie. Trois 6 consécutifs déclenchent une surcharge et font passer le tour.'],
  ['5 · Ferme le Cercle', 'Après le tour complet, entre dans les six cases de ta Porte nationale. Le compte exact est obligatoire pour transformer chaque totem en fragment du Nexus.'],
];

function safeSaved(value) {
  try { return readMatchSnapshot(value); } catch { return null; }
}

function initialSeats() {
  return COUNTRIES_3B.map((country, index) => ({
    countryId: country.id,
    type: index === 0 ? 'human' : index < 4 ? 'bot' : 'off',
  }));
}

function polar(angleDeg, radius) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    left: 50 + Math.cos(angle) * radius,
    top: 50 + Math.sin(angle) * radius,
  };
}

function trackPosition(index) {
  return polar(-90 + (index * 360) / TRACK_LENGTH, 38.8);
}

function homePosition(country, index) {
  const angle = -90 + (country.start * 360) / TRACK_LENGTH;
  return polar(angle, 31.8 - index * 4.15);
}

function stableCenter(country) {
  return polar(-90 + (country.start * 360) / TRACK_LENGTH, 44.1);
}

function finishedPosition(country, pieceIndex) {
  const angle = -90 + (country.start * 360) / TRACK_LENGTH + pieceIndex * 4 - 6;
  return polar(angle, 6.4 + (pieceIndex % 2) * 1.25);
}

function positionForPiece(country, steps, pieceIndex) {
  let base;
  if (steps === STABLE) {
    base = stableCenter(country);
    const clusterAngle = (pieceIndex * Math.PI) / 2 + Math.PI / 4;
    return {
      left: base.left + Math.cos(clusterAngle) * 2.65,
      top: base.top + Math.sin(clusterAngle) * 2.65,
    };
  }
  if (steps === FINISH_STEP) return finishedPosition(country, pieceIndex);
  if (steps >= TRACK_LENGTH) return homePosition(country, homeIndexFor(steps));
  base = trackPosition(globalCellFor(country.id, steps));
  const clusterAngle = (pieceIndex * Math.PI) / 2;
  return {
    left: base.left + Math.cos(clusterAngle) * 0.72,
    top: base.top + Math.sin(clusterAngle) * 0.72,
  };
}

function GuardianTotem({ country, pieceIndex }) {
  return (
    <svg className="dada3b-totem" viewBox="0 0 40 48" aria-hidden="true">
      <path className="dada3b-totem-aura" d="M20 1 34 9 37 27 28 44 12 44 3 27 6 9Z" />
      <circle className="dada3b-totem-head" cx="20" cy="12" r="6.2" />
      <path className="dada3b-totem-body" d="M9 38c1-12 3-19 11-19s10 7 11 19l-6 5H15Z" />
      <path className="dada3b-totem-cape" d={pieceIndex % 2 ? 'M11 25 5 39h10l5-20Z' : 'M29 25 35 39H25l-5-20Z'} />
      <circle className="dada3b-totem-core" cx="20" cy="28.5" r="5.5" />
      <text x="20" y="31.5" textAnchor="middle">{country.crest}</text>
    </svg>
  );
}

function SeatCard({ seat, country, aiLevel, onChange }) {
  return (
    <article className="dada3b-country-card" data-state={seat.type} style={{ '--country': country.accent }}>
      <header>
        <div>
          <b>{country.name}</b>
          <p style={{ margin: '2px 0 0' }}>{country.guardian} · {country.value}</p>
        </div>
        <em aria-hidden="true">{country.flag}</em>
      </header>
      <div className="dada3b-seat-preview" aria-hidden="true">
        <GuardianTotem country={country} pieceIndex={0} />
        <span>{country.code}</span>
      </div>
      <div className="dada3b-seat-switch" aria-label={`Statut ${country.name}`}>
        {[
          ['human', 'Joueur'],
          ['bot', `IA ${aiLevel}`],
          ['off', 'Absent'],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={seat.type === value}
            onClick={() => onChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}

function RuleToggle({ checked, onChange, title, detail }) {
  return (
    <button type="button" className="dada3b-rule-toggle" aria-pressed={checked} onClick={() => onChange(!checked)}>
      <span className="dada3b-rule-state">{checked ? 'ON' : 'OFF'}</span>
      <span><strong>{title}</strong><small>{detail}</small></span>
    </button>
  );
}

function Board({ match, motion, blast, focus, busy, onPiece }) {
  const activeCountries = useMemo(
    () => match.players.map((player) => countryFor(player.countryId)),
    [match.players],
  );
  const activeIds = new Set(activeCountries.map((country) => country.id));
  const startMap = useMemo(
    () => new Map(COUNTRIES_3B.map((country) => [country.start, country])),
    [],
  );

  const style = focus
    ? { '--focus-x': `${focus.left}%`, '--focus-y': `${focus.top}%` }
    : undefined;

  return (
    <div
      className="dada3b-board"
      data-theme={match.rules.boardTheme}
      data-focus={Boolean(focus)}
      style={style}
      aria-label="Plateau DADA 3B — Cercle des 8 Portes"
    >
      <div className="dada3b-board-atmosphere" aria-hidden="true" />

      {Array.from({ length: TRACK_LENGTH }, (_, index) => {
        const position = trackPosition(index);
        const startCountry = startMap.get(index);
        const activeStart = startCountry && activeIds.has(startCountry.id);
        const sanctuary = SANCTUARY_CELLS.includes(index);
        const blockade = blockadeOwnerAt(match, index);
        return (
          <span
            key={`track-${index}`}
            className="dada3b-track-cell"
            data-start={Boolean(activeStart)}
            data-safe={sanctuary}
            data-blockade={blockade !== null}
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              '--cell-color': activeStart ? startCountry.accent : '#bca56f',
            }}
            aria-hidden="true"
          >
            {activeStart ? startCountry.code : sanctuary ? '◇' : ''}
          </span>
        );
      })}

      {activeCountries.flatMap((country) =>
        Array.from({ length: HOME_LENGTH }, (_, index) => {
          const position = homePosition(country, index);
          return (
            <span
              key={`home-${country.id}-${index}`}
              className="dada3b-home-cell"
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
                '--cell-color': country.accent,
              }}
              aria-hidden="true"
            />
          );
        }),
      )}

      <div className="dada3b-nexus" aria-hidden="true">
        <div>
          <strong>3B</strong>
          <small>NEXUS</small>
          <i>{match.players.reduce((sum, player) => sum + player.pieces.filter((piece) => piece.steps === FINISH_STEP).length, 0)}</i>
        </div>
      </div>

      {match.players.map((player) => {
        const country = countryFor(player.countryId);
        const position = stableCenter(country);
        const stable = player.pieces.filter((piece) => piece.steps === STABLE).length;
        return (
          <div
            key={`stable-${country.id}`}
            className="dada3b-stable"
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              '--country': country.accent,
            }}
            aria-hidden="true"
          >
            <span>{country.code}</span>
            <small>{stable} ÉCURIE</small>
          </div>
        );
      })}

      {match.players.flatMap((player, playerIndex) => {
        const country = countryFor(player.countryId);
        return player.pieces.map((piece, pieceIndex) => {
          const shownSteps = motion?.countryId === player.countryId && motion.pieceIndex === pieceIndex
            ? motion.step
            : piece.steps;
          const position = positionForPiece(country, shownSteps, pieceIndex);
          const canMove = !busy
            && playerIndex === match.turn
            && match.pendingMoves.includes(pieceIndex)
            && !motion;
          return (
            <button
              type="button"
              key={`piece-${country.id}-${pieceIndex}`}
              className="dada3b-piece"
              data-shape={country.shape}
              data-legal={canMove}
              data-finished={piece.steps === FINISH_STEP}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
                '--country': country.accent,
              }}
              disabled={!canMove}
              onClick={() => onPiece(pieceIndex)}
              aria-label={`${country.name}, totem ${pieceIndex + 1}${canMove ? ', jouable' : ''}`}
            >
              <GuardianTotem country={country} pieceIndex={pieceIndex} />
            </button>
          );
        });
      })}

      {blast && (
        <span
          key={blast.key}
          className="dada3b-burst"
          style={{ left: `${blast.left}%`, top: `${blast.top}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function Tutorial({ step, onNext, onClose }) {
  const [title, detail] = TUTORIAL[step];
  return (
    <div className="dada3b-tutorial-layer" role="dialog" aria-modal="true" aria-label="Tutoriel DADA 3B">
      <section className="dada3b-tutorial-card">
        <span className="dada3b-kicker">Transmission pédagogique · {step + 1}/{TUTORIAL.length}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
        <div className="dada3b-tutorial-dots" aria-hidden="true">
          {TUTORIAL.map((_, index) => <i key={index} data-active={index === step} />)}
        </div>
        <div className="dada3b-victory-actions">
          <button type="button" className="dada3b-secondary" onClick={onClose}>Passer</button>
          <button type="button" className="dada3b-primary" onClick={onNext}>
            {step === TUTORIAL.length - 1 ? 'J’ai compris' : 'Suivant'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function Dada3B({ saved, onClose, onCheckpoint, saveMessage, onAccount }) {
  const resumeCandidate = useMemo(() => safeSaved(saved), [saved]);
  const [seats, setSeats] = useState(initialSeats);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [rules, setRules] = useState({ ...DEFAULT_RULES });
  const [match, setMatch] = useState(null);
  const [lastSeats, setLastSeats] = useState(null);
  const [dice, setDice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [motion, setMotion] = useState(null);
  const [blast, setBlast] = useState(null);
  const [focus, setFocus] = useState(null);
  const [notice, setNotice] = useState('Choisis de 2 à 8 pays.');
  const [turnRemaining, setTurnRemaining] = useState(0);
  const [matchRemaining, setMatchRemaining] = useState(null);
  const [feedbackPrefs, setFeedbackPrefs] = useState(readDadaFeedbackPreferences);
  const feedback = useRef(null);
  const sequence = useRef(0);
  const matchRef = useRef(null);
  const turnDeadline = useRef(0);
  const endRecorded = useRef(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialOpen, setTutorialOpen] = useState(() => {
    try { return localStorage.getItem(TUTORIAL_KEY) !== 'done'; } catch { return true; }
  });

  if (!feedback.current) feedback.current = createDadaFeedback(feedbackPrefs);
  matchRef.current = match;

  useEffect(() => () => {
    sequence.current += 1;
    feedback.current?.close();
  }, []);

  function persist(next) {
    if (!next) return;
    onCheckpoint?.({ snapshot: () => serializeMatch(next) }, 'dada3b', false);
  }

  function clearSavedMatch() {
    onCheckpoint?.({ snapshot: () => null }, 'dada3b', false);
  }

  function setFeedback(next) {
    const prefs = feedback.current.set(next);
    setFeedbackPrefs(prefs);
  }

  function closeTutorial() {
    setTutorialOpen(false);
    setTutorialStep(0);
    try { localStorage.setItem(TUTORIAL_KEY, 'done'); } catch {}
  }

  function nextTutorial() {
    if (tutorialStep >= TUTORIAL.length - 1) closeTutorial();
    else setTutorialStep((value) => value + 1);
  }

  function applyPreset(name) {
    if (name === 'quick') {
      setSeats(COUNTRIES_3B.map((country, index) => ({ countryId: country.id, type: index === 0 ? 'human' : index < 4 ? 'bot' : 'off' })));
      setRules((current) => ({ ...current, aiLevel: 'tactique', timerSeconds: 30 }));
      setNotice('Jeu rapide · 1 joueur + 3 IA Tactiques.');
    } else if (name === 'ai') {
      setSeats(COUNTRIES_3B.map((country, index) => ({ countryId: country.id, type: index === 0 ? 'human' : index < 3 ? 'bot' : 'off' })));
      setRules((current) => ({ ...current, aiLevel: 'gardien', timerSeconds: 30 }));
      setNotice('Contre IA · difficulté Gardien.');
    } else if (name === 'local') {
      setSeats(COUNTRIES_3B.map((country, index) => ({ countryId: country.id, type: index < 4 ? 'human' : 'off' })));
      setRules((current) => ({ ...current, timerSeconds: 0 }));
      setNotice('Local · quatre joueurs sur le même appareil.');
    } else if (name === 'eight') {
      setSeats(COUNTRIES_3B.map((country, index) => ({ countryId: country.id, type: index === 0 ? 'human' : 'bot' })));
      setRules((current) => ({ ...current, aiLevel: 'gardien', timerSeconds: 20 }));
      setNotice('8 Nations · toi contre sept IA Gardien.');
    }
  }

  function updateSeat(countryId, type) {
    setSeats((current) => current.map((seat) => (seat.countryId === countryId ? { ...seat, type } : seat)));
  }

  function begin() {
    const activeSeats = seats.filter((seat) => seat.type !== 'off');
    if (activeSeats.length < 2) {
      setNotice('Active au moins 2 pays pour ouvrir le Cercle.');
      return;
    }
    const config = activeSeats.map((seat) => ({
      countryId: seat.countryId,
      type: seat.type,
      aiLevel: rules.aiLevel,
      name: countryFor(seat.countryId).name,
    }));
    const next = createMatch(config, rules);
    sequence.current += 1;
    endRecorded.current = false;
    setLastSeats(config);
    setMatch(next);
    setDice(null);
    setBusy(false);
    setMotion(null);
    setBlast(null);
    setFocus(null);
    setNotice('Le Cercle des 8 Portes est ouvert.');
    persist(next);
  }

  function resume() {
    if (!resumeCandidate || resumeCandidate.status !== 'playing') return;
    sequence.current += 1;
    endRecorded.current = false;
    setRules(resumeCandidate.rules);
    setLastSeats(resumeCandidate.players.map((player) => ({
      countryId: player.countryId,
      type: player.type,
      aiLevel: player.aiLevel,
      name: player.name,
    })));
    setMatch(resumeCandidate);
    setDice(resumeCandidate.pendingRoll);
    setNotice('Partie restaurée depuis ta sauvegarde 3B.');
  }

  function replay() {
    if (!lastSeats) return;
    const next = createMatch(lastSeats, rules);
    sequence.current += 1;
    endRecorded.current = false;
    setMatch(next);
    setDice(null);
    setBusy(false);
    setMotion(null);
    setBlast(null);
    setFocus(null);
    setNotice('Nouvelle partie · le dé attend le premier joueur.');
    persist(next);
  }

  function feedbackForEvent(event) {
    if (!event) return 'move';
    if (event.type === 'triple-six') return 'tripleSix';
    if (event.type === 'time-limit') return 'timeout';
    return event.type || 'move';
  }

  function finishIfNeeded(next) {
    if (next?.status !== 'finished' || endRecorded.current) return;
    endRecorded.current = true;
    const winner = next.winner;
    onCheckpoint?.({
      score: winner ? scoreFor(next, winner) : 0,
      won: Boolean(winner),
      snapshot: () => serializeMatch(next),
    }, 'dada3b', true);
  }

  async function commitMove(source, result) {
    const id = ++sequence.current;
    const move = result.move;
    if (move) {
      const countryId = source.players[source.turn].countryId;
      const steps = move.from === STABLE
        ? [0]
        : Array.from({ length: Math.max(0, move.to - move.from) }, (_, index) => move.from + index + 1);
      for (const step of steps) {
        if (id !== sequence.current) return;
        setMotion({ countryId, pieceIndex: move.pieceIndex, step });
        await wait(95);
      }
    }

    if (id !== sequence.current) return;
    setMotion(null);
    setMatch(result.match);
    setDice(result.match.pendingRoll);
    setNotice(result.event?.text || result.match.lastEvent?.text || 'Tour résolu.');
    persist(result.match);
    feedback.current.event(feedbackForEvent(result.event), { countryId: result.event?.countryId });

    if (result.event?.captured?.length && result.event.landing !== null) {
      const point = trackPosition(result.event.landing);
      setFocus({ ...point, type: 'capture' });
      setBlast({ ...point, key: Date.now() });
      setTimeout(() => setBlast(null), 850);
      setTimeout(() => setFocus(null), 1050);
    } else if (result.event?.type === 'door') {
      const country = countryFor(result.event.countryId);
      const point = homePosition(country, 0);
      setFocus({ ...point, type: 'door' });
      setTimeout(() => setFocus(null), 1050);
    } else if (result.event?.type === 'finish' || result.event?.type === 'victory') {
      const country = countryFor(result.event.countryId);
      const point = result.event.type === 'victory' ? { left: 50, top: 50 } : homePosition(country, HOME_LENGTH - 1);
      setFocus({ ...point, type: result.event.type });
      setTimeout(() => setFocus(null), 1150);
    } else if (result.event?.type === 'exit') {
      const point = trackPosition(countryFor(result.event.countryId).start);
      setFocus({ ...point, type: 'exit' });
      setTimeout(() => setFocus(null), 850);
    }

    finishIfNeeded(result.match);
    setBusy(false);
  }

  async function executeMove(source, pieceIndex) {
    if (!source || source.status !== 'playing') return;
    setBusy(true);
    try {
      const result = movePiece(source, pieceIndex);
      await commitMove(source, result);
    } catch (error) {
      setNotice(error.message || 'Déplacement impossible.');
      setBusy(false);
    }
  }

  async function rollDice(automated = false) {
    if (!match || match.status !== 'playing' || busy || match.pendingRoll !== null) return;
    const player = currentPlayer(match);
    if (!player || (!automated && player.type === 'bot')) return;

    const source = match;
    const id = ++sequence.current;
    setBusy(true);
    setNotice(`${countryFor(player.countryId).name} lance le dé…`);

    const finalRoll = secureRoll();
    for (let index = 0; index < 7; index += 1) {
      if (id !== sequence.current) return;
      setDice(index === 6 ? finalRoll : secureRoll());
      await wait(48 + index * 6);
    }
    if (id !== sequence.current) return;

    let rolled;
    try {
      rolled = rollTurn(source, finalRoll);
    } catch (error) {
      setNotice(error.message || 'Le dé ne peut pas être lancé.');
      setBusy(false);
      return;
    }

    setMatch(rolled.match);
    setDice(rolled.match.pendingRoll);
    setNotice(rolled.match.lastEvent?.text || `Dé : ${finalRoll}`);
    persist(rolled.match);
    feedback.current.event(rolled.penalty ? 'tripleSix' : 'roll');

    if (rolled.match.pendingRoll === null) {
      setBusy(false);
      return;
    }

    const moves = rolled.match.pendingMoves;
    const activePlayer = currentPlayer(rolled.match);
    const allStable = finalRoll === 6 && moves.every(
      (pieceIndex) => activePlayer.pieces[pieceIndex].steps === STABLE,
    );
    const autoPiece = automated || activePlayer.type === 'bot'
      ? selectBotMove(rolled.match, finalRoll, rolled.match.turn, activePlayer.aiLevel)
      : moves.length === 1 || allStable
        ? moves[0]
        : null;

    if (autoPiece !== null) {
      setNotice(activePlayer.type === 'bot'
        ? `IA ${activePlayer.aiLevel} · décision calculée.`
        : allStable
          ? '6 · sortie automatique de l’écurie.'
          : 'Un seul mouvement légal · sélection automatique.');
      await wait(activePlayer.type === 'bot' ? 420 : 260);
      if (id !== sequence.current) return;
      await executeMove(rolled.match, autoPiece);
      return;
    }

    setNotice('Choisis un totem lumineux. Les autres mouvements sont verrouillés.');
    setBusy(false);
  }

  async function handleTimeout() {
    if (!match || match.status !== 'playing' || busy) return;
    const source = match;
    setBusy(true);
    feedback.current.event('timeout');
    setNotice('Temps écoulé · le système sécurise automatiquement le meilleur mouvement légal.');
    await wait(180);
    const result = resolveTimeout(source, secureRoll());
    if (result.move) await commitMove(source, result);
    else {
      setMatch(result.match);
      setDice(result.match.pendingRoll);
      setNotice(result.event?.text || 'Tour résolu automatiquement.');
      persist(result.match);
      finishIfNeeded(result.match);
      setBusy(false);
    }
  }

  function choosePiece(pieceIndex) {
    if (!match || busy || match.pendingRoll === null || !match.pendingMoves.includes(pieceIndex)) return;
    executeMove(match, pieceIndex);
  }

  useEffect(() => {
    if (!match || match.status !== 'playing' || busy) return undefined;
    const player = currentPlayer(match);
    if (player?.type !== 'bot') return undefined;
    const timer = setTimeout(() => {
      if (match.pendingRoll !== null) {
        const piece = selectBotMove(match, match.pendingRoll, match.turn, player.aiLevel);
        if (piece !== null) executeMove(match, piece);
      } else {
        rollDice(true);
      }
    }, 620);
    return () => clearTimeout(timer);
  }, [match?.turn, match?.pendingRoll, match?.sequence, match?.status, busy]);

  useEffect(() => {
    if (!match || match.status !== 'playing' || !match.rules.timerSeconds) {
      turnDeadline.current = 0;
      setTurnRemaining(0);
      return undefined;
    }
    turnDeadline.current = Date.now() + match.rules.timerSeconds * 1000;
    setTurnRemaining(match.rules.timerSeconds);
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((turnDeadline.current - Date.now()) / 1000));
      setTurnRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        handleTimeout();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [match?.turn, match?.pendingRoll, match?.sequence, match?.status, match?.rules?.timerSeconds]);

  useEffect(() => {
    if (!match || match.status !== 'playing' || !match.rules.maxDurationMinutes) {
      setMatchRemaining(null);
      return undefined;
    }
    const deadline = match.createdAt + match.rules.maxDurationMinutes * 60000;
    const timer = setInterval(() => {
      const remainingMs = Math.max(0, deadline - Date.now());
      setMatchRemaining(Math.ceil(remainingMs / 1000));
      if (remainingMs <= 0) {
        clearInterval(timer);
        const latest = matchRef.current;
        if (!latest || latest.status !== 'playing') return;
        const finished = finishByTime(latest);
        setMatch(finished);
        setDice(null);
        setNotice(finished.lastEvent?.text || 'Temps de partie écoulé.');
        feedback.current.event('victory');
        persist(finished);
        finishIfNeeded(finished);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [match?.status, match?.createdAt, match?.rules?.maxDurationMinutes]);

  const turnPlayer = currentPlayer(match);
  const turnCountry = turnPlayer ? countryFor(turnPlayer.countryId) : null;
  const activeSeats = seats.filter((seat) => seat.type !== 'off');

  if (onlineOpen && !match) {
    return <DadaOnline onBack={() => setOnlineOpen(false)} onClose={onClose} onAccount={onAccount} />;
  }

  if (!match) {
    return (
      <div className="dada3b-shell" role="dialog" aria-modal="true" aria-label="DADA 3B — configuration">
        <header className="dada3b-topbar">
          <div>
            <small>Jeux 3B · Gold Master</small>
            <strong>DADA 3B — Le Cercle des 8 Portes</strong>
          </div>
          <div className="dada3b-top-actions">
            <button type="button" className="dada3b-mini-button" onClick={() => setTutorialOpen(true)}>Règles</button>
            <button type="button" className="dada3b-icon-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
          </div>
        </header>

        <main className="dada3b-setup">
          <section className="dada3b-setup-card">
            <span className="dada3b-kicker">2 à 8 joueurs · local + IA · reprise sécurisée</span>
            <h2>Un jeu classique, reconstruit comme une expérience 3B.</h2>
            <p>
              Totems-Gardiens, Sanctuaires, Boucliers 3B, Fracture Matrix, trois niveaux d’IA,
              timer anti-abandon et sauvegarde de la partie complète sur ton système de progression.
            </p>

            {resumeCandidate?.status === 'playing' && (
              <div className="dada3b-resume-card">
                <div>
                  <span className="dada3b-kicker">Sauvegarde trouvée</span>
                  <strong>Manche {resumeCandidate.round} · {resumeCandidate.players.length} pays</strong>
                  <small>{countryFor(resumeCandidate.players[resumeCandidate.turn].countryId).name} doit jouer.</small>
                </div>
                <button type="button" className="dada3b-primary" onClick={resume}>Reprendre</button>
              </div>
            )}

            <div className="dada3b-online-entry">
              <div><span className="dada3b-kicker">Nouveau · Multijoueur</span><h3>Jouer en ligne avec le serveur 3B</h3><p>Privé 2–8, jeu rapide, classé 1v1, spectateur, reconnexion et IA de relais.</p></div>
              <button type="button" className="dada3b-primary" onClick={() => setOnlineOpen(true)}>Entrer en ligne</button>
            </div>

            <div className="dada3b-section-title">
              <div><span className="dada3b-kicker">Préréglages locaux</span><h3>Choisis ton rythme</h3></div>
            </div>
            <div className="dada3b-presets">
              <button type="button" onClick={() => applyPreset('quick')}><strong>Jeu rapide</strong><small>1 joueur + 3 IA</small></button>
              <button type="button" onClick={() => applyPreset('ai')}><strong>Contre IA</strong><small>Difficulté Gardien</small></button>
              <button type="button" onClick={() => applyPreset('local')}><strong>Local</strong><small>4 joueurs</small></button>
              <button type="button" onClick={() => applyPreset('eight')}><strong>8 Nations</strong><small>1 contre 7</small></button>
            </div>

            <div className="dada3b-section-title">
              <div><span className="dada3b-kicker">Nations</span><h3>Joueurs & Gardiens</h3></div>
              <span>{activeSeats.length}/8 actifs</span>
            </div>
            <div className="dada3b-country-grid">
              {COUNTRIES_3B.map((country) => (
                <SeatCard
                  key={country.id}
                  country={country}
                  seat={seats.find((seat) => seat.countryId === country.id)}
                  aiLevel={rules.aiLevel}
                  onChange={(type) => updateSeat(country.id, type)}
                />
              ))}
            </div>

            <div className="dada3b-rules-panel">
              <div className="dada3b-section-title">
                <div><span className="dada3b-kicker">Moteur de règles</span><h3>Partie personnalisée</h3></div>
              </div>
              <div className="dada3b-rule-selects">
                <label>Totems par pays
                  <select value={rules.piecesPerPlayer} onChange={(event) => setRules((current) => ({ ...current, piecesPerPlayer: Number(event.target.value) }))}>
                    <option value={2}>2</option><option value={3}>3</option><option value={4}>4 classique</option>
                  </select>
                </label>
                <label>IA globale
                  <select value={rules.aiLevel} onChange={(event) => setRules((current) => ({ ...current, aiLevel: event.target.value }))}>
                    {AI_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
                <label>Timer de tour
                  <select value={rules.timerSeconds} onChange={(event) => setRules((current) => ({ ...current, timerSeconds: Number(event.target.value) }))}>
                    <option value={0}>Sans limite</option><option value={20}>20 s</option><option value={30}>30 s</option><option value={45}>45 s</option>
                  </select>
                </label>
                <label>Durée maximale
                  <select value={rules.maxDurationMinutes} onChange={(event) => setRules((current) => ({ ...current, maxDurationMinutes: Number(event.target.value) }))}>
                    <option value={0}>Sans limite</option><option value={10}>10 min</option><option value={20}>20 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
                  </select>
                </label>
              </div>
              <div className="dada3b-rule-grid">
                <RuleToggle checked={rules.safeCells} onChange={(value) => setRules((current) => ({ ...current, safeCells: value }))} title="Sanctuaires 3B" detail="Les Portes de départ sont protégées." />
                <RuleToggle checked={rules.barricades} onChange={(value) => setRules((current) => ({ ...current, barricades: value }))} title="Boucliers 3B" detail="Deux alliés bloquent le passage." />
                <RuleToggle checked={rules.captureRequired} onChange={(value) => setRules((current) => ({ ...current, captureRequired: value }))} title="Capture prioritaire" detail="Une capture disponible devient obligatoire." />
                <RuleToggle checked={rules.bonusOnCapture} onChange={(value) => setRules((current) => ({ ...current, bonusOnCapture: value }))} title="Bonus Fracture" detail="Une capture donne un nouveau tour." />
                <RuleToggle checked={rules.tripleSixPenalty} onChange={(value) => setRules((current) => ({ ...current, tripleSixPenalty: value }))} title="Surcharge 3×6" detail="Trois 6 consécutifs font passer le tour." />
              </div>
            </div>

            <div className="dada3b-section-title">
              <div><span className="dada3b-kicker">Plateaux</span><h3>Ambiance visuelle</h3></div>
            </div>
            <div className="dada3b-theme-grid">
              {BOARD_THEMES.map((theme) => (
                <button
                  type="button"
                  key={theme}
                  data-theme={theme}
                  aria-pressed={rules.boardTheme === theme}
                  onClick={() => setRules((current) => ({ ...current, boardTheme: theme }))}
                >
                  <i />
                  <span>{THEME_LABELS[theme]}</span>
                </button>
              ))}
            </div>

            <div className="dada3b-launch">
              <span role="status">
                {activeSeats.length} pays · {activeSeats.filter((seat) => seat.type === 'human').length} humain(s) · {activeSeats.filter((seat) => seat.type === 'bot').length} IA
                <br />{notice}
              </span>
              <div className="dada3b-launch-actions">
                {resumeCandidate && <button type="button" className="dada3b-secondary" onClick={() => { clearSavedMatch(); setNotice('Ancienne partie retirée de la sauvegarde.'); }}>Effacer la reprise</button>}
                <button type="button" className="dada3b-primary" onClick={begin} disabled={activeSeats.length < 2}>Ouvrir le Cercle</button>
              </div>
            </div>
          </section>
        </main>

        {tutorialOpen && <Tutorial step={tutorialStep} onNext={nextTutorial} onClose={closeTutorial} />}
      </div>
    );
  }

  const winner = match.winner ? countryFor(match.winner) : null;
  const timeText = matchRemaining === null
    ? null
    : `${Math.floor(matchRemaining / 60)}:${String(matchRemaining % 60).padStart(2, '0')}`;

  return (
    <div className="dada3b-shell" role="dialog" aria-modal="true" aria-label="DADA 3B — partie">
      <header className="dada3b-topbar">
        <div>
          <small>Le Cercle des 8 Portes · Manche {match.round}{timeText ? ` · Partie ${timeText}` : ''}</small>
          <strong>DADA 3B · {THEME_LABELS[match.rules.boardTheme]}</strong>
        </div>
        <div className="dada3b-top-actions">
          <button type="button" className="dada3b-mini-button" aria-pressed={feedbackPrefs.voice} onClick={() => setFeedback({ voice: !feedbackPrefs.voice })}>Voix {feedbackPrefs.voice ? 'ON' : 'OFF'}</button>
          <button type="button" className="dada3b-mini-button" aria-pressed={feedbackPrefs.haptics} onClick={() => setFeedback({ haptics: !feedbackPrefs.haptics })}>Vibration {feedbackPrefs.haptics ? 'ON' : 'OFF'}</button>
          <button type="button" className="dada3b-icon-button" onClick={() => setFeedback({ sound: !feedbackPrefs.sound })} aria-label={feedbackPrefs.sound ? 'Couper le son' : 'Activer le son'}>
            {feedbackPrefs.sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button type="button" className="dada3b-icon-button" onClick={onClose} aria-label="Quitter la partie"><X size={20} /></button>
        </div>
      </header>

      <div className="dada3b-arena">
        <div className="dada3b-board-wrap">
          <Board match={match} motion={motion} blast={blast} focus={focus} busy={busy} onPiece={choosePiece} />
        </div>

        <aside className="dada3b-sidebar">
          <section className="dada3b-turn-card" style={{ '--country': turnCountry?.accent || '#c7a66a' }}>
            <div className="dada3b-turn-line">
              <div>
                <span className="dada3b-kicker">Tour actuel</span>
                <strong>{turnCountry?.name}</strong>
                <small>{turnPlayer?.type === 'bot' ? `IA ${turnPlayer.aiLevel}` : 'Joueur'} · {turnCountry?.guardian} · {turnCountry?.value}</small>
              </div>
              <span aria-hidden="true">{turnCountry?.flag}</span>
            </div>
            {match.rules.timerSeconds > 0 && (
              <div className="dada3b-timer" data-low={turnRemaining <= 5}>
                <span style={{ width: `${Math.max(0, Math.min(100, (turnRemaining / match.rules.timerSeconds) * 100))}%` }} />
                <b>{turnRemaining}s</b>
              </div>
            )}
            <button
              type="button"
              className="dada3b-dice"
              onClick={() => rollDice(false)}
              disabled={busy || match.pendingRoll !== null || turnPlayer?.type === 'bot' || match.status !== 'playing'}
              aria-label={dice ? `Dé : ${dice}` : 'Lancer le dé'}
            >
              <b aria-hidden="true">{dice ? DICE[dice] : '◇'}</b>
              <small>{dice ? `${dice} obtenu` : turnPlayer?.type === 'bot' ? 'IA en réflexion' : 'Appuie pour lancer'}</small>
            </button>
          </section>

          <section className="dada3b-event" aria-live="polite">
            <b>Transmission 3B</b><br />
            {notice}
            {match.turnSixes > 0 && <small> Série de 6 : {match.turnSixes}/3</small>}
          </section>

          <section className="dada3b-roster">
            <h3>Écuries & progression</h3>
            {match.players.map((player, index) => {
              const country = countryFor(player.countryId);
              const home = player.pieces.filter((piece) => piece.steps === FINISH_STEP).length;
              const stable = player.pieces.filter((piece) => piece.steps === STABLE).length;
              return (
                <div className="dada3b-roster-row" key={country.id} style={{ '--country': country.accent }}>
                  <span className="dada3b-roster-dot" />
                  <div>
                    <strong>{index === match.turn ? '› ' : ''}{country.flag} {country.name}</strong>
                    <small>{stable} écurie · {player.stats.captures} capture(s) · {player.stats.sixes} six</small>
                  </div>
                  <span>{home}/{match.rules.piecesPerPlayer} Nexus</span>
                </div>
              );
            })}
          </section>

          <details className="dada3b-live-stats">
            <summary>Statistiques détaillées</summary>
            {match.players.map((player) => {
              const country = countryFor(player.countryId);
              return (
                <p key={country.id}>
                  <b>{country.code}</b> · {player.stats.rolls} lancers · {player.stats.distance} cases · {player.stats.barricadesFormed} bouclier(s) · {player.stats.turnsTimedOut} timeout(s)
                </p>
              );
            })}
          </details>

          <div className="dada3b-rules">
            <strong>Règles actives</strong><br />
            {match.rules.safeCells ? 'Sanctuaires · ' : ''}
            {match.rules.barricades ? 'Boucliers · ' : ''}
            {match.rules.captureRequired ? 'Capture obligatoire · ' : ''}
            {match.rules.bonusOnCapture ? 'Bonus capture · ' : ''}
            {match.rules.tripleSixPenalty ? '3×6 sanctionné · ' : ''}
            compte exact Nexus.
            <small>{saveMessage || 'Sauvegarde automatique active.'}</small>
          </div>
        </aside>
      </div>

      {winner && (
        <div className="dada3b-victory" role="dialog" aria-modal="true" aria-label="Résultat DADA 3B">
          <section className="dada3b-victory-card" style={{ '--country': winner.accent }}>
            <span className="dada3b-kicker">{match.endedReason === 'time' ? 'Temps écoulé' : 'Cercle complété'} · Score {scoreFor(match, winner.id)}</span>
            <h2>{winner.flag} {winner.name}</h2>
            <p>
              {match.endedReason === 'time'
                ? `${winner.guardian} termine en tête selon la progression, les captures et les fragments sécurisés.`
                : `Tous les totems sont réunis dans le Nexus. ${winner.guardian} scelle la valeur ${winner.value}.`}
            </p>

            <div className="dada3b-result-stats">
              {match.players.map((player) => {
                const country = countryFor(player.countryId);
                return (
                  <article key={country.id}>
                    <strong>{country.flag} {country.code}</strong>
                    <span>{scoreFor(match, country.id)} pts</span>
                    <small>{player.stats.captures} captures · {player.stats.sixes} six · {player.stats.distance} cases</small>
                  </article>
                );
              })}
            </div>

            <div className="dada3b-achievements">
              {achievementsFor(match, winner.id).map((achievement) => (
                <span key={achievement.id}><b>{achievement.title}</b><small>{achievement.detail}</small></span>
              ))}
            </div>

            <details className="dada3b-history"><summary>Historique de la partie</summary><div>{match.history.slice(-24).reverse().map((event) => <p key={event.id}><b>#{event.id}</b> {event.text}</p>)}</div></details>

            <div className="dada3b-victory-actions">
              <button type="button" className="dada3b-primary" onClick={replay}><RotateCcw size={17} /> Rejouer</button>
              <button type="button" className="dada3b-secondary" onClick={() => { sequence.current += 1; setMatch(null); setDice(null); setNotice('Choisis de 2 à 8 pays.'); }}>Changer les joueurs</button>
              <button type="button" className="dada3b-secondary" onClick={onClose}>Retour aux Jeux 3B</button>
            </div>
          </section>
        </div>
      )}

      {tutorialOpen && <Tutorial step={tutorialStep} onNext={nextTutorial} onClose={closeTutorial} />}
    </div>
  );
}
