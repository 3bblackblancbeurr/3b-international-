import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORAGE_MEMBER_KEY = "3b_member_progress_v1";
const STORAGE_GAME_KEY = "3b_game_progress_v1";

const official3BCountries = [
  { name: "France", flag: "🇫🇷", colors: ["#0055a4", "#fff", "#ef4135"], x: 333, y: 260 },
  { name: "Italie", flag: "🇮🇹", colors: ["#008c45", "#fff", "#cd212a"], x: 455, y: 300 },
  { name: "Estonie", flag: "🇪🇪", colors: ["#0072ce", "#000", "#fff"], x: 535, y: 170 },
  { name: "Turquie", flag: "🇹🇷", colors: ["#e30a17", "#fff", "#e30a17"], x: 675, y: 330 },
  { name: "Algérie", flag: "🇩🇿", colors: ["#006233", "#fff", "#d21034"], x: 345, y: 415 },
  { name: "Tunisie", flag: "🇹🇳", colors: ["#e70013", "#fff", "#e70013"], x: 415, y: 385 },
  { name: "Maroc", flag: "🇲🇦", colors: ["#c1272d", "#006233", "#c1272d"], x: 240, y: 390 },
  { name: "Espagne", flag: "🇪🇸", colors: ["#aa151b", "#f1bf00", "#aa151b"], x: 250, y: 315 },
];

const residenceCountries = [
  "France",
  "Maroc",
  "Algérie",
  "Tunisie",
  "Italie",
  "Espagne",
  "Turquie",
  "Estonie",
  "Portugal",
  "Belgique",
  "Suisse",
  "Allemagne",
  "Royaume-Uni",
  "Irlande",
  "Pays-Bas",
  "Luxembourg",
  "Autriche",
  "Pologne",
  "Roumanie",
  "Grèce",
  "Croatie",
  "Sénégal",
  "Mali",
  "Côte d’Ivoire",
  "Comores",
  "Cameroun",
  "États-Unis",
  "Canada",
  "Brésil",
  "Arabie saoudite",
  "Émirats arabes unis",
  "Qatar",
  "Japon",
  "Chine",
  "Australie",
  "Autre pays",
];

const memberCards = [
  { name: "Découverte 3B", status: "automatique", type: "inscription", icon: "💠" },
  { name: "Héritier 3B", status: "bloqué", type: "points futurs", icon: "♛" },
  { name: "Gardien 3B", status: "bloqué", type: "points futurs", icon: "🛡️" },
  { name: "Élite 3B", status: "bloqué", type: "mission future", icon: "✦" },
  { name: "Légende 3B", status: "sur demande", type: "commande premium", icon: "★" },
  { name: "Secret 3B", status: "sur demande", type: "accès spécial", icon: "🔐" },
  { name: "Musique 3B", status: "sur demande", type: "univers musical", icon: "♪" },
  { name: "Jeux 3B", status: "sur demande", type: "XP jeux", icon: "🎮" },
  { name: "International 3B", status: "sur demande", type: "monde 3B", icon: "🌍" },
  { name: "Drop 3B", status: "sur demande", type: "drop privé", icon: "🔥" },
  { name: "Prototype 3B", status: "sur demande", type: "prototype", icon: "🎁" },
  { name: "Legacy 3B", status: "sur demande", type: "patrimoine", icon: "◆" },
];

const gameFamilies = [
  {
    name: "ADN 3B",
    theme: "héritage, luxe, identité, ambition, international",
    words: ["héritage", "luxe", "identité", "ambition", "international", "création", "patrimoine", "vision", "premium", "legacy"],
    wrong: ["abandon", "copie", "oubli", "faible", "hasard", "vide", "désordre", "retard", "banal", "limite"],
  },
  {
    name: "Mode & couture",
    theme: "maillot, atelier, textile, logo, couture",
    words: ["couture", "atelier", "maillot", "jacquard", "broderie", "patronage", "logo", "textile", "matière", "collection"],
    wrong: ["cassé", "sale", "jetable", "brouillon", "plastique", "défaut", "copie", "basique", "panne", "chaos"],
  },
  {
    name: "Musique 3B",
    theme: "sons, album, clip, TikTok, hymne",
    words: ["album", "clip", "studio", "hymne", "refrain", "mélodie", "rythme", "son", "playlist", "tiktok"],
    wrong: ["silence", "oubli", "brouhaha", "panne", "copie", "pause", "muet", "bruit", "vide", "fade"],
  },
  {
    name: "Gaming 3B",
    theme: "niveau, mission, XP, stratégie, victoire",
    words: ["niveau", "mission", "stratégie", "victoire", "classement", "escouade", "xp", "porte", "boss", "progression"],
    wrong: ["défaite", "abandon", "blocage", "hasard", "retour", "bug", "perdu", "triche", "pause", "échec"],
  },
  {
    name: "Pays 3B",
    theme: "les huit pays officiels 3B",
    words: ["france", "italie", "maroc", "algérie", "tunisie", "espagne", "turquie", "estonie"],
    wrong: ["inconnu", "aucun", "vide", "fermé", "oublié", "perdu", "flou", "faux"],
  },
  {
    name: "Secret 3B",
    theme: "indice, coffre, code, salon, Italie",
    words: ["secret", "indice", "coffre", "italie", "salon", "code", "mystère", "prototype", "révélation", "accès"],
    wrong: ["oubli", "public", "hasard", "bruit", "faible", "retard", "fermé", "vide", "fuite", "banal"],
  },
];

const gameModes = [
  "bubbleChoice",
  "writeWord",
  "findIntruder",
  "trueFalse",
  "mixedLetters",
  "duelWords",
  "completeSentence",
  "familyMatch",
  "countryFlag",
  "memoryPair",
  "fastChoice",
  "conceptOrder",
  "secretCode",
  "wordLength",
  "firstLetter",
  "lastLetter",
  "twoGoodWords",
  "avoidTrap",
  "themeQuiz",
  "finalDoor",
];

