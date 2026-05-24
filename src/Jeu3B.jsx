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

const COUNTRY_XP_BONUS = {
  France: { xp: 2, label: "Héritage France 3B" },
  Italie: { xp: 2, label: "Salon Invité Italie" },
  Estonie: { xp: 2, label: "Digital Tech 3B" },
  Turquie: { xp: 2, label: "Force & Détermination" },
  Algérie: { xp: 2, label: "Fennec Focus" },
  Tunisie: { xp: 2, label: "Précision Carthage" },
  Maroc: { xp: 2, label: "Lion Atlas 3B" },
  Espagne: { xp: 2, label: "Arène Créative" },
};

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
  "classement",
  "niveau",
  "porte",
  "origine",
  "famille",
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
    skippedQuestions: Number(gameProfile?.skippedQuestions) || 0,
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

function betterWordHints(word, label = "mot") {
  const clean = normalize(word);
  const upper = clean.toUpperCase();
  const middle = upper[Math.floor(upper.length / 2)] || "";

  return [
    `Indice 1 : ce ${label} fait ${upper.length} lettres et commence par ${upper[0]}.`,
    `Indice 2 : ce ${label} finit par ${upper[upper.length - 1]} et contient la lettre ${middle}.`,
    `Indice 3 : les lettres utiles sont ${upper.slice(0, 2)} ... ${upper.slice(-2)}.`,
  ];
}

function countryHints(country) {
  return [
    `Indice 1 : ${country.flag} c’est un des 8 pays officiels 3B.`,
    `Indice 2 : sa capitale est ${country.capital}.`,
    `Indice 3 : son code pays est ${country.code}.`,
  ];
}

function buildSimpleCrosswordGrid(answer, seed) {
  const main = normalize(answer).toUpperCase();
  const helperWords = shuffle(
    ["BLACK", "BLANC", "BEUR", "LOGO", "DROP", "LUXE", "CARTE", "MONDE", "MEMBRE", "SALON", "PAYS", "PORTE"],
    seed
  )
    .filter((word) => word !== main)
    .slice(0, 4);

  const rows = 9;
  const cols = 13;
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: "empty",
      letter: "",
      hidden: false,
      clue: "",
    }))
  );

  const mainRow = 4;
  const startCol = Math.max(1, Math.floor((cols - main.length) / 2));

  Array.from(main).forEach((letter, index) => {
    grid[mainRow][startCol + index] = {
      type: "letter",
      letter,
      hidden: index !== 0 && index !== main.length - 1,
      clue: "",
    };
  });

  helperWords.forEach((word, helperIndex) => {
    const crossIndex = Math.min(main.length - 2, Math.max(1, helperIndex + 1));
    const crossCol = startCol + crossIndex;
    const crossLetter = main[crossIndex];
    const wordLetters = Array.from(word);
    let matchIndex = wordLetters.findIndex((letter) => letter === crossLetter);

    if (matchIndex < 0) matchIndex = Math.floor(wordLetters.length / 2);

    const startRow = Math.max(0, Math.min(mainRow - matchIndex, rows - wordLetters.length));

    wordLetters.forEach((letter, index) => {
      const row = startRow + index;
      if (row < 0 || row >= rows) return;

      const alreadyLetter = grid[row][crossCol].type === "letter";

      grid[row][crossCol] = {
        type: "letter",
        letter: alreadyLetter ? grid[row][crossCol].letter : letter,
        hidden: alreadyLetter ? false : index !== 0 && index !== wordLetters.length - 1,
        clue: "",
      };
    });
  });

  return grid;
}

