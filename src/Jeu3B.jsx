import { useEffect, useMemo, useState } from "react";

const GAME_KEY = "3b_game_progress_v2";
const LEADERBOARD_KEY = "3b_game_leaderboard_v2";
const MEMBER_KEY = "3b_member_passport_v3";

const gameFamilies = [
  {
    name: "ADN 3B",
    words: ["heritage", "luxe", "identite", "ambition", "international", "creation", "patrimoine", "premium"],
    wrong: ["abandon", "copie", "oubli", "faible", "hasard", "vide", "retard", "désordre"],
  },
  {
    name: "Pays 3B",
    words: ["france", "italie", "estonie", "turquie", "algerie", "tunisie", "maroc", "espagne"],
    wrong: ["canada", "bresil", "japon", "chine", "inde", "norvege", "pologne", "mexique"],
  },
  {
    name: "Musique 3B",
    words: ["album", "clip", "hymne", "studio", "son", "tiktok", "scene", "rythme"],
    wrong: ["silence", "papier", "mur", "chaise", "pluie", "cuisine", "route", "ombre"],
  },
  {
    name: "Gaming 3B",
    words: ["niveau", "porte", "xp", "mission", "classement", "indice", "victoire", "strategie"],
    wrong: ["défaite", "pause", "erreur", "sortie", "vide", "lent", "perte", "blocage"],
  },
  {
    name: "Secret 3B",
    words: ["blackblancbeurr", "indice", "coffre", "salon", "italie", "juillet", "prototype", "secret"],
    wrong: ["ouvert", "simple", "public", "normal", "ancien", "oublié", "fermé", "faux"],
  },
  {
    name: "Mode 3B",
    words: ["maillot", "polo", "hoodie", "couture", "logo", "badge", "collection", "textile"],
    wrong: ["table", "verre", "lampe", "stylo", "fenêtre", "clé", "carton", "prise"],
  },
];

