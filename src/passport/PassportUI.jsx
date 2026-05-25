import React from "react";
import styles from "./passport.module.css";

export default function PassportUI({ onBack, onHome }) {
  return (
    <main className={styles.passportPage}>
      <div className={styles.backgroundGlow}></div>

      <header className={styles.topBar}>
        <button className={styles.navButton} onClick={onHome || onBack}>
          Accueil
        </button>

        <div className={styles.headerTitle}>
          <span>3B INTERNATIONAL</span>
          <strong>PASSEPORT 3B</strong>
        </div>

        <button className={styles.navButton} onClick={onBack || onHome}>
          Entrée
        </button>
      </header>

      <section className={styles.passportFrame}>
        <img
          src="/passport-digital-3bv2.png"
          alt="Passeport Digital 3B"
          className={styles.passportImage}
        />

        <div className={styles.scanLine}></div>
        <div className={styles.lightPulse}></div>
      </section>
    </main>
  );
}