import React from "react";

const DOORS = [
  {
    name: "Porte France",
    status: "Ouverte",
    reward: "Fragment Tricolore",
  },
  {
    name: "Porte Italie",
    status: "Verrouillée",
    reward: "Fragment Roma",
  },
  {
    name: "Porte Maroc",
    status: "Verrouillée",
    reward: "Fragment Atlas",
  },
  {
    name: "Porte Monde 3B",
    status: "Secrète",
    reward: "Fragment International",
  },
];

export default function GamesDoors3B() {
  return (
    <section className="premium-panel">
      <p className="eyebrow">Portes 3B</p>
      <h2>Jeux & fragments</h2>

      <div className="content-grid">
        {DOORS.map((door) => (
          <article key={door.name} className="premium-panel">
            <h2>{door.name}</h2>
            <p>
              <strong>Statut :</strong> {door.status}
            </p>
            <p>
              <strong>Récompense :</strong> {door.reward}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}