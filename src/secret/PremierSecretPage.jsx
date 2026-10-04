import { useLuxury } from "../design-system/LuxuryExperience.jsx";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ARCHIVE_VALUES,
  COUNTRIES,
  SLOT_NAMES,
  TRANSMISSION_TOKENS,
  advanceCoupledRing,
  makePremierSecretConfig,
  parisDayKey,
  sameArray,
} from "./premierSecretEngine.js";
import { completeDailySecretAttempt, startDailySecretAttempt } from "./dailySecret.js";
import SecretSanctuary3D from "./SecretSanctuary3D.jsx";
import "./premier-secret.css";
import "./secret-aaaa.css";
import "./secret-v2.css";

const SecretSanctuary3D = lazy(() => import("./SecretSanctuary3D.jsx"));\n\nconst STORAGE_KEY = "3b_premier_secret_v2";
const RING_MARKS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const SECRET_STAGES = [
  { id: 0, label: "Veille" },
  { id: 1, label: "Signal" },
  { id: 2, label: "Veilleur" },
  { id: 3, label: "Mémoire" },
  { id: 4, label: "Anneaux" },
  { id: 5, label: "Archive" },
  { id: 6, label: "Heure" },
  { id: 7, label: "Sceau" },
  { id: 8, label: "Révélé" },
];

function safeRead(dayKey) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.dayKey === dayKey ? parsed : null;
  } catch {
    return null;
  }
}

function safeWrite(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // L’expérience reste jouable sans stockage local.
  }
}