function buildArrowGrid(answer, seed) {
  const main = normalize(answer).toUpperCase();
  const helperWords = shuffle(
    ["BLACK", "BLANC", "BEUR", "LOGO", "DROP", "LUXE", "CARTE", "MONDE", "MEMBRE", "SALON"],
    seed
  )
    .filter((word) => word !== main)
    .slice(0, 4);

  const rows = 9;
  const cols = 12;

  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: "empty",
      letter: "",
      clue: "",
      hidden: false,
    }))
  );

  const startCol = Math.max(1, Math.floor((cols - main.length) / 2));
  const mainRow = 4;

  grid[mainRow][startCol - 1] = {
    type: "clue",
    letter: "",
    clue: "Mot →",
    hidden: false,
  };

  Array.from(main).forEach((letter, index) => {
    grid[mainRow][startCol + index] = {
      type: "letter",
      letter,
      clue: "",
      hidden: index !== 0 && index !== main.length - 1,
    };
  });

  helperWords.forEach((word, wordIndex) => {
    const crossIndex = Math.min(main.length - 2, Math.max(1, wordIndex + 1));
    const crossCol = startCol + crossIndex;
    const crossLetter = main[crossIndex];
    const wordLetters = Array.from(word);
    let matchingIndex = wordLetters.findIndex((letter) => letter === crossLetter);

    if (matchingIndex < 0) matchingIndex = Math.floor(word.length / 2);

    const startRow = Math.max(0, mainRow - matchingIndex);
    const safeStartRow = Math.min(startRow, rows - word.length);

    if (safeStartRow < 0) return;

    const clueRow = Math.max(0, safeStartRow - 1);

    grid[clueRow][crossCol] = {
      type: "clue",
      letter: "",
      clue: "↓",
      hidden: false,
    };

    wordLetters.forEach((letter, index) => {
      const row = safeStartRow + index;
      if (row < 0 || row >= rows) return;

      const alreadyMain = grid[row][crossCol].type === "letter";

      grid[row][crossCol] = {
        type: "letter",
        letter: alreadyMain ? grid[row][crossCol].letter : letter,
        clue: "",
        hidden: alreadyMain ? false : index !== 0 && index !== word.length - 1,
      };
    });
  });

  return grid;
}

function buildConnectPairs(step) {
  const first = COUNTRIES[seededIndex(step + 7, COUNTRIES.length)];
  let second = COUNTRIES[seededIndex(step + 19, COUNTRIES.length)];

  if (normalize(first.name) === normalize(second.name)) {
    second = COUNTRIES[(COUNTRIES.indexOf(first) + 1) % COUNTRIES.length];
  }

  const pairs = [
    { country: first.name, capital: first.capital, flag: first.flag },
    { country: second.name, capital: second.capital, flag: second.flag },
  ];

  return {
    pairs,
    leftItems: pairs.map((pair) => `${pair.flag} ${pair.country}`),
    rightItems: shuffle(pairs.map((pair) => pair.capital), step + 77),
    answer: pairs
      .map((pair) => `${normalize(pair.country)}:${normalize(pair.capital)}`)
      .sort()
      .join("|"),
  };
}

function buildRound(game) {
  const step = game.correctAnswers + game.skippedQuestions + 1;
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
      hints: countryHints(country),
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
      hints: countryHints(country),
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
      hints: betterWordHints(word, "mot mélangé"),
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
      hints: countryHints(country),
    };
  }

  if (mode === "Relier gauche droite") {
    const connectData = buildConnectPairs(step);

    return {
      mode,
      visual: "connect",
      title: "Relier gauche / droite",
      instruction:
        "Relie les 2 pays aux 2 bonnes capitales. La validation se fait seulement quand les 2 liens sont faits.",
      question: "Relie chaque pays à sa capitale.",
      answer: connectData.answer,
      pairs: connectData.pairs,
      leftItems: connectData.leftItems,
      rightItems: connectData.rightItems,
      hints: [
        `Indice 1 : fais exactement ${connectData.pairs.length} liens.`,
        "Indice 2 : pays à gauche, capitale à droite.",
        `Indice 3 : une capitale correcte dans cette mission est ${connectData.pairs[0].capital}.`,
      ],
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
      hints: [
        "Indice 1 : c’est le troisième mot de la formule.",
        "Indice 2 : BLACK • BLANC • BEUR.",
        "Indice 3 : la réponse commence par B et finit par R.",
      ],
    };
  }

  if (mode === "Mot croisé") {
    return {
      mode,
      visual: "crossword",
      title: "Mot croisé",
      instruction: "Lis la vraie grille croisée et trouve le mot principal horizontal.",
      question: `Définition : pays 3B, capitale ${country.capital}.`,
      answer: country.name,
      crosswordGrid: buildSimpleCrosswordGrid(country.name, step + 44),
      hints: countryHints(country),
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
      hints: countryHints(country),
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
      hints: countryHints(country),
    };
  }

  if (mode === "Mot fléché") {
    const answer = word;

    return {
      mode,
      visual: "arrow",
      title: "Mot fléché",
      instruction:
        "Observe la vraie grille : plusieurs mots se croisent. Trouve le mot principal horizontal.",
      question: "Mot principal horizontal",
      answer,
      arrowGrid: buildArrowGrid(answer, step + 90),
      hints: betterWordHints(answer, "mot principal horizontal"),
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
      hints: [
        "Indice 1 : les 8 pays officiels sont France, Italie, Estonie, Turquie, Algérie, Tunisie, Maroc, Espagne.",
        "Indice 2 : l’intrus n’est pas dans cette liste officielle.",
        `Indice 3 : l’intrus commence par ${intruder.slice(0, 1)}.`,
      ],
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
      hints: countryHints(country),
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
      hints: betterWordHints(item.a, "réponse"),
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
      hints: [
        "Indice 1 : c’est un mot très important dans ton slogan.",
        "Indice 2 : ce mot commence par H.",
        "Indice 3 : ce n’est pas une marque, c’est un héritage.",
      ],
    };
  }

  return {
    mode: "Écriture",
    visual: "write",
    title: "Écriture",
    instruction: "Écris le bon mot.",
    question: `Écris le mot lié à 3B : ${brandWord2.slice(0, 2)}...`,
    answer: brandWord2,
    hints: betterWordHints(brandWord2, "mot"),
  };
}