function safeLoad(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn("Sauvegarde impossible :", key);
  }
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCountry(name) {
  return official3BCountries.find((country) => normalize(country.name) === normalize(name));
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function pick(list, index) {
  return list[Math.abs(index) % list.length];
}

function getLevel(points) {
  if (points >= 10000) return { name: "Légende", next: 10000, icon: "◆", percent: 100 };
  if (points >= 6000) return { name: "Élite", next: 10000, icon: "✦", percent: Math.round((points / 10000) * 100) };
  if (points >= 3000) return { name: "Gardien", next: 6000, icon: "🛡️", percent: Math.round((points / 6000) * 100) };
  if (points >= 1500) return { name: "Héritier", next: 3000, icon: "♛", percent: Math.round((points / 3000) * 100) };
  if (points >= 500) return { name: "Membre 3B", next: 1500, icon: "3B", percent: Math.round((points / 1500) * 100) };
  return { name: "Découverte", next: 500, icon: "3B", percent: Math.round((points / 500) * 100) };
}

function getDifficulty(level, door) {
  const baseByDoor = door;
  const levelBoost = Math.floor((level - 1) / 10);
  const rareBoost = level % 25 === 0 ? 3 : 0;
  const bossBoost = door === 10 ? 2 : 0;

  return Math.min(100, Math.max(1, baseByDoor + levelBoost + rareBoost + bossBoost));
}

function xpForDoor(level, door, hintUsed = false, mistakes = 0) {
  let base = 1;

  if (level >= 25) base = 2;
  if (level >= 75) base = 3;
  if (level >= 150) base = 4;
  if (level >= 300) base = 5;
  if (level >= 500) base = 7;
  if (level >= 750) base = 9;

  if (door === 10) base += 3;
  if (level % 25 === 0 && door === 10) base += 5;
  if (level % 100 === 0 && door === 10) base += 12;

  if (hintUsed) base = Math.max(1, Math.floor(base * 0.5));
  if (mistakes > 0) base = Math.max(1, base - mistakes);

  return base;
}

function generateGameDoor(level, door, roundSeed = 0) {
  const globalIndex = (level - 1) * 10 + door + roundSeed;
  const mode = gameModes[(globalIndex - 1) % gameModes.length];
  const family = gameFamilies[Math.floor((level - 1) / 167) % gameFamilies.length];

  const wordA = pick(family.words, globalIndex);
  const wordB = pick(family.words, globalIndex + 2);
  const wordC = pick(family.words, globalIndex + 4);
  const trapA = pick(family.wrong, globalIndex + 1);
  const trapB = pick(family.wrong, globalIndex + 3);
  const trapC = pick(family.wrong, globalIndex + 5);

  const country = pick(official3BCountries, globalIndex);
  const wrongCountry = pick(official3BCountries, globalIndex + 3);
  const mixed = shuffleArray(wordA.split("")).join("");
  const trueAnswer = globalIndex % 2 === 0;

  const choices = shuffleArray([wordA, wordB, trapA, trapB]);
  const intruderChoices = shuffleArray([wordA, wordB, wordC, trapA]);
  const duelChoices = shuffleArray([wordA, trapA]);
  const twoGoodChoices = shuffleArray([wordA, wordB, trapA, trapB]);

  const modeConfig = {
    bubbleChoice: {
      title: "Sélection tactile",
      mission: "Choisis le mot qui appartient vraiment à l’univers affiché.",
      instruction: "Appuie sur la bonne bulle.",
      correct: wordA,
      choices,
      type: "choice",
      hint: `Indice : le mot est lié à ${family.theme}.`,
    },
    writeWord: {
      title: "Écriture du mot",
      mission: "Écris le bon mot 3B demandé par la porte.",
      instruction: `Famille : ${family.name}.`,
      correct: wordA,
      type: "write",
      hint: `Indice : ${wordA.length} lettres, commence par “${wordA[0]}”.`,
    },
    findIntruder: {
      title: "Trouver l’intrus",
      mission: "Trois mots sont dans la bonne famille. Un seul est faux.",
      instruction: "Sélectionne l’intrus.",
      correct: trapA,
      choices: intruderChoices,
      type: "choice",
      hint: "Indice : cherche le mot qui casse la logique 3B.",
    },
    trueFalse: {
      title: "Vrai ou faux",
      mission: `Le mot “${trueAnswer ? wordA : trapA}” appartient-il à la famille ${family.name} ?`,
      instruction: "Choisis vrai ou faux.",
      correct: trueAnswer ? "vrai" : "faux",
      choices: ["vrai", "faux"],
      type: "choice",
      hint: `Indice : thème de la famille = ${family.theme}.`,
    },
    mixedLetters: {
      title: "Mot mélangé",
      mission: `Remets les lettres dans l’ordre : ${mixed}`,
      instruction: "Écris le vrai mot.",
      correct: wordA,
      type: "write",
      hint: `Indice : première lettre “${wordA[0]}”, dernière lettre “${wordA[wordA.length - 1]}”.`,
    },
    duelWords: {
      title: "Duel de mots",
      mission: "Deux mots s’affrontent. Un seul représente vraiment l’esprit 3B.",
      instruction: "Choisis le meilleur mot.",
      correct: wordA,
      choices: duelChoices,
      type: "choice",
      hint: `Indice : le bon mot appartient à ${family.name}.`,
    },
    completeSentence: {
      title: "Phrase à compléter",
      mission: "3B International représente le mot : ____",
      instruction: "Complète avec le bon mot.",
      correct: wordA,
      choices,
      type: "choice",
      hint: `Indice : regarde la famille ${family.name}.`,
    },
    familyMatch: {
      title: "Famille du mot",
      mission: `Quel mot correspond le mieux à la famille “${family.name}” ?`,
      instruction: "Sélectionne la réponse logique.",
      correct: wordB,
      choices: shuffleArray([wordB, trapA, trapB, trapC]),
      type: "choice",
      hint: `Indice : ${family.theme}.`,
    },
    countryFlag: {
      title: "Pays 3B",
      mission: `Quel pays correspond au drapeau ${country.flag} ?`,
      instruction: "Choisis le bon pays 3B.",
      correct: country.name,
      choices: shuffleArray([
        country.name,
        wrongCountry.name,
        pick(official3BCountries, globalIndex + 4).name,
        pick(official3BCountries, globalIndex + 5).name,
      ]),
      type: "choice",
      hint: "Indice : c’est un des 8 pays officiels 3B.",
    },
    memoryPair: {
      title: "Mémoire 3B",
      mission: `Retrouve le mot associé à “${wordA}”.`,
      instruction: "Choisis un mot de la même famille.",
      correct: wordB,
      choices: shuffleArray([wordB, trapA, trapB, trapC]),
      type: "choice",
      hint: `Indice : les deux mots viennent de ${family.name}.`,
    },
    fastChoice: {
      title: "Choix rapide",
      mission: "Sélectionne vite le mot le plus premium.",
      instruction: "Réponds sans te tromper.",
      correct: wordC,
      choices: shuffleArray([wordC, trapA, trapB, trapC]),
      type: "choice",
      hint: "Indice : le mot positif est le bon.",
    },
    conceptOrder: {
      title: "Ordre logique",
      mission: "Quel mot vient le mieux après “3B → projet →” ?",
      instruction: "Choisis la suite stratégique.",
      correct: wordA,
      choices: shuffleArray([wordA, trapA, trapB, trapC]),
      type: "choice",
      hint: "Indice : pense construction, ambition, univers.",
    },
    secretCode: {
      title: "Code secret",
      mission: "Trouve le mot lié au coffre secret 3B.",
      instruction: "Écris le bon mot.",
      correct: family.name === "Secret 3B" ? wordA : "secret",
      type: "write",
      hint: "Indice : c’est lié au coffre, à l’indice ou au mystère.",
    },
    wordLength: {
      title: "Longueur du mot",
      mission: `Quel mot contient ${wordA.length} lettres ?`,
      instruction: "Choisis le bon mot.",
      correct: wordA,
      choices: shuffleArray([wordA, trapA, trapB, trapC]),
      type: "choice",
      hint: "Indice : compte les lettres du mot.",
    },
    firstLetter: {
      title: "Première lettre",
      mission: `Quel mot commence par “${wordA[0].toUpperCase()}” ?`,
      instruction: "Choisis le bon mot.",
      correct: wordA,
      choices: shuffleArray([wordA, trapA, trapB, trapC]),
      type: "choice",
      hint: `Indice : le mot est dans ${family.name}.`,
    },
    lastLetter: {
      title: "Dernière lettre",
      mission: `Quel mot finit par “${wordA[wordA.length - 1].toUpperCase()}” ?`,
      instruction: "Choisis le bon mot.",
      correct: wordA,
      choices: shuffleArray([wordA, trapA, trapB, trapC]),
      type: "choice",
      hint: "Indice : la dernière lettre est importante.",
    },
    twoGoodWords: {
      title: "Deux bons mots",
      mission: "Deux mots sont bons. Sélectionne le premier bon mot visible.",
      instruction: "Un piège est mélangé avec les bons mots.",
      correct: wordA,
      choices: twoGoodChoices,
      type: "choice",
      hint: `Indice : ${wordA} et ${wordB} sont dans la bonne famille.`,
    },
    avoidTrap: {
      title: "Évite le piège",
      mission: "Ne choisis pas le mot négatif. Choisis le mot 3B.",
      instruction: "La mauvaise réponse fait perdre de la récompense.",
      correct: wordB,
      choices: shuffleArray([wordB, trapA, trapB, trapC]),
      type: "choice",
      hint: "Indice : choisis un mot qui construit, pas qui détruit.",
    },
    themeQuiz: {
      title: "Quiz univers 3B",
      mission: `Quel mot représente le mieux : ${family.theme} ?`,
      instruction: "Choisis le mot le plus proche du thème.",
      correct: wordC,
      choices: shuffleArray([wordC, trapA, trapB, trapC]),
      type: "choice",
      hint: `Indice : famille = ${family.name}.`,
    },
    finalDoor: {
      title: "Porte finale",
      mission: `Dernière porte du niveau ${level}. Trouve le mot-clé 3B.`,
      instruction: "Cette porte donne un bonus si tu réussis.",
      correct: wordA,
      choices: shuffleArray([wordA, trapA, trapB, trapC]),
      type: "choice",
      hint: `Indice : le mot final appartient à ${family.name}.`,
    },
  };

  return {
    level,
    door,
    globalIndex,
    mode,
    family,
    difficulty: getDifficulty(level, door),
    ...modeConfig[mode],
  };
}

function BackButton({ onClick }) {
  return (
    <button className="back-btn" onClick={onClick}>
      ← Retour
    </button>
  );
}

function LogoHeader({ small = false }) {
  return (
    <div className={small ? "logo-header small" : "logo-header"}>
      <div className="big-logo">3B</div>
      <div className="brand-text">INTERNATIONAL</div>
      {!small && <div className="sub-text">VÊTEMENTS HAUT DE GAMME</div>}
    </div>
  );
}

function MenuCard({ icon, title, onClick }) {
  return (
    <button className="menu-card" onClick={onClick}>
      <div className="icon-circle">{icon}</div>
      <span>{title}</span>
      <b>›</b>
    </button>
  );
}

function InfoCard({ title, children, visual }) {
  return (
    <section className={visual ? "info-card visual-card" : "info-card"}>
      <div className="card-text">
        <h3>{title}</h3>
        {children}
      </div>
      {visual && <div className="card-visual">{visual}</div>}
    </section>
  );
}

function Field({ icon, children }) {
  return (
    <div className="input-row">
      <span>{icon}</span>
      {children}
    </div>
  );
}

function ProgressCircle({ percent, label, icon }) {
  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));
  const r = 47;
  const c = 2 * Math.PI * r;
  const dash = (safePercent / 100) * c;

  return (
    <div className="progress-visual">
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={r} className="progress-bg" />
        <circle
          cx="75"
          cy="75"
          r={r}
          className="progress-bar"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 75 75)"
        />
        <text x="75" y="68" textAnchor="middle" className="progress-icon">
          {icon}
        </text>
        <text x="75" y="98" textAnchor="middle" className="progress-number">
          {safePercent}%
        </text>
      </svg>
      <p>{label}</p>
    </div>
  );
}

