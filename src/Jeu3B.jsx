import React, { useState } from "react";

const STORAGE_GAME = "3b_game_v3_final";

const MISSIONS = [
  { type: "qcm", title: "QCM premium", question: "Que signifie 3B ?", options: ["Black Blanc Beur", "Blue Black Brand", "Boutique Bleu Bronze"], answer: "Black Blanc Beur" },
  { type: "scramble", title: "Mot mélangé", question: "Remets le mot dans l’ordre", letters: ["R", "I", "T", "É", "H", "A", "G", "E"], answer: "HÉRITAGE" },
  { type: "memory", title: "Mémoire", question: "Mémorise : France • Italie • Estonie. Quel pays était en troisième ?", options: ["France", "Italie", "Estonie"], answer: "Estonie" },
  { type: "code", title: "Code secret", question: "Code indice officiel 3B", answer: "ITALIE" },
  { type: "intrus", title: "Trouve l’intrus", question: "Lequel n’est pas un pays officiel 3B actuel ?", options: ["France", "Maroc", "Canada", "Turquie"], answer: "Canada" },
  { type: "suite", title: "Suite logique", question: "Complète : Découverte → Héritier → Gardien → ?", answer: "LÉGENDE" },
  { type: "complete", title: "Compléter", question: "Ce n’est pas une marque, c’est un _____.", answer: "HÉRITAGE" },
  { type: "crossword", title: "Mot croisé", question: "Trouve le mot vertical : 3B est un...", answer: "LEGACY" },
  { type: "arrow", title: "Mot fléché", question: "Grille fléchée : complète les 4 mots courts", answer: "LUXE" },
];

function loadGame() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_GAME)) || {
      xp: 0,
      level: 1,
      streak: 0,
      played: 0,
    };
  } catch {
    return {
      xp: 0,
      level: 1,
      streak: 0,
      played: 0,
    };
  }
}

function saveGame(g) {
  localStorage.setItem(STORAGE_GAME, JSON.stringify(g));
  return g;
}

export default function Jeu3B() {
  const [game, setGame] = useState(loadGame);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  const mission = MISSIONS[index % MISSIONS.length];
  const progress = Math.min(100, game.xp % 100);

  function check(value = answer) {
    const normalized = String(value).trim().toUpperCase();
    const correct = normalized === mission.answer.toUpperCase();

    const next = {
      ...game,
      played: game.played + 1,
      streak: correct ? game.streak + 1 : 0,
      xp: correct ? game.xp + 15 + game.streak * 2 : game.xp,
      level: Math.max(1, Math.floor((correct ? game.xp + 15 : game.xp) / 100) + 1),
    };

    setGame(saveGame(next));
    setFeedback(correct ? "✅ Correct + XP 3B" : "❌ Presque. Réessaie ou passe à la mission suivante.");

    if (correct) {
      setTimeout(() => {
        setAnswer("");
        setFeedback("");
        setIndex((i) => i + 1);
      }, 650);
    }
  }

  return (
    <div className="jeu3b-shell">
      <header className="jeu3b-head">
        <div>
          <span>3B INTERNATIONAL</span>
          <h1>Jeux 3B</h1>
          <p>Jeux variés : QCM, mémoire, code, intrus, suite logique, mots croisés et mots fléchés.</p>
        </div>
        <div className="game-hud">
          <b>Niveau {game.level}</b>
          <b>{game.xp} XP</b>
          <b>Série {game.streak}</b>
        </div>
      </header>

      <div className="game-panels">
        <section className="game-card-main">
          <div className="game-mode">{mission.title}</div>
          <h2>{mission.question}</h2>
          <GameRenderer
            mission={mission}
            answer={answer}
            setAnswer={setAnswer}
            check={check}
          />

          {feedback && <div className="game-feedback">{feedback}</div>}

          <div className="game-actions">
            <button onClick={() => check()}>Valider</button>
            <button
              onClick={() => {
                setAnswer("");
                setFeedback("");
                setIndex((i) => i + 1);
              }}
            >
              Mission suivante
            </button>
          </div>
        </section>

        <aside className="game-side">
          <h3>Progression</h3>
          <div className="game-ring" style={{ "--p": `${progress}%` }}>
            {progress}%
          </div>
          <p>Objectif : enchaîner les missions sans répétition.</p>
          <h3>Types actifs</h3>
          {MISSIONS.map((m) => (
            <span className="mode-chip" key={m.type}>
              {m.title}
            </span>
          ))}
        </aside>
      </div>
    </div>
  );
}

function GameRenderer({ mission, answer, setAnswer, check }) {
  if (["qcm", "memory", "intrus"].includes(mission.type)) {
    return (
      <div className="choice-grid">
        {mission.options.map((o) => (
          <button key={o} onClick={() => check(o)}>
            {o}
          </button>
        ))}
      </div>
    );
  }

  if (mission.type === "scramble") {
    return (
      <>
        <div className="letter-bank">
          {mission.letters.map((l, i) => (
            <button key={i} onClick={() => setAnswer((a) => a + l)}>
              {l}
            </button>
          ))}
        </div>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value.toUpperCase().replace(/[^A-ZÉÈÀÙÇ]/g, ""))}
          placeholder="Réponse"
        />
      </>
    );
  }

  if (mission.type === "crossword") {
    return (
      <>
        <CrosswordGrid />
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
          placeholder="Mot trouvé"
        />
      </>
    );
  }

  if (mission.type === "arrow") {
    return (
      <>
        <ArrowGrid />
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
          placeholder="Mot clé final"
        />
      </>
    );
  }

  return (
    <input
      value={answer}
      onChange={(e) => setAnswer(e.target.value.toUpperCase())}
      placeholder="Ta réponse"
    />
  );
}

function CrosswordGrid() {
  const cells = ["3", "B", "", "L", "E", "G", "A", "C", "Y", "", "", ""];
  return (
    <div className="cross-grid">
      {cells.map((c, i) => (
        <span className={c ? "filled" : "empty"} key={i}>
          {c}
        </span>
      ))}
    </div>
  );
}

function ArrowGrid() {
  const cells = ["L", "U", "X", "E", "→", "3", "B", "→", "★", "", "", ""];
  return (
    <div className="arrow-grid">
      {cells.map((c, i) => (
        <span className={c ? "filled" : "empty"} key={i}>
          {c}
        </span>
      ))}
    </div>
  );
}