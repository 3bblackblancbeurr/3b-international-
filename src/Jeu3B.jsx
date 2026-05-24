import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const OFFICIAL_COUNTRIES = [
  { name: "France", code: "FR", flag: "🇫🇷", capital: "Paris" },
  { name: "Italie", code: "IT", flag: "🇮🇹", capital: "Rome" },
  { name: "Estonie", code: "EE", flag: "🇪🇪", capital: "Tallinn" },
  { name: "Turquie", code: "TR", flag: "🇹🇷", capital: "Ankara" },
  { name: "Algérie", code: "DZ", flag: "🇩🇿", capital: "Alger" },
  { name: "Tunisie", code: "TN", flag: "🇹🇳", capital: "Tunis" },
  { name: "Maroc", code: "MA", flag: "🇲🇦", capital: "Rabat" },
  { name: "Espagne", code: "ES", flag: "🇪🇸", capital: "Madrid" },
];

const NON_OFFICIAL_COUNTRIES = [
  "Portugal",
  "Japon",
  "Brésil",
  "Canada",
  "Belgique",
  "Croatie",
  "Argentine",
  "Suisse",
];

const BRAND_WORDS = [
  "heritage",
  "luxe",
  "identite",
  "premium",
  "digital",
  "legacy",
  "creation",
  "international",
  "ambition",
  "passeport",
];

const BRAND_CLUES = [
  { answer: "heritage", clue: "Mot-clé de la phrase : « ce n’est pas une marque, c’est un ... »" },
  { answer: "luxe", clue: "Mot 3B lié au premium et au haut de gamme." },
  { answer: "digital", clue: "Le passeport 3B est un passeport ..." },
  { answer: "international", clue: "Le nom de la marque se termine par ce mot." },
  { answer: "identite", clue: "Le passeport 3B sert d’accès membre et d’... numérique." },
];

