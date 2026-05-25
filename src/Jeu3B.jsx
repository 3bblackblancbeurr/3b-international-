import React, { useState } from "react";

const QUESTIONS = [
  {
    question: "Que signifie l’esprit 3B ?",
    answers: [
      "Black Blanc Beur",
      "Basket Ball Business",
      "Bleu Blanc Bois",
      "Base Bloc Bonus",
    ],
    correct: "Black Blanc Beur",
  },
  {
    question: "Quel est le premier pays actif dans le passeport test ?",
    answers: ["France", "Italie", "Maroc", "Espagne"],
    correct: "France",
  },
  {
    question: "Quel mot ouvre le coffre secret actuellement ?",
    answers: ["italie", "maroc", "france", "secret"],
    correct: "italie",
  },
];

export default function Jeu3B() {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");

  const current = QUESTIONS[index];

  function answer(value) {
    if (value === current.correct) {
      setScore((previous) => previous + 1);
      setMessage("Bonne réponse +10 XP");
    } else {
      setMessage("Mauvaise réponse, réessaie.");
    }
  }

  function next() {
    setMessage("");
    setIndex((previous) => {
      if (previous + 1 >= QUESTIONS.length) {
        return 0;
      }

      return previous + 1;
    });
  }

  return (
    <section className="premium-panel">
      <p className="eyebrow">Jeu 3B sécurisé</p>
      <h2>Mission QCM</h2>

      <p>
        Score actuel : <strong>{score}</strong>
      </p>

      <h3>{current.question}</h3>

      <div className="content-grid">
        {current.answers.map((item) => (
          <button
            key={item}
            type="button"
            className="secondary-button"
            onClick={() => answer(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {message && <p>{message}</p>}

      <button type="button" className="primary-button" onClick={next}>
        Question suivante
      </button>
    </section>
  );
}