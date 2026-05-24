import { useEffect, useMemo, useState } from "react";
import "./App.css";

const GAME_VERSION = "v4_premium_visual_games_reset";
const STORAGE_GAME_KEY = `3b_game_progression_${GAME_VERSION}`;
const STORAGE_RANKING_KEY = `3b_game_ranking_${GAME_VERSION}`;
const STORAGE_SESSION_KEY = `3b_game_session_${GAME_VERSION}`;

const OLD_KEYS_TO_REMOVE = [
  "3b_jeu_progression_v1",
  "3b_game_progression_v1",
  "3b_game_progression_v2",
  "3b_game_progression_v3",
  "3b_jeu_classement_v1",
  "3b_game_ranking_v1",
  "3b_game_ranking_v2",
  "3b_game_ranking_v3",
];

const PASSPORT_KEYS = [
  "3b_passport_profile",
  "3b_member_profile",
  "3b_global_profile",
  "3b_passport_global",
  "3b_user_profile",
  "3b_passeport",
  "passport3B",
  "passeport3B",
];

const official3BCountries = [
  { name: "France", key: "france", flag: "🇫🇷", code: "FR", color: "#0055A4" },
  { name: "Italie", key: "italie", flag: "🇮🇹", code: "IT", color: "#008C45" },
  { name: "Estonie", key: "estonie", flag: "🇪🇪", code: "EE", color: "#0072CE" },
  { name: "Turquie", key: "turquie", flag: "🇹🇷", code: "TR", color: "#E30A17" },
  { name: "Algérie", key: "algerie", flag: "🇩🇿", code: "DZ", color: "#006233" },
  { name: "Tunisie", key: "tunisie", flag: "🇹🇳", code: "TN", color: "#E70013" },
  { name: "Maroc", key: "maroc", flag: "🇲🇦", code: "MA", color: "#C1272D" },
  { name: "Espagne", key: "espagne", flag: "🇪🇸", code: "ES", color: "#AA151B" },
];

const wordBanks = {
  adn: [
    "heritage",
    "identite",
    "ambition",
    "creation",
    "premium",
    "international",
    "legacy",
    "origine",
    "famille",
    "transmission",
    "vision",
    "destin",
    "force",
    "respect",
    "authenticite",
  ],
  mode: [
    "maillot",
    "couture",
    "atelier",
    "textile",
    "badge",
    "metal",
    "luxe",
    "prototype",
    "collection",
    "broderie",
    "silhouette",
    "matiere",
    "noir",
    "or",
    "relief",
  ],
  musique: [
    "album",
    "clip",
    "refrain",
    "couplet",
    "studio",
    "scene",
    "hymne",
    "rythme",
    "voix",
    "piste",
    "son",
    "melodie",
    "live",
    "tiktok",
    "campagne",
  ],
  secret: [
    "secret",
    "coffre",
    "indice",
    "italie",
    "salon",
    "code",
    "cle",
    "porte",
    "mystere",
    "juillet",
    "vingt",
    "minuit",
    "deblocage",
    "enigme",
    "prototype",
  ],
  pays: [
    "france",
    "italie",
    "estonie",
    "turquie",
    "algerie",
    "tunisie",
    "maroc",
    "espagne",
    "drapeau",
    "monde",
    "origine",
    "residence",
    "carte",
    "voyage",
    "frontiere",
  ],
  gaming: [
    "niveau",
    "porte",
    "xp",
    "mission",
    "victoire",
    "defi",
    "joueur",
    "boss",
    "score",
    "classement",
    "rapidite",
    "bonus",
    "piege",
    "memoire",
    "progression",
  ],
};

const allWords = Object.values(wordBanks).flat();

const miniGameTypes = [
  "bubbleChoice",
  "writeWord",
  "anagram",
  "intruder",
  "missingLetter",
  "letterGrid",
  "crossword",
  "arrowWords",
  "connectPairs",
  "memory",
  "flagToCountry",
  "countryToFlag",
  "completePhrase",
  "multiSelect",
  "orderWords",
  "avoidTrap",
  "secretCode",
  "synonym",
  "quickChoice",
  "bossGate",
];

