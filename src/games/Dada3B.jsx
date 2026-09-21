import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import {
  COUNTRIES_3B,
  FINISH_STEP,
  HOME_LENGTH,
  STABLE,
  TRACK_LENGTH,
  countryFor,
  createMatch,
  currentPlayer,
  globalCellFor,
  homeIndexFor,
  legalMoves,
  movePiece,
  passTurn,
  previewMove,
  scoreFor,
  secureRoll,
  selectBotMove,
} from './dada3b/engine.js';
import './dada3b.css';

const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const initialSeats = () => COUNTRIES_3B.map((country, index) => ({
  countryId: country.id,
  type: index < 4 ? 'human' : 'off',
}));

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
  return polar(angle, 31.6 - index * 4.1);
}

function stableCenter(country) {
  return polar(-90 + (country.start * 360) / TRACK_LENGTH, 44);
}

function finishedPosition(country, pieceIndex) {
  const angle = -90 + (country.start * 360) / TRACK_LENGTH + pieceIndex * 4 - 6;
  return polar(angle, 6.6 + (pieceIndex % 2) * 1.3);
}

function positionForPiece(country, steps, pieceIndex) {
  let base;
  if (steps === STABLE) {
    base = stableCenter(country);
    const clusterAngle = (pieceIndex * Math.PI) / 2 + Math.PI / 4;
    return {
      left: base.left + Math.cos(clusterAngle) * 2.7,
      top: base.top + Math.sin(clusterAngle) * 2.7,
    };
  }
  if (steps === FINISH_STEP) return finishedPosition(country, pieceIndex);
  if (steps >= TRACK_LENGTH) return homePosition(country, homeIndexFor(steps));

  base = trackPosition(globalCellFor(country.id, steps));
  const clusterAngle = (pieceIndex * Math.PI) / 2;
  return {
    left: base.left + Math.cos(clusterAngle) * 0.75,
    top: base.top + Math.sin(clusterAngle) * 0.75,
  };
}