function LevelLogo({ level }) {
  return (
    <div className={`level-logo level-${normalize(level.name)}`}>
      <div>{level.icon}</div>
      <span>{level.name}</span>
    </div>
  );
}

function PassportCardVisual({ member }) {
  return (
    <div className="passport-visual premium-passport">
      <div className="passport-holo-lines" />
      <div className="passport-chip" />
      <div className="passport-orbit orbit-one" />
      <div className="passport-orbit orbit-two" />
      <div className="passport-inner">
        <strong>3B</strong>
        <span>PASSEPORT NUMÉRIQUE</span>
        <em>{member?.pseudo || "Membre 3B"}</em>
        <div className="qr-box">
          <i />
          <i />
          <i />
          QR
        </div>
      </div>
      <div className="matrix-digits">
        010011 110010 3B 001011 101010 0110 3B INTERNATIONAL
      </div>
    </div>
  );
}

function FlagVisual({ country }) {
  const selected = country || official3BCountries[0];

  return (
    <div className="flag-visual">
      <div className="flag-stripes">
        {selected.colors.map((color, index) => (
          <div key={index} style={{ background: color }} />
        ))}
      </div>
      <div className="flag-bottom">
        <strong>3B</strong>
        <span>
          {selected.flag} {selected.name} activée
        </span>
      </div>
    </div>
  );
}