const phrases = [
  { text: "Ce n’est pas une marque, c’est un ____.", answer: "heritage" },
  { text: "3B International avance de zéro à ____.", answer: "international" },
  { text: "Le coffre secret donne un ____.", answer: "indice" },
  { text: "Le Passeport 3B garde l’identité du ____.", answer: "membre" },
  { text: "Le QR code servira au ____ produit.", answer: "certificat" },
  { text: "Le jeu 3B fait monter les ____ lentement.", answer: "xp" },
  { text: "Le salon Italie représente la haute ____ 3B.", answer: "couture" },
  { text: "Chaque porte terminée ajoute de la ____.", answer: "progression" },
];

const synonyms = [
  { word: "luxe", answer: "premium", wrong: ["faible", "copie", "banal"] },
  { word: "heritage", answer: "legacy", wrong: ["hasard", "oubli", "vide"] },
  { word: "identite", answer: "origine", wrong: ["perte", "retard", "erreur"] },
  { word: "creation", answer: "prototype", wrong: ["destruction", "pause", "silence"] },
  { word: "international", answer: "monde", wrong: ["local", "ferme", "petit"] },
  { word: "coffre", answer: "secret", wrong: ["public", "simple", "perdu"] },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function seededNumber(level, door, offset = 0) {
  const x = Math.sin(level * 99991 + door * 31337 + offset * 777) * 100000;
  return Math.abs(Math.floor(x));
}

function pick(list, level, door, offset = 0) {
  return list[seededNumber(level, door, offset) % list.length];
}

function shuffle(list, level, door) {
  return [...list]
    .map((item, index) => ({
      item,
      sort: seededNumber(level, door, index + 1),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map((x) => x.item);
}

function getFamily(level, door) {
  const families = Object.keys(wordBanks);
  return families[(level + door) % families.length];
}

function getWord(level, door, offset = 0) {
  const family = getFamily(level, door + offset);
  return pick(wordBanks[family], level, door, offset);
}

function scramble(word, level, door) {
  const mixed = shuffle(word.split(""), level, door).join("");
  if (mixed === word) return word.split("").reverse().join("");
  return mixed;
}

function getDifficulty(level, door) {
  const slow = Math.floor((level - 1) / 10);
  return Math.min(100, Math.max(1, slow + door));
}

function getLevelName(level) {
  if (level < 50) return "Découverte";
  if (level < 150) return "Héritier";
  if (level < 300) return "Gardien";
  if (level < 600) return "Élite";
  if (level < 850) return "Légende";
  return "Legacy";
}

function getXpReward({ level, door, usedHint, wrongCount }) {
  let reward = 1;

  if (door === 10) reward += 2;
  if (level >= 100) reward += 1;
  if (level >= 250) reward += 1;
  if (level >= 500) reward += 1;
  if (level >= 800) reward += 1;

  if (usedHint) reward -= 1;
  if (wrongCount > 0) reward -= Math.min(2, wrongCount);

  return Math.max(1, reward);
}

function formatTime(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function getSpeedLabel(durationMs, doorsDone) {
  if (!doorsDone) return "Départ";
  const average = durationMs / 1000 / doorsDone;
  if (average < 12) return "Très rapide";
  if (average < 25) return "Rapide";
  if (average < 50) return "Normal";
  return "Réfléchi";
}

function findPassportProfile() {
  for (const key of PASSPORT_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const parsed = safeJsonParse(raw);
    if (!parsed) continue;

    const hasIdentity =
      parsed.name ||
      parsed.nom ||
      parsed.email ||
      parsed.courriel ||
      parsed.passportNumber ||
      parsed.numeroPasseport ||
      parsed.originCountry ||
      parsed.paysOrigine ||
      parsed.pays3B;

    if (hasIdentity) {
      return {
        key,
        raw: parsed,
        name: parsed.name || parsed.nom || parsed.pseudo || "Membre 3B",
        email: parsed.email || parsed.courriel || "email non renseigné",
        passportNumber:
          parsed.passportNumber ||
          parsed.numeroPasseport ||
          parsed.passport ||
          "3B-PASS-0001",
        country:
          parsed.originCountry ||
          parsed.paysOrigine ||
          parsed.pays3B ||
          parsed.unlockedCountry ||
          "Aucun",
        globalXp: Number(parsed.globalXp || parsed.xpGlobal || parsed.points3B || 0),
        gameXp: Number(parsed.gameXp || parsed.xpJeu || 0),
      };
    }
  }

  return null;
}

function updatePassportXp(addXp, gameProgress) {
  const profile = findPassportProfile();
  if (!profile) return null;

  const updated = {
    ...profile.raw,
    globalXp: Number(profile.raw.globalXp || profile.raw.xpGlobal || profile.raw.points3B || 0) + addXp,
    xpGlobal: Number(profile.raw.xpGlobal || profile.raw.globalXp || profile.raw.points3B || 0) + addXp,
    points3B: Number(profile.raw.points3B || profile.raw.globalXp || profile.raw.xpGlobal || 0) + addXp,
    gameXp: Number(profile.raw.gameXp || profile.raw.xpJeu || 0) + addXp,
    xpJeu: Number(profile.raw.xpJeu || profile.raw.gameXp || 0) + addXp,
    gameLevel: gameProgress.level,
    gameDoor: gameProgress.door,
    gameCompletedDoors: gameProgress.completedDoors,
    gameUpdatedAt: new Date().toISOString(),
  };

  localStorage.setItem(profile.key, JSON.stringify(updated));
  localStorage.setItem("3b_global_game_sync", JSON.stringify(updated));

  return updated;
}

function getDefaultProgress() {
  return {
    level: 1,
    door: 1,
    totalXp: 0,
    globalXpFromGame: 0,
    completedDoors: 0,
    completedLevels: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    hintsUsed: 0,
    usedHint: false,
    wrongCountForDoor: 0,
    startedAt: Date.now(),
    lastUpdate: Date.now(),
  };
}

function removeOldGameSaves() {
  OLD_KEYS_TO_REMOVE.forEach((key) => localStorage.removeItem(key));
}

function loadProgress(canSave) {
  removeOldGameSaves();

  if (!canSave) {
    return getDefaultProgress();
  }

  const raw = localStorage.getItem(STORAGE_GAME_KEY);
  const parsed = safeJsonParse(raw);

  if (!parsed) return getDefaultProgress();

  return {
    ...getDefaultProgress(),
    ...parsed,
  };
}

function saveProgress(canSave, progress) {
  if (!canSave) return;
  localStorage.setItem(STORAGE_GAME_KEY, JSON.stringify(progress));
}

function resetAllGameData() {
  localStorage.removeItem(STORAGE_GAME_KEY);
  localStorage.removeItem(STORAGE_RANKING_KEY);
  localStorage.removeItem(STORAGE_SESSION_KEY);
  removeOldGameSaves();
}

function generateQuestion(level, door) {
  const type = miniGameTypes[(level * 7 + door * 3) % miniGameTypes.length];
  const family = getFamily(level, door);
  const word = getWord(level, door, 1);
  const word2 = getWord(level, door, 2);
  const word3 = getWord(level, door, 3);
  const country = pick(official3BCountries, level, door, 4);
  const otherCountry = pick(official3BCountries, level, door, 5);
  const phrase = pick(phrases, level, door, 6);
  const synonym = pick(synonyms, level, door, 7);

  const base = {
    id: `${level}-${door}-${type}`,
    type,
    family,
    word,
    answer: word,
    title: "Porte 3B",
    instruction: "Trouve la bonne réponse.",
    hint: `Indice : famille ${family.toUpperCase()}, univers 3B.`,
  };

  if (type === "bubbleChoice") {
    return {
      ...base,
      title: "Bulles tactiles",
      instruction: "Touche la bulle qui appartient le mieux à l’univers 3B.",
      answer: word,
      options: shuffle([word, word2, "copie", "faible", word3, "vide"], level, door),
    };
  }

  if (type === "writeWord") {
    return {
      ...base,
      title: "Mot à écrire",
      instruction: `Écris le mot central de cette porte : ${word.toUpperCase()}.`,
      answer: word,
      input: true,
    };
  }

  if (type === "anagram") {
    return {
      ...base,
      title: "Mot mélangé",
      instruction: `Remets les lettres dans l’ordre : ${scramble(word, level, door)}.`,
      answer: word,
      input: true,
    };
  }

  if (type === "intruder") {
    return {
      ...base,
      title: "Trouver l’intrus",
      instruction: "Un mot ne correspond pas à 3B. Trouve l’intrus.",
      answer: "poubelle",
      options: shuffle([word, word2, word3, "poubelle"], level, door),
    };
  }

  if (type === "missingLetter") {
    const pos = Math.max(1, seededNumber(level, door, 9) % word.length);
    const missing = word[pos];
    const hidden = `${word.slice(0, pos)}_${word.slice(pos + 1)}`;
    return {
      ...base,
      title: "Lettre manquante",
      instruction: `Complète le mot : ${hidden}`,
      answer: missing,
      input: true,
    };
  }

  if (type === "letterGrid") {
    return {
      ...base,
      title: "Grille de lettres",
      instruction: `Retrouve le mot caché dans la grille : ${word.toUpperCase()}.`,
      answer: word,
      input: true,
      gridLetters: shuffle(
        [...word.toUpperCase().split(""), "3", "B", "X", "P", "Q", "R", "L", "O"],
        level,
        door
      ).slice(0, 16),
    };
  }

  if (type === "crossword") {
    return {
      ...base,
      title: "Mini mots croisés",
      instruction: "Complète le mot horizontal principal de la grille.",
      answer: word,
      input: true,
      crossword: {
        main: word,
        vertical: word2,
      },
    };
  }

  if (type === "arrowWords") {
    return {
      ...base,
      title: "Mini mots fléchés",
      instruction: "Lis l’indice fléché et trouve le mot.",
      answer: word,
      input: true,
      arrow: `Indice → ${family.toUpperCase()} → ${word.length} lettres`,
    };
  }

  if (type === "connectPairs") {
    const pairs = [
      ["Passeport", "Identité"],
      ["Secret", "Indice"],
      ["Musique", "Album"],
      ["Jeu", "XP"],
    ];
    const pair = pick(pairs, level, door, 10);
    return {
      ...base,
      title: "Relier gauche / droite",
      instruction: "Choisis la bonne liaison 3B.",
      answer: `${pair[0]}-${pair[1]}`,
      pairs,
      options: shuffle(
        pairs.map((p) => `${p[0]}-${p[1]}`),
        level,
        door
      ),
    };
  }

  if (type === "memory") {
    return {
      ...base,
      title: "Mémoire rapide",
      instruction: `Mémorise ce mot 3B puis écris-le : ${word.toUpperCase()}.`,
      answer: word,
      input: true,
      memory: true,
    };
  }

  if (type === "flagToCountry") {
    return {
      ...base,
      title: "Drapeau → pays",
      instruction: `Quel pays correspond à ce drapeau : ${country.flag} ?`,
      answer: country.name,
      options: shuffle([country.name, otherCountry.name, "Portugal", "Brésil"], level, door),
    };
  }

  if (type === "countryToFlag") {
    return {
      ...base,
      title: "Pays → drapeau",
      instruction: `Quel drapeau correspond à : ${country.name} ?`,
      answer: country.flag,
      options: shuffle([country.flag, otherCountry.flag, "🇧🇷", "🇯🇵"], level, door),
    };
  }

  if (type === "completePhrase") {
    return {
      ...base,
      title: "Phrase à compléter",
      instruction: phrase.text,
      answer: phrase.answer,
      input: true,
    };
  }

  if (type === "multiSelect") {
    return {
      ...base,
      title: "Sélection multiple",
      instruction: "Sélectionne les 2 bons mots 3B.",
      answer: [word, word2],
      multi: true,
      options: shuffle([word, word2, "faible", "copie", "vide", "poubelle"], level, door),
    };
  }

  if (type === "orderWords") {
    return {
      ...base,
      title: "Ordre logique",
      instruction: "Remets l’ordre logique du projet 3B.",
      answer: ["idee", "prototype", "vente", "international"],
      order: true,
      options: ["idée", "prototype", "vente", "international"],
    };
  }

  if (type === "avoidTrap") {
    return {
      ...base,
      title: "Évite le piège",
      instruction: "Choisis un mot 3B, mais ne touche pas le piège.",
      answer: word,
      trap: "piège",
      options: shuffle([word, word2, "piège", word3, "héritage"], level, door),
    };
  }

  if (type === "secretCode") {
    return {
      ...base,
      title: "Code secret",
      instruction: "Trouve le mot lié au coffre secret 3B.",
      answer: "secret",
      input: true,
    };
  }

  if (type === "synonym") {
    return {
      ...base,
      title: "Synonyme premium",
      instruction: `Choisis le mot le plus proche de : ${synonym.word}.`,
      answer: synonym.answer,
      options: shuffle([synonym.answer, ...synonym.wrong], level, door),
    };
  }

  if (type === "quickChoice") {
    return {
      ...base,
      title: "Choix rapide premium",
      instruction: "Choisis le mot le plus premium.",
      answer: "premium",
      options: shuffle(["premium", "faible", "copie", "vide"], level, door),
    };
  }

  return {
    ...base,
    title: "Boss de niveau",
    instruction: "Porte 10 : trouve le mot final qui résume 3B.",
    answer: "heritage",
    input: true,
    boss: true,
  };
}

function renderMiniVisual(question, selected, setSelected) {
  if (question.gridLetters) {
    return (
      <div className="game-visual-grid">
        {question.gridLetters.map((letter, index) => (
          <span key={index}>{letter}</span>
        ))}
      </div>
    );
  }

  if (question.crossword) {
    const main = question.crossword.main.toUpperCase().split("");
    const vertical = question.crossword.vertical.toUpperCase().split("").slice(0, 5);

    return (
      <div className="crossword-visual">
        <div className="cross-row">
          {main.map((letter, index) => (
            <span key={index}>{index === 0 ? letter : ""}</span>
          ))}
        </div>
        <div className="cross-column">
          {vertical.map((letter, index) => (
            <span key={index}>{index === 0 ? main[0] : ""}</span>
          ))}
        </div>
        <small>Grille prototype — réponse principale à écrire</small>
      </div>
    );
  }

  if (question.arrow) {
    return (
      <div className="arrow-visual">
        <div className="arrow-box">DÉPART</div>
        <div className="arrow-line">➜</div>
        <div className="arrow-box">{question.arrow}</div>
      </div>
    );
  }

  if (question.pairs) {
    return (
      <div className="pair-visual">
        <div>
          {question.pairs.map((pair) => (
            <span key={pair[0]}>{pair[0]}</span>
          ))}
        </div>
        <div className="pair-lines">⇄</div>
        <div>
          {question.pairs.map((pair) => (
            <span key={pair[1]}>{pair[1]}</span>
          ))}
        </div>
      </div>
    );
  }

  if (question.memory) {
    return (
      <div className="memory-visual">
        <span>3B</span>
        <p>Mémoire active</p>
      </div>
    );
  }

  if (question.boss) {
    return (
      <div className="boss-visual">
        <span>👑</span>
        <p>BOSS PORTE 10</p>
      </div>
    );
  }

  return (
    <div className="premium-symbol">
      <span>3B</span>
      <small>{question.title}</small>
    </div>
  );
}

export default function Jeu3B({ go }) {
  const [passport, setPassport] = useState(() => findPassportProfile());
  const [canSave, setCanSave] = useState(() => Boolean(findPassportProfile()));
  const [progress, setProgress] = useState(() => loadProgress(Boolean(findPassportProfile())));
  const [view, setView] = useState("hub");
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [ranking, setRanking] = useState(() => {
    const saved = safeJsonParse(localStorage.getItem(STORAGE_RANKING_KEY));
    return saved || [];
  });

  const question = useMemo(
    () => generateQuestion(progress.level, progress.door),
    [progress.level, progress.door]
  );

  useEffect(() => {
    const currentPassport = findPassportProfile();
    setPassport(currentPassport);
    setCanSave(Boolean(currentPassport));
  }, []);

  useEffect(() => {
    saveProgress(canSave, progress);

    if (canSave) {
      const duration = Date.now() - progress.startedAt;
      const name = passport?.name || "Membre 3B";
      const row = {
        name,
        passport: passport?.passportNumber || "3B-PASS-0001",
        country: passport?.country || "Aucun",
        level: progress.level,
        door: progress.door,
        xp: progress.totalXp,
        globalXp: progress.globalXpFromGame,
        duration: formatTime(duration),
        speed: getSpeedLabel(duration, progress.completedDoors),
        completedDoors: progress.completedDoors,
        updatedAt: new Date().toISOString(),
      };

      const previous = safeJsonParse(localStorage.getItem(STORAGE_RANKING_KEY)) || [];
      const filtered = previous.filter((p) => p.passport !== row.passport && p.name !== row.name);
      const nextRanking = [row, ...filtered]
        .sort((a, b) => b.xp - a.xp || b.level - a.level || b.door - a.door)
        .slice(0, 50);

      localStorage.setItem(STORAGE_RANKING_KEY, JSON.stringify(nextRanking));
      setRanking(nextRanking);
    }
  }, [progress, canSave, passport]);

  function resetInputs() {
    setAnswer("");
    setSelected([]);
  }

  function resetGame() {
    resetAllGameData();
    const fresh = getDefaultProgress();
    setProgress(fresh);
    setRanking([]);
    resetInputs();
    setMessage("Jeu remis à zéro. Si un Passeport existe, la nouvelle progression sera sauvegardée.");
  }

  function nextDoor(xpWon) {
    setProgress((old) => {
      let newDoor = old.door + 1;
      let newLevel = old.level;
      let completedLevels = old.completedLevels;

      if (newDoor > 10) {
        newDoor = 1;
        newLevel = Math.min(1000, old.level + 1);
        completedLevels += 1;
      }

      const updated = {
        ...old,
        level: newLevel,
        door: newDoor,
        totalXp: old.totalXp + xpWon,
        globalXpFromGame: old.globalXpFromGame + xpWon,
        completedDoors: old.completedDoors + 1,
        completedLevels,
        correctAnswers: old.correctAnswers + 1,
        usedHint: false,
        wrongCountForDoor: 0,
        lastUpdate: Date.now(),
      };

      if (canSave) {
        updatePassportXp(xpWon, updated);
      }

      return updated;
    });

    resetInputs();
  }

  function useHint() {
    setProgress((old) => ({
      ...old,
      usedHint: true,
      hintsUsed: old.hintsUsed + 1,
    }));

    setMessage(`${question.hint} Attention : l’indice réduit les XP gagnés sur cette porte.`);
  }

  function wrongAnswer() {
    setProgress((old) => ({
      ...old,
      wrongAnswers: old.wrongAnswers + 1,
      wrongCountForDoor: old.wrongCountForDoor + 1,
    }));

    setMessage("Mauvaise réponse. Réessaie directement, la question reste active.");
    resetInputs();
  }

  function validate(value = null) {
    let correct = false;

    if (question.multi) {
      const selectedClean = selected.map(normalize).sort().join("-");
      const answerClean = question.answer.map(normalize).sort().join("-");
      correct = selectedClean === answerClean;
    } else if (question.order) {
      const selectedClean = selected.map(normalize);
      const answerClean = question.answer.map(normalize);
      correct = selectedClean.join("-") === answerClean.join("-");
    } else {
      const finalValue = value ?? answer;
      correct = normalize(finalValue) === normalize(question.answer);
    }

    if (question.trap && normalize(value ?? answer) === normalize(question.trap)) {
      correct = false;
    }

    if (!correct) {
      wrongAnswer();
      return;
    }

    const xpWon = getXpReward({
      level: progress.level,
      door: progress.door,
      usedHint: progress.usedHint,
      wrongCount: progress.wrongCountForDoor,
    });

    setMessage(`Bonne réponse. +${xpWon} XP. Porte suivante chargée automatiquement.`);
    nextDoor(xpWon);
  }

  function toggleSelection(option) {
    if (question.order) {
      if (selected.includes(option)) return;
      setSelected((old) => [...old, option]);
      return;
    }

    if (question.multi) {
      setSelected((old) =>
        old.includes(option) ? old.filter((item) => item !== option) : [...old, option]
      );
    }
  }

  const doorProgress = Math.round(((progress.door - 1) / 10) * 100);
  const difficulty = getDifficulty(progress.level, progress.door);
  const levelName = getLevelName(progress.level);

  return (
    <main className="app page game-page">
      <button className="back-button" onClick={() => go && go("home")}>
        ← Retour
      </button>

      <section className="game-hero">
        <div className="brand-small">3B INTERNATIONAL</div>
        <h1>Jeu 3B</h1>
        <p>1000 niveaux • 10 portes par niveau • XP lent • classement général.</p>
      </section>

      <section className="game-tabs">
        <button className={view === "hub" ? "active" : ""} onClick={() => setView("hub")}>
          Accueil jeu
        </button>
        <button className={view === "play" ? "active" : ""} onClick={() => setView("play")}>
          Jouer
        </button>
        <button className={view === "ranking" ? "active" : ""} onClick={() => setView("ranking")}>
          Classement
        </button>
        <button className={view === "rules" ? "active" : ""} onClick={() => setView("rules")}>
          Règles
        </button>
      </section>

      {!canSave && (
        <section className="lux-card warning-card">
          <h2>Mode invité</h2>
          <p>
            Aucun Passeport digital 3B détecté. Tu peux tester le jeu, mais la progression
            ne sera pas sauvegardée automatiquement.
          </p>
          <p>
            Pour enregistrer les XP, le classement et la progression, il faut créer le
            Passeport 3B avant de jouer.
          </p>
        </section>
      )}

      {view === "hub" && (
        <section className="game-grid">
          <div className="lux-card">
            <h2>Jeu actuel</h2>
            <p>Nom : Portes 3B — Mots, pays, secret, musique et ADN 3B.</p>
            <p>Niveau : {progress.level} / 1000</p>
            <p>Porte : {progress.door} / 10</p>
            <p>XP jeu : {progress.totalXp}</p>
            <p>Statut : {levelName}</p>
            <button className="gold-button" onClick={() => setView("play")}>
              Lancer le jeu
            </button>
          </div>

          <div className="lux-card">
            <h2>Classement général</h2>
            {ranking.length === 0 ? (
              <p>Aucun classement enregistré pour l’instant.</p>
            ) : (
              ranking.slice(0, 5).map((player, index) => (
                <div className="ranking-mini" key={`${player.name}-${index}`}>
                  <strong>#{index + 1} — {player.name}</strong>
                  <span>Niveau {player.level} • Porte {player.door}/10</span>
                  <span>{player.xp} XP • {player.speed}</span>
                </div>
              ))
            )}
          </div>

          <div className="lux-card">
            <h2>Sauvegarde</h2>
            <p>{canSave ? "Passeport détecté : sauvegarde automatique activée." : "Mode invité : pas de sauvegarde."}</p>
            <p>{passport ? `Membre : ${passport.name}` : "Membre : invité"}</p>
            <p>{passport ? `Passeport : ${passport.passportNumber}` : "Passeport : non créé"}</p>
          </div>

          <div className="lux-card">
            <h2>Remise à zéro</h2>
            <p>Ce bouton remet à zéro la progression locale du jeu.</p>
            <button className="danger-button" onClick={resetGame}>
              Réinitialiser le jeu
            </button>
          </div>
        </section>
      )}

      {view === "play" && (
        <section className="game-grid">
          <div className="lux-card status-card">
            <h2>Niveau {progress.level} / 1000</h2>
            <p>Porte {progress.door} / 10</p>
            <p>Type : {question.title}</p>
            <p>Famille : {question.family.toUpperCase()}</p>
            <p>Difficulté : {difficulty}%</p>
            <p>XP total jeu : {progress.totalXp}</p>
            <p>XP global ajouté : {progress.globalXpFromGame}</p>
            <p>{canSave ? "Sauvegarde : automatique" : "Sauvegarde : désactivée invité"}</p>
            <small>010101 3B XP 001101 INTERNATIONAL</small>
          </div>

          <div className="lux-card progress-card">
            <div
              className="circle-progress"
              style={{
                background: `conic-gradient(#f1bf00 ${doorProgress}%, rgba(241,191,0,.16) ${doorProgress}%)`,
              }}
            >
              <span>{doorProgress}%</span>
            </div>
            <h3>Portes du niveau</h3>
            <p>Après 10 portes, tu passes automatiquement au niveau suivant.</p>
          </div>

          <div className="lux-card mission-card">
            <h2>Mission de la porte</h2>
            <p>{question.instruction}</p>

            {renderMiniVisual(question, selected, setSelected)}

            {question.options && !question.multi && !question.order && (
              <div className="choice-grid">
                {question.options.map((option) => (
                  <button key={option} onClick={() => validate(option)}>
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
                      onClick={() => toggleSelection(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button className="gold-button" onClick={() => validate()}>
                  Valider la sélection
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
                      onClick={() => toggleSelection(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p>Ordre choisi : {selected.join(" → ") || "aucun"}</p>
                <button className="gold-button" onClick={() => validate()}>
                  Valider l’ordre
                </button>
              </>
            )}

            {question.input && (
              <div className="answer-zone">
                <button className="hint-button" onClick={useHint}>
                  Indice
                </button>
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") validate();
                  }}
                  placeholder="✍️ Écris le bon mot"
                />
                <button className="gold-button" onClick={() => validate()}>
                  Valider
                </button>
              </div>
            )}

            {message && <div className="game-message">{message}</div>}
          </div>

          <div className="lux-card rule-card">
            <h2>Règle XP</h2>
            <p>Bonne réponse : XP gagné.</p>
            <p>Indice utilisé : XP réduit.</p>
            <p>Erreur : récompense diminuée.</p>
            <p>Plus le niveau monte, plus la difficulté augmente.</p>
          </div>
        </section>
      )}

      {view === "ranking" && (
        <section className="lux-card ranking-card">
          <h2>Classement général du jeu</h2>
          <p>
            Le classement s’active vraiment quand un Passeport 3B existe. En mode invité,
            la progression n’est pas enregistrée.
          </p>

          {ranking.length === 0 ? (
            <p>Aucun joueur classé pour l’instant.</p>
          ) : (
            <div className="ranking-list">
              {ranking.map((player, index) => (
                <div className="ranking-row" key={`${player.name}-${index}`}>
                  <strong>#{index + 1} — {player.name}</strong>
                  <span>Passeport : {player.passport}</span>
                  <span>Pays : {player.country}</span>
                  <span>Niveau {player.level}</span>
                  <span>Porte {player.door}/10</span>
                  <span>XP jeu : {player.xp}</span>
                  <span>XP global : {player.globalXp}</span>
                  <span>Rapidité : {player.speed}</span>
                  <span>Durée : {player.duration}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "rules" && (
        <section className="game-grid">
          <div className="lux-card">
            <h2>1000 niveaux</h2>
            <p>Chaque niveau contient 10 portes. Les mécaniques tournent entre mots, grilles, pays, mémoire, secret et boss.</p>
          </div>

          <div className="lux-card">
            <h2>XP global</h2>
            <p>Si un Passeport existe, chaque XP gagné dans le jeu est ajouté à l’XP global de l’application.</p>
          </div>

          <div className="lux-card">
            <h2>Classement</h2>
            <p>Le classement affiche nom, passeport, pays, niveau, porte, XP, rapidité et durée.</p>
          </div>

          <div className="lux-card">
            <h2>Mode invité</h2>
            <p>Sans Passeport, on peut tester le jeu, mais rien n’est sauvegardé automatiquement.</p>
          </div>
        </section>
      )}
    </main>
  );
}