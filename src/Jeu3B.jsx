import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const COUNTRIES = [
  { name: "France", code: "FR", flag: "🇫🇷", capital: "Paris" },
  { name: "Italie", code: "IT", flag: "🇮🇹", capital: "Rome" },
  { name: "Estonie", code: "EE", flag: "🇪🇪", capital: "Tallinn" },
  { name: "Turquie", code: "TR", flag: "🇹🇷", capital: "Ankara" },
  { name: "Algérie", code: "DZ", flag: "🇩🇿", capital: "Alger" },
  { name: "Tunisie", code: "TN", flag: "🇹🇳", capital: "Tunis" },
  { name: "Maroc", code: "MA", flag: "🇲🇦", capital: "Rabat" },
  { name: "Espagne", code: "ES", flag: "🇪🇸", capital: "Madrid" },
];

const BRAND_WORDS = [
  "black",
  "blanc",
  "beur",
  "heritage",
  "luxe",
  "premium",
  "passeport",
  "digital",
  "secret",
  "international",
  "ambition",
  "creation",
  "identite",
  "legacy",
  "musique",
  "maillot",
  "prototype",
  "communaute",
  "fidélité",
  "membre",
];

const MODES = [
  "Écriture",
  "QCM",
  "Compléter",
  "Mot mélangé",
  "Drapeau",
  "Code pays",
  "Capitale",
  "Intrus",
  "Association",
  "Mémoire",
  "Suite logique",
  "Mot secret",
];

