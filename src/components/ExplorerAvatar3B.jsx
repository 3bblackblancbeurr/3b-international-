import React, { useMemo, useState } from "react";

const AVATAR_STYLES = [
  {
    id: "heritier",
    name: "Héritier",
    color: "Or",
    mask: "Couronne 3B",
  },
  {
    id: "gardien",
    name: "Gardien",
    color: "Noir / Or",
    mask: "Masque protecteur",
  },
  {
    id: "visionnaire",
    name: "Visionnaire",
    color: "Bleu digital",
    mask: "Visière matrix",
  },
];

export default function ExplorerAvatar3B() {
  const [selected, setSelected] = useState("heritier");

  const avatar = useMemo(() => {
    return AVATAR_STYLES.find((item) => item.id === selected) || AVATAR_STYLES[0];
  }, [selected]);

  return (
    <section className="avatar-3b-panel">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Avatar explorateur</p>
          <h2>Guide explorateur 3B</h2>
        </div>
        <span className="status-pill active">Interactif</span>
      </div>

      <div className="avatar-stage">
        <div className={`avatar-orb avatar-${avatar.id}`}>
          <div className="avatar-helmet">3B</div>
          <div className="avatar-body" />
          <div className="avatar-glow" />
        </div>

        <div className="avatar-info">
          <h3>{avatar.name}</h3>
          <p>Couleur : {avatar.color}</p>
          <p>Style : {avatar.mask}</p>
          <p>
            Ton avatar accompagne le passeport, les missions, les cartes et la
            progression membre.
          </p>
        </div>
      </div>

      <div className="avatar-options">
        {AVATAR_STYLES.map((item) => (
          <button
            key={item.id}
            className={`small-premium-button ${selected === item.id ? "active" : ""}`}
            onClick={() => setSelected(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </section>
  );
}