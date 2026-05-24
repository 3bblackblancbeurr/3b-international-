import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORAGE_KEY = "3b_jeu_progression_v1";
const RANKING_KEY = "3b_jeu_classement_v1";

const WORDS_3B = [
  "heritage", "identite", "ambition", "creation", "premium", "international",
  "secret", "passeport", "musique", "maillot", "prototype", "communaute",
  "atelier", "salon", "couture", "luxury", "origine", "residence",
  "france", "italie", "estonie", "turquie", "algerie", "tunisie", "maroc", "espagne",
  "black", "blanc", "beur", "legacy", "elite", "gardien", "legende", "drop",
  "certificat", "authenticite", "membre", "niveau", "porte", "victoire"
];

const THEMES = [
  "ADN 3B",
  "Pays 3B",
  "Musique 3B",
  "Mode luxe",
  "Coffre secret",
  "Passeport 3B",
  "Jeux 3B",
  "International",
  "Cartes 3B",
  "Prototype 3B",
];

const COUNTRIES = [
  { name: "France", flag: "🇫🇷", key: "france" },
  { name: "Italie", flag: "🇮🇹", key: "italie" },
  { name: "Estonie", flag: "🇪🇪", key: "estonie" },
  { name: "Turquie", flag: "🇹🇷", key: "turquie" },
  { name: "Algérie", flag: "🇩🇿", key: "algerie" },
  { name: "Tunisie", flag: "🇹🇳", key: "tunisie" },
  { name: "Maroc", flag: "🇲🇦", key: "maroc" },
  { name: "Espagne", flag: "🇪🇸", key: "espagne" },
];

const GAME_TYPES = [
  "write",
  "anagram",
  "choice",
  "intruder",
  "missing",
  "firstLetter",
  "lastLetter",
  "synonym",
  "flagToCountry",
  "countryToFlag",
  "completePhrase",
  "multiSelect",
  "memory",
  "order",
  "pairing",
  "grid",
  "secretCode",
  "avoidTrap",
  "quickChoice",
  "boss",
];

const SYNONYMS = [
  { word: "luxe", answer: "premium", wrong: ["faible", "copie", "banal"] },
  { word: "heritage", answer: "legacy", wrong: ["hasard", "oubli", "pause"] },
  { word: "identite", answer: "origine", wrong: ["vide", "retard", "erreur"] },
  { word: "creation", answer: "prototype", wrong: ["destruction", "silence", "retour"] },
  { word: "international", answer: "monde", wrong: ["local", "ferme", "petit"] },
];

