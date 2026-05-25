export const doorsQuestions = [
  {
    id: 1,
    door: "France",
    question: "Quel pays est actif au départ dans le passeport 3B ?",
    answers: ["France", "Italie", "Maroc", "Espagne"],
    correct: "France",
    reward: "Fragment Tricolore",
  },
  {
    id: 2,
    door: "Secret",
    question: "Quel code ouvre le premier coffre secret ?",
    answers: ["italie", "maroc", "france", "secret"],
    correct: "italie",
    reward: "Indice Italie",
  },
  {
    id: 3,
    door: "Univers 3B",
    question: "Dans ton architecture, où va 3B Origins ?",
    answers: [
      "Dans Manga 3B",
      "Dans Boutique",
      "Dans Musique",
      "Dans Sport",
    ],
    correct: "Dans Manga 3B",
    reward: "Fragment Origine",
  },
  {
    id: 4,
    door: "Monde du 3B",
    question: "À quoi sert la case Le Monde du 3B ?",
    answers: [
      "Personnages interactifs",
      "Bibliothèque manga",
      "Paiement",
      "Paramètres",
    ],
    correct: "Personnages interactifs",
    reward: "Fragment Personnage",
  },
];

export default doorsQuestions;