function MiniCard({ card }) {
  return (
    <div className={`mini-card ${card.status === "automatique" ? "active" : ""}`}>
      <strong>3B</strong>
      <span>{card.icon}</span>
      <p>{card.name}</p>
      <em>{card.status}</em>
      <small>{card.type}</small>
    </div>
  );
}

function WorldMap3B({ originCountry }) {
  const unlocked = useMemo(() => getCountry(originCountry), [originCountry]);

  return (
    <section className="worldmap-card premium-map">
      <h3>Carte du monde 3B</h3>
      <p>
        Vue monde + zoom sur les 8 pays 3B. Seul le pays d’origine 3B choisi pendant
        l’inscription se déverrouille.
      </p>

      <div className="world-strip">
        <svg viewBox="0 0 900 260" width="100%" height="100%">
          <rect width="900" height="260" fill="#031019" />
          <g opacity="0.32">
            {Array.from({ length: 60 }).map((_, i) => (
              <text key={i} x={(i * 47) % 880} y={18 + ((i * 19) % 230)} fill="#58b5ea" fontSize="8">
                010110101001
              </text>
            ))}
          </g>
          <path d="M58 96 C112 42 206 56 246 102 C286 146 230 183 140 171 C75 162 25 132 58 96Z" className="land" />
          <path d="M202 178 C260 170 310 212 286 252 C235 252 196 225 202 178Z" className="land" />
          <path d="M345 88 C424 34 580 50 625 118 C655 172 560 204 454 174 C380 153 306 124 345 88Z" className="land" />
          <path d="M438 180 C512 162 584 202 565 254 C500 263 435 228 438 180Z" className="land" />
          <path d="M635 105 C720 72 862 118 868 172 C830 224 680 205 635 105Z" className="land" />
        </svg>
      </div>

      <div className="world-zoom">
        <svg viewBox="0 0 900 520" width="100%" height="100%">
          <rect width="900" height="520" fill="#04111b" />
          <g opacity="0.26">
            {Array.from({ length: 26 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" x2="900" y1={i * 20} y2={i * 20} stroke="#174660" />
            ))}
            {Array.from({ length: 36 }).map((_, i) => (
              <line key={`v-${i}`} y1="0" y2="520" x1={i * 25} x2={i * 25} stroke="#174660" />
            ))}
          </g>

          <path d="M90 270 C160 204 245 204 315 224 C360 190 430 146 535 152 C635 158 708 236 730 306 C655 286 590 268 518 286 C448 304 410 365 300 370 C184 378 88 340 90 270Z" className="continent" />
          <path d="M204 312 C252 298 315 318 338 356 C300 396 220 390 172 350 C154 326 172 312 204 312Z" className="continent" />
          <path d="M394 268 C430 254 470 272 476 304 C462 338 420 346 392 318 C376 298 380 278 394 268Z" className="continent" />
          <path d="M620 300 C680 266 765 292 770 332 C730 376 638 364 604 330 C594 316 602 306 620 300Z" className="continent" />

          {official3BCountries.map((country) => {
            const isUnlocked = unlocked?.name === country.name;
            return (
              <g key={country.name}>
                <line x1={country.x} y1={country.y} x2={country.x + 22} y2={country.y - 22} className="map-line" />
                <circle cx={country.x} cy={country.y} r={isUnlocked ? 8 : 6} className={isUnlocked ? "map-dot unlocked" : "map-dot"} />
                <rect x={country.x + 18} y={country.y - 38} width={country.name.length * 8 + 34} height="24" rx="8" className={isUnlocked ? "label unlocked" : "label"} />
                <text x={country.x + 34} y={country.y - 22} className="country-label">
                  {country.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="map-summary-grid clean">
        <div>
          <span>Pays 3B activé</span>
          <strong>{unlocked ? unlocked.name : "Aucun"}</strong>
        </div>
        <div>
          <span>Pays 3B disponibles</span>
          <strong>8 pays</strong>
        </div>
      </div>
    </section>
  );
}

function Home({ go, member }) {
  return (
    <div className="page home-page">
      <LogoHeader />

      <div className="menu-list home-grid">
        <MenuCard icon="🛍️" title="Boutique" onClick={() => go("boutique")} />
        <MenuCard icon="♪" title="Musique" onClick={() => go("musique")} />
        <MenuCard icon="👥" title="Communauté" onClick={() => go("communaute")} />
        <MenuCard icon="🛂" title="Passeport 3B" onClick={() => go("passeport-access")} />
        {member && <MenuCard icon="💎" title="Espace Membre 3B" onClick={() => go("espace-membre")} />}
        <MenuCard icon="🎮" title="Jeux" onClick={() => go("jeux")} />
        <MenuCard icon="🔒" title="Coffre secret 3B" onClick={() => go("secret")} />
        <MenuCard icon="☆" title="Plus encore" onClick={() => go("plus")} />
      </div>

      <div className="diamond">◆</div>
    </div>
  );
}

function Boutique({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <h1>Boutique</h1>
      <div className="gold-line">◆</div>
      <p className="intro">Ajoutez vos créations. Chaque maillot apparaîtra ici, prêt à être porté.</p>

      <div className="page-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <button className="product-slot" key={i}>
            <div className="shirt">⌁</div>
            <div className="plus">+</div>
            <p>Ajouter un maillot</p>
            <span>◆</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Musique({ go }) {
  const tracks = Array.from({ length: 20 }).map((_, i) => {
    const number = String(i + 1).padStart(2, "0");
    return { number, title: `Piste ${number}`, file: `/musique/piste-${number}.mp3` };
  });

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <h1>Musique</h1>
      <div className="gold-line">◆</div>
      <p className="intro">Album 3B International — 20 titres officiels.</p>

      <div className="page-grid compact-grid">
        {tracks.map((track) => (
          <div className="track-card music-player-card" key={track.number}>
            <span>▶</span>
            <div className="music-info">
              <strong>{track.number}</strong>
              <p>{track.title}</p>
              <audio controls preload="metadata">
                <source src={track.file} type="audio/mpeg" />
              </audio>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Communaute({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <h1>Communauté</h1>
      <div className="gold-line">◆</div>
      <div className="stats-card">
        <div>
          <strong>1 256</strong>
          <span>Membres</span>
        </div>
        <div>
          <strong>24</strong>
          <span>En ligne</span>
        </div>
        <div>
          <strong>387</strong>
          <span>Messages aujourd’hui</span>
        </div>
      </div>
      <div className="chat-box">
        <span>💬</span>
        <input placeholder="Écrivez votre message..." />
        <button>➤</button>
      </div>
    </div>
  );
}

function Secret({ go }) {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  function checkSecret() {
    if (code.trim().toLowerCase() === "blackblancbeurr") setUnlocked(true);
    else alert("Code incorrect");
  }

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <h1>Coffre secret 3B</h1>
      <p className="intro">Entrez le code secret pour débloquer l’indice caché.</p>

      <div className="input-row">
        <span>🔒</span>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Entrez le code secret" />
        <button onClick={checkSecret}>Ouvrir</button>
      </div>

      {unlocked && (
        <InfoCard title="Indice débloqué" visual={<LevelLogo level={{ name: "Secret", icon: "🔐" }} />}>
          <p>L’Italie s’y comprend — 8 juillet — 20h.</p>
          <p>TikTok en direct 3B International.</p>
          <p className="salon-text">Salon Italie — Haute Couture 3B</p>
          <p>
            Quand j’arriverai dans votre monde, vous comprendrez que 3B International
            entre dans une étape sérieuse : salon, Italie, présentation premium,
            univers luxe et ambition internationale.
          </p>
          <p>Récompense future : indice du prochain secret + prototype gratuit lors de sa sortie.</p>
        </InfoCard>
      )}

      <div className="relief-box">
        <div className="relief-logo">3B</div>
      </div>
    </div>
  );
}

function Jeux({ go, game }) {
  const totalDoors = 1000 * 10;
  const completedDoors = Math.min(game.completedDoors, totalDoors);
  const gamePercent = Math.min(Math.round((completedDoors / totalDoors) * 100), 100);

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <h1>Jeux 3B</h1>
      <div className="gold-line">◆</div>

      <div className="page-grid compact-grid">
        <InfoCard title="Jeux à venir" visual={<LevelLogo level={{ name: "Jeux", icon: "🎮" }} />}>
          <p>Premier jeu actif maintenant.</p>
          <p>Le moteur tourne avec 1000 niveaux, 10 portes par niveau et 20 mécaniques différentes.</p>
        </InfoCard>

        <InfoCard title="Jeu 3B — 1000 niveaux" visual={<ProgressCircle percent={gamePercent} label="Progression globale" icon="🎮" />}>
          <p>Niveau actuel : {game.level} / 1000</p>
          <p>Porte actuelle : {game.door} / 10</p>
          <p>XP jeux : {game.xp}</p>
          <p>Progression sauvegardée automatiquement.</p>
          <button className="inside-action" onClick={() => go("jeu-1000")}>
            Continuer le jeu
          </button>
        </InfoCard>
      </div>
    </div>
  );
}

function Jeu1000({ go, game, setGame, setMember }) {
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [hintUsed, setHintUsed] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [roundSeed, setRoundSeed] = useState(0);

  const data = useMemo(() => {
    return generateGameDoor(game.level, game.door, roundSeed);
  }, [game.level, game.door, roundSeed]);

  const displayedLevel = game.level;
  const displayedDoor = game.door;
  const displayedXP = game.xp;
  const displayedDifficulty = getDifficulty(displayedLevel, displayedDoor);
  const doorPercent = Math.round((displayedDoor / 10) * 100);

  function resetQuestion(messageText) {
    setAnswer("");
    setMessage(messageText);

    setTimeout(() => {
      setMessage("");
    }, 1500);
  }

  function wrongAnswer() {
    setMistakes((old) => old + 1);
    resetQuestion("Mauvaise réponse. Choisis une autre réponse.");
  }

  function reward() {
    const currentLevel = game.level;
    const currentDoor = game.door;
    const xpWon = xpForDoor(currentLevel, currentDoor, hintUsed, mistakes);

    const finishedLevel = currentDoor >= 10;
    const nextDoor = finishedLevel ? 1 : currentDoor + 1;
    const nextLevel = finishedLevel ? Math.min(1000, currentLevel + 1) : currentLevel;

    setGame((current) => {
      const currentFinishedLevel = current.door >= 10;
      const correctedNextDoor = currentFinishedLevel ? 1 : current.door + 1;
      const correctedNextLevel = currentFinishedLevel ? Math.min(1000, current.level + 1) : current.level;
      const correctedXpWon = xpForDoor(current.level, current.door, hintUsed, mistakes);

      return {
        level: correctedNextLevel,
        door: correctedNextDoor,
        xp: current.xp + correctedXpWon,
        completedDoors: Math.min(10000, current.completedDoors + 1),
      };
    });

    setMember((current) => {
      if (!current) return current;

      const newPoints = (current.points || 0) + xpWon;
      const newGamePoints = (current.gamePoints || 0) + xpWon;
      const newLevel = getLevel(newPoints);

      return {
        ...current,
        points: newPoints,
        gamePoints: newGamePoints,
        level: newLevel.name,
      };
    });

    setAnswer("");
    setHintUsed(false);
    setMistakes(0);
    setRoundSeed((old) => old + 1);

    if (finishedLevel) {
      resetQuestion(`Niveau terminé. +${xpWon} XP. Niveau ${nextLevel} débloqué.`);
    } else {
      resetQuestion(`Bonne réponse. +${xpWon} XP. Porte ${nextDoor} débloquée.`);
    }
  }

  function validate(value = answer) {
    const userAnswer = normalize(value);
    const correctAnswer = normalize(data.correct);

    if (userAnswer === correctAnswer) {
      reward();
    } else {
      wrongAnswer();
    }
  }

  function showHint() {
    setHintUsed(true);
    setMessage(data.hint || "Indice : observe bien la famille et le thème du niveau.");

    setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  return (
    <div className="page" key={`${displayedLevel}-${displayedDoor}-${displayedXP}`}>
      <BackButton onClick={() => go("jeux")} />
      <LogoHeader small />

      <h1>Jeu 3B</h1>
      <div className="gold-line">◆</div>

      <div className="game-hero premium-game-hero">
        <div>
          <h3>Niveau {displayedLevel} / 1000</h3>
          <p>Porte {displayedDoor} / 10</p>
          <p>Type de jeu : {data.title}</p>
          <p>Famille : {data.family.name}</p>
          <p>Difficulté : {displayedDifficulty}%</p>
          <p>XP total jeu : {displayedXP}</p>
          <p>Sauvegarde : automatique</p>
        </div>

        <ProgressCircle percent={doorPercent} label="Portes du niveau" icon="🚪" />
      </div>

      <div className="page-grid compact-grid">
        <InfoCard title="Mission de la porte">
          <p>{data.mission}</p>
          <p>{data.instruction}</p>
          <p>Chaque porte change de mécanique : choix, écriture, piège, mémoire, pays, code ou quiz.</p>
        </InfoCard>

        <InfoCard title="Règle XP">
          <p>Bonne réponse : XP gagné.</p>
          <p>Indice utilisé : XP réduit.</p>
          <p>Erreur : récompense diminuée.</p>
          <p>Plus le niveau monte, plus la difficulté augmente.</p>
        </InfoCard>
      </div>

      <div className="hint-zone">
        <button onClick={showHint}>Indice</button>
      </div>

      {data.type === "choice" && (
        <div className="bubble-zone">
          {data.choices.map((choice) => (
            <button key={choice} onClick={() => validate(choice)}>
              {choice}
            </button>
          ))}
        </div>
      )}

      {data.type === "write" && (
        <div className="input-row game-input">
          <span>✍️</span>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Écris le bon mot"
            onKeyDown={(e) => {
              if (e.key === "Enter") validate();
            }}
          />
          <button onClick={() => validate()}>Valider</button>
        </div>
      )}

      {message && <div className="game-message">{message}</div>}
    </div>
  );
}

function PasseportAccess({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <h1>Passeport 3B</h1>
      <div className="gold-line">◆</div>
      <p className="intro">Créez votre Passeport 3B pour activer votre pays d’origine et entrer dans le monde 3B.</p>
      <WorldMap3B originCountry="" />
      <div className="page-grid compact-grid">
        <InfoCard title="Pays d’origine 3B">
          <p>Sert à activer un des 8 pays officiels 3B sur la carte.</p>
        </InfoCard>
        <InfoCard title="Pays de résidence">
          <p>Sert seulement à indiquer où vous vivez aujourd’hui.</p>
        </InfoCard>
        <MenuCard icon="👤" title="Créer mon compte 3B" onClick={() => go("passeport-inscription")} />
        <MenuCard icon="🔐" title="Me connecter" onClick={() => go("passeport-connexion")} />
      </div>
    </div>
  );
}

function PasseportInscription({ go, setMember }) {
  const [form, setForm] = useState({
    pseudo: "",
    email: "",
    password: "",
    originCountry: "",
    residenceCountry: "",
    city: "",
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function createAccount() {
    const country = getCountry(form.originCountry);
    const points = 100 + (form.originCountry ? 25 : 0) + (form.residenceCountry ? 10 : 0) + (form.city ? 10 : 0) + (country ? 25 : 0);
    const level = getLevel(points);

    setMember({
      pseudo: form.pseudo.trim() || "Membre 3B",
      email: form.email.trim() || "courriel non renseigné",
      originCountry: form.originCountry || "Non renseigné",
      residenceCountry: form.residenceCountry || "Non renseigné",
      city: form.city.trim() || "Non renseignée",
      unlockedCountry: country ? country.name : "Aucun pays 3B officiel",
      points,
      gamePoints: 0,
      level: level.name,
      serial: "3B-PASS-0001",
      createdAt: new Date().toLocaleDateString("fr-FR"),
    });

    go("passeport");
  }

  return (
    <div className="page">
      <BackButton onClick={() => go("passeport-access")} />
      <LogoHeader small />
      <h1>Inscription 3B</h1>
      <div className="gold-line">◆</div>

      <div className="page-grid compact-grid">
        <Field icon="👤">
          <input value={form.pseudo} onChange={(e) => update("pseudo", e.target.value)} placeholder="Nom ou pseudo" />
        </Field>
        <Field icon="✉️">
          <input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Adresse e-mail" />
        </Field>
        <Field icon="🔒">
          <input value={form.password} onChange={(e) => update("password", e.target.value)} type="password" placeholder="Mot de passe" />
        </Field>

        <Field icon="🌍">
          <select value={form.originCountry} onChange={(e) => update("originCountry", e.target.value)}>
            <option value="">Pays d’origine 3B à activer</option>
            {official3BCountries.map((country) => (
              <option key={country.name} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>

        <Field icon="📍">
          <select value={form.residenceCountry} onChange={(e) => update("residenceCountry", e.target.value)}>
            <option value="">Pays de résidence actuel</option>
            {residenceCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </Field>

        <Field icon="🏙️">
          <input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Ville de résidence" />
        </Field>
      </div>

      <WorldMap3B originCountry={form.originCountry} />

      <button className="menu-card main-action" onClick={createAccount}>
        <div className="icon-circle">◆</div>
        <span>Créer mon Passeport 3B</span>
        <b>›</b>
      </button>
    </div>
  );
}

function PasseportConnexion({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("passeport-access")} />
      <LogoHeader small />
      <h1>Connexion 3B</h1>
      <div className="page-grid compact-grid">
        <Field icon="✉️">
          <input placeholder="Adresse e-mail" />
        </Field>
        <Field icon="🔒">
          <input type="password" placeholder="Mot de passe" />
        </Field>
        <MenuCard icon="◆" title="Entrer dans mon Passeport" onClick={() => go("passeport")} />
      </div>
    </div>
  );
}

function Passeport({ go, member }) {
  const profile = member || {
    pseudo: "Membre 3B",
    email: "courriel non renseigné",
    originCountry: "Non renseigné",
    residenceCountry: "Non renseigné",
    city: "Non renseignée",
    unlockedCountry: "Aucun pays 3B officiel",
    serial: "3B-PASS-0001",
    createdAt: "24/05/2026",
  };

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <h1>Passeport numérique</h1>
      <div className="gold-line">◆</div>

      <WorldMap3B originCountry={profile.originCountry} />

      <div className="page-grid compact-grid">
        <InfoCard title="Carte membre digitale" visual={<PassportCardVisual member={profile} />}>
          <p>Nom : {profile.pseudo}</p>
          <p>Courriel : {profile.email}</p>
          <p>Numéro passeport : {profile.serial}</p>
          <p>Date de création : {profile.createdAt}</p>
        </InfoCard>

        <InfoCard title="Origine et résidence" visual={<FlagVisual country={getCountry(profile.originCountry)} />}>
          <p>Pays d’origine 3B activé : {profile.originCountry}</p>
          <p>Pays de résidence actuelle : {profile.residenceCountry}</p>
          <p>Ville : {profile.city}</p>
          <p>Pays 3B déverrouillé : {profile.unlockedCountry}</p>
        </InfoCard>
      </div>
    </div>
  );
}

function EspaceMembre({ go, member, game }) {
  const profile = member || {
    points: 0,
    gamePoints: 0,
    level: "Découverte",
    originCountry: "Non renseigné",
    unlockedCountry: "Aucun pays 3B officiel",
  };

  const level = getLevel(profile.points);
  const gamePercent = Math.min(Math.round((game.completedDoors / 10000) * 100), 100);
  const unlocked = getCountry(profile.originCountry);

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <h1>Espace Membre 3B</h1>
      <div className="gold-line">◆</div>

      <div className="page-grid compact-grid">
        <InfoCard title="Résumé actuel" visual={<LevelLogo level={level} />}>
          <p>Points 3B : {profile.points}</p>
          <p>Points jeux : {profile.gamePoints || 0}</p>
          <p>Niveau actuel : {level.name}</p>
          <p>Prochain palier : {level.next} points</p>
        </InfoCard>

        <InfoCard title="Progression Jeux 3B" visual={<ProgressCircle percent={gamePercent} label="10 000 portes" icon="🎮" />}>
          <p>Niveau jeu : {game.level} / 1000</p>
          <p>Porte : {game.door} / 10</p>
          <p>XP jeux : {game.xp}</p>
          <p>Le logo Jeux deviendra évolutif.</p>
        </InfoCard>

        <InfoCard title="Pays verrouillé" visual={<FlagVisual country={unlocked} />}>
          {official3BCountries.map((country) => {
            const active = unlocked?.name === country.name;
            return (
              <p key={country.name}>
                {country.flag} {active ? "✅ Déverrouillé" : "🔒 Verrouillé"} : {country.name}
              </p>
            );
          })}
        </InfoCard>

        <InfoCard title="Missions 3B" visual={<LevelLogo level={{ name: "XP", icon: "XP" }} />}>
          <p>Inviter un membre : +150 points</p>
          <p>Découvrir le secret 3B : +250 points + indice futur</p>
          <p>Prototype gratuit lors de sa sortie : récompense spéciale</p>
          <p>Clip TikTok avec une musique 3B + identification 3D BlackBlanBeur : points bonus</p>
          <p>Jeux 3B : points gagnés en jouant, gagnant et passant des niveaux</p>
        </InfoCard>

        <InfoCard title="Mes 12 cartes 3B">
          <div className="mini-card-grid">
            {memberCards.map((card) => (
              <MiniCard key={card.name} card={card} />
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Code QR et certificat futur" visual={<div className="qr-large">QR</div>}>
          <p>Code QR personnel du membre</p>
          <p>Relié au compte, aux produits, aux achats, aux cartes et aux certificats 3B.</p>
        </InfoCard>
      </div>
    </div>
  );
}

function PlusEncore({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <h1>Plus encore</h1>
      <div className="page-grid compact-grid">
        <MenuCard icon="💳" title="Cartes de fidélité 3B" onClick={() => go("fidelite")} />
        <MenuCard icon="🛂" title="Passeport 3B" onClick={() => go("passeport-access")} />
        <MenuCard icon="🎮" title="Jeux 3B" onClick={() => go("jeux")} />
        <MenuCard icon="📖" title="Manga 3B International" onClick={() => go("manga")} />
        <MenuCard icon="🌍" title="8 logos internationaux" onClick={() => go("logos")} />
        <MenuCard icon="♪" title="Album musique 20 titres" onClick={() => go("musique")} />
        <MenuCard icon="💻" title="Créateurs / commandes" onClick={() => go("createurs")} />
        <MenuCard icon="▣" title="Certificat produit avec QR" onClick={() => go("certificat")} />
      </div>
    </div>
  );
}

function SimplePage({ go, title, lines }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />
      <h1>{title}</h1>
      <div className="page-grid compact-grid">
        {lines.map((line) => (
          <InfoCard key={line.title} title={line.title} visual={<LevelLogo level={{ name: line.title, icon: line.icon }} />}>
            <p>{line.text}</p>
          </InfoCard>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");

  const [member, setMember] = useState(() => safeLoad(STORAGE_MEMBER_KEY, null));

  const [game, setGame] = useState(() =>
    safeLoad(STORAGE_GAME_KEY, {
      level: 1,
      door: 1,
      xp: 0,
      completedDoors: 0,
    })
  );

  useEffect(() => {
    if (member) {
      safeSave(STORAGE_MEMBER_KEY, member);
    }
  }, [member]);

  useEffect(() => {
    safeSave(STORAGE_GAME_KEY, game);
  }, [game]);

  function go(nextPage) {
    setPage(nextPage);
    setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }), 0);
  }

  return (
    <main className="app">
      {page === "home" && <Home go={go} member={member} />}
      {page === "boutique" && <Boutique go={go} />}
      {page === "musique" && <Musique go={go} />}
      {page === "communaute" && <Communaute go={go} />}
      {page === "secret" && <Secret go={go} />}
      {page === "jeux" && <Jeux go={go} member={member} game={game} />}
      {page === "jeu-1000" && <Jeu1000 go={go} game={game} setGame={setGame} setMember={setMember} />}
      {page === "passeport-access" && <PasseportAccess go={go} />}
      {page === "passeport-inscription" && <PasseportInscription go={go} setMember={setMember} />}
      {page === "passeport-connexion" && <PasseportConnexion go={go} />}
      {page === "passeport" && <Passeport go={go} member={member} />}
      {page === "espace-membre" && <EspaceMembre go={go} member={member} game={game} />}
      {page === "plus" && <PlusEncore go={go} />}
      {page === "fidelite" && (
        <SimplePage
          go={go}
          title="Cartes de fidélité 3B"
          lines={[
            { title: "Carte Découverte", icon: "💠", text: "Automatique à l’inscription." },
            { title: "Cartes sur demande", icon: "💳", text: "La majorité des cartes seront demandées ou commandées." },
          ]}
        />
      )}
      {page === "manga" && (
        <SimplePage
          go={go}
          title="Manga 3B"
          lines={[
            { title: "Univers", icon: "📖", text: "Histoire, pays, personnages et secret 3B." },
            { title: "Chapitres", icon: "✦", text: "Chaque pays pourra devenir un chapitre 3B." },
          ]}
        />
      )}
      {page === "logos" && (
        <SimplePage
          go={go}
          title="8 logos internationaux"
          lines={official3BCountries.map((country) => ({
            title: country.name,
            icon: country.flag,
            text: `Logo officiel 3B ${country.name}.`,
          }))}
        />
      )}
      {page === "createurs" && (
        <SimplePage
          go={go}
          title="Créateurs / commandes"
          lines={[
            { title: "Créateurs", icon: "🎥", text: "Programme UGC, vidéos et contenus 3B." },
            { title: "Commandes", icon: "💻", text: "Demandes spéciales, visuels et créations." },
          ]}
        />
      )}
      {page === "certificat" && (
        <SimplePage
          go={go}
          title="Certificat produit"
          lines={[
            { title: "Authenticité", icon: "▣", text: "Produit officiel 3B avec numéro de série." },
            { title: "QR Code", icon: "QR", text: "Scan futur du produit et certificat digital." },
          ]}
        />
      )}
    </main>
  );
}