function normalizeValue(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function shuffleWithSeed(items, seed) {
  const array = [...items];
  let localSeed = seed || 1;

  function random() {
    localSeed = (localSeed * 9301 + 49297) % 233280;
    return localSeed / 233280;
  }

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pickSeeded(list, seed) {
  return list[seed % list.length];
}

function getDifficultyLabel(level) {
  if (level <= 10) return "Très facile";
  if (level <= 25) return "Facile";
  if (level <= 60) return "Moyen";
  if (level <= 120) return "Intermédiaire";
  if (level <= 250) return "Soutenu";
  return "Avancé";
}

function getStep(profile) {
  return (profile.level - 1) * 10 + profile.door;
}

function getUniquePrefix(answer, pool) {
  const normalizedPool = pool.map((item) => normalizeValue(item));
  const normalizedAnswer = normalizeValue(answer);

  for (let len = 2; len < normalizedAnswer.length; len += 1) {
    const prefix = normalizedAnswer.slice(0, len);
    const matches = normalizedPool.filter((value) => value.startsWith(prefix));
    if (matches.length === 1) {
      return answer.slice(0, len);
    }
  }

  return answer.slice(0, Math.max(3, answer.length - 2));
}

function scrambleWord(word, seed) {
  const letters = word.split("");
  const shuffled = shuffleWithSeed(letters, seed).join("");
  return shuffled === word ? letters.reverse().join("") : shuffled;
}

function buildCompleteQuestion(step) {
  const easyAnswers = [
    ...OFFICIAL_COUNTRIES.map((country) => country.name),
    ...BRAND_WORDS.slice(0, 5),
  ];
  const answer = pickSeeded(easyAnswers, step);
  const prefix = getUniquePrefix(answer, easyAnswers);
  const masked = `${prefix}${"_".repeat(Math.max(1, answer.length - prefix.length))}`;

  return {
    type: "complete",
    label: "Compléter",
    prompt: "Complète le mot manquant.",
    clueText: masked,
    answer,
    hint:
      OFFICIAL_COUNTRIES.find((country) => country.name === answer)?.capital
        ? `Indice : capitale liée = ${
            OFFICIAL_COUNTRIES.find((country) => country.name === answer)?.capital
          }.`
        : `Indice : le mot contient ${answer.length} caractères.`,
  };
}

function buildWriteQuestion(step) {
  const cluePool = [
    ...OFFICIAL_COUNTRIES.map((country) => ({
      answer: country.name,
      clue: `Écris le pays officiel 3B dont la capitale est ${country.capital}.`,
    })),
    ...BRAND_CLUES,
    {
      answer: "Tunisie",
      clue: "Écris le pays officiel 3B situé entre l’Algérie et la Libye.",
    },
    {
      answer: "Maroc",
      clue: "Écris le pays officiel 3B situé à l’ouest de l’Algérie.",
    },
  ];

  const item = pickSeeded(cluePool, step + 11);

  return {
    type: "write",
    label: "Écriture",
    prompt: item.clue,
    answer: item.answer,
    hint: `Indice : la réponse commence par « ${item.answer.slice(0, 2)} ».`,
  };
}

function buildQcmQuestion(step) {
  const country = pickSeeded(OFFICIAL_COUNTRIES, step + 21);
  const otherOptions = shuffleWithSeed(
    OFFICIAL_COUNTRIES.filter((item) => item.name !== country.name).map((item) => item.name),
    step + 22
  ).slice(0, 3);

  const options = shuffleWithSeed([country.name, ...otherOptions], step + 23);

  return {
    type: "qcm",
    label: "QCM",
    prompt: `Quel pays officiel 3B possède le code « ${country.code} » ?`,
    options,
    answer: country.name,
    hint: `Indice : sa capitale est ${country.capital}.`,
  };
}

function buildFlagQuestion(step) {
  const country = pickSeeded(OFFICIAL_COUNTRIES, step + 31);
  const otherOptions = shuffleWithSeed(
    OFFICIAL_COUNTRIES.filter((item) => item.name !== country.name).map((item) => item.name),
    step + 32
  ).slice(0, 3);

  const options = shuffleWithSeed([country.name, ...otherOptions], step + 33);

  return {
    type: "flag",
    label: "Choix",
    prompt: `Quel pays 3B correspond à ce drapeau : ${country.flag} ?`,
    options,
    answer: country.name,
    hint: `Indice : son code pays est ${country.code}.`,
  };
}

function buildAnagramQuestion(step) {
  const answer = pickSeeded(
    [...OFFICIAL_COUNTRIES.map((item) => item.name), ...BRAND_WORDS],
    step + 41
  );
  const mixed = scrambleWord(answer, step + 42);

  return {
    type: "anagram",
    label: "Mot mélangé",
    prompt: "Retrouve le bon mot à partir du mot mélangé.",
    clueText: mixed,
    answer,
    hint: `Indice : la réponse commence par « ${answer.slice(0, 2)} ».`,
  };
}

function buildIntruderQuestion(step) {
  const official = shuffleWithSeed(OFFICIAL_COUNTRIES.map((c) => c.name), step + 51).slice(0, 3);
  const intruder = pickSeeded(NON_OFFICIAL_COUNTRIES, step + 52);
  const options = shuffleWithSeed([...official, intruder], step + 53);

  return {
    type: "intruder",
    label: "Intrus",
    prompt: "Trouve l’intrus : quel mot ne fait pas partie des pays officiels 3B ?",
    options,
    answer: intruder,
    hint: "Indice : les autres mots sont tous des pays officiels 3B.",
  };
}

function buildAssociationQuestion(step) {
  const pairs = shuffleWithSeed(
    OFFICIAL_COUNTRIES.map((country) => ({ left: country.name, right: country.code })),
    step + 61
  ).slice(0, 4);

  return {
    type: "association",
    label: "Relier",
    prompt: "Relie chaque pays à son code.",
    pairs,
    hint: "Indice : FR = France, IT = Italie, etc.",
  };
}

function buildSequenceQuestion(step) {
  const patterns = [
    { prompt: "Trouve la suite : 1, 2, 3, ?", answer: "4", options: ["4", "5", "6", "8"] },
    { prompt: "Trouve la suite : 10, 20, 30, ?", answer: "40", options: ["25", "40", "50", "60"] },
    { prompt: "Trouve la suite : A, B, C, ?", answer: "D", options: ["D", "E", "F", "G"] },
    { prompt: "Trouve la suite : FR, IT, EE, ?", answer: "TR", options: ["TN", "TR", "DZ", "MA"] },
  ];

  const item = pickSeeded(patterns, step + 71);

  return {
    type: "sequence",
    label: "Suite logique",
    prompt: item.prompt,
    options: item.options,
    answer: item.answer,
    hint: "Indice : observe la logique de progression.",
  };
}

function buildCodeQuestion(step) {
  const item = pickSeeded(OFFICIAL_COUNTRIES, step + 81);

  return {
    type: "code",
    label: "Code secret",
    prompt: `Quel est le code pays officiel 3B de ${item.name} ?`,
    answer: item.code,
    hint: `Indice : la réponse contient ${item.code.length} lettres.`,
  };
}

function buildCrossQuestion(step) {
  const item = pickSeeded(
    [
      { answer: "Madrid", clue: "Mot croisé : capitale de l’Espagne." },
      { answer: "Rabat", clue: "Mot croisé : capitale du Maroc." },
      { answer: "Alger", clue: "Mot croisé : capitale de l’Algérie." },
      { answer: "Paris", clue: "Mot croisé : capitale de la France." },
      { answer: "Rome", clue: "Mot croisé : capitale de l’Italie." },
    ],
    step + 91
  );

  return {
    type: "cross",
    label: "Mot croisé",
    prompt: item.clue,
    answer: item.answer,
    hint: `Indice : la réponse commence par « ${item.answer.slice(0, 1)} ».`,
  };
}

function buildArrowQuestion(step) {
  const item = pickSeeded(
    [
      { answer: "Tunisie", clue: "Mot fléché : pays officiel 3B dont la capitale est Tunis." },
      { answer: "Turquie", clue: "Mot fléché : pays officiel 3B dont la capitale est Ankara." },
      { answer: "Estonie", clue: "Mot fléché : pays officiel 3B dont la capitale est Tallinn." },
      { answer: "France", clue: "Mot fléché : pays officiel 3B dont la capitale est Paris." },
    ],
    step + 101
  );

  return {
    type: "arrow",
    label: "Mot fléché",
    prompt: item.clue,
    answer: item.answer,
    hint: `Indice : le mot contient ${item.answer.length} caractères.`,
  };
}

function availableGameBuilders(step) {
  if (step <= 12) {
    return [buildCompleteQuestion, buildWriteQuestion, buildQcmQuestion, buildFlagQuestion];
  }
  if (step <= 30) {
    return [
      buildCompleteQuestion,
      buildWriteQuestion,
      buildQcmQuestion,
      buildFlagQuestion,
      buildAnagramQuestion,
      buildIntruderQuestion,
      buildCodeQuestion,
    ];
  }
  return [
    buildCompleteQuestion,
    buildWriteQuestion,
    buildQcmQuestion,
    buildFlagQuestion,
    buildAnagramQuestion,
    buildIntruderQuestion,
    buildAssociationQuestion,
    buildSequenceQuestion,
    buildCodeQuestion,
    buildCrossQuestion,
    buildArrowQuestion,
  ];
}

function createRound(profile) {
  const step = getStep(profile);
  const builders = availableGameBuilders(step);
  const builder = builders[step % builders.length];
  const round = builder(step);

  return {
    id: `round-${profile.level}-${profile.door}-${round.type}-${step}`,
    ...round,
  };
}

function formatDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function Feedback({ feedback }) {
  if (!feedback) return null;
  return <div className={`feedback-box ${feedback.type}`}>{feedback.text}</div>;
}

export default function Jeu3B({ member, gameProfile, setGameProfile, onBack }) {
  const [round, setRound] = useState(() => createRound(gameProfile));
  const [textAnswer, setTextAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintAlreadyCounted, setHintAlreadyCounted] = useState(false);
  const [leftChoice, setLeftChoice] = useState(null);
  const [rightChoice, setRightChoice] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]);

  const difficulty = useMemo(() => getDifficultyLabel(gameProfile.level), [gameProfile.level]);

  useEffect(() => {
    setRound(createRound(gameProfile));
    setTextAnswer("");
    setFeedback(null);
    setHintVisible(false);
    setHintAlreadyCounted(false);
    setLeftChoice(null);
    setRightChoice(null);
    setMatchedPairs([]);
  }, [gameProfile.level, gameProfile.door]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGameProfile((prev) => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
    }, 1000);

    return () => clearInterval(interval);
  }, [setGameProfile]);

  const progressInsideDoor = Number((((gameProfile.door - 1) / 10) * 100).toFixed(0));

  const markHint = () => {
    setHintVisible(true);
    if (!hintAlreadyCounted) {
      setHintAlreadyCounted(true);
      setGameProfile((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
    }
  };

  const failRound = () => {
    setFeedback({
      type: "error",
      text: "Mauvaise réponse. Réessaie, la porte ne change pas.",
    });

    setGameProfile((prev) => ({
      ...prev,
      wrongAnswers: prev.wrongAnswers + 1,
      streak: 0,
    }));
  };

  const validateSuccess = () => {
    const xpBase = 12 + Math.floor((gameProfile.level - 1) / 15) * 2;
    const xpGain = Math.max(6, xpBase - (hintAlreadyCounted ? 4 : 0));

    setFeedback({
      type: "success",
      text: `Bonne réponse ! +${xpGain} XP — porte suivante déverrouillée.`,
    });

    setTimeout(() => {
      setGameProfile((prev) => {
        const isDoorComplete = prev.door >= 10;
        const nextLevel = isDoorComplete ? Math.min(1000, prev.level + 1) : prev.level;
        const nextDoor = isDoorComplete ? 1 : prev.door + 1;
        const completedDoors = (nextLevel - 1) * 10 + (nextDoor - 1);
        const totalPercent = Number(((completedDoors / 10000) * 100).toFixed(2));

        return {
          ...prev,
          level: nextLevel,
          door: nextDoor,
          xp: prev.xp + xpGain,
          correctAnswers: prev.correctAnswers + 1,
          streak: prev.streak + 1,
          bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
          totalPercent,
        };
      });
    }, 650);
  };

  const submitText = () => {
    const expected = normalizeValue(round.answer);
    const received = normalizeValue(textAnswer);

    if (!received) return;

    if (received === expected) {
      validateSuccess();
    } else {
      failRound();
    }
  };

  const clickChoice = (option) => {
    const expected = normalizeValue(round.answer);
    const received = normalizeValue(option);

    if (received === expected) {
      validateSuccess();
    } else {
      failRound();
    }
  };

  const handlePair = () => {
    if (!leftChoice || !rightChoice) return;

    const pairIsCorrect = round.pairs.some(
      (pair) => pair.left === leftChoice && pair.right === rightChoice
    );

    if (!pairIsCorrect) {
      failRound();
      return;
    }

    const exists = matchedPairs.some(
      (pair) => pair.left === leftChoice && pair.right === rightChoice
    );

    if (!exists) {
      const nextPairs = [...matchedPairs, { left: leftChoice, right: rightChoice }];
      setMatchedPairs(nextPairs);

      if (nextPairs.length === round.pairs.length) {
        validateSuccess();
      } else {
        setFeedback({
          type: "success",
          text: "Association validée. Continue pour terminer la porte.",
        });
      }
    }

    setLeftChoice(null);
    setRightChoice(null);
  };

  const resetGame = () => {
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
  };

  const matchedLeft = matchedPairs.map((pair) => pair.left);
  const matchedRight = matchedPairs.map((pair) => pair.right);

  const renderActionContent = () => {
    if (["complete", "write", "anagram", "code", "cross", "arrow"].includes(round.type)) {
      return (
        <div className="answer-block">
          <input
            className="text-input game-answer-input"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Écris ta réponse"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitText();
            }}
          />

          <div className="button-row">
            <button className="gold-button" onClick={submitText}>
              Valider
            </button>
            <button className="blue-button" onClick={markHint}>
              Indice
            </button>
          </div>

          {hintVisible ? <div className="hint-box">{round.hint}</div> : null}
          <Feedback feedback={feedback} />
        </div>
      );
    }

    if (["qcm", "flag", "intruder", "sequence"].includes(round.type)) {
      return (
        <div className="answer-block">
          <div className="choice-grid">
            {round.options.map((option) => (
              <button
                key={option}
                className="choice-button"
                onClick={() => clickChoice(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="button-row">
            <button className="blue-button" onClick={markHint}>
              Indice
            </button>
          </div>

          {hintVisible ? <div className="hint-box">{round.hint}</div> : null}
          <Feedback feedback={feedback} />
        </div>
      );
    }

    if (round.type === "association") {
      const leftItems = round.pairs.map((pair) => pair.left);
      const rightItems = shuffleWithSeed(round.pairs.map((pair) => pair.right), getStep(gameProfile) + 99);

      return (
        <div className="answer-block">
          <div className="association-grid">
            <div>
              <div className="association-title">Colonne gauche</div>
              <div className="association-list">
                {leftItems.map((item) => (
                  <button
                    key={item}
                    className={`choice-button small ${leftChoice === item ? "selected" : ""}`}
                    onClick={() => setLeftChoice(item)}
                    disabled={matchedLeft.includes(item)}
                  >
                    {matchedLeft.includes(item) ? `✓ ${item}` : item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="association-title">Colonne droite</div>
              <div className="association-list">
                {rightItems.map((item) => (
                  <button
                    key={item}
                    className={`choice-button small ${rightChoice === item ? "selected" : ""}`}
                    onClick={() => setRightChoice(item)}
                    disabled={matchedRight.includes(item)}
                  >
                    {matchedRight.includes(item) ? `✓ ${item}` : item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="button-row">
            <button className="gold-button" onClick={handlePair}>
              Associer
            </button>
            <button className="blue-button" onClick={markHint}>
              Indice
            </button>
          </div>

          {hintVisible ? <div className="hint-box">{round.hint}</div> : null}
          <Feedback feedback={feedback} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="page">
      <button className="back-button" onClick={onBack}>
        ← Retour
      </button>

      <div className="play-header-row">
        <div>
          <div className="page-eyebrow">3B INTERNATIONAL</div>
          <h1 className="page-title">Porte {gameProfile.door} — {round.label}</h1>
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
        <SectionCard title="Progression porte">
          <div className="progress-ring-shell">
            <div className="progress-ring" style={{ "--progress": `${progressInsideDoor}%` }}>
              <div className="progress-ring-inner">{progressInsideDoor}%</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Niveau / porte">
          <div className="stats-compact">
            <div>Niveau {gameProfile.level} / 1000</div>
            <div>Porte {gameProfile.door} / 10</div>
            <div>Difficulté : {difficulty}</div>
          </div>
        </SectionCard>

        <SectionCard title="XP et temps">
          <div className="stats-compact">
            <div>XP jeu : {gameProfile.xp}</div>
            <div>Série : {gameProfile.streak}</div>
            <div>Temps : {formatDuration(gameProfile.elapsedSeconds)}</div>
          </div>
        </SectionCard>
      </div>

      <div className="game-main-grid">
        <SectionCard title="Mission de la porte" className="mission-card">
          <div className="game-mode-pill">{round.label}</div>
          <div className="mission-main-text">{round.prompt}</div>
          {round.clueText ? <div className="mission-emphasis">{round.clueText}</div> : null}
        </SectionCard>

        <SectionCard title="Réponse" className="answer-card">
          {renderActionContent()}
        </SectionCard>
      </div>

      <div className="game-bottom-grid">
        <SectionCard title="Règle XP">
          <ul className="bullet-list">
            <li>Bonne réponse : XP gagné + porte suivante.</li>
            <li>Indice utilisé : XP réduit pour cette porte.</li>
            <li>Erreur : la porte ne change pas.</li>
            <li>Après 10 portes validées, tu passes au niveau suivant.</li>
            <li>La difficulté augmente progressivement avec l’avancement.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Statut joueur">
          <div className="info-list">
            <div><span>Mode</span><strong>{member ? "Membre 3B" : "Invité"}</strong></div>
            <div><span>Nom</span><strong>{member?.name || "Invité"}</strong></div>
            <div><span>Meilleure série</span><strong>{gameProfile.bestStreak}</strong></div>
            <div><span>Réponses validées</span><strong>{gameProfile.correctAnswers}</strong></div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}