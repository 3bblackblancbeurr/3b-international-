import { useEffect, useMemo, useState } from "react";

const GAME_KEY = "3b_game_final_v4";

const families = [
  {
    name: "Mode 3B",
    words: ["black", "blanc", "beur", "luxe", "couture", "premium", "maillot", "héritage"],
    wrong: ["banal", "faible", "copie", "oubli", "hasard", "vide"],
  },
  {
    name: "ADN 3B",
    words: ["identité", "ambition", "international", "création", "patrimoine", "héritage"],
    wrong: ["abandon", "désordre", "retard", "fragile", "secret faux"],
  },
  {
    name: "Pays 3B",
    words: ["france", "italie", "estonie", "turquie", "algérie", "tunisie", "maroc", "espagne"],
    wrong: ["canada", "japon", "brésil", "norvège", "mexique"],
  },
  {
    name: "Musique 3B",
    words: ["album", "studio", "refrain", "rythme", "clip", "tiktok", "son", "hymne"],
    wrong: ["silence", "bruit", "vide", "cassé"],
  },
  {
    name: "Gaming 3B",
    words: ["niveau", "porte", "xp", "mission", "classement", "série", "victoire", "indice"],
    wrong: ["pause", "défaite", "erreur", "retour"],
  },
];

const mechanics = [
  "Écriture",
  "QCM",
  "Mot mélangé",
  "Association",
  "Mémoire",
  "Code secret",
  "Mot croisé",
  "Mot fléché",
  "Relier gauche droite",
  "Suite logique",
  "Intrus",
  "Compléter",
  "Ordre des lettres",
  "Famille de mots",
  "Pays verrouillé",
  "Choix rapide",
  "Définition",
  "Synonyme",
  "Antonyme",
  "Mot caché",
  "Puzzle lettres",
  "Quiz drapeau",
  "Matrice 3B",
  "Sélection tactile",
  "Double choix",
  "Vrai ou faux",
  "Portes mémoire",
  "Chaîne de mots",
  "Code pays",
  "Mission salon",
  "ADN secret",
  "Carte monde",
  "Musique indice",
  "Rang prestige",
  "Chrono mot",
  "Indice réduit",
  "Mots miroir",
  "Paire correcte",
  "Mot manquant",
  "Tri premium",
  "Lettres piégées",
  "Mot long",
  "Mot court",
  "Déblocage",
  "Énigme simple",
  "Énigme avancée",
  "Combinaison",
  "Coffre 3B",
  "Passeport",
  "Final porte",
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function scramble(word) {
  const letters = word.split("");
  const mixed = shuffle(letters).join("");
  return mixed === word ? letters.reverse().join("") : mixed;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function getDifficulty(level, door) {
  const raw = Math.min(100, Math.max(1, Math.round(level * 0.35 + door)));
  if (raw < 10) return { percent: raw, label: "Très facile" };
  if (raw < 25) return { percent: raw, label: "Facile" };
  if (raw < 45) return { percent: raw, label: "Moyen" };
  if (raw < 70) return { percent: raw, label: "Difficile" };
  return { percent: raw, label: "Expert" };
}

function defaultGame() {
  return {
    level: 1,
    door: 1,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    hintsUsed: 0,
    validatedAnswers: 0,
    playSeconds: 0,
    startedAt: Date.now(),
    lastMessage: "",
    lastCorrect: false,
  };
}

function loadGame(member) {
  if (!member) return defaultGame();

  try {
    const saved = localStorage.getItem(GAME_KEY);
    if (!saved) return defaultGame();
    return { ...defaultGame(), ...JSON.parse(saved) };
  } catch {
    return defaultGame();
  }
}

function saveGame(game, member) {
  if (!member) return;
  localStorage.setItem(GAME_KEY, JSON.stringify(game));
}

function buildMission(level, door) {
  const index = (level * 10 + door) % 50;
  const mechanic = mechanics[index];
  const family = families[(level + door) % families.length];
  const word = family.words[(level + door * 2) % family.words.length];
  const wrongPool = shuffle([...family.wrong, ...families.flatMap((f) => f.words).filter((w) => w !== word)]).slice(0, 5);
  const difficulty = getDifficulty(level, door);

  const qcmChoices = shuffle([word, ...wrongPool.slice(0, 3)]);
  const pairLeft = shuffle(family.words.slice(0, 4));
  const pairRight = shuffle(pairLeft.map((w) => `${w} 3B`));

  const missions = {
    "Écriture": {
      type: "input",
      title: "Écriture",
      instruction: `Écris le mot exact lié à cette famille 3B.`,
      prompt: `Famille : ${family.name}. Écris le bon mot.`,
      answer: word,
      hint: `Indice : commence par « ${word.slice(0, 2)} » et contient ${word.length} caractères.`,
    },
    "QCM": {
      type: "choice",
      title: "QCM premium",
      instruction: "Choisis le bon mot dans la liste.",
      prompt: `Quel mot appartient à la famille ${family.name} ?`,
      answer: word,
      choices: qcmChoices,
      hint: `Indice : le bon mot commence par « ${word[0]} ».`,
    },
    "Mot mélangé": {
      type: "input",
      title: "Mot mélangé",
      instruction: "Remets les lettres dans le bon ordre.",
      prompt: `Mot mélangé : ${scramble(word)}`,
      answer: word,
      hint: `Indice : ${word.length} lettres, première lettre ${word[0].toUpperCase()}.`,
    },
    "Association": {
      type: "choice",
      title: "Association",
      instruction: "Associe le mot au bon univers.",
      prompt: `Quel mot représente le mieux : ${family.name} ?`,
      answer: word,
      choices: qcmChoices,
      hint: "Indice : élimine les mots hors univers 3B.",
    },
    "Mémoire": {
      type: "choice",
      title: "Mémoire",
      instruction: "Retrouve le mot qui était dans la famille.",
      prompt: `Famille affichée : ${family.name}. Mot à retrouver.`,
      answer: word,
      choices: qcmChoices,
      hint: `Indice : mot officiel dans la liste ${family.name}.`,
    },
    "Code secret": {
      type: "input",
      title: "Code secret",
      instruction: "Trouve le mot lié au coffre secret 3B.",
      prompt: `Code lié à la porte ${door}.`,
      answer: word,
      hint: `Indice : le code contient ${word.length} caractères.`,
    },
    "Mot croisé": {
      type: "input",
      title: "Mot croisé",
      instruction: "Complète la ligne centrale du mini mot croisé.",
      prompt: `_${word.slice(1, -1)}_`,
      answer: word,
      hint: `Indice : première lettre ${word[0]}, dernière lettre ${word.at(-1)}.`,
    },
    "Mot fléché": {
      type: "choice",
      title: "Mot fléché",
      instruction: "Suis l’indice et sélectionne la bonne case.",
      prompt: `Indice fléché : univers ${family.name}`,
      answer: word,
      choices: qcmChoices,
      hint: "Indice : le bon choix est cohérent avec l’univers affiché.",
    },
    "Relier gauche droite": {
      type: "match",
      title: "Relier",
      instruction: "Relie chaque mot avec sa version 3B.",
      prompt: "Sélectionne la bonne association pour valider la porte.",
      answer: pairLeft[0],
      pairs: pairLeft.map((w) => ({ left: w, right: `${w} 3B` })),
      choices: pairRight,
      hint: "Indice : chaque ligne garde exactement le même mot.",
    },
    "Suite logique": {
      type: "choice",
      title: "Suite logique",
      instruction: "Trouve le mot qui continue la suite.",
      prompt: `${family.words[0]} → ${family.words[1]} → ?`,
      answer: family.words[2] || word,
      choices: shuffle([family.words[2] || word, ...wrongPool.slice(0, 3)]),
      hint: `Indice : reste dans ${family.name}.`,
    },
    "Intrus": {
      type: "choice",
      title: "Intrus",
      instruction: "Trouve l’intrus qui ne correspond pas à la famille.",
      prompt: `Famille : ${family.name}. Trouve l’intrus.`,
      answer: wrongPool[0],
      choices: shuffle([wrongPool[0], ...family.words.slice(0, 3)]),
      hint: "Indice : l’intrus ne fait pas partie de l’univers affiché.",
    },
    "Compléter": {
      type: "input",
      title: "Compléter",
      instruction: "Complète le mot manquant.",
      prompt: `${word.slice(0, 2)}____`,
      answer: word,
      hint: `Indice : le mot complet contient ${word.length} caractères.`,
    },
  };

  return missions[mechanic] || missions["Écriture"];
}

function ProgressRing({ percent, label }) {
  return (
    <div className="progress-ring" style={{ "--progress": `${percent * 3.6}deg` }}>
      <span>{percent}%</span>
      {label && <small>{label}</small>}
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button className="back-btn" onClick={onClick}>
      ← Retour
    </button>
  );
}

function GameCard({ title, children, className = "" }) {
  return (
    <section className={`lux-card game-card ${className}`}>
      <h2>{title}</h2>
      <div className="card-content">{children}</div>
    </section>
  );
}

export default function Jeu3B({ go, member, setMember, saveMember }) {
  const [mode, setMode] = useState("hub");
  const [game, setGame] = useState(() => loadGame(member));
  const [answer, setAnswer] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [hintUsedThisDoor, setHintUsedThisDoor] = useState(false);

  const difficulty = getDifficulty(game.level, game.door);
  const mission = useMemo(
    () => buildMission(game.level, game.door),
    [game.level, game.door]
  );

  const totalDoorNumber = (game.level - 1) * 10 + game.door;
  const totalPercent = Math.min(100, Math.round((totalDoorNumber / 10000) * 100));
  const doorPercent = Math.round(((game.door - 1) / 10) * 100);

  useEffect(() => {
    const timer = setInterval(() => {
      setGame((old) => {
        const next = { ...old, playSeconds: old.playSeconds + 1 };
        saveGame(next, member);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [member]);

  useEffect(() => {
    saveGame(game, member);
  }, [game, member]);

  function syncMember(nextGame) {
    if (!member) return;

    const updated = {
      ...member,
      gamePoints: nextGame.xp,
      gameLevel: nextGame.level,
      gameDoor: nextGame.door,
      bestStreak: Math.max(member.bestStreak || 0, nextGame.bestStreak || 0),
      hintsUsed: nextGame.hintsUsed,
      validatedAnswers: nextGame.validatedAnswers,
      playSeconds: nextGame.playSeconds,
      lastActivity: `Jeu 3B — niveau ${nextGame.level}, porte ${nextGame.door}`,
    };

    setMember(updated);
    saveMember(updated);
  }

  function nextDoor() {
    setGame((old) => {
      const baseXp = Math.max(1, Math.round(1 + old.level * 0.15 + old.door * 0.2));
      const earned = hintUsedThisDoor ? Math.max(1, baseXp - 1) : baseXp;

      let nextDoorValue = old.door + 1;
      let nextLevelValue = old.level;

      if (nextDoorValue > 10) {
        nextDoorValue = 1;
        nextLevelValue = Math.min(1000, old.level + 1);
      }

      const next = {
        ...old,
        level: nextLevelValue,
        door: nextDoorValue,
        xp: old.xp + earned,
        streak: old.streak + 1,
        bestStreak: Math.max(old.bestStreak || 0, old.streak + 1),
        validatedAnswers: old.validatedAnswers + 1,
        hintsUsed: old.hintsUsed + (hintUsedThisDoor ? 1 : 0),
        lastCorrect: true,
        lastMessage: `Bonne réponse +${earned} XP. Porte suivante.`,
      };

      syncMember(next);
      return next;
    });

    setAnswer("");
    setHintVisible(false);
    setHintUsedThisDoor(false);
  }

  function wrongAnswer() {
    setGame((old) => ({
      ...old,
      streak: 0,
      lastCorrect: false,
      lastMessage: "Mauvaise réponse. Réessaie, la porte ne change pas.",
    }));
    setAnswer("");
  }

  function validate() {
    if (mission.type === "match") {
      if (normalize(answer) === normalize(mission.answer)) nextDoor();
      else wrongAnswer();
      return;
    }

    if (normalize(answer) === normalize(mission.answer)) nextDoor();
    else wrongAnswer();
  }

  function useHint() {
    setHintVisible(true);
    setHintUsedThisDoor(true);
  }

  function resetGame() {
    const fresh = defaultGame();
    setGame(fresh);
    localStorage.removeItem(GAME_KEY);

    if (member) {
      const updated = {
        ...member,
        gamePoints: 0,
        gameLevel: 1,
        gameDoor: 1,
        bestStreak: 0,
        hintsUsed: 0,
        validatedAnswers: 0,
        playSeconds: 0,
        lastActivity: "Jeu réinitialisé",
      };
      setMember(updated);
      saveMember(updated);
    }
  }

  const leaderboard = [
    member
      ? { name: member.name, level: game.level, door: game.door, xp: game.xp, time: formatTime(game.playSeconds) }
      : null,
    { name: "Alya", level: 11, door: 7, xp: 985, time: "02:18:42" },
    { name: "Noé", level: 9, door: 4, xp: 820, time: "01:58:10" },
    { name: "Yanis", level: 8, door: 9, xp: 730, time: "01:44:22" },
  ]
    .filter(Boolean)
    .sort((a, b) => b.xp - a.xp);

  if (mode === "play") {
    return (
      <main className="page gameplay-page">
        <BackButton onClick={() => setMode("hub")} />

        <header className="gameplay-header">
          <div>
            <p className="mini-brand">3B INTERNATIONAL</p>
            <h1>Porte {game.door} — {mission.title}</h1>
            <p>
              Chaque bonne réponse ouvre la porte suivante. À 10 portes, tu
              passes au niveau suivant.
            </p>
          </div>
          <div className="gameplay-rings">
            <ProgressRing percent={totalPercent} label="Total" />
            <ProgressRing percent={doorPercent} label="Porte" />
          </div>
        </header>

        <section className="gameplay-layout">
          <GameCard title="Mission de la porte" className="mission-panel">
            <h3>{mission.instruction}</h3>
            <p>{mission.prompt}</p>
            <p className="muted">
              Les mécaniques tournent entre choix, écriture, mémoire, pays,
              mots croisés, mots fléchés, code, quiz et association.
            </p>

            <div className="mechanic-strip">
              {mechanics.slice(0, 12).map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </GameCard>

          <GameCard title="Réponse" className="answer-panel">
            {mission.type === "choice" && (
              <div className="choice-grid">
                {mission.choices.map((choice) => (
                  <button
                    key={choice}
                    className={answer === choice ? "selected-choice" : ""}
                    onClick={() => setAnswer(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}

            {mission.type === "match" && (
              <div className="match-grid">
                {mission.pairs.map((pair) => (
                  <button
                    key={pair.left}
                    className={answer === pair.left ? "selected-choice" : ""}
                    onClick={() => setAnswer(pair.left)}
                  >
                    {pair.left} → {pair.right}
                  </button>
                ))}
              </div>
            )}

            {mission.type === "input" && (
              <input
                className="answer-input"
                value={answer}
                placeholder="Écris ta réponse"
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") validate();
                }}
              />
            )}

            <div className="game-actions">
              <button onClick={validate}>Valider</button>
              <button className="secondary-btn" onClick={useHint}>
                Indice
              </button>
            </div>

            {hintVisible && <div className="hint-box">{mission.hint}</div>}
            {game.lastMessage && (
              <div className={game.lastCorrect ? "success-box" : "error-box"}>
                {game.lastMessage}
              </div>
            )}
          </GameCard>

          <aside className="game-side">
            <GameCard title="Niveau / porte">
              <p>Niveau {game.level} / 1000</p>
              <p>Porte {game.door} / 10</p>
              <p>Difficulté : {difficulty.label} ({difficulty.percent}%)</p>
            </GameCard>

            <GameCard title="XP et temps">
              <p>XP jeu : {game.xp}</p>
              <p>Série : {game.streak}</p>
              <p>Temps : {formatTime(game.playSeconds)}</p>
            </GameCard>

            <GameCard title="Règle XP">
              <ul>
                <li>Bonne réponse : XP gagné + porte suivante.</li>
                <li>Indice utilisé : XP réduit pour cette porte.</li>
                <li>Erreur : la porte ne change pas.</li>
                <li>La difficulté augmente progressivement.</li>
              </ul>
            </GameCard>

            <GameCard title="Statut joueur">
              <p>Mode : {member ? "Membre 3B" : "Invité"}</p>
              <p>Nom : {member?.name || "Invité"}</p>
              <p>XP : {game.xp}</p>
              <p>Niveau : {game.level}</p>
              <p>Porte : {game.door}</p>
            </GameCard>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <header className="page-title">
        <p className="mini-brand">3B INTERNATIONAL</p>
        <h1>Jeux 3B</h1>
        <p>50 mécaniques de jeu, progression, XP et classement.</p>
      </header>

      <section className="page-grid">
        <GameCard title="Progression porte">
          <ProgressRing percent={doorPercent} label="Porte" />
        </GameCard>

        <GameCard title="Niveau / porte">
          <p>Niveau {game.level} / 1000</p>
          <p>Porte {game.door} / 10</p>
          <p>Difficulté : {difficulty.label}</p>
        </GameCard>

        <GameCard title="XP et temps">
          <p>XP jeu : {game.xp}</p>
          <p>Série : {game.streak}</p>
          <p>Temps : {formatTime(game.playSeconds)}</p>
        </GameCard>

        <GameCard title="Règle XP">
          <ul>
            <li>Bonne réponse : XP gagné + porte suivante.</li>
            <li>Indice utilisé : XP réduit pour cette porte.</li>
            <li>Erreur : la porte ne change pas.</li>
            <li>Après 10 portes validées, tu passes au niveau suivant.</li>
            <li>La difficulté augmente progressivement avec l’avancement.</li>
          </ul>
        </GameCard>

        <GameCard title="Statut joueur">
          <p>Mode : {member ? "Membre 3B" : "Invité"}</p>
          <p>Nom : {member?.name || "Invité"}</p>
          <p>Progression sauvegardée : {member ? "Oui" : "Non"}</p>
          <p>
            Sans passeport, tu peux tester le jeu, mais la progression n’est pas
            enregistrée automatiquement.
          </p>
        </GameCard>

        <GameCard title="Classement général">
          <div className="leaderboard-list">
            {leaderboard.map((p, i) => (
              <div key={p.name} className="leader-row">
                <span>#{i + 1}</span>
                <strong>{p.name}</strong>
                <span>Niv. {p.level}</span>
                <span>Porte {p.door}</span>
                <span>XP {p.xp}</span>
                <span>{p.time}</span>
              </div>
            ))}
          </div>
        </GameCard>

        <GameCard title="Jeu actuel">
          <p>Portes 3B — mots, pays, secret, musique et ADN 3B.</p>
          <p>1000 niveaux • 10 portes par niveau • XP lente et progressive.</p>
          <div className="button-stack">
            <button onClick={() => setMode("play")}>Ouvrir le jeu</button>
            <button className="secondary-btn" onClick={resetGame}>
              Réinitialiser le jeu
            </button>
          </div>
        </GameCard>

        <GameCard title="Mécaniques disponibles">
          <div className="mechanic-grid">
            {mechanics.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </GameCard>
      </section>
    </main>
  );
}