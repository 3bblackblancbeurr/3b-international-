import React, { useMemo, useState } from "react";

const STORAGE_GAME = "3b_game_v3_final";

const MISSIONS = [
  {
    type: "qcm",
    title: "QCM premium",
    description: "Question rapide sur l’univers 3B.",
    question: "Quel pays est actuellement débloqué dans le passeport 3B ?",
    answers: ["Italie", "France", "Maroc", "Espagne"],
    correct: "France",
    reward: 20,
  },
  {
    type: "scramble",
    title: "Mot mélangé",
    description: "Remets le mot dans le bon ordre.",
    question: "Trouve le mot caché : E G A H E R I T",
    correct: "HERITAGE",
    reward: 25,
  },
  {
    type: "memory",
    title: "Mémoire 3B",
    description: "Retrouve la bonne paire.",
    question: "Quelle paire correspond au slogan 3B ?",
    answers: [
      "Mode / hasard",
      "Héritage / communauté",
      "Sport / oubli",
      "Secret / silence",
    ],
    correct: "Héritage / communauté",
    reward: 20,
  },
  {
    type: "code",
    title: "Code secret",
    description: "Déverrouille l’indice.",
    question: "Entre le code secret lié au premier indice.",
    correct: "ITALIE",
    reward: 40,
  },
  {
    type: "intrus",
    title: "Trouve l’intrus",
    description: "Repère l’élément qui n’est pas un pays officiel 3B.",
    question: "France, Italie, Estonie, Japon",
    answers: ["France", "Italie", "Estonie", "Japon"],
    correct: "Japon",
    reward: 20,
  },
  {
    type: "suite",
    title: "Suite logique",
    description: "Continue la logique.",
    question: "Découverte → Héritier → Gardien → ?",
    answers: ["Légende", "Débutant", "Silence", "Archive"],
    correct: "Légende",
    reward: 25,
  },
  {
    type: "complete",
    title: "Compléter",
    description: "Complète la phrase officielle.",
    question: "Ce n’est pas une marque, c’est un...",
    correct: "HERITAGE",
    reward: 25,
  },
  {
    type: "crossword",
    title: "Mot croisé",
    description: "Uniquement des lettres.",
    question: "Mot à écrire : identité forte du projet 3B.",
    correct: "HERITAGE",
    reward: 30,
  },
  {
    type: "arrow",
    title: "Mot fléché",
    description: "Relie les idées principales.",
    question: "Associe 3B au bon mot-clé.",
    answers: ["Héritage", "Hasard", "Copie", "Oubli"],
    correct: "Héritage",
    reward: 30,
  },
];

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function onlyLetters(value) {
  return String(value || "").replace(/[^a-zA-ZÀ-ÿ]/g, "");
}

function createInitialGame() {
  return {
    xp: 120,
    level: 3,
    streak: 0,
    bestStreak: 2,
    completed: [],
    rank: "Héritier",
  };
}