function ConnectGame({ round, validate }) {
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [links, setLinks] = useState([]);

  const cleanLeftName = (item) => item.replace(/^[^\wÀ-ÿ]+/u, "").trim();
  const isLeftUsed = (left) => links.some((link) => link.left === left);
  const isRightUsed = (right) => links.some((link) => link.right === right);

  const handleLeft = (left) => {
    if (isLeftUsed(left)) return;
    setSelectedLeft(left);
  };

  const handleRight = (right) => {
    if (!selectedLeft || isRightUsed(right)) return;

    const nextLinks = [...links, { left: selectedLeft, right }];
    setLinks(nextLinks);
    setSelectedLeft(null);

    if (nextLinks.length === round.pairs.length) {
      const builtAnswer = nextLinks
        .map((link) => `${normalize(cleanLeftName(link.left))}:${normalize(link.right)}`)
        .sort()
        .join("|");

      setTimeout(() => {
        validate(builtAnswer === round.answer ? round.answer : "__mauvais_lien__");
      }, 300);
    }
  };

  const resetLinks = () => {
    setSelectedLeft(null);
    setLinks([]);
  };

  return (
    <div className="connect-real-game">
      <div className="connect-columns">
        <div className="connect-column">
          <div className="connect-title-mini">Pays</div>

          {round.leftItems.map((item) => (
            <button
              key={item}
              className={[
                "connect-node",
                selectedLeft === item ? "selected" : "",
                isLeftUsed(item) ? "used" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleLeft(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="connect-link-preview">
          {links.length === 0 ? (
            <span>Choisis un pays puis une capitale</span>
          ) : (
            links.map((link, index) => (
              <div className="connect-made-line" key={`${link.left}-${link.right}`}>
                <span>{index + 1}</span>
                <strong>{link.left}</strong>
                <em>→</em>
                <strong>{link.right}</strong>
              </div>
            ))
          )}
        </div>

        <div className="connect-column">
          <div className="connect-title-mini">Capitales</div>

          {round.rightItems.map((item) => (
            <button
              key={item}
              className={["connect-node", isRightUsed(item) ? "used" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleRight(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="connect-progress">
        Liens faits : {links.length} / {round.pairs.length}
      </div>

      <button className="small-outline-btn" onClick={resetLinks}>
        Recommencer les liens
      </button>
    </div>
  );
}

function GridGame({ grid, title, note }) {
  return (
    <div className="arrow-grid-game">
      <div className="arrow-grid-title">{title}</div>

      <div className="arrow-grid">
        {grid.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;

            if (cell.type === "empty") {
              return <div className="arrow-cell empty" key={key} />;
            }

            if (cell.type === "clue") {
              return (
                <div className="arrow-cell clue" key={key}>
                  {cell.clue}
                </div>
              );
            }

            return (
              <div className="arrow-cell letter" key={key}>
                {cell.hidden ? "" : cell.letter}
              </div>
            );
          })
        )}
      </div>

      <div className="arrow-grid-note">{note}</div>
    </div>
  );
}

function GameVisual({ round, validate }) {
  if (round.visual === "qcm" || round.visual === "flag" || round.visual === "intruder") {
    return (
      <div className="choice-grid">
        {round.options.map((option) => (
          <button key={option} className="choice-button" onClick={() => validate(option)}>
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
          <button key={option} className="memory-card" onClick={() => validate(option)}>
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
          <button key={option} className="association-card" onClick={() => validate(option)}>
            <span>Carte</span>
            <strong>{option}</strong>
          </button>
        ))}
      </div>
    );
  }

  if (round.visual === "connect") {
    return <ConnectGame round={round} validate={validate} />;
  }

  if (round.visual === "crossword") {
    return (
      <GridGame
        grid={round.crosswordGrid}
        title="Vraie grille mot croisé"
        note="Le mot principal est horizontal. Les mots verticaux se croisent avec lui."
      />
    );
  }

  if (round.visual === "arrow") {
    return (
      <GridGame
        grid={round.arrowGrid}
        title="Grille mots fléchés 3B"
        note="Le mot principal est horizontal. Les mots verticaux le croisent."
      />
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
    [game.level, game.door, game.correctAnswers, game.skippedQuestions]
  );

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hintCount, setHintCount] = useState(0);
  const [hintUsedThisRound, setHintUsedThisRound] = useState(false);

  useEffect(() => {
    setAnswer("");
    setFeedback("");
    setHintCount(0);
    setHintUsedThisRound(false);
  }, [game.level, game.door, game.correctAnswers, game.skippedQuestions]);

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

  function goNextQuestionWithoutDoor() {
    setFeedback("Nouvelle question. La porte ne change pas.");

    setTimeout(() => {
      setGameProfile((prev) => {
        const current = safeGame(prev);

        return {
          ...current,
          skippedQuestions: current.skippedQuestions + 1,
          wrongAnswers: current.wrongAnswers + 1,
          streak: 0,
        };
      });
    }, 500);
  }

  function useHint() {
    if (hintCount >= 3) {
      goNextQuestionWithoutDoor();
      return;
    }

    setHintCount((prev) => prev + 1);

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

    if (round.visual === "connect") {
      if (value !== round.answer) {
        setFeedback("Mauvais liens. Réessaie, la porte ne change pas.");

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
    } else if (userValue !== correctValue) {
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
    const countryBonus = member?.originCountry ? COUNTRY_XP_BONUS[member.originCountry] : null;
    const countryXp = countryBonus?.xp || 0;
    const gainBeforeHint = baseXp + countryXp;
    const gain = hintUsedThisRound ? Math.max(4, gainBeforeHint - 4) : gainBeforeHint;

    setFeedback(
      countryBonus
        ? `Bonne réponse. +${gain} XP avec bonus ${countryBonus.label}. Porte suivante.`
        : `Bonne réponse. +${gain} XP. Porte suivante.`
    );

    setTimeout(() => {
      setGameProfile((prev) => {
        const current = safeGame(prev);
        const newCorrectAnswers = current.correctAnswers + 1;

        const nextLevel = Math.min(1000, Math.floor(newCorrectAnswers / 10) + 1);
        const nextDoor =
          newCorrectAnswers % 10 === 0 ? 1 : (newCorrectAnswers % 10) + 1;

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
      skippedQuestions: 0,
      hintsUsed: 0,
      elapsedSeconds: 0,
      totalPercent: 0,
      lastMode: member ? "membre" : "invité",
    });
  }

  const completedDoorsThisLevel = game.correctAnswers % 10;
  const doorPercent = completedDoorsThisLevel * 10;
  const countryBonus = member?.originCountry ? COUNTRY_XP_BONUS[member.originCountry] : null;

  const needsTextInput = ![
    "qcm",
    "flag",
    "intruder",
    "memory",
    "association",
    "connect",
  ].includes(round.visual);

  const visibleHints = round.hints ? round.hints.slice(0, hintCount) : [];

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
            1 bonne réponse = 1 porte ouverte. 10 portes ouvertes = niveau suivant.
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
            {countryBonus ? (
              <div>
                Bonus : {countryBonus.label} (+{countryBonus.xp} XP)
              </div>
            ) : null}
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
            {["qcm", "flag", "intruder", "memory", "association", "connect"].includes(
              round.visual
            )
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
                  {hintCount >= 3 ? "Nouvelle question" : "Indice"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="soft-text">Clique directement dans la mission pour jouer.</p>

              <div className="button-row">
                <button className="blue-button" onClick={useHint}>
                  {hintCount >= 3 ? "Nouvelle question" : "Indice"}
                </button>
              </div>
            </>
          )}

          {visibleHints.length > 0 ? (
            <div className="hint-stack">
              {visibleHints.map((hint, index) => (
                <div className="hint-box" key={`${hint}-${index}`}>
                  {hint}
                </div>
              ))}

              {hintCount >= 3 ? (
                <div className="hint-box">
                  Tu as utilisé les 3 indices. Le prochain clic passe à une nouvelle question sans ouvrir la porte.
                </div>
              ) : null}
            </div>
          ) : null}

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
            <li>Après 3 indices : nouvelle question sans porte ouverte.</li>
            <li>Bonus pays d’origine : +2 XP si ton passeport est actif.</li>
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

            <div>
              <span>Questions passées</span>
              <strong>{game.skippedQuestions}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}