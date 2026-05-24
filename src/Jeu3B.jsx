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
  "fidelite",
  "membre",
  "salon",
  "drop",
  "monde",
  "logo",
  "carte",
  "victoire",
];

const MODE_ORDER = [
  "QCM",
  "Compléter",
  "Mot mélangé",
  "Drapeau",
  "Relier gauche droite",
  "Mémoire",
  "Mot croisé",
  "Association",
  "Code pays",
  "Mot fléché",
  "Intrus",
  "Capitale",
  "Suite logique",
  "Mot secret",
  "Écriture",
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
  const cleanWord = normalize(word);
  const letters = Array.from(cleanWord.toUpperCase());
  const mixedLetters = shuffle(letters, seed);
  const mixed = mixedLetters.join("");

  return normalize(mixed) === cleanWord ? letters.reverse().join("") : mixed;
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

function formatTime(seconds = 0) {
  const total = Number(seconds) || 0;
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");

  return `${h}:${m}:${s}`;
}

function difficultyLabel(level, door) {
  if (level <= 2 && door <= 3) return "Très facile";
  if (level <= 5 && door <= 6) return "Facile";
  if (level <= 10) return "Progressif";
  if (level <= 25) return "Moyen";
  if (level <= 60) return "Sérieux";
  if (level <= 120) return "Difficile";
  if (level <= 300) return "Expert";
  return "Légende";
}

function makeOptions(correct, allOptions, seed, count = 4) {
  const clean = allOptions.filter((item) => normalize(item) !== normalize(correct));
  const mixed = shuffle([correct, ...clean], seed).slice(0, count);

  if (!mixed.some((item) => normalize(item) === normalize(correct))) {
    mixed[0] = correct;
  }

  return shuffle(mixed, seed + 9);
}

function buildCrosswordLetters(answer) {
  const word = normalize(answer).toUpperCase();

  return Array.from(word).map((letter, index) => ({
    id: `${letter}-${index}`,
    letter,
    visible: index === 0 || index === word.length - 1,
  }));
}

function buildRound(game) {
  const step = game.correctAnswers + 1;
  const mode = MODE_ORDER[(step - 1) % MODE_ORDER.length];

  const country = COUNTRIES[seededIndex(step + game.level + game.door, COUNTRIES.length)];
  const country2 = COUNTRIES[seededIndex(step + 17, COUNTRIES.length)];
  const word = BRAND_WORDS[seededIndex(step + 23, BRAND_WORDS.length)];
  const brandWord2 = BRAND_WORDS[seededIndex(step + 37, BRAND_WORDS.length)];

  if (mode === "QCM") {
    return {
      mode,
      visual: "qcm",
      title: "QCM ultra rapide",
      instruction: "Choisis la bonne réponse.",
      question: `Quel pays 3B a pour capitale ${country.capital} ?`,
      answer: country.name,
      options: makeOptions(country.name, COUNTRIES.map((c) => c.name), step + 4),
      hint: `Indice : ${country.flag} / code ${country.code}.`,
    };
  }

  if (mode === "Compléter") {
    const answer = country.name;
    const prefix = answer.slice(0, Math.min(3, answer.length - 1));

    return {
      mode,
      visual: "complete",
      title: "Compléter le mot",
      instruction: "Complète le pays officiel 3B.",
      question: `${prefix}${"_".repeat(Math.max(2, answer.length - prefix.length))}`,
      answer,
      hint: `Indice : capitale ${country.capital}.`,
    };
  }

  if (mode === "Mot mélangé") {
    const mixedWord = scramble(word, step + 22);
    const letters = Array.from(mixedWord);

    return {
      mode,
      visual: "scramble",
      title: "Mot mélangé",
      instruction: "Remets les lettres dans le bon ordre.",
      question: mixedWord,
      answer: word,
      letters,
      hint: `Indice : mot lié à l’univers 3B, ${normalize(word).length} lettres.`,
    };
  }

  if (mode === "Drapeau") {
    return {
      mode,
      visual: "flag",
      title: "Drapeau 3B",
      instruction: "Trouve le pays correspondant au drapeau.",
      question: country.flag,
      answer: country.name,
      options: makeOptions(country.name, COUNTRIES.map((c) => c.name), step + 31),
      hint: `Indice : capitale ${country.capital}.`,
    };
  }

  if (mode === "Relier gauche droite") {
    return {
      mode,
      visual: "connect",
      title: "Relier gauche / droite",
      instruction: "Relie mentalement le pays à sa capitale, puis clique sur la bonne capitale.",
      question: country.name,
      answer: country.capital,
      leftItems: [country.name, country2.name],
      rightItems: makeOptions(country.capital, COUNTRIES.map((c) => c.capital), step + 44),
      hint: `Indice : ${country.flag}.`,
    };
  }

  if (mode === "Mémoire") {
    return {
      mode,
      visual: "memory",
      title: "Mémoire 3B",
      instruction: "Souviens-toi de la formule 3B.",
      question: "BLACK • BLANC • ?",
      answer: "beur",
      options: ["beur", "or", "noir", "bleu"],
      hint: "Indice : c’est le troisième mot de Black Blanc Beur.",
    };
  }

  if (mode === "Mot croisé") {
    return {
      mode,
      visual: "crossword",
      title: "Mot croisé",
      instruction: "Lis les cases et trouve le mot caché.",
      question: `Définition : pays 3B, capitale ${country.capital}.`,
      answer: country.name,
      crossword: buildCrosswordLetters(country.name),
      hint: `Indice : commence par ${country.name.slice(0, 1)}.`,
    };
  }

  if (mode === "Association") {
    return {
      mode,
      visual: "association",
      title: "Association par cartes",
      instruction: "Clique sur la carte qui correspond.",
      question: `${country.name} est associé à quelle capitale ?`,
      answer: country.capital,
      options: makeOptions(country.capital, COUNTRIES.map((c) => c.capital), step + 60),
      hint: `Indice : pays ${country.flag}.`,
    };
  }

  if (mode === "Code pays") {
    return {
      mode,
      visual: "code",
      title: "Code secret pays",
      instruction: "Écris le code pays officiel.",
      question: `Code officiel de ${country.name}`,
      answer: country.code,
      codeBoxes: country.code.split(""),
      hint: `Indice : ${country.code.length} lettres.`,
    };
  }

  if (mode === "Mot fléché") {
    const cleanWord = normalize(word).toUpperCase();

    return {
      mode,
      visual: "arrow",
      title: "Mot fléché",
      instruction: "Suis la flèche et trouve le mot.",
      question: `→ ${cleanWord.slice(0, 2)}${"_".repeat(Math.max(2, cleanWord.length - 2))}`,
      answer: word,
      hint: "Indice : mot de l’univers 3B.",
    };
  }

  if (mode === "Intrus") {
    const intruders = ["Portugal", "Japon", "Brésil", "Canada", "Suisse", "Belgique"];
    const intruder = intruders[seededIndex(step + 50, intruders.length)];

    return {
      mode,
      visual: "intruder",
      title: "Trouve l’intrus",
      instruction: "Un seul pays n’est pas dans les 8 pays officiels 3B.",
      question: "Clique sur l’intrus.",
      answer: intruder,
      options: shuffle([country.name, country2.name, "France", intruder], step + 51),
      hint: "Indice : les pays officiels sont France, Italie, Estonie, Turquie, Algérie, Tunisie, Maroc, Espagne.",
    };
  }

  if (mode === "Capitale") {
    return {
      mode,
      visual: "write",
      title: "Capitale",
      instruction: "Écris la capitale.",
      question: `Capitale de ${country.name}`,
      answer: country.capital,
      hint: `Indice : commence par ${country.capital.slice(0, 2)}.`,
    };
  }

  if (mode === "Suite logique") {
    const sequences = [
      { q: "France → Italie → Estonie → ?", a: "Turquie" },
      { q: "Black → Blanc → ?", a: "Beur" },
      { q: "Passeport → Membre → XP → ?", a: "Classement" },
      { q: "Logo → Maillot → Drop → ?", a: "Héritage" },
    ];

    const item = sequences[seededIndex(step + 80, sequences.length)];

    return {
      mode,
      visual: "sequence",
      title: "Suite logique",
      instruction: "Trouve la suite.",
      question: item.q,
      answer: item.a,
      hint: `Indice : la réponse commence par ${item.a.slice(0, 1)}.`,
    };
  }

  if (mode === "Mot secret") {
    return {
      mode,
      visual: "secret-code",
      title: "Mot secret",
      instruction: "Trouve le mot secret de l’univers 3B.",
      question: "Ce n’est pas une marque, c’est un...",
      answer: "heritage",
      hint: "Indice : mot très important dans ton slogan.",
    };
  }

  return {
    mode: "Écriture",
    visual: "write",
    title: "Écriture",
    instruction: "Écris le bon mot.",
    question: `Écris le mot lié à 3B : ${brandWord2.slice(0, 2)}...`,
    answer: brandWord2,
    hint: `Indice : ${normalize(brandWord2).length} lettres.`,
  };
}

function GameVisual({ round, validate }) {
  if (round.visual === "qcm" || round.visual === "flag" || round.visual === "intruder") {
    return (
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
    );
  }

  if (round.visual === "memory") {
    return (
      <div className="memory-card-grid">
        {round.options.map((option) => (
          <button
            key={option}
            className="memory-card"
            onClick={() => validate(option)}
          >
            <span>3B</span>
            <strong>{option}</strong>
          </button>
        ))}
      </div>
    );
  }

  if (round.visual === "association") {
    return (
      <div className="association-card-grid">
        {round.options.map((option) => (
          <button
            key={option}
            className="association-card"
            onClick={() => validate(option)}
          >
            <span>Carte</span>
            <strong>{option}</strong>
          </button>
        ))}
      </div>
    );
  }

  if (round.visual === "connect") {
    return (
      <div className="connect-board">
        <div className="connect-left">
          {round.leftItems.map((item) => (
            <div className="connect-item left" key={item}>
              {item}
            </div>
          ))}
        </div>

        <div className="connect-lines">
          <span />
          <span />
          <span />
        </div>

        <div className="connect-right">
          {round.rightItems.map((item) => (
            <button
              key={item}
              className="connect-item right"
              onClick={() => validate(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (round.visual === "crossword") {
    return (
      <div className="crossword-board">
        {round.crossword.map((cell) => (
          <div className="crossword-cell" key={cell.id}>
            {cell.visible ? cell.letter : ""}
          </div>
        ))}
      </div>
    );
  }

  if (round.visual === "arrow") {
    return (
      <div className="arrow-word-board">
        <div className="arrow-clue">INDICE</div>
        <div className="arrow-line">→</div>
        <div className="arrow-target">{round.question}</div>
      </div>
    );
  }

  if (round.visual === "code" || round.visual === "secret-code") {
    return (
      <div className="code-box-board">
        {Array.from(normalize(round.answer).toUpperCase()).map((_, index) => (
          <div className="code-mini-box" key={index}>
            ?
          </div>
        ))}
      </div>
    );
  }

  if (round.visual === "scramble") {
    return (
      <div className="scramble-letters">
        {round.letters.map((letter, index) => (
          <span className="scramble-letter" key={`${letter}-${index}`}>
            {letter}
          </span>
        ))}
      </div>
    );
  }

  if (round.visual === "sequence") {
    return <div className="sequence-board">{round.question}</div>;
  }

  if (round.visual === "complete") {
    return <div className="complete-board">{round.question}</div>;
  }

  return null;
}

export default function Jeu3B({ member, gameProfile, setGameProfile, onBack }) {
  const game = safeGame(gameProfile);

  const round = useMemo(
    () => buildRound(game),
    [game.level, game.door, game.correctAnswers]
  );

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsedThisRound, setHintUsedThisRound] = useState(false);

  useEffect(() => {
    setAnswer("");
    setFeedback("");
    setHintOpen(false);
    setHintUsedThisRound(false);
  }, [game.level, game.door, game.correctAnswers]);

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
        const newCorrectAnswers = current.correctAnswers + 1;
        const nextLevel = Math.min(1000, Math.floor(newCorrectAnswers / 10) + 1);
        const nextDoor = newCorrectAnswers % 10 === 0 ? 1 : (newCorrectAnswers % 10) + 1;
        const totalPercent = Number(((newCorrectAnswers / 10000) * 100).toFixed(2));
        const nextStreak = current.streak + 1;

        return {
          ...current,
          level: nextLevel,
          door: nextDoor,
          xp: current.xp + gain,
          streak: nextStreak,
          bestStreak: Math.max(current.bestStreak, nextStreak),
          correctAnswers: newCorrectAnswers,
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

  const needsTextInput = ![
    "qcm",
    "flag",
    "intruder",
    "memory",
    "association",
    "connect",
  ].includes(round.visual);

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
            Chaque bonne réponse ouvre la porte suivante. À 10 portes, tu passes
            au niveau suivant.
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
            <div>Difficulté : {difficultyLabel(game.level, game.door)}</div>
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
          <div className="mission-sub-text">{round.instruction}</div>

          <div className="mission-emphasis">
            {["qcm", "flag", "intruder", "memory", "association", "connect"].includes(round.visual)
              ? round.question
              : null}
          </div>

          <GameVisual round={round} validate={validate} />
        </section>

        <section className="section-card answer-card">
          <h2 className="section-title">Réponse</h2>

          {needsTextInput ? (
            <>
              <input
                className="text-input game-answer-input"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Écris ta réponse"
                onKeyDown={(e) => {
                  if (e.key === "Enter") validate(answer);
                }}
              />

              <div className="button-row">
                <button className="gold-button" onClick={() => validate(answer)}>
                  Valider
                </button>

                <button className="blue-button" onClick={useHint}>
                  Indice
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="soft-text">
                Clique directement sur la bonne carte dans la mission.
              </p>

              <div className="button-row">
                <button className="blue-button" onClick={useHint}>
                  Indice
                </button>
              </div>
            </>
          )}

          {hintOpen ? <div className="hint-box">{round.hint}</div> : null}

          {feedback ? (
            <div className={`feedback-box ${feedback.startsWith("Bonne") ? "success" : "error"}`}>
              {feedback}
            </div>
          ) : null}
        </section>
      </div>

      <div className="game-bottom-grid">
        <section className="section-card">
          <h2 className="section-title">Règle XP</h2>

          <ul className="bullet-list">
            <li>1 bonne réponse = 1 porte ouverte.</li>
            <li>10 portes ouvertes = niveau suivant.</li>
            <li>Indice utilisé : XP réduit pour cette porte.</li>
            <li>Erreur : la porte ne change pas.</li>
            <li>Les jeux changent à chaque porte pour éviter la répétition.</li>
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