function normalize(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function seededIndex(seed, length) {
  if (!length) return 0;
  return Math.abs((seed * 9301 + 49297) % 233280) % length;
}

function shuffle(array, seed) {
  const result = [...array];
  let s = seed || 1;

  for (let i = result.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function scramble(word, seed) {
  const letters = String(word).split("");
  const mixed = shuffle(letters, seed).join("");
  return normalize(mixed) === normalize(word) ? letters.reverse().join("") : mixed;
}

function safeGame(gameProfile) {
  return {
    level: Number(gameProfile?.level) || 1,
    door: Number(gameProfile?.door) || 1,
    xp: Number(gameProfile?.xp) || 0,
    streak: Number(gameProfile?.streak) || 0,
    bestStreak: Number(gameProfile?.bestStreak) || 0,
    correctAnswers: Number(gameProfile?.correctAnswers) || 0,
    wrongAnswers: Number(gameProfile?.wrongAnswers) || 0,
    hintsUsed: Number(gameProfile?.hintsUsed) || 0,
    elapsedSeconds: Number(gameProfile?.elapsedSeconds) || 0,
    totalPercent: Number(gameProfile?.totalPercent) || 0,
    lastMode: gameProfile?.lastMode || "invité",
  };
}

function getStep(game) {
  return (game.level - 1) * 10 + game.door;
}

function difficultyLabel(level) {
  if (level <= 3) return "Très facile";
  if (level <= 10) return "Facile";
  if (level <= 25) return "Progressif";
  if (level <= 60) return "Moyen";
  if (level <= 120) return "Sérieux";
  if (level <= 250) return "Difficile";
  if (level <= 500) return "Expert";
  return "Légende";
}

function buildRound(game) {
  const step = getStep(game);
  const mode = MODES[seededIndex(step + game.level + game.door, MODES.length)];

  const country = COUNTRIES[seededIndex(step + 7, COUNTRIES.length)];
  const country2 = COUNTRIES[seededIndex(step + 13, COUNTRIES.length)];
  const word = BRAND_WORDS[seededIndex(step + 19, BRAND_WORDS.length)];

  if (mode === "QCM") {
    const options = shuffle(
      [
        country.name,
        ...COUNTRIES.filter((c) => c.name !== country.name)
          .slice(0, 6)
          .map((c) => c.name),
      ],
      step + 4
    ).slice(0, 4);

    if (!options.includes(country.name)) options[0] = country.name;

    return {
      mode,
      title: "Choisis la bonne réponse.",
      question: `Quel pays 3B a pour capitale ${country.capital} ?`,
      answer: country.name,
      options: shuffle(options, step + 9),
      hint: `Indice : ${country.flag} / code ${country.code}.`,
    };
  }

  if (mode === "Compléter") {
    const answer = country.name;
    const prefix = answer.slice(0, Math.min(3, answer.length - 1));
    return {
      mode,
      title: "Complète le mot manquant.",
      question: `${prefix}${"_".repeat(Math.max(2, answer.length - prefix.length))}`,
      answer,
      options: null,
      hint: `Indice : pays officiel 3B, capitale ${country.capital}.`,
    };
  }

  if (mode === "Mot mélangé") {
    return {
      mode,
      title: "Remets les lettres dans le bon ordre.",
      question: scramble(word, step + 22),
      answer: word,
      options: null,
      hint: `Indice : mot lié à l’univers 3B, ${word.length} lettres.`,
    };
  }

  if (mode === "Drapeau") {
    const options = shuffle(COUNTRIES.map((c) => c.name), step + 31).slice(0, 4);
    if (!options.includes(country.name)) options[0] = country.name;

    return {
      mode,
      title: "Trouve le pays correspondant au drapeau.",
      question: country.flag,
      answer: country.name,
      options: shuffle(options, step + 32),
      hint: `Indice : capitale ${country.capital}.`,
    };
  }

  if (mode === "Code pays") {
    return {
      mode,
      title: "Trouve le code pays officiel.",
      question: `Code officiel de ${country.name}`,
      answer: country.code,
      options: null,
      hint: `Indice : ${country.code.length} lettres.`,
    };
  }

  if (mode === "Capitale") {
    return {
      mode,
      title: "Écris la capitale.",
      question: `Capitale de ${country.name}`,
      answer: country.capital,
      options: null,
      hint: `Indice : commence par ${country.capital.slice(0, 2)}.`,
    };
  }

  if (mode === "Intrus") {
    const intruders = ["Portugal", "Japon", "Brésil", "Canada", "Suisse", "Belgique"];
    const intruder = intruders[seededIndex(step + 50, intruders.length)];
    const options = shuffle([country.name, country2.name, "France", intruder], step + 51);

    return {
      mode,
      title: "Trouve l’intrus.",
      question: "Un seul pays n’est pas dans les 8 pays officiels 3B.",
      answer: intruder,
      options,
      hint: "Indice : les pays officiels sont France, Italie, Estonie, Turquie, Algérie, Tunisie, Maroc, Espagne.",
    };
  }

  if (mode === "Association") {
    return {
      mode,
      title: "Associe mentalement le pays à sa capitale.",
      question: `${country.name} → ?`,
      answer: country.capital,
      options: shuffle(
        [country.capital, country2.capital, "Lisbonne", "Tokyo"],
        step + 60
      ),
      hint: `Indice : capitale du pays ${country.flag}.`,
    };
  }

  if (mode === "Mémoire") {
    return {
      mode,
      title: "Question mémoire 3B.",
      question: "Quel mot complète : Black • Blanc • ?",
      answer: "Beur",
      options: shuffle(["Beur", "Noir", "Bleu", "Or"], step + 70),
      hint: "Indice : c’est le troisième mot du nom 3B.",
    };
  }

  if (mode === "Suite logique") {
    const sequences = [
      { q: "France → Italie → Estonie → ?", a: "Turquie" },
      { q: "Black → Blanc → ?", a: "Beur" },
      { q: "1 → 2 → 3 → ?", a: "4" },
      { q: "Passeport → Membre → XP → ?", a: "Classement" },
    ];
    const item = sequences[seededIndex(step + 80, sequences.length)];

    return {
      mode,
      title: "Trouve la suite logique.",
      question: item.q,
      answer: item.a,
      options: null,
      hint: `Indice : la réponse commence par ${item.a.slice(0, 1)}.`,
    };
  }

  if (mode === "Mot secret") {
    return {
      mode,
      title: "Trouve le mot secret de l’univers 3B.",
      question: "Ce n’est pas une marque, c’est un...",
      answer: "héritage",
      options: null,
      hint: "Indice : mot très important dans ton slogan.",
    };
  }

  return {
    mode: "Écriture",
    title: "Écris le bon mot.",
    question: `Écris le pays officiel 3B dont la capitale est ${country.capital}.`,
    answer: country.name,
    options: null,
    hint: `Indice : commence par ${country.name.slice(0, 2)}.`,
  };
}

function formatTime(seconds = 0) {
  const total = Number(seconds) || 0;
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function Jeu3B({ member, gameProfile, setGameProfile, onBack }) {
  const game = safeGame(gameProfile);
  const round = useMemo(() => buildRound(game), [game.level, game.door]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsedThisRound, setHintUsedThisRound] = useState(false);

  useEffect(() => {
    setAnswer("");
    setFeedback("");
    setHintOpen(false);
    setHintUsedThisRound(false);
  }, [game.level, game.door]);

  useEffect(() => {
    const timer = setInterval(() => {
      setGameProfile((prev) => {
        const current = safeGame(prev);
        return {
          ...current,
          elapsedSeconds: current.elapsedSeconds + 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setGameProfile]);

  function useHint() {
    setHintOpen(true);

    if (!hintUsedThisRound) {
      setHintUsedThisRound(true);
      setGameProfile((prev) => {
        const current = safeGame(prev);
        return {
          ...current,
          hintsUsed: current.hintsUsed + 1,
        };
      });
    }
  }

  function validate(value) {
    const userValue = normalize(value);
    const correctValue = normalize(round.answer);

    if (!userValue) return;

    if (userValue !== correctValue) {
      setFeedback("Mauvaise réponse. Réessaie, la porte ne change pas.");

      setGameProfile((prev) => {
        const current = safeGame(prev);
        return {
          ...current,
          wrongAnswers: current.wrongAnswers + 1,
          streak: 0,
        };
      });

      return;
    }

    const baseXp = 10 + Math.floor(game.level / 10);
    const gain = hintUsedThisRound ? Math.max(4, baseXp - 4) : baseXp;

    setFeedback(`Bonne réponse. +${gain} XP. Porte suivante.`);

    setTimeout(() => {
      setGameProfile((prev) => {
        const current = safeGame(prev);
        const nextDoor = current.door >= 10 ? 1 : current.door + 1;
        const nextLevel = current.door >= 10 ? Math.min(1000, current.level + 1) : current.level;
        const completedDoors = (nextLevel - 1) * 10 + (nextDoor - 1);
        const totalPercent = Number(((completedDoors / 10000) * 100).toFixed(2));
        const nextStreak = current.streak + 1;

        return {
          ...current,
          level: nextLevel,
          door: nextDoor,
          xp: current.xp + gain,
          streak: nextStreak,
          bestStreak: Math.max(current.bestStreak, nextStreak),
          correctAnswers: current.correctAnswers + 1,
          totalPercent,
          lastMode: member ? "membre" : "invité",
        };
      });
    }, 700);
  }

  function resetGame() {
    setGameProfile({
      level: 1,
      door: 1,
      xp: 0,
      streak: 0,
      bestStreak: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      hintsUsed: 0,
      elapsedSeconds: 0,
      totalPercent: 0,
      lastMode: member ? "membre" : "invité",
    });
  }

  const doorPercent = Math.round(((game.door - 1) / 10) * 100);

  return (
    <div className="page">
      <button className="back-button" onClick={onBack}>
        ← Retour
      </button>

      <div className="play-header-row">
        <div>
          <div className="page-eyebrow">3B INTERNATIONAL</div>
          <h1 className="page-title">
            Porte {game.door} — {round.mode}
          </h1>
          <p className="page-subtitle">
            Chaque bonne réponse ouvre la porte suivante. À 10 portes, tu passes au niveau suivant.
          </p>
        </div>

        <div className="play-header-actions">
          <button className="blue-button" onClick={resetGame}>
            Réinitialiser le jeu
          </button>
        </div>
      </div>

      <div className="game-top-grid">
        <section className="section-card">
          <h2 className="section-title">Progression porte</h2>
          <div className="progress-ring-shell">
            <div className="progress-ring" style={{ "--progress": `${doorPercent}%` }}>
              <div className="progress-ring-inner">{doorPercent}%</div>
            </div>
          </div>
        </section>

        <section className="section-card">
          <h2 className="section-title">Niveau / porte</h2>
          <div className="stats-compact">
            <div>Niveau {game.level} / 1000</div>
            <div>Porte {game.door} / 10</div>
            <div>Difficulté : {difficultyLabel(game.level)}</div>
          </div>
        </section>

        <section className="section-card">
          <h2 className="section-title">XP et temps</h2>
          <div className="stats-compact">
            <div>XP jeu : {game.xp}</div>
            <div>Série : {game.streak}</div>
            <div>Temps : {formatTime(game.elapsedSeconds)}</div>
          </div>
        </section>
      </div>

      <div className="game-main-grid">
        <section className="section-card mission-card">
          <div className="game-mode-pill">{round.mode}</div>
          <h2 className="section-title">Mission de la porte</h2>
          <div className="mission-main-text">{round.title}</div>
          <div className="mission-emphasis">{round.question}</div>
        </section>

        <section className="section-card answer-card">
          <h2 className="section-title">Réponse</h2>

          {round.options ? (
            <div className="choice-grid">
              {round.options.map((option) => (
                <button
                  key={option}
                  className="choice-button"
                  onClick={() => validate(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              className="text-input game-answer-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Écris ta réponse"
              onKeyDown={(e) => {
                if (e.key === "Enter") validate(answer);
              }}
            />
          )}

          <div className="button-row">
            {!round.options ? (
              <button className="gold-button" onClick={() => validate(answer)}>
                Valider
              </button>
            ) : null}

            <button className="blue-button" onClick={useHint}>
              Indice
            </button>
          </div>

          {hintOpen ? <div className="hint-box">{round.hint}</div> : null}

          {feedback ? (
            <div
              className={`feedback-box ${
                feedback.startsWith("Bonne") ? "success" : "error"
              }`}
            >
              {feedback}
            </div>
          ) : null}
        </section>
      </div>

      <div className="game-bottom-grid">
        <section className="section-card">
          <h2 className="section-title">Règle XP</h2>
          <ul className="bullet-list">
            <li>Bonne réponse : XP gagné + porte suivante.</li>
            <li>Indice utilisé : XP réduit pour cette porte.</li>
            <li>Erreur : la porte ne change pas.</li>
            <li>Après 10 portes validées, tu passes au niveau suivant.</li>
            <li>La difficulté augmente progressivement avec l’avancement.</li>
          </ul>
        </section>

        <section className="section-card">
          <h2 className="section-title">Statut joueur</h2>
          <div className="info-list">
            <div>
              <span>Mode</span>
              <strong>{member ? "Membre 3B" : "Invité"}</strong>
            </div>
            <div>
              <span>Nom</span>
              <strong>{member?.name || "Invité"}</strong>
            </div>
            <div>
              <span>Meilleure série</span>
              <strong>{game.bestStreak}</strong>
            </div>
            <div>
              <span>Réponses validées</span>
              <strong>{game.correctAnswers}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}