const PHRASES = [
  { text: "Ce n'est pas une marque, c'est un ____.", answer: "heritage" },
  { text: "3B International avance de zéro à ____.", answer: "international" },
  { text: "Le coffre secret débloque un ____.", answer: "indice" },
  { text: "Le passeport 3B garde l'identité du ____.", answer: "membre" },
  { text: "Le QR code servira au ____ produit.", answer: "certificat" },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function seededNumber(level, door, offset = 0) {
  const x = Math.sin(level * 999 + door * 111 + offset * 77) * 10000;
  return Math.abs(Math.floor(x));
}

function pick(arr, level, door, offset = 0) {
  return arr[seededNumber(level, door, offset) % arr.length];
}

function shuffleDeterministic(arr, level, door) {
  const copy = [...arr];
  return copy
    .map((item, index) => ({
      item,
      sort: seededNumber(level, door, index + 1),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map((x) => x.item);
}

function scramble(word, level, door) {
  const letters = word.split("");
  return shuffleDeterministic(letters, level, door).join("");
}

function getDifficulty(level, door) {
  const base = Math.min(100, Math.floor(level / 10) + door);
  return Math.max(1, base);
}

function getXpReward(level, door, usedHint, wrongCount) {
  const base = 1 + Math.floor(level / 80);
  const bossBonus = door === 10 ? 3 : 0;
  const difficultyBonus = Math.floor(getDifficulty(level, door) / 25);
  let reward = base + bossBonus + difficultyBonus;

  if (usedHint) reward = Math.max(1, reward - 1);
  if (wrongCount > 0) reward = Math.max(1, reward - wrongCount);

  return reward;
}

function getLevelTitle(level) {
  if (level < 50) return "Découverte";
  if (level < 150) return "Héritier";
  if (level < 300) return "Gardien";
  if (level < 600) return "Élite";
  if (level < 850) return "Légende";
  return "Legacy 3B";
}

function getDefaultProgress() {
  return {
    level: 1,
    door: 1,
    totalXp: 0,
    usedHint: false,
    wrongCount: 0,
    startedAt: Date.now(),
    lastUpdate: Date.now(),
    completedDoors: 0,
    completedLevels: 0,
  };
}

function loadProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return getDefaultProgress();
    return { ...getDefaultProgress(), ...JSON.parse(saved) };
  } catch {
    return getDefaultProgress();
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function loadRanking() {
  try {
    const saved = localStorage.getItem(RANKING_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}

  return [
    {
      name: "Zakaria",
      level: 1,
      door: 7,
      xp: 6,
      speed: "Rapide",
      duration: "00:06:20",
    },
    {
      name: "Membre 3B",
      level: 1,
      door: 3,
      xp: 2,
      speed: "Normal",
      duration: "00:03:10",
    },
    {
      name: "3B Elite",
      level: 1,
      door: 1,
      xp: 0,
      speed: "Départ",
      duration: "00:00:00",
    },
  ];
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function getSpeed(durationMs, completedDoors) {
  if (completedDoors <= 0) return "Départ";
  const secondsPerDoor = durationMs / 1000 / completedDoors;
  if (secondsPerDoor < 20) return "Très rapide";
  if (secondsPerDoor < 45) return "Rapide";
  if (secondsPerDoor < 90) return "Normal";
  return "Réfléchi";
}

function generateQuestion(level, door) {
  const type = GAME_TYPES[(level * 10 + door + level) % GAME_TYPES.length];
  const word = pick(WORDS_3B, level, door, 1);
  const word2 = pick(WORDS_3B, level, door, 2);
  const word3 = pick(WORDS_3B, level, door, 3);
  const country = pick(COUNTRIES, level, door, 4);
  const country2 = pick(COUNTRIES, level, door, 5);
  const theme = pick(THEMES, level, door, 6);

  const common = {
    type,
    family: theme,
    hint: `Indice 3B : pense à ${theme.toLowerCase()}.`,
  };

  if (type === "write") {
    return {
      ...common,
      title: "Mot à écrire",
      instruction: `Écris le mot lié à l’univers 3B : ${word.toUpperCase()}.`,
      answer: word,
      input: true,
    };
  }

  if (type === "anagram") {
    return {
      ...common,
      title: "Mot mélangé",
      instruction: `Remets les lettres dans l’ordre : ${scramble(word, level, door)}.`,
      answer: word,
      input: true,
    };
  }

  if (type === "choice") {
    const options = shuffleDeterministic([word, word2, word3, "faible"], level, door);
    return {
      ...common,
      title: "Choix tactile",
      instruction: "Choisis le mot qui appartient le mieux à l’univers 3B.",
      answer: word,
      options,
    };
  }

  if (type === "intruder") {
    const options = shuffleDeterministic([word, word2, word3, "poubelle"], level, door);
    return {
      ...common,
      title: "Intrus",
      instruction: "Trouve le mot qui ne correspond pas à 3B.",
      answer: "poubelle",
      options,
    };
  }

  if (type === "missing") {
    const pos = Math.min(word.length - 1, Math.max(1, seededNumber(level, door, 2) % word.length));
    const missing = word[pos];
    const hidden = word.slice(0, pos) + "_" + word.slice(pos + 1);
    return {
      ...common,
      title: "Lettre manquante",
      instruction: `Trouve la lettre manquante : ${hidden}.`,
      answer: missing,
      input: true,
    };
  }

  if (type === "firstLetter") {
    return {
      ...common,
      title: "Première lettre",
      instruction: `Quelle est la première lettre du mot : ${word.toUpperCase()} ?`,
      answer: word[0],
      input: true,
    };
  }

  if (type === "lastLetter") {
    return {
      ...common,
      title: "Dernière lettre",
      instruction: `Quelle est la dernière lettre du mot : ${word.toUpperCase()} ?`,
      answer: word[word.length - 1],
      input: true,
    };
  }

  if (type === "synonym") {
    const syn = pick(SYNONYMS, level, door, 7);
    return {
      ...common,
      title: "Synonyme 3B",
      instruction: `Choisis le mot le plus proche de : ${syn.word}.`,
      answer: syn.answer,
      options: shuffleDeterministic([syn.answer, ...syn.wrong], level, door),
    };
  }

  if (type === "flagToCountry") {
    return {
      ...common,
      title: "Drapeau vers pays",
      instruction: `Quel pays correspond à ce drapeau : ${country.flag} ?`,
      answer: country.name,
      options: shuffleDeterministic(
        [country.name, country2.name, "Portugal", "Allemagne"],
        level,
        door
      ),
    };
  }

  if (type === "countryToFlag") {
    return {
      ...common,
      title: "Pays vers drapeau",
      instruction: `Quel drapeau correspond à : ${country.name} ?`,
      answer: country.flag,
      options: shuffleDeterministic(
        [country.flag, country2.flag, "🇧🇷", "🇯🇵"],
        level,
        door
      ),
    };
  }

  if (type === "completePhrase") {
    const phrase = pick(PHRASES, level, door, 8);
    return {
      ...common,
      title: "Phrase à compléter",
      instruction: phrase.text,
      answer: phrase.answer,
      input: true,
    };
  }

  if (type === "multiSelect") {
    const correct = [word, word2];
    return {
      ...common,
      title: "Sélection multiple",
      instruction: "Sélectionne les 2 mots qui appartiennent à l’univers 3B.",
      answer: correct,
      multi: true,
      options: shuffleDeterministic([...correct, "faible", "copie"], level, door),
    };
  }

  if (type === "memory") {
    return {
      ...common,
      title: "Mémoire 3B",
      instruction: `Mémorise ce mot puis écris-le : ${word.toUpperCase()}.`,
      answer: word,
      input: true,
      memory: true,
    };
  }

  if (type === "order") {
    return {
      ...common,
      title: "Ordre logique",
      instruction: "Remets l’ordre logique du projet 3B.",
      answer: "ideeprototypeventeinternational",
      options: ["idée", "prototype", "vente", "international"],
      order: true,
    };
  }

  if (type === "pairing") {
    return {
      ...common,
      title: "Relier les idées",
      instruction: "Choisis la bonne association.",
      answer: "passeport-identite",
      options: shuffleDeterministic(
        [
          "passeport-identite",
          "musique-cadenas",
          "secret-boutique",
          "jeu-maillot",
        ],
        level,
        door
      ),
    };
  }

  if (type === "grid") {
    return {
      ...common,
      title: "Grille de lettres",
      instruction: `Trouve le mot caché dans la grille : ${word.toUpperCase()}.`,
      answer: word,
      input: true,
      grid: true,
    };
  }

  if (type === "secretCode") {
    return {
      ...common,
      title: "Code secret",
      instruction: "Trouve le mot lié au coffre secret 3B.",
      answer: "secret",
      input: true,
    };
  }

  if (type === "avoidTrap") {
    const options = shuffleDeterministic([word, word2, "piege", word3], level, door);
    return {
      ...common,
      title: "Évite le piège",
      instruction: "Choisis un mot 3B, mais évite le mot piège.",
      answer: word,
      trap: "piege",
      options,
    };
  }

  if (type === "quickChoice") {
    return {
      ...common,
      title: "Choix rapide",
      instruction: "Choisis rapidement le mot le plus premium.",
      answer: "premium",
      options: shuffleDeterministic(["premium", "faible", "copie", "vide"], level, door),
    };
  }

  return {
    ...common,
    title: "Boss de niveau",
    instruction: "Porte 10 : trouve le mot final qui résume 3B.",
    answer: "heritage",
    input: true,
    boss: true,
  };
}

export default function Jeu3B({ go }) {
  const [progress, setProgress] = useState(loadProgress);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("jeu");
  const [ranking, setRanking] = useState(loadRanking);

  const question = useMemo(
    () => generateQuestion(progress.level, progress.door),
    [progress.level, progress.door]
  );

  useEffect(() => {
    saveProgress(progress);

    const duration = Date.now() - progress.startedAt;
    const player = {
      name: "Vous",
      level: progress.level,
      door: progress.door,
      xp: progress.totalXp,
      speed: getSpeed(duration, progress.completedDoors),
      duration: formatDuration(duration),
    };

    const base = loadRanking().filter((p) => p.name !== "Vous");
    const next = [player, ...base]
      .sort((a, b) => b.xp - a.xp || b.level - a.level || b.door - a.door)
      .slice(0, 20);

    localStorage.setItem(RANKING_KEY, JSON.stringify(next));
    setRanking(next);
  }, [progress]);

  function resetAnswerOnly() {
    setAnswer("");
    setSelected([]);
  }

  function goNextDoor(xpWon) {
    setProgress((old) => {
      let nextDoor = old.door + 1;
      let nextLevel = old.level;
      let completedLevels = old.completedLevels;

      if (nextDoor > 10) {
        nextDoor = 1;
        nextLevel = Math.min(1000, old.level + 1);
        completedLevels += 1;
      }

      return {
        ...old,
        level: nextLevel,
        door: nextDoor,
        totalXp: old.totalXp + xpWon,
        usedHint: false,
        wrongCount: 0,
        lastUpdate: Date.now(),
        completedDoors: old.completedDoors + 1,
        completedLevels,
      };
    });

    resetAnswerOnly();
  }

  function checkAnswer(value) {
    const userValue = value ?? answer;
    let isCorrect = false;

    if (question.multi) {
      const selectedClean = selected.map(normalize).sort().join("-");
      const correctClean = question.answer.map(normalize).sort().join("-");
      isCorrect = selectedClean === correctClean;
    } else if (question.order) {
      const cleanOrder = selected.map(normalize).join("");
      isCorrect = cleanOrder === normalize(question.answer);
    } else {
      isCorrect = normalize(userValue) === normalize(question.answer);
    }

    if (question.trap && normalize(userValue) === normalize(question.trap)) {
      isCorrect = false;
    }

    if (!isCorrect) {
      setProgress((old) => ({
        ...old,
        wrongCount: old.wrongCount + 1,
      }));
      setMessage("Mauvaise réponse. Réessaie directement, la question reste ici.");
      resetAnswerOnly();
      return;
    }

    const xpWon = getXpReward(
      progress.level,
      progress.door,
      progress.usedHint,
      progress.wrongCount
    );

    setMessage(`Bonne réponse. +${xpWon} XP enregistrés automatiquement.`);
    goNextDoor(xpWon);
  }

  function useHint() {
    setProgress((old) => ({
      ...old,
      usedHint: true,
    }));

    setMessage(`${question.hint} Récompense réduite si tu valides avec indice.`);
  }

  function toggleSelect(option) {
    if (question.order) {
      if (selected.includes(option)) return;
      setSelected((old) => [...old, option]);
      return;
    }

    if (question.multi) {
      setSelected((old) =>
        old.includes(option) ? old.filter((x) => x !== option) : [...old, option]
      );
    }
  }

  const doorPercent = Math.round(((progress.door - 1) / 10) * 100);
  const difficulty = getDifficulty(progress.level, progress.door);
  const levelTitle = getLevelTitle(progress.level);

  return (
    <main className="app page game-page">
      <button className="back-button" onClick={() => go && go("home")}>
        ← Retour
      </button>

      <section className="hero">
        <div className="brand-small">3B INTERNATIONAL</div>
        <h1>Jeu 3B</h1>
        <p>
          1000 niveaux, 10 portes par niveau, XP lent, sauvegarde automatique et
          classement des participants.
        </p>
      </section>

      <section className="tab-row">
        <button className={tab === "jeu" ? "tab active" : "tab"} onClick={() => setTab("jeu")}>
          Jeu actuel
        </button>
        <button
          className={tab === "classement" ? "tab active" : "tab"}
          onClick={() => setTab("classement")}
        >
          Classement
        </button>
        <button
          className={tab === "regles" ? "tab active" : "tab"}
          onClick={() => setTab("regles")}
        >
          Règles XP
        </button>
      </section>

      {tab === "jeu" && (
        <section className="game-grid">
          <div className="lux-card">
            <h2>Niveau {progress.level} / 1000</h2>
            <p>Porte {progress.door} / 10</p>
            <p>Type de jeu : {question.title}</p>
            <p>Famille : {question.family}</p>
            <p>Difficulté : {difficulty}%</p>
            <p>XP total jeu : {progress.totalXp}</p>
            <p>Sauvegarde : automatique</p>
            <small>010101 3B XP 001101 3B INTERNATIONAL</small>
          </div>

          <div className="lux-card progress-card">
            <div className="circle-progress">
              <span>{doorPercent}%</span>
            </div>
            <h3>Portes du niveau</h3>
            <p>
              Chaque bonne réponse avance automatiquement à la porte suivante.
              Après la porte 10, tu passes au niveau suivant.
            </p>
          </div>

          <div className="lux-card mission-card">
            <h2>Mission de la porte</h2>
            <p>{question.instruction}</p>
            <p>
              Chaque porte change de mécanique : choix, écriture, piège, mémoire,
              pays, code, grille ou boss.
            </p>

            {question.grid && (
              <div className="letter-grid">
                {shuffleDeterministic(
                  [...question.answer.toUpperCase().split(""), "X", "B", "Q", "R"],
                  progress.level,
                  progress.door
                ).map((letter, index) => (
                  <span key={index}>{letter}</span>
                ))}
              </div>
            )}

            {question.options && !question.multi && !question.order && (
              <div className="choice-grid">
                {question.options.map((option) => (
                  <button key={option} onClick={() => checkAnswer(option)}>
                    {option}
                  </button>
                ))}
              </div>
            )}

            {question.multi && (
              <>
                <div className="choice-grid">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      className={selected.includes(option) ? "selected" : ""}
                      onClick={() => toggleSelect(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button className="gold-button" onClick={() => checkAnswer()}>
                  Valider ma sélection
                </button>
              </>
            )}

            {question.order && (
              <>
                <div className="choice-grid">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      className={selected.includes(option) ? "selected" : ""}
                      onClick={() => toggleSelect(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p>Ordre choisi : {selected.join(" → ") || "aucun"}</p>
                <button className="gold-button" onClick={() => checkAnswer()}>
                  Valider l’ordre
                </button>
              </>
            )}

            {question.input && (
              <div className="answer-zone">
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") checkAnswer();
                  }}
                  placeholder="✍️ Écris le bon mot"
                />
                <button onClick={useHint}>Indice</button>
                <button className="gold-button" onClick={() => checkAnswer()}>
                  Valider
                </button>
              </div>
            )}

            {message && <div className="game-message">{message}</div>}
          </div>

          <div className="lux-card">
            <h2>Règle XP</h2>
            <p>Bonne réponse : XP gagné.</p>
            <p>Indice utilisé : XP réduit.</p>
            <p>Erreur : récompense diminuée.</p>
            <p>Plus le niveau monte, plus la difficulté augmente.</p>
            <p>La progression est sauvegardée automatiquement.</p>
          </div>

          <div className="lux-card">
            <h2>Statut actuel</h2>
            <div className="badge-evolution">
              <span>3B</span>
              <small>{levelTitle}</small>
            </div>
            <p>Niveau joueur : {levelTitle}</p>
            <p>Portes terminées : {progress.completedDoors}</p>
            <p>Niveaux terminés : {progress.completedLevels}</p>
          </div>
        </section>
      )}

      {tab === "classement" && (
        <section className="lux-card ranking-card">
          <h2>Classement du jeu actuel</h2>
          <p>
            Pour l’instant, il n’y a qu’un jeu actif. Plus tard, chaque jeu aura son
            propre classement.
          </p>

          <div className="ranking-list">
            {ranking.map((player, index) => (
              <div className="ranking-row" key={`${player.name}-${index}`}>
                <strong>
                  #{index + 1} — {player.name}
                </strong>
                <span>Niveau {player.level}</span>
                <span>Porte {player.door}/10</span>
                <span>{player.xp} XP</span>
                <span>Vitesse : {player.speed}</span>
                <span>Durée : {player.duration}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "regles" && (
        <section className="game-grid">
          <div className="lux-card">
            <h2>Progression lente</h2>
            <p>
              Le joueur gagne des XP à chaque porte, mais pas trop vite. Le but est
              de garder le jeu long, difficile et motivant.
            </p>
          </div>

          <div className="lux-card">
            <h2>1000 niveaux</h2>
            <p>
              Chaque niveau possède 10 portes. Le moteur alterne plusieurs concepts :
              écriture, choix, mémoire, pays, grille, piège, code et boss.
            </p>
          </div>

          <div className="lux-card">
            <h2>Indice</h2>
            <p>
              Le bouton indice aide le joueur, mais il réduit la récompense XP. Le
              joueur peut continuer sans revenir au menu.
            </p>
          </div>

          <div className="lux-card">
            <h2>Classement</h2>
            <p>
              Le classement affiche les participants, leur rapidité, leur durée,
              leur niveau, leur porte actuelle et leur XP total.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}