function SeatCard({ seat, country, onChange }) {
  return (
    <article className="dada3b-country-card" data-state={seat.type} style={{ '--country': country.accent }}>
      <header>
        <div>
          <b>{country.name}</b>
          <p style={{ margin: '2px 0 0' }}>{country.code} · {country.value}</p>
        </div>
        <em aria-hidden="true">{country.flag}</em>
      </header>
      <p>{country.guardian} devient le totem-guide de ce pays sur le Cercle.</p>
      <div className="dada3b-seat-switch" aria-label={`Statut ${country.name}`}>
        {[
          ['human', 'Joueur'],
          ['bot', 'IA'],
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

function Board({ match, legal, motion, blast, onPiece }) {
  const starts = useMemo(() => new Map(COUNTRIES_3B.map((country) => [country.start, country])), []);

  return (
    <div className="dada3b-board" aria-label="Plateau Dada 3B — Cercle des 8 Portes">
      {Array.from({ length: TRACK_LENGTH }, (_, index) => {
        const position = trackPosition(index);
        const startCountry = starts.get(index);
        return (
          <span
            key={`track-${index}`}
            className="dada3b-track-cell"
            data-start={Boolean(startCountry)}
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              '--cell-color': startCountry?.accent || '#bca56f',
            }}
            aria-hidden="true"
          >
            {startCountry ? startCountry.code : ''}
          </span>
        );
      })}

      {COUNTRIES_3B.flatMap((country) =>
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
        <div><strong>3B</strong><small>NEXUS</small></div>
      </div>

      {match.players.map((player) => {
        const country = countryFor(player.countryId);
        const position = stableCenter(country);
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
            <small>ÉCURIE</small>
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
          const canMove = playerIndex === match.turn && legal.includes(pieceIndex) && !motion;
          return (
            <button
              type="button"
              key={`piece-${country.id}-${pieceIndex}`}
              className="dada3b-piece"
              data-shape={country.shape}
              data-legal={canMove}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
                '--country': country.accent,
              }}
              disabled={!canMove}
              onClick={() => onPiece(pieceIndex)}
              aria-label={`${country.name}, totem ${pieceIndex + 1}${canMove ? ', jouable' : ''}`}
            >
              <span>{country.code}</span>
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

export default function Dada3B({ onClose, onCheckpoint }) {
  const [seats, setSeats] = useState(initialSeats);
  const [match, setMatch] = useState(null);
  const [lastSeats, setLastSeats] = useState(null);
  const [dice, setDice] = useState(null);
  const [legal, setLegal] = useState([]);
  const [busy, setBusy] = useState(false);
  const [motion, setMotion] = useState(null);
  const [blast, setBlast] = useState(null);
  const [notice, setNotice] = useState('Choisis de 2 à 8 pays.');
  const sequence = useRef(0);

  useEffect(() => () => { sequence.current += 1; }, []);

  const activeSeats = seats.filter((seat) => seat.type !== 'off');
  const turnPlayer = currentPlayer(match);
  const turnCountry = turnPlayer ? countryFor(turnPlayer.countryId) : null;

  function updateSeat(countryId, type) {
    setSeats((current) => current.map((seat) => (seat.countryId === countryId ? { ...seat, type } : seat)));
  }

  function begin() {
    if (activeSeats.length < 2) {
      setNotice('Active au moins 2 pays pour ouvrir le Cercle.');
      return;
    }
    const config = activeSeats.map((seat) => ({
      countryId: seat.countryId,
      type: seat.type,
      name: countryFor(seat.countryId).name,
    }));
    sequence.current += 1;
    setLastSeats(config);
    setMatch(createMatch(config));
    setDice(null);
    setLegal([]);
    setBusy(false);
    setMotion(null);
    setBlast(null);
    setNotice('Le Cercle des 8 Portes est ouvert.');
  }

  function replay() {
    if (!lastSeats) return;
    sequence.current += 1;
    setMatch(createMatch(lastSeats));
    setDice(null);
    setLegal([]);
    setBusy(false);
    setMotion(null);
    setBlast(null);
    setNotice('Nouvelle partie. Le dé attend le premier joueur.');
  }

  async function animateMove(sourceMatch, pieceIndex, roll) {
    const id = ++sequence.current;
    const preview = previewMove(sourceMatch, pieceIndex, roll);
    if (!preview) {
      setBusy(false);
      return;
    }

    const result = movePiece(sourceMatch, pieceIndex, roll);
    const countryId = sourceMatch.players[sourceMatch.turn].countryId;
    const steps = preview.from === STABLE
      ? [0]
      : Array.from({ length: preview.to - preview.from }, (_, index) => preview.from + index + 1);

    for (const step of steps) {
      if (id !== sequence.current) return;
      setMotion({ countryId, pieceIndex, step });
      await wait(115);
    }

    if (id !== sequence.current) return;
    setMatch(result.match);
    setMotion(null);
    setLegal([]);
    setNotice(result.event.text);

    if (result.event.captured.length && result.event.landing !== null) {
      const point = trackPosition(result.event.landing);
      setBlast({ ...point, key: Date.now() });
      setTimeout(() => setBlast(null), 760);
      await wait(280);
    }

    setDice(null);
    setBusy(false);

    if (result.match.status === 'finished') {
      const score = scoreFor(result.match, result.match.winner);
      onCheckpoint?.({ score, won: true }, 'dada3b', true);
    }
  }

  async function rollDice(automated = false) {
    if (!match || match.status !== 'playing' || busy || dice !== null) return;
    const player = currentPlayer(match);
    if (!player || (!automated && player.type === 'bot')) return;

    const sourceMatch = match;
    const id = ++sequence.current;
    setBusy(true);
    setLegal([]);
    setNotice(`${countryFor(player.countryId).name} lance le dé…`);

    const finalRoll = secureRoll();
    for (let index = 0; index < 7; index += 1) {
      if (id !== sequence.current) return;
      setDice(index === 6 ? finalRoll : secureRoll());
      await wait(55 + index * 5);
    }

    if (id !== sequence.current) return;
    const moves = legalMoves(sourceMatch, finalRoll);
    setDice(finalRoll);

    if (!moves.length) {
      setNotice(finalRoll === 6
        ? '6 obtenu, mais aucun totem ne peut avancer exactement jusque dans le Nexus.'
        : 'Aucun déplacement possible. Le tour passe.');
      await wait(620);
      if (id !== sequence.current) return;
      setMatch(passTurn(sourceMatch, finalRoll));
      setDice(null);
      setBusy(false);
      return;
    }

    const allEquivalentStable = finalRoll === 6 && moves.every(
      (pieceIndex) => sourceMatch.players[sourceMatch.turn].pieces[pieceIndex].steps === STABLE,
    );
    const selected = automated
      ? selectBotMove(sourceMatch, finalRoll)
      : moves.length === 1 || allEquivalentStable
        ? moves[0]
        : null;

    if (selected !== null) {
      setNotice(allEquivalentStable && !automated
        ? '6 · sortie automatique de l’écurie.'
        : automated
          ? 'L’IA analyse le Cercle.'
          : 'Un seul mouvement est possible · sélection automatique.');
      await wait(320);
      if (id !== sequence.current) return;
      await animateMove(sourceMatch, selected, finalRoll);
      return;
    }

    setLegal(moves);
    setBusy(false);
    setNotice('Choisis le totem à déplacer. Les possibilités brillent sur le plateau.');
  }

  function choosePiece(pieceIndex) {
    if (!match || busy || dice === null || !legal.includes(pieceIndex)) return;
    setBusy(true);
    animateMove(match, pieceIndex, dice);
  }

  useEffect(() => {
    if (!match || match.status !== 'playing' || busy || dice !== null) return undefined;
    const player = currentPlayer(match);
    if (player?.type !== 'bot') return undefined;
    const timer = setTimeout(() => rollDice(true), 650);
    return () => clearTimeout(timer);
  }, [match?.turn, match?.status, busy, dice]);

  if (!match) {
    return (
      <div className="dada3b-shell" role="dialog" aria-modal="true" aria-label="Dada 3B — configuration">
        <header className="dada3b-topbar">
          <div>
            <small>Jeux 3B · Nouveau protocole</small>
            <strong>DADA 3B — Le Cercle des 8 Portes</strong>
          </div>
          <button type="button" className="dada3b-icon-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </header>

        <main className="dada3b-setup">
          <section className="dada3b-setup-card">
            <span className="dada3b-kicker">2 à 8 joueurs · local + IA</span>
            <h2>Le jeu de dada revient dans l’univers 3B.</h2>
            <p>
              Quatre totems par pays. Il faut faire 6 pour ouvrir l’écurie, parcourir le Cercle,
              entrer dans sa Porte nationale et atteindre le Nexus avec le compte exact. Si un totem
              rejoint une case occupée par un adversaire, Fracture Matrix le renvoie à son écurie.
            </p>

            <div className="dada3b-country-grid">
              {COUNTRIES_3B.map((country) => (
                <SeatCard
                  key={country.id}
                  country={country}
                  seat={seats.find((seat) => seat.countryId === country.id)}
                  onChange={(type) => updateSeat(country.id, type)}
                />
              ))}
            </div>

            <div className="dada3b-launch">
              <span role="status">
                {activeSeats.length} pays actif{activeSeats.length > 1 ? 's' : ''} · {activeSeats.filter((seat) => seat.type === 'human').length} humain(s) · {activeSeats.filter((seat) => seat.type === 'bot').length} IA
                <br />{notice}
              </span>
              <button type="button" className="dada3b-primary" onClick={begin} disabled={activeSeats.length < 2}>
                Ouvrir le Cercle
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const winner = match.winner ? countryFor(match.winner) : null;

  return (
    <div className="dada3b-shell" role="dialog" aria-modal="true" aria-label="Dada 3B — partie">
      <header className="dada3b-topbar">
        <div>
          <small>Le Cercle des 8 Portes · Manche {match.round}</small>
          <strong>DADA 3B</strong>
        </div>
        <button type="button" className="dada3b-icon-button" onClick={onClose} aria-label="Quitter la partie"><X size={20} /></button>
      </header>

      <div className="dada3b-arena">
        <div className="dada3b-board-wrap">
          <Board match={match} legal={legal} motion={motion} blast={blast} onPiece={choosePiece} />
        </div>

        <aside className="dada3b-sidebar">
          <section className="dada3b-turn-card" style={{ '--country': turnCountry?.accent || '#c7a66a' }}>
            <div className="dada3b-turn-line">
              <div>
                <span className="dada3b-kicker">Tour actuel</span>
                <strong>{turnCountry?.name}</strong>
                <small>{turnPlayer?.type === 'bot' ? 'IA 3B' : 'Joueur'} · {turnCountry?.guardian} · {turnCountry?.value}</small>
              </div>
              <span aria-hidden="true">{turnCountry?.flag}</span>
            </div>
            <button
              type="button"
              className="dada3b-dice"
              onClick={() => rollDice(false)}
              disabled={busy || dice !== null || turnPlayer?.type === 'bot' || match.status !== 'playing'}
              aria-label={dice ? `Dé : ${dice}` : 'Lancer le dé'}
            >
              <b aria-hidden="true">{dice ? DICE[dice] : '◇'}</b>
              <small>{dice ? `${dice} obtenu` : turnPlayer?.type === 'bot' ? 'IA en réflexion' : 'Appuie pour lancer'}</small>
            </button>
          </section>

          <section className="dada3b-event" aria-live="polite">
            <b>Transmission 3B</b><br />
            {notice}
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
                    <small>{stable} écurie · {player.stats.captures} capture(s)</small>
                  </div>
                  <span>{home}/4 Nexus</span>
                </div>
              );
            })}
          </section>

          <div className="dada3b-rules">
            <strong>Règles rapides</strong><br />
            6 = sortir de l’écurie + rejouer · déplacement case par case · capture sur la même case · entrée finale dans la Porte du pays · compte exact obligatoire pour sécuriser le dernier totem.
          </div>
        </aside>
      </div>

      {winner && (
        <div className="dada3b-victory" role="dialog" aria-modal="true" aria-label="Victoire Dada 3B">
          <section className="dada3b-victory-card" style={{ '--country': winner.accent }}>
            <span className="dada3b-kicker">Cercle complété · Score {scoreFor(match, winner.id)}</span>
            <h2>{winner.flag} {winner.name}</h2>
            <p>
              Les quatre totems sont réunis dans le Nexus. {winner.guardian} scelle la valeur
              <strong> {winner.value}</strong> et remporte cette partie.
            </p>
            <div className="dada3b-victory-actions">
              <button type="button" className="dada3b-primary" onClick={replay}><RotateCcw size={17} /> Rejouer</button>
              <button type="button" className="dada3b-secondary" onClick={() => { sequence.current += 1; setMatch(null); setNotice('Choisis de 2 à 8 pays.'); }}>Changer les joueurs</button>
              <button type="button" className="dada3b-secondary" onClick={onClose}>Retour aux Jeux 3B</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
