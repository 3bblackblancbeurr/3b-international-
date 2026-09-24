import { useEffect, useMemo, useRef, useState } from "react";
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
import "./premier-secret.css";

const STORAGE_KEY = "3b_premier_secret_v2";
const RING_MARKS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function safeRead(dayKey) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.dayKey !== dayKey) return null;
    return parsed;
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

function PulseMark({ count }) {
  return <span className="ps-pulses" aria-label={count + " pulsations"}>{"•".repeat(count)}</span>;
}

function VeilleurFigure() {
  return (
    <div className="ps-veilleur-frame">
      <div className="ps-veilleur-halo" aria-hidden="true" />
      <img src="/games/forbidden-guardian.webp" alt="Le Veilleur du Nexus dans une architecture sombre éclairée de bleu" />
      <div className="ps-veilleur-mask" aria-hidden="true" />
      <div className="ps-veilleur-caption">
        <span>LE VEILLEUR</span>
        <strong>ARCHIVE NEXUS / 001</strong>
      </div>
    </div>
  );
}

export default function PremierSecretPage({ goTo, dailySecret }) {
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
  const [chamberNumber, setChamberNumber] = useState("");
  const [chamberValue, setChamberValue] = useState("");
  const [sealPick, setSealPick] = useState([]);
  const [serverMessage, setServerMessage] = useState("");
  const [starting, setStarting] = useState(false);
  const sequenceTimer = useRef(null);

  const journalEntries = useMemo(() => {
    const entries = [
      "Jour " + dayKey + " · l’heure ne montre jamais deux fois le même chemin.",
    ];
    if (stage >= 2) {
      entries.push("Porte ouverte : " + config.country.name + " · " + config.country.value + " · glyphe " + config.country.glyph + ".");
    }
    if (stage >= 4) {
      entries.push("Fragment transmission : " + config.transmission.join(" · ") + ".");
      entries.push("Clé des anneaux : ☽=I · △=III · ☀=V · ◇=VII ; avance ensuite chaque marque de " + config.ringShift + " cran(s).");
    }
    if (stage >= 5) {
      entries.push(...config.archiveClues);
    }
    if (stage >= 6) {
      entries.push("Anneaux stabilisés : " + config.ringTargets.map((value) => RING_MARKS[value]).join(" / ") + ".");
      entries.push("Archive stabilisée : " + config.archiveOrder.map((value, index) => SLOT_NAMES[index] + "=" + value).join(" · ") + ".");
      entries.push("Chambre : additionne les trois valeurs des anneaux puis ramène le résultat sur 8 ; lis ensuite la trace placée au " + SLOT_NAMES[config.chamberSlot] + ".");
    }
    if (stage >= 7) {
      entries.push("Sceau final : ce qui relie garde ce qui fut, pour ouvrir ce qui vient.");
    }
    return entries;
  }, [stage, dayKey, config]);

  useEffect(() => {
    safeWrite({ dayKey, stage });
  }, [dayKey, stage]);

  useEffect(() => () => {
    if (sequenceTimer.current) window.clearTimeout(sequenceTimer.current);
  }, []);

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
    if (!soundOn || typeof window === "undefined") return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
    oscillator.addEventListener("ended", () => ctx.close());
  }

  async function startSignal() {
    if (starting || dailySecret?.phase !== "open") return;
    try {
      setStarting(true);
      setServerMessage("");
      const result = await startDailySecretAttempt();
      if (!result?.ok) {
        setServerMessage(result?.reason === "expired" ? "Le temps est déjà écoulé pour aujourd’hui." : "Le signal vient de se refermer.");
        await dailySecret?.refresh?.();
        return;
      }
      await dailySecret?.refresh?.();
      setAttempts(3);
      setSecondsLeft(60);
      setDeadline(Date.now() + 60_000);
      setStage(1);
      ping(520);
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "Impossible d’ouvrir le Nexus.");
    } finally {
      setStarting(false);
    }
  }

  function chooseCountry(index) {
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

  function placeArchiveValue(value) {
    if (archiveDraft.includes(value)) return;
    const openIndex = archiveDraft.findIndex((entry) => entry === null);
    if (openIndex < 0) return;
    const next = [...archiveDraft];
    next[openIndex] = value;
    setArchiveDraft(next);
    ping(420 + openIndex * 45);
  }

  function clearArchiveSlot(index) {
    if (!archiveDraft[index]) return;
    const next = [...archiveDraft];
    next[index] = null;
    setArchiveDraft(next);
  }

  function validateArchive() {
    if (!sameArray(archiveDraft, config.archiveOrder)) {
      setArchiveDraft([null, null, null, null]);
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
    const next = [...sealPick, word];
    setSealPick(next);
    ping(480 + next.length * 80);
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
      await dailySecret?.refresh?.();
      ping(920);
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "Validation serveur impossible.");
    }
  }

  function resetExperience() {
    setStage(0);
    setDeadline(0);
    setAttempts(3);
    setTransmissionPick([]);
    setRings(config.ringStart);
    setArchiveDraft([null, null, null, null]);
    setChamberNumber("");
    setChamberValue("");
    setSealPick([]);
    safeWrite({ dayKey, stage: 0 });
  }

  const shuffledSeal = useMemo(() => {
    const base = [...config.finalSeal];
    return config.seed % 2 ? [base[2], base[0], base[1]] : [base[1], base[2], base[0]];
  }, [config]);

  return (
    <section
      className="premier-secret"
      aria-labelledby="premier-secret-title"
      style={{ "--ps-signal": config.signalColor.hex }}
    >
      <div className="ps-atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <header className="ps-toprail">
        <button type="button" className="ps-brand" onClick={() => goTo?.("home")} aria-label="Retour à l’accueil 3B">
          <strong>3B</strong>
          <span>LES ARCHIVES<br />DU NEXUS</span>
        </button>

        <div className="ps-edition">ÉDITION II · EN LIGNE</div>

        <div className="ps-tools">
          <button type="button" onClick={() => setSoundOn((value) => !value)}>
            {soundOn ? "SON ON" : "SON OFF"}
          </button>
          <button type="button" onClick={() => setJournalOpen(true)}>
            CARNET <b>{String(journalEntries.length).padStart(2, "0")}</b>
          </button>
          <div className="ps-attempt-clock" data-phase={dailySecret?.phase || "loading"}>
            <span>{dailySecret?.parisClock || "--:--:--"}</span>
            <strong>{dailySecret?.phase === "open" || dailySecret?.phase === "attempt" ? dailySecret.countdown : "PARIS"}</strong>
          </div>
          <button type="button" className="ps-clock-button" aria-label="Horloge officielle du Secret" disabled>
            ◷
          </button>
        </div>
      </header>

      <main className="ps-shell">
        {dailySecret?.phase === "attempt" && (
          <div className="ps-global-deadline" role="status">
            <span>TEMPS TOTAL DE TA TENTATIVE</span>
            <strong>{dailySecret.countdown}</strong>
            <small>Quand ce compteur atteint 00:00, le Secret se verrouille jusqu’à demain.</small>
          </div>
        )}
        {stage === 0 && (
          <section className="ps-landing ps-stage">
            <div className="ps-landing-copy">
              <p className="ps-kicker">CHAPITRE 01 / LE VEILLEUR DU NEXUS</p>
              <h1 id="premier-secret-title">L’Heure du <em>Premier Secret.</em></h1>
              <p className="ps-lead">Huit royaumes. Une heure qui se dérobe.<br />Et quelque chose qui attend, de l’autre côté.</p>
              <div className={`ps-hour-status ps-hour-${dailySecret?.phase || "loading"}`}>
                <span>HEURE OFFICIELLE · PARIS</span>
                <strong>{dailySecret?.parisClock || "--:--:--"}</strong>
                <p>{dailySecret?.status?.message || "Synchronisation avec le Nexus…"}</p>
                {(dailySecret?.phase === "open" || dailySecret?.phase === "attempt") && <b>{dailySecret.countdown}</b>}
              </div>
              <div className="ps-actions">
                {dailySecret?.phase === "open" && <button type="button" className="ps-primary ps-live-entry" onClick={startSignal} disabled={starting}>{starting ? "Ouverture…" : "Le signal est actif — Entrer maintenant"} <span>↗</span></button>}
                {dailySecret?.phase === "attempt" && <button type="button" className="ps-primary ps-live-entry" onClick={() => setStage(Math.max(1, Number(safeRead(dayKey)?.stage || 1)))}>Reprendre ma tentative · {dailySecret.countdown} <span>↗</span></button>}
                <button type="button" className="ps-secondary" onClick={() => setJournalOpen(true)}>Les règles du Secret</button>
              </div>
              {serverMessage && <p className="ps-server-message" role="status">{serverMessage}</p>}
              <p className="ps-meta">Épisode 01 · 30 minutes d’ouverture · 15 minutes maximum par tentative<br />Une seule occasion par jour. Demain, l’heure sera différente.</p>
              <div className="ps-oath">CE QUI EST BRISÉ PEUT ENCORE NOUS RELIER</div>
            </div>

            <div className="ps-promise">
              <div className="ps-seal-mark">◷</div>
              <p className="ps-kicker">LA PROMESSE DU VEILLEUR</p>
              <blockquote>« La réponse n’est jamais dans une seule trace. »</blockquote>
              <div className="ps-promise-grid">
                <div><strong>Observer.</strong><span>Une couleur. Un sceau. Un rythme.</span></div>
                <div><strong>Relier.</strong><span>Cinq épreuves interdépendantes.</span></div>
                <div><strong>Révéler.</strong><span>Un premier secret au bout du cercle.</span></div>
              </div>
              <p className="ps-demo-note">Horloge et durée contrôlées par le serveur 3B. Modifier l’heure du téléphone ne change pas l’ouverture.</p>
            </div>
          </section>
        )}

        {stage === 1 && (
          <section className="ps-stage ps-signal-stage">
            <div className="ps-stage-copy">
              <p className="ps-kicker">LE SIGNAL EST OUVERT</p>
              <h2>Une minute. Une porte.</h2>
              <p>
                Le signal est <b>{config.signalColor.label}</b>. Son glyphe est <b className="ps-big-glyph">{config.country.glyph}</b>.
                Il pulse <b>{config.country.pulses} fois</b>. Mémorise ces marques.
              </p>
              <div className="ps-timer"><strong>{String(secondsLeft).padStart(2, "0")}</strong><span>secondes</span></div>
              <p className="ps-attempts">{attempts} essai{attempts > 1 ? "s" : ""} restant{attempts > 1 ? "s" : ""}</p>
            </div>

            <div className="ps-nexus" aria-label="Anneau des huit royaumes">
              <div className="ps-nexus-core"><span>{config.country.glyph}</span><small>LE SIGNAL</small></div>
              <div className="ps-country-grid">
                {COUNTRIES.map((country, index) => (
                  <button key={country.id} type="button" className="ps-country-cell" onClick={() => chooseCountry(index)}>
                    <span className="ps-country-glyph">{country.glyph}</span>
                    <strong>{country.name}</strong>
                    <PulseMark count={country.pulses} />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {stage === 2 && (
          <section className="ps-stage ps-veilleur-stage">
            <VeilleurFigure />
            <div className="ps-veilleur-copy">
              <p className="ps-kicker">LE VEILLEUR DU NEXUS</p>
              <h2>« Tu as vu l’heure changer. »</h2>
              <p>Mais ce n’était pas une couleur. C’était une direction.</p>
              <p>Souviens-toi de ce que tu verras. Chaque fragment ouvre la suite.</p>
              <button type="button" className="ps-primary" onClick={() => setStage(3)}>Traverser la Porte <span>↗</span></button>
            </div>
          </section>
        )}

        {stage === 3 && (
          <section className="ps-stage ps-puzzle-stage">
            <PuzzleHeader country={config.country.name} step="1" title="La Transmission perdue" />
            <div className="ps-puzzle-panel">
              <p>Une transmission en quatre fragments. Observe leur ordre ; tu peux la relire autant que nécessaire.</p>
              <div className={showSequence ? "ps-transmission-display active" : "ps-transmission-display"}>
                {showSequence ? config.transmission.map((token, index) => <span key={token + index}>{token}</span>) : <span className="ps-static">· · · ·</span>}
              </div>
              <button type="button" className="ps-secondary" onClick={playTransmission}>{showSequence ? "Transmission en cours…" : "Lire la transmission"}</button>

              <p className="ps-instruction">Recompose ensuite les fragments dans l’ordre d’apparition.</p>
              <div className="ps-token-row">
                {TRANSMISSION_TOKENS.map((token) => (
                  <button key={token} type="button" disabled={showSequence || transmissionPick.includes(token)} onClick={() => selectTransmission(token)}>{token}</button>
                ))}
              </div>
              <div className="ps-current-answer">Ton ordre : <strong>{transmissionPick.length ? transmissionPick.join(" → ") : "—"}</strong></div>
              <div className="ps-actions">
                <button type="button" className="ps-secondary" onClick={() => setTransmissionPick([])}>Effacer</button>
                <button type="button" className="ps-primary" disabled={transmissionPick.length !== 4} onClick={validateTransmission}>Valider l’ordre</button>
              </div>
            </div>
          </section>
        )}

        {stage === 4 && (
          <section className="ps-stage ps-puzzle-stage">
            <PuzzleHeader country={config.country.name} step="2" title="Les Anneaux couplés" />
            <div className="ps-puzzle-panel">
              <p>Trois anneaux sont liés. Tourner un anneau entraîne celui qui le suit. La cible doit être déduite de la transmission précédente.</p>
              <div className="ps-ring-code">
                <span>CLÉ DE CONVERSION</span>
                <strong>☽ = I</strong>
                <strong>△ = III</strong>
                <strong>☀ = V</strong>
                <strong>◇ = VII</strong>
              </div>
              <p className="ps-instruction">
                Prends les trois premiers fragments de ta transmission, convertis-les, puis avance chaque marque de <b>{config.ringShift} cran{config.ringShift > 1 ? "s" : ""}</b> sur un cadran de huit positions.
              </p>
              <div className="ps-rings">
                {rings.map((value, index) => (
                  <div className="ps-ring-control" key={index}>
                    <small>ANNEAU {index + 1}</small>
                    <button type="button" onClick={() => moveRing(index, -1)} aria-label={"Tourner l’anneau " + (index + 1) + " en arrière"}>−</button>
                    <div className="ps-ring-value"><span>{RING_MARKS[value]}</span></div>
                    <button type="button" onClick={() => moveRing(index, 1)} aria-label={"Tourner l’anneau " + (index + 1) + " en avant"}>+</button>
                  </div>
                ))}
              </div>
              <button type="button" className="ps-primary" onClick={validateRings}>Synchroniser les anneaux</button>
            </div>
          </section>
        )}

        {stage === 5 && (
          <section className="ps-stage ps-puzzle-stage">
            <PuzzleHeader country={config.country.name} step="3" title="L’Archive du royaume" />
            <div className="ps-puzzle-panel">
              <p>Place les quatre traces autour du cercle. Les inscriptions du carnet décrivent leur relation.</p>
              <div className="ps-archive-clues">
                {config.archiveClues.map((clue) => <p key={clue}>◈ {clue}</p>)}
              </div>
              <div className="ps-archive-board">
                {SLOT_NAMES.map((slot, index) => (
                  <button type="button" className="ps-archive-slot" key={slot} onClick={() => clearArchiveSlot(index)}>
                    <small>{slot}</small>
                    <strong>{archiveDraft[index] || "—"}</strong>
                  </button>
                ))}
                <div className="ps-archive-core">3B</div>
              </div>
              <div className="ps-virtue-row">
                {ARCHIVE_VALUES.map((value) => (
                  <button type="button" key={value} disabled={archiveDraft.includes(value)} onClick={() => placeArchiveValue(value)}>{value}</button>
                ))}
              </div>
              <button type="button" className="ps-primary" disabled={archiveDraft.some((entry) => entry === null)} onClick={validateArchive}>Sceller l’Archive</button>
            </div>
          </section>
        )}

        {stage === 6 && (
          <section className="ps-stage ps-puzzle-stage">
            <PuzzleHeader country={config.country.name} step="4" title="La Chambre de l’Heure" />
            <div className="ps-puzzle-panel">
              <p>Le mécanisme attend deux résultats issus des salles précédentes. Aucun nombre final ni aucune valeur finale ne sont donnés directement.</p>
              <div className="ps-chamber-clues">
                <p><strong>Aiguille :</strong> additionne les valeurs I–VIII de tes trois anneaux stabilisés, puis ramène le total sur un cadran de huit positions.</p>
                <p><strong>Valeur :</strong> utilise la trace que tu avais placée au <b>{SLOT_NAMES[config.chamberSlot]}</b> dans l’Archive.</p>
              </div>
              <div className="ps-chamber">
                <label>
                  <span>Aiguille du royaume</span>
                  <select value={chamberNumber} onChange={(event) => setChamberNumber(event.target.value)}>
                    <option value="">Choisir un nombre</option>
                    {COUNTRIES.map((country, index) => <option key={country.id} value={index + 1}>{index + 1}</option>)}
                  </select>
                </label>
                <label>
                  <span>Valeur du cercle</span>
                  <select value={chamberValue} onChange={(event) => setChamberValue(event.target.value)}>
                    <option value="">Choisir une valeur</option>
                    {ARCHIVE_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              </div>
              <button type="button" className="ps-primary" onClick={validateChamber}>Confirmer le mécanisme</button>
            </div>
          </section>
        )}

        {stage === 7 && (
          <section className="ps-stage ps-final-stage">
            <div className="ps-final-veilleur"><VeilleurFigure /></div>
            <div className="ps-puzzle-panel">
              <p className="ps-kicker">{config.country.name.toUpperCase()} / ÉPREUVE 5 SUR 5</p>
              <h2>La question du Veilleur</h2>
              <blockquote>« Tu as ouvert la Porte. Tu n’as toujours pas découvert le Secret. »</blockquote>
              <p>Ce qui nous relie garde ce qui fut, pour ouvrir ce qui vient.</p>
              <p className="ps-instruction">Reconstruis les trois mots du sceau.</p>
              <div className="ps-virtue-row">
                {shuffledSeal.map((word) => (
                  <button type="button" key={word} disabled={sealPick.includes(word)} onClick={() => selectSeal(word)}>{word}</button>
                ))}
              </div>
              <div className="ps-current-answer">Ton sceau : <strong>{sealPick.length ? sealPick.join(" → ") : "—"}</strong></div>
              <div className="ps-actions">
                <button type="button" className="ps-secondary" onClick={() => setSealPick([])}>Effacer</button>
                <button type="button" className="ps-primary" disabled={sealPick.length !== 3} onClick={validateSeal}>Révéler le Premier Secret</button>
              </div>
            </div>
          </section>
        )}

        {stage === 8 && (
          <section className="ps-stage ps-complete-stage">
            <div className="ps-coffer">
              <div className="ps-coffer-glyph">{config.country.glyph}</div>
              <p className="ps-kicker">LE COFFRE DU PREMIER SECRET</p>
              <h2>Tu as réuni les fragments.</h2>
              <p className="ps-final-words">Unité. Mémoire. Avenir.</p>
              <div className="ps-validation-banner">PARCOURS TERMINÉ — VALIDATION SERVEUR 3B</div>
              <p>Ta tentative du jour est validée. Le Nexus ne se rouvrira pour toi que lors du prochain signal quotidien.</p>
              <div className="ps-actions">
                <button type="button" className="ps-primary" onClick={() => goTo?.("home")}>Retour à l’accueil 3B</button>
                <button type="button" className="ps-secondary" onClick={() => setJournalOpen(true)}>Relire mon carnet</button>
              </div>
            </div>
          </section>
        )}


      </main>

      <footer className="ps-footer">
        <span>3B INTERNATIONAL / LE PROTOCOLE DE L’HEURE</span>
        <button type="button" onClick={() => setJournalOpen(true)}>Carnet des traces</button>
      </footer>

      {journalOpen && (
        <div className="ps-journal-backdrop" role="presentation" onClick={() => setJournalOpen(false)}>
          <aside className="ps-journal" role="dialog" aria-modal="true" aria-labelledby="ps-journal-title" onClick={(event) => event.stopPropagation()}>
            <div className="ps-journal-head">
              <div>
                <p className="ps-kicker">ARCHIVE PERSONNELLE</p>
                <h2 id="ps-journal-title">Carnet des traces</h2>
              </div>
              <button type="button" onClick={() => setJournalOpen(false)}>×</button>
            </div>
            <ol>
              {journalEntries.map((entry) => <li key={entry}>{entry}</li>)}
            </ol>
            <div className="ps-rules">
              <strong>Règle du Veilleur</strong>
              <p>Observe, relie, puis déduis. Les réponses utiles apparaissent dans plusieurs épreuves. Le carnet conserve les traces déjà gagnées.</p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function PuzzleHeader({ country, step, title }) {
  return (
    <header className="ps-puzzle-header">
      <div>
        <p className="ps-kicker">{country.toUpperCase()} / ÉPREUVE {step} SUR 5</p>
        <h2>{title}</h2>
      </div>
      <span className="ps-step-badge">{step}/5</span>
    </header>
  );
}
