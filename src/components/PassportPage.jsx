import React from "react";
import "./PassportPage.css";

export default function PassportPage({ member, goTo, goToIntro }) {
  const originCountry = member?.originCountry || "France";
  const passportId = member?.passportId || "3B-PASS-TEST";

  return (
    <section className="passport-component-page">
      <div className="passport-component-header">
        <button type="button" onClick={() => goTo("home")}>
          ← Retour
        </button>

        <div>
          <p>3B International</p>
          <h1>Passeport 3B</h1>
        </div>

        <button type="button" onClick={() => (goToIntro ? goToIntro() : goTo("home"))}>
          Entrée
        </button>
      </div>

      <div className="passport-component-frame">
        <img
          src="/passport-digital-3bv2.png"
          alt="Passeport Digital 3B"
          className="passport-component-image"
        />

        <span className="passport-component-glow" />
        <span className="passport-component-scan" />

        <button
          type="button"
          className="passport-component-hotspot passport-component-home"
          onClick={() => goTo("home")}
          aria-label="Retour accueil"
        />

        <button
          type="button"
          className="passport-component-hotspot passport-component-entry"
          onClick={() => (goToIntro ? goToIntro() : goTo("home"))}
          aria-label="Retour entrée"
        />
      </div>

      <div className="passport-component-grid">
        <article>
          <p>Identité digitale</p>
          <h2>{passportId}</h2>
        </article>

        <article>
          <p>Origine active</p>
          <h2>{originCountry}</h2>
        </article>
      </div>
    </section>
  );
}