const mechanics = [
  "choix",
  "ecriture",
  "melange",
  "intrus",
  "memoire",
  "code",
  "pays",
  "quiz",
  "association",
  "sequence",
  "mot-croise",
  "mot-fleche",
  "double-choix",
  "definition",
  "tactile",
  "tri",
  "famille",
  "vrai-faux",
  "indice-cache",
  "combo",
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function shuffleArray(array, seed) {
  const copy = [...array];
  let currentSeed = seed || 1;

  for (let i = copy.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const j = Math.floor((currentSeed / 233280) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function createQuestion(level, door) {
  const seed = level * 100 + door;
  const family = gameFamilies[seed % gameFamilies.length];
  const mechanic = mechanics[seed % mechanics.length];
  const word = family.words[seed % family.words.length];
  const wrong = shuffleArray(family.wrong, seed).slice(0, 3);
  const options = shuffleArray([word, ...wrong], seed + 12);

  const scrambled = shuffleArray(word.split(""), seed + 44).join("");
  const difficulty = Math.min(100, Math.max(1, Math.round(level * 0.8 + door)));

  const base = {
    family,
    mechanic,
    word,
    options,
    difficulty,
    answer: word,
  };

  if (mechanic === "choix") {
    return {
      ...base,
      typeLabel: "Sélection tactile",
      mission: "Sélectionne le mot qui appartient à l’univers 3B.",
      instruction: "Choisis la bonne réponse.",
    };
  }

  if (mechanic === "ecriture") {
    return {
      ...base,
      typeLabel: "Écriture",
      mission: "Écris le mot exact lié à cette famille 3B.",
      instruction: `Famille : ${family.name}. Écris le bon mot.`,
    };
  }

  if (mechanic === "melange") {
    return {
      ...base,
      typeLabel: "Mot mélangé",
      mission: `Remets les lettres dans l’ordre : ${scrambled}`,
      instruction: "Écris le vrai mot.",
    };
  }

  if (mechanic === "intrus") {
    return {
      ...base,
      typeLabel: "Intrus",
      answer: wrong[0],
      options: shuffleArray([wrong[0], ...family.words.slice(0, 3)], seed + 7),
      mission: "Trouve l’intrus qui ne correspond pas à la famille 3B.",
      instruction: "Sélectionne l’intrus.",
    };
  }

  if (mechanic === "memoire") {
    return {
      ...base,
      typeLabel: "Mémoire",
      mission: `Mémorise cette famille : ${family.name}.`,
      instruction: `Retrouve le mot central : ${word[0].toUpperCase()}${"_".repeat(Math.max(2, word.length - 2))}${word[word.length - 1]}`,
    };
  }

  if (mechanic === "code") {
    return {
      ...base,
      typeLabel: "Code secret",
      mission: "Trouve le mot lié au coffre secret 3B.",
      instruction: "Écris le bon mot.",
    };
  }

  if (mechanic === "pays") {
    return {
      ...base,
      typeLabel: "Pays 3B",
      mission: "Trouve un pays officiel 3B.",
      instruction: "Sélectionne ou écris le bon pays.",
      options: shuffleArray(["france", "italie", "estonie", "turquie"], seed),
    };
  }

  if (mechanic === "quiz") {
    return {
      ...base,
      typeLabel: "Quiz 3B",
      mission: "Réponds au quiz de l’univers 3B.",
      instruction: `Quel mot va avec : ${family.name} ?`,
    };
  }

  if (mechanic === "association") {
    return {
      ...base,
      typeLabel: "Traits à relier",
      mission: "Associe mentalement la famille au bon mot.",
      instruction: `${family.name} → quel mot correspond ?`,
    };
  }

  if (mechanic === "sequence") {
    return {
      ...base,
      typeLabel: "Séquence",
      mission: "Complète la suite logique 3B.",
      instruction: `3B → ${family.name} → ?`,
    };
  }

  if (mechanic === "mot-croise") {
    return {
      ...base,
      typeLabel: "Mot croisé",
      mission: "Insère le bon mot dans la grille mentale 3B.",
      instruction: `Indice horizontal : ${family.name}. Mot de ${word.length} lettres.`,
    };
  }

  if (mechanic === "mot-fleche") {
    return {
      ...base,
      typeLabel: "Mot fléché",
      mission: "Suis la flèche conceptuelle vers le bon mot.",
      instruction: `Flèche : 3B → ${family.name} → ?`,
    };
  }

  if (mechanic === "double-choix") {
    return {
      ...base,
      typeLabel: "Double choix",
      mission: "Deux réponses semblent proches, une seule est juste.",
      instruction: "Sélectionne la réponse la plus cohérente.",
      options: shuffleArray([word, family.words[(seed + 1) % family.words.length], wrong[0], wrong[1]], seed + 14),
    };
  }

  if (mechanic === "definition") {
    return {
      ...base,
      typeLabel: "Définition",
      mission: "Retrouve le mot avec une définition courte.",
      instruction: `Définition : appartient à ${family.name}.`,
    };
  }

  if (mechanic === "tactile") {
    return {
      ...base,
      typeLabel: "Bulles tactiles",
      mission: "Touche la bonne bulle 3B.",
      instruction: "Sélectionne la bulle correcte.",
    };
  }

  if (mechanic === "tri") {
    return {
      ...base,
      typeLabel: "Tri",
      mission: "Trie mentalement les mots et garde le bon.",
      instruction: "Choisis le mot premium 3B.",
    };
  }

  if (mechanic === "famille") {
    return {
      ...base,
      typeLabel: "Famille de mots",
      mission: "Retrouve le mot de la bonne famille.",
      instruction: `Famille demandée : ${family.name}.`,
    };
  }

  if (mechanic === "vrai-faux") {
    return {
      ...base,
      typeLabel: "Vrai / Faux",
      mission: `Le mot "${word}" appartient-il à ${family.name} ?`,
      instruction: "Écris vrai.",
      answer: "vrai",
      options: ["vrai", "faux"],
    };
  }

  if (mechanic === "indice-cache") {
    return {
      ...base,
      typeLabel: "Indice caché",
      mission: "Découvre le mot caché dans le thème 3B.",
      instruction: `Indice : ${word.slice(0, 2)}...`,
    };
  }

  return {
    ...base,
    typeLabel: "Combo 3B",
    mission: "Mission combo : mémoire, logique, mot et thème 3B.",
    instruction: `Trouve le mot relié à ${family.name}.`,
  };
}

function loadGame(member) {
  if (!member) {
    return {
      level: 1,
      door: 1,
      xp: 0,
      startedAt: Date.now(),
      completedDoors: 0,
    };
  }

  try {
    const saved = JSON.parse(localStorage.getItem(GAME_KEY) || "null");
    return saved || {
      level: 1,
      door: 1,
      xp: 0,
      startedAt: Date.now(),
      completedDoors: 0,
    };
  } catch {
    return {
      level: 1,
      door: 1,
      xp: 0,
      startedAt: Date.now(),
      completedDoors: 0,
    };
  }
}

function saveLeaderboard(member, game) {
  if (!member) return;

  const newEntry = {
    name: member.name || "Membre 3B",
    level: game.level,
    door: game.door,
    xp: game.xp,
    time: Date.now(),
  };

  let leaderboard = [];

  try {
    leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
  } catch {
    leaderboard = [];
  }

  const filtered = leaderboard.filter((player) => player.name !== newEntry.name);
  const updated = [...filtered, newEntry]
    .sort((a, b) => b.xp - a.xp || b.level - a.level || b.door - a.door)
    .slice(0, 20);

  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
}

function BackButton({ onClick }) {
  return (
    <button className="back-button" onClick={onClick}>
      ← Retour
    </button>
  );
}

function LogoHeader({ title, subtitle }) {
  return (
    <header className="logo-header small">
      <div className="brand-mark">3B</div>
      <div className="brand-sub">INTERNATIONAL</div>
      <div className="brand-line">VÊTEMENTS HAUT DE GAMME</div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      <div className="gold-line">◆</div>
    </header>
  );
}

function InfoCard({ title, children, visual }) {
  return (
    <article className="info-card">
      <div className="info-text">
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
      {visual && <div className="info-visual">{visual}</div>}
    </article>
  );
}

function ProgressCircle({ percent = 0, label = "XP" }) {
  const clean = Math.max(0, Math.min(100, Number(percent) || 0));

  return (
    <div className="progress-circle" style={{ "--progress": `${clean}%` }}>
      <div>
        <strong>{label}</strong>
        <span>{clean}%</span>
      </div>
    </div>
  );
}

export default function Jeu3B({ go, member, setMember }) {
  const [game, setGame] = useState(() => loadGame(member));
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const question = useMemo(() => createQuestion(game.level, game.door), [game.level, game.door]);
  const gamePercent = Math.round(((game.door - 1) / 10) * 100);
  const totalPercent = Math.round(((game.level - 1) / 1000) * 100);

  useEffect(() => {
    if (member) {
      localStorage.setItem(GAME_KEY, JSON.stringify(game));
      saveLeaderboard(member, game);
    }
  }, [game, member]);

  function updateMemberGamePoints(nextGame) {
    if (!member || !setMember) return;

    const updatedMember = {
      ...member,
      gamePoints: nextGame.xp,
    };

    setMember(updatedMember);
    localStorage.setItem(MEMBER_KEY, JSON.stringify(updatedMember));
  }

  function nextStep(currentGame, earnedXp) {
    let nextDoor = currentGame.door + 1;
    let nextLevel = currentGame.level;
    let levelBonus = 0;

    if (nextDoor > 10) {
      nextDoor = 1;
      nextLevel = Math.min(1000, currentGame.level + 1);
      levelBonus = 4 + Math.floor(currentGame.level / 25);
    }

    const nextGame = {
      ...currentGame,
      level: nextLevel,
      door: nextDoor,
      xp: currentGame.xp + earnedXp + levelBonus,
      completedDoors: currentGame.completedDoors + 1,
    };

    return nextGame;
  }

  function validateAnswer(value) {
    const userAnswer = normalize(value || answer);
    const goodAnswer = normalize(question.answer);

    if (!userAnswer) {
      setMessage("Écris ou sélectionne une réponse.");
      return;
    }

    if (userAnswer !== goodAnswer) {
      setMessage("Mauvaise réponse. Recommence : la question reste active.");
      setAnswer("");
      return;
    }

    const baseXp = 1 + Math.floor(game.level / 50);
    const earnedXp = hintUsed ? Math.max(1, baseXp - 1) : baseXp;
    const nextGame = nextStep(game, earnedXp);

    setGame(nextGame);
    updateMemberGamePoints(nextGame);

    setMessage(hintUsed ? `Bonne réponse. +${earnedXp} XP avec indice.` : `Bonne réponse. +${earnedXp} XP.`);
    setAnswer("");
    setHintUsed(false);
    setShowHint(false);
  }

  function useHint() {
    setHintUsed(true);
    setShowHint(true);
  }

  function resetGame() {
    const reset = {
      level: 1,
      door: 1,
      xp: 0,
      startedAt: Date.now(),
      completedDoors: 0,
    };

    setGame(reset);
    setAnswer("");
    setMessage("Progression locale remise à zéro.");

    if (member) {
      localStorage.setItem(GAME_KEY, JSON.stringify(reset));
      updateMemberGamePoints(reset);
      saveLeaderboard(member, reset);
    }
  }

  return (
    <main className="page">
      <BackButton onClick={() => go("jeux")} />
      <LogoHeader title="Jeu 3B" subtitle="1000 niveaux, 10 portes par niveau, XP lente et progression sauvegardée pour les membres." />

      <section className="page-grid">
        <InfoCard title={`Niveau ${game.level} / 1000`} visual={<ProgressCircle percent={totalPercent} label="Total" />}>
          <p>Porte : {game.door} / 10</p>
          <p>Type de jeu : {question.typeLabel}</p>
          <p>Famille : {question.family.name}</p>
          <p>Difficulté : {question.difficulty}%</p>
          <p>XP total jeu : {game.xp}</p>
          <p>Sauvegarde : {member ? "automatique" : "mode invité non sauvegardé"}</p>
        </InfoCard>

        <InfoCard title="Portes du niveau" visual={<ProgressCircle percent={gamePercent} label="Porte" />}>
          <p>Progression du niveau actuel : {gamePercent}%</p>
          <p>Chaque bonne réponse ouvre la porte suivante.</p>
          <p>À 10 portes validées, tu passes au niveau suivant.</p>
        </InfoCard>

        <InfoCard title="Mission de la porte">
          <p>{question.mission}</p>
          <p>{question.instruction}</p>
          <p className="small-note">
            Les mécaniques tournent entre choix, écriture, mémoire, pays, mots croisés, mots fléchés, code, quiz et association.
          </p>
        </InfoCard>

        <InfoCard title="Règle XP">
          <p>Bonne réponse : XP gagné.</p>
          <p>Indice utilisé : XP réduit.</p>
          <p>Erreur : aucune récompense.</p>
          <p>Plus le niveau monte, plus la difficulté augmente.</p>
        </InfoCard>

        <InfoCard title="Réponse">
          {(question.mechanic === "choix" ||
            question.mechanic === "intrus" ||
            question.mechanic === "tactile" ||
            question.mechanic === "quiz" ||
            question.mechanic === "double-choix" ||
            question.mechanic === "pays" ||
            question.mechanic === "vrai-faux") && (
            <div className="choice-grid">
              {question.options.map((option) => (
                <button key={option} className="choice-button" onClick={() => validateAnswer(option)}>
                  {option}
                </button>
              ))}
            </div>
          )}

          <label>
            Écris le bon mot
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Écris ta réponse"
              onKeyDown={(e) => {
                if (e.key === "Enter") validateAnswer();
              }}
            />
          </label>

          <div className="action-row">
            <button className="lux-button" onClick={() => validateAnswer()}>
              Valider
            </button>
            <button className="ghost-button" onClick={useHint}>
              Indice
            </button>
          </div>

          {showHint && (
            <p className="hint-box">
              Indice : commence par “{String(question.answer).slice(0, 2)}” et contient {String(question.answer).length} caractères.
            </p>
          )}

          {message && <p className="message-line">{message}</p>}
        </InfoCard>

        <InfoCard title="Statut joueur">
          <p>Mode : {member ? "Membre 3B" : "Invité"}</p>
          <p>Nom : {member?.name || "Invité"}</p>
          <p>XP jeu : {game.xp}</p>
          <p>Niveau : {game.level}</p>
          <p>Porte : {game.door}</p>
          <button className="danger-button" onClick={resetGame}>Remettre le jeu à zéro</button>
        </InfoCard>
      </section>
    </main>
  );
}