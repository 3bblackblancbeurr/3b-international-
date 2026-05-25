import React, { useState } from "react";

const AVATARS = [
  {
    name: "Découverte",
    aura: "Bleu digital",
    level: "Débutant",
  },
  {
    name: "Héritier",
    aura: "Or premium",
    level: "Intermédiaire",
  },
  {
    name: "Gardien",
    aura: "Cyan protecteur",
    level: "Avancé",
  },
  {
    name: "Légende",
    aura: "Or céleste",
    level: "Rare",
  },
];

export default function ExplorerAvatar3B() {
  const [selected, setSelected] = useState(AVATARS[0]);

  return (
    <section className="premium-panel">
      <p className="eyebrow">Avatar explorateur</p>
      <h2>{selected.name}</h2>

      <div
        style={{
          width: "160px",
          height: "160px",
          borderRadius: "32px",
          display: "grid",
          placeItems: "center",
          margin: "18px 0",
          border: "1px solid rgba(230, 189, 100, 0.5)",
          background:
            "radial-gradient(circle, rgba(0, 213, 255, 0.25), rgba(0, 0, 0, 0.72))",
          boxShadow: "0 0 28px rgba(0, 213, 255, 0.16)",
          color: "#fff0a5",
          fontSize: "48px",
          fontWeight: "1000",
        }}
      >
        3B
      </div>

      <p>
        <strong>Aura :</strong> {selected.aura}
      </p>

      <p>
        <strong>Niveau :</strong> {selected.level}
      </p>

      <div className="content-grid">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.name}
            type="button"
            className="secondary-button"
            onClick={() => setSelected(avatar)}
          >
            {avatar.name}
          </button>
        ))}
      </div>
    </section>
  );
}