export default function Jeu3B() {
  const [game, setGame] = useState(() => {
    const saved = localStorage.getItem(STORAGE_GAME);

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return createInitialGame();
      }
    }

    const initial = createInitialGame();
    localStorage.setItem(STORAGE_GAME, JSON.stringify(initial));
    return initial;
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("Choisis une mission et gagne de l’XP 3B.");
  const mission = MISSIONS[activeIndex];

  const progress = useMemo(() => {
    return Math.min(100, Math.round((game.completed.length / MISSIONS.length) * 100));
  }, [game.completed.length]);

  function saveGame(next) {
    setGame(next);
    localStorage.setItem(STORAGE_GAME, JSON.stringify(next));
  }

  function validate(answer) {
    const cleanAnswer = normalize(answer);
    const cleanCorrect = normalize(mission.correct);

    if (cleanAnswer !== cleanCorrect) {
      setFeedback("Pas encore. Réessaie, lis bien l’indice.");
      return;
    }

    const alreadyDone = game.completed.includes(mission.type);

    const next = {
      ...game,
      xp: alreadyDone ? game.xp : game.xp + mission.reward,
      streak: game.streak + 1,
      bestStreak: Math.max(game.bestStreak, game.streak + 1),
      completed: alreadyDone ? game.completed : [...game.completed, mission.type],
    };

    next.level = Math.max(1, Math.floor(next.xp / 100) + 1);
    next.rank = next.xp >= 500 ? "Gardien" : next.xp >= 250 ? "Héritier" : "Découverte";

    saveGame(next);
    setFeedback(`Validé. +${alreadyDone ? 0 : mission.reward} XP. Mission comprise.`);
    setInput("");
  }

  function nextMission() {
    setActiveIndex((current) => (current + 1) % MISSIONS.length);
    setInput("");
    setFeedback("Nouvelle mission chargée.");
  }

  function renderMissionBody() {
    if (mission.answers) {
      return (
        <div className="answer-grid">
          {mission.answers.map((answer) => (
            <button
              key={answer}
              className="answer-button"
              onClick={() => validate(answer)}
            >
              {answer}
            </button>
          ))}
        </div>
      );
    }

    if (mission.type === "crossword") {
      const letters = onlyLetters(input).toUpperCase().slice(0, 7);

      return (
        <>
          <input
            className="game-input"
            value={letters}
            onChange={(event) => setInput(onlyLetters(event.target.value).toUpperCase())}
            placeholder="Écris uniquement des lettres"
          />

          <div className="crossword-grid">
            {"HERITAGE".split("").map((letter, index) => (
              <span key={`${letter}-${index}`} className="crossword-cell">
                {letters[index] || ""}
              </span>
            ))}
          </div>

          <button className="game-action-button" onClick={() => validate(letters)}>
            Valider le mot croisé
          </button>
        </>
      );
    }

    return (
      <>
        <input
          className="game-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ta réponse"
        />

        <button className="game-action-button" onClick={() => validate(input)}>
          Valider
        </button>
      </>
    );
  }

  return (
    <div className="jeu3b-shell">
      <section className="game-dashboard">
        <div className="game-card-panel">
          <h3>Progression du jour</h3>
          <div className="progress-ring small">
            <span>{progress}%</span>
          </div>
        </div>

        <div className="game-card-panel">
          <h3>Niveau / rang</h3>
          <div className="game-stats">
            <div className="game-stat-line">
              <span>Niveau</span>
              <strong>{game.level}</strong>
            </div>
            <div className="game-stat-line">
              <span>Rang</span>
              <strong>{game.rank}</strong>
            </div>
            <div className="game-stat-line">
              <span>Meilleure série</span>
              <strong>{game.bestStreak}</strong>
            </div>
          </div>
        </div>

        <div className="game-card-panel">
          <h3>XP et temps</h3>
          <div className="game-stats">
            <div className="game-stat-line">
              <span>XP</span>
              <strong>{game.xp}</strong>
            </div>
            <div className="game-stat-line">
              <span>Bonus</span>
              <strong>+3B</strong>
            </div>
            <div className="game-stat-line">
              <span>Mode</span>
              <strong>Actif</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="missions-grid-3b">
        {MISSIONS.map((item, index) => (
          <button
            key={item.type}
            className={`mission-card ${index === activeIndex ? "active" : ""}`}
            onClick={() => {
              setActiveIndex(index);
              setInput("");
              setFeedback("Mission sélectionnée.");
            }}
          >
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span>
              {game.completed.includes(item.type) ? "✓ Terminée" : `+${item.reward} XP`}
            </span>
          </button>
        ))}
      </section>

      <section className="game-play-zone">
        <p className="eyebrow">Mission active</p>
        <h2>{mission.title}</h2>
        <p>{mission.question}</p>

        {renderMissionBody()}

        <div className="game-feedback">{feedback}</div>

        <button className="premium-action-button" onClick={nextMission}>
          Mission suivante
        </button>
      </section>

      <section className="game-card-panel">
        <h3>Classement général</h3>

        <div className="game-stats">
          <div className="game-stat-line">
            <span>Zakaria</span>
            <strong>{game.xp} XP</strong>
          </div>
          <div className="game-stat-line">
            <span>Communauté 3B</span>
            <strong>À venir</strong>
          </div>
          <div className="game-stat-line">
            <span>Objectif prochain</span>
            <strong>300 XP</strong>
          </div>
        </div>
      </section>
    </div>
  );
}