function RingControl({ index, value, onStep }) {
  const startX = useRef(null);

  function finishDrag(event) {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    startX.current = null;
    if (Math.abs(delta) > 18) onStep(index, delta > 0 ? 1 : -1);
  }

  return (
    <div className="ps-v2-ring-control">
      <button type="button" onClick={() => onStep(index, -1)} aria-label={"Tourner l’anneau " + (index + 1) + " en arrière"}>‹</button>
      <div
        className="ps-v2-ring-readout"
        role="group"
        aria-label={"Anneau " + (index + 1) + ", position " + RING_MARKS[value]}
        onPointerDown={(event) => {
          startX.current = event.clientX;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerUp={finishDrag}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
        <small>ANNEAU {index + 1}</small>
        <strong>{RING_MARKS[value]}</strong>
        <span>glisse pour tourner</span>
      </div>
      <button type="button" onClick={() => onStep(index, 1)} aria-label={"Tourner l’anneau " + (index + 1) + " en avant"}>›</button>
    </div>
  );
}

function SceneHeading({ country, step, title, whisper }) {
  return (
    <header className="ps-v2-scene-heading">
      <p>{country ? country.toUpperCase() + " · " : ""}{step ? "ÉPREUVE " + step + "/5" : "PROTOCOLE 01"}</p>
      <h2>{title}</h2>
      {whisper && <span>{whisper}</span>}
    </header>
  );
}

export default function PremierSecretPage({ goTo, dailySecret }) {
  const { present } = useLuxury();
  const dayKey = useMemo(() => parisDayKey(), []);
  const config = useMemo(() => makePremierSecretConfig(dayKey), [dayKey]);
  const saved = useMemo(() => safeRead(dayKey), [dayKey]);

  const [stage, setStage] = useState(() => {
    const value = Number(saved?.stage || 0);
    return value === 1 ? 0 : Math.max(0, Math.min(8, value));
  });
  const [soundOn, setSoundOn] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [attempts, setAttempts] = useState(3);
  const [showSequence, setShowSequence] = useState(false);
  const [transmissionPick, setTransmissionPick] = useState([]);
  const [rings, setRings] = useState(config.ringStart);
  const [archiveDraft, setArchiveDraft] = useState([null, null, null, null]);
  const [archiveSelection, setArchiveSelection] = useState(null);
  const [chamberNumber, setChamberNumber] = useState("");
  const [chamberValue, setChamberValue] = useState("");
  const [sealPick, setSealPick] = useState([]);
  const [serverMessage, setServerMessage] = useState("");
  const [starting, setStarting] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const sequenceTimer = useRef(null);
  const previousStageRef = useRef(stage);

  const journalEntries = useMemo(() => {
    const entries = ["Jour " + dayKey + " · l’heure ne montre jamais deux fois le même chemin."];
    if (stage >= 2) {
      entries.push("Porte ouverte : " + config.country.name + " · " + config.country.value + " · glyphe " + config.country.glyph + ".");
    }
    if (stage >= 4) {
      entries.push("Fragment transmission : " + config.transmission.join(" · ") + ".");
      entries.push("Clé : ☽=I · △=III · ☀=V · ◇=VII. Avance chaque marque de " + config.ringShift + " cran(s).");
    }
    if (stage >= 5) entries.push(...config.archiveClues);
    if (stage >= 6) {
      entries.push("Anneaux : " + config.ringTargets.map((value) => RING_MARKS[value]).join(" / ") + ".");
      entries.push("Archive : " + config.archiveOrder.map((value, index) => SLOT_NAMES[index] + "=" + value).join(" · ") + ".");
      entries.push("Chambre : additionne les trois anneaux sur 8 et lis la trace au " + SLOT_NAMES[config.chamberSlot] + ".");
    }
    if (stage >= 7) entries.push("Sceau : ce qui relie garde ce qui fut, pour ouvrir ce qui vient.");
    return entries;
  }, [stage, dayKey, config]);

  useEffect(() => {
    safeWrite({ dayKey, stage });
  }, [dayKey, stage]);

  useEffect(() => () => {
    if (sequenceTimer.current) window.clearTimeout(sequenceTimer.current);
  }, []);

  useEffect(() => {
    if (previousStageRef.current === stage) return undefined;
    previousStageRef.current = stage;
    setCinematic(true);
    const timer = window.setTimeout(() => setCinematic(false), 620);
    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    const phase = dailySecret?.phase;
    if (!phase || phase === "loading") return;
    if (phase === "completed") {
      setStage(8);
      return;
    }
    if (["waiting", "missed", "expired", "disabled"].includes(phase)) {
      setStage(0);
      return;
    }
    if (phase === "open" && stage > 0) {
      setStage(0);
      return;
    }
    if (phase === "attempt" && stage === 0) {
      const restored = Number(safeRead(dayKey)?.stage || 1);
      setStage(Math.max(1, Math.min(7, restored)));
    }
  }, [dailySecret?.phase, dayKey]);

  useEffect(() => {
    if (stage !== 1 || !deadline) return undefined;
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next <= 0) {
        setDeadline(0);
        setAttempts(3);
        setStage(0);
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [stage, deadline]);

  function ping(frequency = 440) {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(frequency < 250 ? [18, 24, 18] : frequency > 800 ? [12, 20, 26] : 12);
    }
    if (!soundOn || typeof window === "undefined") return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = frequency > 780 ? "triangle" : "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.075, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.22);
    oscillator.addEventListener("ended", () => ctx.close());
  }

  async function startSignal() {
    if (starting || dailySecret?.phase !== "open") return;
    try {
      setStarting(true);
      setServerMessage("");
      const result = await startDailySecretAttempt();
      if (!result?.ok) {
        setServerMessage(result?.reason === "expired" ? "Le signal vient de disparaître." : "Le Nexus s’est refermé.");
        await dailySecret?.refresh?.();
        return;
      }
      await dailySecret?.refresh?.();
      setAttempts(3);
      setSecondsLeft(60);
      setDeadline(Date.now() + 60_000);
      setStage(1);
      present("portal");
      ping(520);
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "Impossible d’ouvrir le Nexus.");
    } finally {
      setStarting(false);
    }
  }

  function chooseCountry(index) {
    if (stage !== 1) return;
    if (index === config.signalIndex) {
      setDeadline(0);
      setStage(2);
      ping(760);
      return;
    }
    const next = attempts - 1;
    setAttempts(next);
    ping(180);
    if (next <= 0) {
      setDeadline(0);
      setStage(0);
    }
  }

  function playTransmission() {
    setShowSequence(true);
    setTransmissionPick([]);
    ping(610);
    if (sequenceTimer.current) window.clearTimeout(sequenceTimer.current);
    sequenceTimer.current = window.setTimeout(() => setShowSequence(false), 2600);
  }

  function selectTransmission(token) {
    if (showSequence || transmissionPick.includes(token)) return;
    const next = [...transmissionPick, token];
    setTransmissionPick(next);
    ping(390 + next.length * 70);
  }

  function validateTransmission() {
    if (!sameArray(transmissionPick, config.transmission)) {
      setTransmissionPick([]);
      ping(170);
      return;
    }
    setStage(4);
    ping(820);
  }

  function moveRing(index, direction) {
    setRings((current) => advanceCoupledRing(current, index, direction));
    ping(300 + index * 80);
  }

  function validateRings() {
    if (!sameArray(rings, config.ringTargets)) {
      ping(170);
      return;
    }
    setStage(5);
    ping(830);
  }

  function selectArchiveValue(value) {
    setArchiveSelection((current) => current === value ? null : value);
    ping(470);
  }

  function placeArchiveAt(index, requestedValue = archiveSelection) {
    if (!requestedValue || !ARCHIVE_VALUES.includes(requestedValue)) {
      if (archiveDraft[index]) {
        setArchiveSelection(archiveDraft[index]);
        const next = [...archiveDraft];
        next[index] = null;
        setArchiveDraft(next);
      }
      return;
    }

    const next = [...archiveDraft];
    const existingIndex = next.indexOf(requestedValue);
    if (existingIndex >= 0) next[existingIndex] = null;
    const displaced = next[index];
    next[index] = requestedValue;
    setArchiveDraft(next);
    setArchiveSelection(displaced || null);
    ping(560 + index * 45);
  }

  function validateArchive() {
    if (!sameArray(archiveDraft, config.archiveOrder)) {
      setArchiveDraft([null, null, null, null]);
      setArchiveSelection(null);
      ping(170);
      return;
    }
    setStage(6);
    ping(850);
  }

  function validateChamber() {
    if (Number(chamberNumber) !== config.chamberNumber || chamberValue !== config.chamberValue) {
      ping(170);
      return;
    }
    setStage(7);
    ping(870);
  }

  function selectSeal(word) {
    if (sealPick.includes(word)) return;
    setSealPick([...sealPick, word]);
    ping(480 + sealPick.length * 80);
  }

  async function validateSeal() {
    if (!sameArray(sealPick, config.finalSeal)) {
      setSealPick([]);
      ping(170);
      return;
    }
    try {
      const result = await completeDailySecretAttempt();
      if (!result?.ok) {
        setServerMessage("Le temps du Veilleur est terminé. Reviens demain.");
        await dailySecret?.refresh?.();
        setStage(0);
        return;
      }
      setStage(8);
      present("milestone", "Le Premier Secret est révélé.");
      await dailySecret?.refresh?.();
      ping(920);
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "Validation serveur impossible.");
    }
  }

  const shuffledSeal = useMemo(() => {
    const base = [...config.finalSeal];
    return config.seed % 2 ? [base[2], base[0], base[1]] : [base[1], base[2], base[0]];
  }, [config]);

  const isLive = dailySecret?.phase === "open" || dailySecret?.phase === "attempt";

  return (
    <section
      className="premier-secret ps-v2-root"
      data-secret-stage={stage}
      aria-labelledby="premier-secret-title"
      style={{ "--ps-signal": config.signalColor.hex }}
    >
      <Suspense fallback={<div className="ps-v2-scene ps-v2-scene-fallback" aria-hidden="true" />}>
        <SecretSanctuary3D
          stage={stage}
          config={config}
          rings={rings}
          archiveDraft={archiveDraft}
          chamberNumber={chamberNumber}
          chamberValue={chamberValue}
          showSequence={showSequence}
          onCountrySelect={chooseCountry}
          onRingStep={moveRing}
        />
      </Suspense>

      {cinematic && <div className="ps-cinematic-transition ps-v2-transition" aria-hidden="true" />}

      <header className="ps-toprail ps-v2-toprail">
        <button type="button" className="ps-brand ps-v2-brand" onClick={() => goTo?.("home")} aria-label="Retour à l’accueil 3B">
          <strong>3B</strong>
          <span>SECRET</span>
        </button>

        <div className="ps-v2-live-status" data-phase={dailySecret?.phase || "loading"}>
          <i aria-hidden="true" />
          <span>{isLive ? dailySecret?.countdown : dailySecret?.parisClock || "--:--:--"}</span>
          <small>{isLive ? "SIGNAL ACTIF" : "PARIS"}</small>
        </div>

        <div className="ps-tools ps-v2-tools">
          <button type="button" onClick={() => setSoundOn((value) => !value)} aria-pressed={soundOn}>
            {soundOn ? "SON ●" : "SON ○"}
          </button>
          <button type="button" onClick={() => setJournalOpen(true)}>
            TRACES {String(journalEntries.length).padStart(2, "0")}
          </button>
        </div>
      </header>

      <main className="ps-shell ps-v2-shell">
        <nav className="ps-progress-rail ps-v2-progress" aria-label="Progression du Premier Secret">
          {SECRET_STAGES.map((item) => {
            const state = item.id < stage ? "done" : item.id === stage ? "current" : "next";
            return (
              <div className="ps-progress-step" data-state={state} key={item.id} aria-current={state === "current" ? "step" : undefined}>
                <i>{item.id === 0 ? "•" : item.id}</i>
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {dailySecret?.phase === "attempt" && (
          <div className="ps-global-deadline ps-v2-deadline" role="status">
            <span>TENTATIVE</span>
            <strong>{dailySecret.countdown}</strong>
          </div>
        )}

        <div className="ps-v2-sr">
          <p>Épisode 01 · 30 minutes d’ouverture · 15 minutes maximum par tentative.</p>
          <p>Modifier l’heure du téléphone ne change pas l’ouverture.</p>
        </div>

        {stage === 0 && (
          <section className="ps-stage ps-landing ps-v2-stage ps-v2-landing">
            <div className="ps-landing-copy ps-v2-hero">
              <p className="ps-kicker">PROTOCOLE 01</p>
              <h1 id="premier-secret-title">Le Premier <em>Secret.</em></h1>
              <p className="ps-lead">L’heure choisit. Le Nexus répond.</p>

              <div className={"ps-hour-status ps-v2-hour ps-hour-" + (dailySecret?.phase || "loading")}>
                <span>HEURE OFFICIELLE</span>
                <strong>{dailySecret?.parisClock || "--:--:--"}</strong>
                <p>{dailySecret?.status?.message || "Synchronisation…"}</p>
                {isLive && <b>{dailySecret.countdown}</b>}
              </div>

              <div className="ps-actions ps-v2-actions">
                {dailySecret?.phase === "open" && (
                  <button type="button" className="ps-primary ps-live-entry ps-v2-primary" onClick={startSignal} disabled={starting}>
                    {starting ? "OUVERTURE…" : "ENTRER DANS LE NEXUS"} <span>→</span>
                  </button>
                )}
                {dailySecret?.phase === "attempt" && (
                  <button type="button" className="ps-primary ps-live-entry ps-v2-primary" onClick={() => setStage(Math.max(1, Number(safeRead(dayKey)?.stage || 1)))}>
                    REPRENDRE · {dailySecret.countdown} <span>→</span>
                  </button>
                )}
                <button type="button" className="ps-secondary ps-v2-quiet" onClick={() => setJournalOpen(true)}>Voir les traces</button>
              </div>
              {serverMessage && <p className="ps-server-message ps-v2-message" role="status">{serverMessage}</p>}
            </div>
          </section>
        )}

        {stage === 1 && (
          <section className="ps-stage ps-v2-stage ps-v2-signal-stage">
            <div className="ps-v2-signal-copy">
              <p className="ps-kicker">LE SIGNAL EST OUVERT</p>
              <h2>Choisis la porte.</h2>
              <p>
                <b>{config.signalColor.label}</b> · {config.country.glyph} · {config.country.pulses} pulsation{config.country.pulses > 1 ? "s" : ""}
              </p>
              <div className="ps-v2-countdown"><strong>{String(secondsLeft).padStart(2, "0")}</strong><span>s</span></div>
              <small>{attempts} essai{attempts > 1 ? "s" : ""}</small>
            </div>

            <div className="ps-country-grid ps-v2-country-orbit" aria-label="Huit royaumes">
              {COUNTRIES.map((country, index) => (
                <button key={country.id} type="button" className="ps-country-cell ps-v2-country" onClick={() => chooseCountry(index)}>
                  <span className="ps-country-glyph">{country.glyph}</span>
                  <strong>{country.name}</strong>
                  <small>{"•".repeat(country.pulses)}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        {stage === 2 && (
          <section className="ps-stage ps-v2-stage ps-v2-guardian-stage">
            <div className="ps-v2-guardian-copy">
              <p className="ps-kicker">LE VEILLEUR</p>
              <h2>« Tu as vu l’heure changer. »</h2>
              <p>Ce n’était pas une couleur. C’était une direction.</p>
              <button type="button" className="ps-primary ps-v2-primary" onClick={() => setStage(3)}>TRAVERSER <span>→</span></button>
            </div>
          </section>
        )}

        {stage === 3 && (
          <section className="ps-stage ps-v2-stage ps-puzzle-stage ps-v2-puzzle">
            <SceneHeading country={config.country.name} step="1" title="Mémorise." whisper="Quatre fragments. Un seul ordre." />
            <div className="ps-puzzle-panel ps-v2-puzzle-body">
              <div className={"ps-transmission-display ps-v2-transmission " + (showSequence ? "active" : "")}>
                {showSequence
                  ? config.transmission.map((token, index) => <span key={token + index}>{token}</span>)
                  : <span className="ps-static">· · · ·</span>}
              </div>

              <button type="button" className="ps-secondary ps-v2-quiet" onClick={playTransmission}>
                {showSequence ? "TRANSMISSION…" : "LIRE LA TRANSMISSION"}
              </button>

              <div className="ps-token-row ps-v2-tokens">
                {TRANSMISSION_TOKENS.map((token) => (
                  <button
                    key={token}
                    type="button"
                    className={transmissionPick.includes(token) ? "is-picked" : ""}
                    disabled={showSequence || transmissionPick.includes(token)}
                    onClick={() => selectTransmission(token)}
                  >
                    {token}
                  </button>
                ))}
              </div>

              <div className="ps-v2-answer">{transmissionPick.length ? transmissionPick.join("  →  ") : "Choisis l’ordre"}</div>

              <div className="ps-actions ps-v2-actions">
                <button type="button" className="ps-secondary ps-v2-quiet" onClick={() => setTransmissionPick([])}>EFFACER</button>
                <button type="button" className="ps-primary ps-v2-primary" disabled={transmissionPick.length !== 4} onClick={validateTransmission}>VALIDER</button>
              </div>
            </div>
          </section>
        )}

        {stage === 4 && (
          <section className="ps-stage ps-v2-stage ps-puzzle-stage ps-v2-puzzle">
            <SceneHeading country={config.country.name} step="2" title="Aligne les anneaux." whisper="Ils sont couplés. Un mouvement en entraîne un autre." />
            <div className="ps-puzzle-panel ps-v2-puzzle-body">
              <div className="ps-v2-keyline">
                <span>☽ I</span><span>△ III</span><span>☀ V</span><span>◇ VII</span><b>+{config.ringShift}</b>
              </div>

              <div className="ps-rings ps-v2-rings">
                {rings.map((value, index) => (
                  <RingControl key={index} index={index} value={value} onStep={moveRing} />
                ))}
              </div>

              <p className="ps-v2-microcopy">Glisse directement sur les anneaux 3D, ou utilise ‹ ›.</p>
              <button type="button" className="ps-primary ps-v2-primary" onClick={validateRings}>VERROUILLER LES ANNEAUX</button>
            </div>
          </section>
        )}

        {stage === 5 && (
          <section className="ps-stage ps-v2-stage ps-puzzle-stage ps-v2-puzzle">
            <SceneHeading country={config.country.name} step="3" title="Reconstruis l’Archive." whisper="Sélectionne une trace, puis sa direction." />
            <div className="ps-puzzle-panel ps-v2-puzzle-body">
              <div className="ps-archive-clues ps-v2-clues">
                {config.archiveClues.map((clue) => <p key={clue}>{clue}</p>)}
              </div>

              <div className="ps-virtue-row ps-v2-archive-tokens">
                {ARCHIVE_VALUES.map((value) => (
                  <button
                    type="button"
                    key={value}
                    draggable
                    className={archiveSelection === value ? "is-selected" : archiveDraft.includes(value) ? "is-used" : ""}
                    onClick={() => selectArchiveValue(value)}
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", value)}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <div className="ps-archive-board ps-v2-archive-board">
                {SLOT_NAMES.map((slot, index) => (
                  <button
                    type="button"
                    className={archiveDraft[index] ? "ps-archive-slot is-filled" : "ps-archive-slot"}
                    key={slot}
                    onClick={() => placeArchiveAt(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      placeArchiveAt(index, event.dataTransfer.getData("text/plain"));
                    }}
                  >
                    <small>{slot}</small>
                    <strong>{archiveDraft[index] || "déposer"}</strong>
                  </button>
                ))}
              </div>

              <button type="button" className="ps-primary ps-v2-primary" disabled={archiveDraft.some((entry) => entry === null)} onClick={validateArchive}>SCELLER L’ARCHIVE</button>
            </div>
          </section>
        )}

        {stage === 6 && (
          <section className="ps-stage ps-v2-stage ps-puzzle-stage ps-v2-puzzle">
            <SceneHeading country={config.country.name} step="4" title="Réveille la Chambre." whisper={"L’aiguille vient des anneaux. La valeur vient du " + SLOT_NAMES[config.chamberSlot] + "."} />
            <div className="ps-puzzle-panel ps-v2-puzzle-body">
              <div className="ps-chamber ps-v2-chamber">
                <fieldset className="ps-choice-field ps-v2-choice">
                  <legend>Aiguille</legend>
                  <div className="ps-choice-wheel ps-number-wheel">
                    {COUNTRIES.map((country, index) => {
                      const value = String(index + 1);
                      const selected = chamberNumber === value;
                      return (
                        <button
                          type="button"
                          key={country.id}
                          className={selected ? "is-selected" : ""}
                          aria-pressed={selected}
                          onClick={() => {
                            setChamberNumber(value);
                            ping(380 + index * 35);
                          }}
                        >
                          <span>{index + 1}</span>
                          <small>{RING_MARKS[index]}</small>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="ps-choice-field ps-v2-choice">
                  <legend>Valeur</legend>
                  <div className="ps-choice-wheel ps-value-wheel">
                    {ARCHIVE_VALUES.map((value, index) => {
                      const selected = chamberValue === value;
                      return (
                        <button
                          type="button"
                          key={value}
                          className={selected ? "is-selected" : ""}
                          aria-pressed={selected}
                          onClick={() => {
                            setChamberValue(value);
                            ping(560 + index * 45);
                          }}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <button type="button" className="ps-primary ps-v2-primary" onClick={validateChamber}>ACTIVER LA CHAMBRE</button>
            </div>
          </section>
        )}

        {stage === 7 && (
          <section className="ps-stage ps-v2-stage ps-final-stage ps-v2-final">
            <div className="ps-v2-final-copy">
              <p className="ps-kicker">{config.country.name.toUpperCase()} · ÉPREUVE 5/5</p>
              <h2>Le Sceau.</h2>
              <blockquote>« Ce qui nous relie garde ce qui fut, pour ouvrir ce qui vient. »</blockquote>

              <div className="ps-virtue-row ps-v2-seal-words">
                {shuffledSeal.map((word) => (
                  <button type="button" key={word} className={sealPick.includes(word) ? "is-picked" : ""} disabled={sealPick.includes(word)} onClick={() => selectSeal(word)}>
                    {word}
                  </button>
                ))}
              </div>

              <div className="ps-v2-answer">{sealPick.length ? sealPick.join("  →  ") : "Reconstruis le sceau"}</div>

              <div className="ps-actions ps-v2-actions">
                <button type="button" className="ps-secondary ps-v2-quiet" onClick={() => setSealPick([])}>EFFACER</button>
                <button type="button" className="ps-primary ps-v2-primary" disabled={sealPick.length !== 3} onClick={validateSeal}>RÉVÉLER</button>
              </div>
            </div>
          </section>
        )}

        {stage === 8 && (
          <section className="ps-stage ps-v2-stage ps-complete-stage ps-v2-reveal">
            <div className="ps-coffer ps-v2-reveal-copy">
              <p className="ps-kicker">LE PREMIER SECRET</p>
              <h2>Tu as réuni les fragments.</h2>
              <p className="ps-final-words">Unité.<br />Mémoire.<br />Avenir.</p>
              <span className="ps-v2-validation">VALIDÉ PAR LE NEXUS</span>
              <div className="ps-actions ps-v2-actions">
                <button type="button" className="ps-primary ps-v2-primary" onClick={() => goTo?.("home")}>REVENIR À 3B</button>
                <button type="button" className="ps-secondary ps-v2-quiet" onClick={() => setJournalOpen(true)}>RELIRE LES TRACES</button>
              </div>
            </div>
          </section>
        )}
      </main>

      {journalOpen && (
        <div className="ps-journal-backdrop ps-v2-journal-backdrop" role="presentation" onClick={() => setJournalOpen(false)}>
          <aside className="ps-journal ps-v2-journal" role="dialog" aria-modal="true" aria-labelledby="ps-journal-title" onClick={(event) => event.stopPropagation()}>
            <div className="ps-journal-head">
              <div>
                <p className="ps-kicker">TRACES CONSERVÉES</p>
                <h2 id="ps-journal-title">Carnet</h2>
              </div>
              <button type="button" onClick={() => setJournalOpen(false)} aria-label="Fermer">×</button>
            </div>
            <ol>
              {journalEntries.map((entry) => <li key={entry}>{entry}</li>)}
            </ol>
          </aside>
        </div>
      )}
    </section>
  );
}
