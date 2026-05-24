import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import Jeu3B from "./Jeu3B";

const STORAGE_MEMBER_KEY = "3b_member_passport_v12";
const STORAGE_GAME_KEY = "3b_member_game_v12";

const OFFICIAL_COUNTRIES = [
  { name: "France", code: "FR", flag: "🇫🇷", color: "#2f6bff" },
  { name: "Italie", code: "IT", flag: "🇮🇹", color: "#2dbf63" },
  { name: "Estonie", code: "EE", flag: "🇪🇪", color: "#3aa9ff" },
  { name: "Turquie", code: "TR", flag: "🇹🇷", color: "#ff4d4d" },
  { name: "Algérie", code: "DZ", flag: "🇩🇿", color: "#1cbf73" },
  { name: "Tunisie", code: "TN", flag: "🇹🇳", color: "#ff335c" },
  { name: "Maroc", code: "MA", flag: "🇲🇦", color: "#ff4040" },
  { name: "Espagne", code: "ES", flag: "🇪🇸", color: "#ffb21e" },
];

const MUSIC_SLOTS = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  title: `Titre ${index + 1}`,
  state: "Prêt",
}));

function safeParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function loadMember() {
  if (typeof window === "undefined") return null;
  return safeParse(localStorage.getItem(STORAGE_MEMBER_KEY), null);
}

function loadGame() {
  if (typeof window === "undefined") return createDefaultGameProfile();
  return (
    safeParse(localStorage.getItem(STORAGE_GAME_KEY), null) ||
    createDefaultGameProfile()
  );
}

function createDefaultGameProfile() {
  return {
    level: 1,
    door: 1,
    xp: 0,
    streak: 0,
    bestStreak: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    hintsUsed: 0,
    elapsedSeconds: 0,
    totalPercent: 0,
    lastMode: "invité",
  };
}

function formatDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function generatePassportNumber() {
  return `3B-PASS-${Math.floor(1000 + Math.random() * 9000)}`;
}

function calcGlobalProgress(level, door) {
  const completedDoors = (Math.max(1, level) - 1) * 10 + (Math.max(1, door) - 1);
  return Number(((completedDoors / 10000) * 100).toFixed(2));
}

function buildLeaderboard(member, gameProfile) {
  const base = [
    { name: "Alya", level: 11, xp: 985 },
    { name: "Noé", level: 9, xp: 820 },
    { name: "Yanis", level: 8, xp: 730 },
    { name: "Lina", level: 7, xp: 610 },
    { name: "Imran", level: 6, xp: 470 },
  ];

  if (!member) return base;

  const playerRow = {
    name: member.name || "Zakaria",
    level: gameProfile.level,
    xp: gameProfile.xp,
  };

  const merged = [...base, playerRow].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.xp - a.xp;
  });

  return merged.map((item, index) => ({ ...item, rank: index + 1 }));
}

function findCountry(name) {
  return OFFICIAL_COUNTRIES.find((country) => country.name === name) || OFFICIAL_COUNTRIES[0];
}

function BackButton({ onClick, label = "Retour" }) {
  return (
    <button className="back-button" onClick={onClick}>
      ← {label}
    </button>
  );
}

function PageHeader({ eyebrow = "3B INTERNATIONAL", title, subtitle, badge }) {
  return (
    <div className="page-header">
      <div className="page-header-top">
        <div className="page-eyebrow">{eyebrow}</div>
        {badge ? <div className="mini-badge">{badge}</div> : null}
      </div>
      <h1 className="page-title">{title}</h1>
      {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children, className = "", actions = null, badge = null }) {
  return (
    <section className={`section-card ${className}`.trim()}>
      {(title || subtitle || actions || badge) && (
        <div className="section-card-head">
          <div>
            {badge ? <div className="section-badge">{badge}</div> : null}
            {title ? <h2 className="section-title">{title}</h2> : null}
            {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="section-actions">{actions}</div> : null}
        </div>
      )}
      <div className="section-body">{children}</div>
    </section>
  );
}

function MenuCard({ icon, title, subtitle, onClick, accent = "" }) {
  return (
    <button className={`menu-card ${accent}`.trim()} onClick={onClick}>
      <div className="menu-card-icon">{icon}</div>
      <div className="menu-card-text">
        <div className="menu-card-title">{title}</div>
        <div className="menu-card-subtitle">{subtitle}</div>
      </div>
      <div className="menu-card-arrow">›</div>
    </button>
  );
}

function WorldMapVisual({ selectedCountry }) {
  const selected = findCountry(selectedCountry);
  const points = {
    France: { x: 375, y: 180 },
    Italie: { x: 415, y: 205 },
    Estonie: { x: 455, y: 135 },
    Turquie: { x: 545, y: 235 },
    Algérie: { x: 355, y: 285 },
    Tunisie: { x: 390, y: 280 },
    Maroc: { x: 300, y: 285 },
    Espagne: { x: 310, y: 215 },
  };

  const active = points[selected.name] || points.France;

  return (
    <div className="map-visual">
      <svg viewBox="0 0 760 430" className="world-map-svg" role="img" aria-label="Carte du monde 3B">
        <defs>
          <linearGradient id="oceanGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#051322" />
            <stop offset="100%" stopColor="#0a2842" />
          </linearGradient>
          <linearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#144f8d" />
            <stop offset="100%" stopColor="#0b3d6f" />
          </linearGradient>
          <filter id="glowBlue">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="760" height="430" rx="24" fill="url(#oceanGrad)" />

        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={40 + i * 55}
            y1="25"
            x2={40 + i * 55}
            y2="405"
            stroke="rgba(76,190,255,0.11)"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="25"
            y1={35 + i * 55}
            x2="735"
            y2={35 + i * 55}
            stroke="rgba(76,190,255,0.11)"
            strokeWidth="1"
          />
        ))}

        <g fill="url(#landGrad)" stroke="#65d8ff" strokeOpacity="0.6" strokeWidth="2">
          <path d="M88 125c25-35 70-55 130-45 35 6 58 18 70 35 12 17 13 31 7 44-10 22-31 36-52 49-26 16-37 40-70 45-46 8-110-9-136-45-19-26-12-57 51-83z" />
          <path d="M280 104c20-20 52-28 82-22 19 4 33 12 41 24 12 19 7 42-9 58-16 16-26 31-33 44-15 26-52 38-88 28-31-9-57-33-58-64-1-26 14-50 65-68z" />
          <path d="M428 122c31-31 78-45 129-34 33 7 59 21 71 42 12 22 8 47-16 70-27 27-58 46-89 59-43 19-104 25-145 10-28-11-34-32-18-57 16-25 29-50 68-90z" />
          <path d="M294 250c16-12 45-18 67-13 26 5 42 21 48 46 5 21-2 43-18 60-18 19-44 31-73 31-28 0-53-10-68-29-13-16-18-38-12-57 7-20 27-31 56-38z" />
          <path d="M618 286c19-12 44-14 63-7 18 6 30 19 34 36 6 25-10 53-38 67-24 13-56 13-78-1-18-11-28-32-24-50 4-18 22-34 43-45z" />
          <path d="M532 330c14-7 32-8 45-4 11 4 18 13 20 24 2 14-5 28-19 36-15 8-34 8-48 0-12-7-19-19-17-31 1-10 8-18 19-25z" />
        </g>

        <g stroke="rgba(81,225,255,0.4)" strokeWidth="1.5">
          {Object.entries(points).map(([country, point]) => (
            <line
              key={country}
              x1={active.x}
              y1={active.y}
              x2={point.x}
              y2={point.y}
              stroke={country === selected.name ? selected.color : "rgba(81,225,255,0.35)"}
            />
          ))}
        </g>

        {Object.entries(points).map(([country, point]) => {
          const activeDot = country === selected.name;
          return (
            <g key={country}>
              <circle
                cx={point.x}
                cy={point.y}
                r={activeDot ? 10 : 6}
                fill={activeDot ? selected.color : "#dff7ff"}
                filter={activeDot ? "url(#glowBlue)" : undefined}
              />
              <text
                x={point.x + 12}
                y={point.y - 10}
                className={`map-label ${activeDot ? "active" : ""}`}
              >
                {country}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ZoomEightCountries({ selectedCountry }) {
  const countries = [
    { name: "France", x: 245, y: 92, w: 48, h: 36 },
    { name: "Espagne", x: 188, y: 134, w: 60, h: 34 },
    { name: "Italie", x: 304, y: 122, w: 38, h: 48 },
    { name: "Estonie", x: 355, y: 64, w: 42, h: 28 },
    { name: "Turquie", x: 442, y: 154, w: 80, h: 26 },
    { name: "Algérie", x: 223, y: 210, w: 88, h: 42 },
    { name: "Tunisie", x: 322, y: 219, w: 26, h: 34 },
    { name: "Maroc", x: 160, y: 209, w: 46, h: 38 },
  ];

  return (
    <div className="map-visual zoom-map-shell">
      <svg viewBox="0 0 640 330" className="zoom-map-svg" role="img" aria-label="Zoom des 8 pays 3B">
        <defs>
          <linearGradient id="zoomBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#07192a" />
            <stop offset="100%" stopColor="#0a2440" />
          </linearGradient>
        </defs>

        <rect width="640" height="330" rx="24" fill="url(#zoomBg)" />
        <rect x="28" y="28" width="584" height="274" rx="18" fill="rgba(11,34,57,0.58)" stroke="rgba(88,207,255,0.28)" />

        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`zx-${i}`}
            x1={40 + i * 55}
            y1="28"
            x2={40 + i * 55}
            y2="302"
            stroke="rgba(76,190,255,0.09)"
          />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`zy-${i}`}
            x1="28"
            y1={60 + i * 50}
            x2="612"
            y2={60 + i * 50}
            stroke="rgba(76,190,255,0.09)"
          />
        ))}

        <path d="M137 150l40-46 37-13 21-25 33-8 23 13 23 2 29-27 35-1 24 18 6 29 36 13 44 0 53 23 15 28-14 24-51 1-68 23-71 18-18 38-38 6-13-27-26-9-23-1-18-26-35-6-20-29-46-11-11-29 13-23z" fill="rgba(27,80,136,0.56)" stroke="rgba(113,214,255,0.55)" strokeWidth="3" />

        {countries.map((country) => {
          const active = country.name === selectedCountry;
          const fill = active ? "rgba(31,184,255,0.28)" : "rgba(13,57,101,0.25)";
          const stroke = active ? "#7ff0ff" : "rgba(113,214,255,0.4)";
          return (
            <g key={country.name}>
              <rect
                x={country.x}
                y={country.y}
                width={country.w}
                height={country.h}
                rx="8"
                fill={fill}
                stroke={stroke}
                strokeWidth={active ? 3 : 2}
              />
              <text
                x={country.x + country.w / 2}
                y={country.y + country.h / 2 + 5}
                textAnchor="middle"
                className={`map-country-name ${active ? "active" : ""}`}
              >
                {country.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DigitalPassportCard({ member }) {
  return (
    <div className="digital-passport-card">
      <div className="digital-passport-noise" />
      <div className="passport-chip" />
      <div className="passport-topline">
        <span>3B ACCÈS NUMÉRIQUE</span>
        <span>{member.originCountry}</span>
      </div>

      <div className="passport-big-title">3B PASSEPORT NUMÉRIQUE</div>

      <div className="passport-main-row">
        <div className="passport-main-info">
          <div className="passport-info-label">Titulaire</div>
          <div className="passport-info-value">{member.name}</div>

          <div className="passport-info-grid">
            <div>
              <span>N°</span>
              <strong>{member.number}</strong>
            </div>
            <div>
              <span>Statut</span>
              <strong>{member.status}</strong>
            </div>
            <div>
              <span>Pays 3B</span>
              <strong>{member.originCountry}</strong>
            </div>
            <div>
              <span>Résidence</span>
              <strong>{member.residenceCountry}</strong>
            </div>
          </div>
        </div>

        <div className="passport-portrait-frame">
          <div className="passport-portrait-matrix">
            <div className="matrix-column left" />
            <div className="matrix-column center" />
            <div className="matrix-column right" />
            <div className="portrait-head" />
            <div className="portrait-neck" />
            <div className="portrait-shoulders" />
          </div>
        </div>
      </div>

      <div className="passport-bottomline">
        <span>Identité numérique membre 3B</span>
        <span>{member.createdAt}</span>
      </div>
    </div>
  );
}

function HomePage({ go, member }) {
  const menuCards = [
    {
      icon: "🛍️",
      title: "Boutique",
      subtitle: "Produits premium, drops et collections.",
      page: "boutique",
    },
    {
      icon: "♪",
      title: "Musique",
      subtitle: "20 cases prêtes pour tes fichiers audio.",
      page: "musique",
    },
    {
      icon: "👥",
      title: "Communauté",
      subtitle: "Échange, réseau et espace de discussion 3B.",
      page: "communaute",
    },
    {
      icon: "🪪",
      title: "Passeport 3B",
      subtitle: member ? "Ton passeport numérique premium." : "Crée ton passeport numérique premium.",
      page: "passeport",
    },
    {
      icon: "🎮",
      title: "Jeux",
      subtitle: "Jeu 3B, XP, progression et classement.",
      page: "jeux",
    },
    {
      icon: "🔐",
      title: "Coffre secret 3B",
      subtitle: "Saisir le code secret pour débloquer l’indice.",
      page: "secret",
    },
    {
      icon: "💎",
      title: "Espace membre 3B",
      subtitle: member ? "Profil, suivi, progression et avantages." : "Se débloque après création du passeport.",
      page: "espace-membre",
    },
    {
      icon: "☆",
      title: "Encore",
      subtitle: "Créateurs, extras, certificats et futures extensions.",
      page: "encore",
    },
  ];

  return (
    <div className="page">
      <div className="home-hero-grid">
        <div className="home-hero-copy">
          <div className="home-main-brand">3B INTERNATIONAL</div>
          <h1 className="home-main-title">VÊTEMENTS HAUT DE GAMME</h1>
          <div className="home-main-tagline">
            BLACK • BLANC • BEUR — ce n’est pas une marque, c’est un héritage.
          </div>
        </div>

        <SectionCard
          badge={member ? "Membre 3B" : "Visiteur de mode"}
          title={
            member
              ? `Bienvenue ${member.name} dans l’écosystème 3B`
              : "Bienvenue dans l’écosystème 3B"
          }
          subtitle={
            member
              ? "Ton passeport est actif. Tu peux continuer ton évolution, tes jeux et ton suivi membre."
              : "Explore le menu, crée ton passeport et débloque ton espace membre."
          }
        />
      </div>

      <div className="menu-grid">
        {menuCards.map((card) => (
          <MenuCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            subtitle={card.subtitle}
            onClick={() => go(card.page)}
          />
        ))}
      </div>
    </div>
  );
}

function BoutiquePage({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <PageHeader
        title="Boutique 3B"
        subtitle="Produits premium, prototypes, drops et collections à venir."
      />

      <div className="content-grid">
        <SectionCard title="Focus boutique" subtitle="Vision luxe, sport et héritage.">
          <ul className="bullet-list">
            <li>Maillots premium</li>
            <li>Polos et vêtements haut de gamme</li>
            <li>Drops exclusifs 3B International</li>
            <li>Certificats et éditions spéciales</li>
          </ul>
        </SectionCard>

        <SectionCard title="État actuel" subtitle="Préparation de la boutique.">
          <p className="soft-text">
            Cette zone est prête pour afficher tes visuels produits, tes prix, tes tailles, tes éditions et tes liens de vente.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

function MusicPage({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <PageHeader
        title="Musique 3B"
        subtitle="20 cases prêtes pour tes musiques, liens et téléchargements."
      />

      <div className="music-grid">
        {MUSIC_SLOTS.map((slot) => (
          <SectionCard
            key={slot.id}
            className="music-slot-card"
            title={`Musique ${slot.id}`}
            subtitle={`${slot.state} pour upload / titre / lien`}
            actions={<button className="small-outline-btn">Ajouter</button>}
          >
            <div className="music-slot-content">
              <div className="music-slot-title">{slot.title}</div>
              <div className="music-slot-actions">
                <button className="small-gold-btn">Téléverser</button>
                <button className="small-outline-btn">Télécharger</button>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

function CommunityPage({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <PageHeader
        title="Communauté 3B"
        subtitle="Échange, réseau, entraide et futur chat temps réel."
      />

      <div className="content-grid">
        <SectionCard title="Espace discussion" subtitle="Zone communauté premium.">
          <p className="soft-text">
            Ici tu peux brancher plus tard le vrai tchat temps réel, les salons, le fil de discussion et la mise à jour live avec Supabase.
          </p>
        </SectionCard>

        <SectionCard title="Fonctions prévues" subtitle="La logique reste prête.">
          <ul className="bullet-list">
            <li>Chat temps réel</li>
            <li>Partage visuels / musique</li>
            <li>Système de créateurs</li>
            <li>Missions et défis communauté</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function SecretPage({ go }) {
  const [value, setValue] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState("");

  const handleUnlock = () => {
    const clean = value.trim().toLowerCase();
    if (clean === "italie") {
      setUnlocked(true);
      setMessage("Indice débloqué.");
    } else {
      setUnlocked(false);
      setMessage("Code incorrect.");
    }
  };

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <PageHeader
        title="Coffre secret 3B"
        subtitle="Entre le code secret pour débloquer l’indice."
      />

      <div className="content-grid">
        <SectionCard title="Zone secrète" subtitle="Le code n’est jamais affiché à l’écran.">
          <div className="secret-entry-row">
            <input
              className="text-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Code secret"
            />
            <button className="gold-button" onClick={handleUnlock}>
              Débloquer
            </button>
          </div>

          {message ? (
            <div className={`feedback-box ${unlocked ? "success" : "error"}`}>{message}</div>
          ) : null}
        </SectionCard>

        <SectionCard title="Verrouillage d’accès" subtitle="Le contenu reste masqué tant que le bon code n’est pas validé.">
          {unlocked ? (
            <div className="secret-result">
              <strong>Indice :</strong>
              <p>Italie s’y comprennent — 8 logos — 20h — tout va commencer.</p>
            </div>
          ) : (
            <p className="soft-text">
              Le contenu secret apparaîtra ici après validation du bon code.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function PassportPage({ go, member, setMember }) {
  const [form, setForm] = useState(() => ({
    name: member?.name || "Zakaria",
    email: member?.email || "",
    originCountry: member?.originCountry || "France",
    residenceCountry: member?.residenceCountry || "France",
    city: member?.city || "",
  }));

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createPassport = () => {
    if (!form.name.trim() || !form.email.trim() || !form.city.trim()) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      originCountry: form.originCountry,
      residenceCountry: form.residenceCountry,
      city: form.city.trim(),
      number: generatePassportNumber(),
      createdAt: new Date().toLocaleDateString("fr-FR"),
      status: "Membre 3B",
    };

    setMember(payload);
  };

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <PageHeader
        title="Passeport 3B"
        subtitle="Accès membre et identité numérique 3B."
      />

      {!member ? (
        <div className="content-grid">
          <SectionCard title="Créer ton passeport" subtitle="Active ton identité 3B.">
            <div className="form-grid">
              <input
                className="text-input"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Nom ou pseudo"
              />
              <input
                className="text-input"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Adresse e-mail"
              />
              <select
                className="text-input"
                value={form.originCountry}
                onChange={(e) => handleChange("originCountry", e.target.value)}
              >
                {OFFICIAL_COUNTRIES.map((country) => (
                  <option key={country.name} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
              <select
                className="text-input"
                value={form.residenceCountry}
                onChange={(e) => handleChange("residenceCountry", e.target.value)}
              >
                {OFFICIAL_COUNTRIES.map((country) => (
                  <option key={country.name} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
              <input
                className="text-input full-span"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Ville actuelle"
              />
            </div>

            <div className="button-row">
              <button className="gold-button" onClick={createPassport}>
                Créer mon passeport 3B
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Aperçu premium" subtitle="Ce que tu débloques ensuite.">
            <ul className="bullet-list">
              <li>Carte membre digitale</li>
              <li>Carte du monde 3B + zoom 8 pays</li>
              <li>Espace membre 3B</li>
              <li>Sauvegarde et suivi de progression</li>
            </ul>
          </SectionCard>
        </div>
      ) : (
        <div className="content-grid">
          <SectionCard
            title="Carte du monde 3B"
            subtitle="Vue monde + zoom premium sur les 8 pays officiels 3B. Seul le pays d’origine sélectionné pendant l’inscription est mis en avant."
          >
            <WorldMapVisual selectedCountry={member.originCountry} />
            <div className="map-separator" />
            <ZoomEightCountries selectedCountry={member.originCountry} />
          </SectionCard>

          <SectionCard title="Carte membre digitale" subtitle="Version luxe, futuriste, bleu digital effet matrix.">
            <DigitalPassportCard member={member} />
          </SectionCard>

          <SectionCard title="Informations membre" subtitle="Identité et statut.">
            <div className="info-list">
              <div><span>Nom</span><strong>{member.name}</strong></div>
              <div><span>E-mail</span><strong>{member.email}</strong></div>
              <div><span>Statut</span><strong>{member.status}</strong></div>
              <div><span>Date</span><strong>{member.createdAt}</strong></div>
            </div>
          </SectionCard>

          <SectionCard title="Résidence et origine" subtitle="Repères du membre 3B.">
            <div className="info-list">
              <div><span>Pays 3B</span><strong>{member.originCountry}</strong></div>
              <div><span>Résidence</span><strong>{member.residenceCountry}</strong></div>
              <div><span>Ville</span><strong>{member.city}</strong></div>
              <div><span>Numéro</span><strong>{member.number}</strong></div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function GamesHubPage({ go, member, gameProfile, leaderboard }) {
  const modeText = member ? "Mode membre détecté." : "Mode invité détecté.";
  const saveText = member
    ? "Sauvegarde active avec ton passeport 3B."
    : "Sans passeport, la progression n’est pas sauvegardée automatiquement.";

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <PageHeader
        title="Jeu 3B"
        subtitle="Centre de lancement du jeu actuel."
      />

      <div className="content-grid">
        <SectionCard title="Jeu actuel" subtitle="Portes 3B — progression, variété et évolution.">
          <p className="soft-text">
            1000 niveaux • 10 portes par niveau • plusieurs mécaniques • difficulté progressive.
          </p>
          <div className="button-row">
            <button className="gold-button" onClick={() => go("jeux-play")}>
              Ouvrir le jeu
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Sauvegarde" subtitle="Gestion automatique du mode de jeu.">
          <p className="soft-text">{saveText}</p>
        </SectionCard>

        <SectionCard title="Classement" subtitle="Le classement général du jeu reste dans cette case uniquement.">
          <div className="leaderboard-list">
            {leaderboard.slice(0, 5).map((entry) => (
              <div className="leaderboard-row" key={`${entry.name}-${entry.rank}`}>
                <span>#{entry.rank}</span>
                <span>{entry.name}</span>
                <span>Niv. {entry.level}</span>
                <strong>XP {entry.xp}</strong>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Mode actuel" subtitle={modeText}>
          <div className="info-list">
            <div><span>Niveau</span><strong>{gameProfile.level} / 1000</strong></div>
            <div><span>Porte</span><strong>{gameProfile.door} / 10</strong></div>
            <div><span>XP jeu</span><strong>{gameProfile.xp}</strong></div>
            <div><span>Temps</span><strong>{formatDuration(gameProfile.elapsedSeconds)}</strong></div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function MemberPage({ go, member, gameProfile, leaderboard }) {
  if (!member) {
    return (
      <div className="page">
        <BackButton onClick={() => go("home")} />
        <PageHeader
          title="Espace membre 3B"
          subtitle="Tu dois d’abord créer ton passeport 3B pour débloquer cet espace."
        />

        <div className="content-grid">
          <SectionCard title="Accès verrouillé" subtitle="Déverrouillage par passeport.">
            <p className="soft-text">
              Crée ton passeport depuis le menu principal pour activer ton espace membre.
            </p>
            <div className="button-row">
              <button className="gold-button" onClick={() => go("passeport")}>
                Aller au passeport
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <PageHeader
        title="Espace membre 3B"
        subtitle="Suivi, profil, progression, fidélité et état du compte."
      />

      <div className="content-grid">
        <SectionCard title="Résumé membre" subtitle="Identité générale.">
          <div className="info-list">
            <div><span>Nom</span><strong>{member.name}</strong></div>
            <div><span>Numéro</span><strong>{member.number}</strong></div>
            <div><span>Statut</span><strong>{member.status}</strong></div>
            <div><span>Créé le</span><strong>{member.createdAt}</strong></div>
          </div>
        </SectionCard>

        <SectionCard title="Jeux de progression" subtitle="Avancement global joueur.">
          <div className="info-list">
            <div><span>Niveau</span><strong>{gameProfile.level} / 1000</strong></div>
            <div><span>Porte</span><strong>{gameProfile.door} / 10</strong></div>
            <div><span>XP</span><strong>{gameProfile.xp}</strong></div>
            <div><span>Progression totale</span><strong>{gameProfile.totalPercent}%</strong></div>
          </div>
        </SectionCard>

        <SectionCard title="Activité" subtitle="Temps réel et historique simple.">
          <div className="info-list">
            <div><span>Réponses validées</span><strong>{gameProfile.correctAnswers}</strong></div>
            <div><span>Erreurs</span><strong>{gameProfile.wrongAnswers}</strong></div>
            <div><span>Indices utilisés</span><strong>{gameProfile.hintsUsed}</strong></div>
            <div><span>Temps de jeu</span><strong>{formatDuration(gameProfile.elapsedSeconds)}</strong></div>
          </div>
        </SectionCard>

        <SectionCard title="Fidélité & avantages" subtitle="Base stratégique membre.">
          <ul className="bullet-list">
            <li>Passeport 3B actif</li>
            <li>Accès à l’espace membre</li>
            <li>Suivi de progression</li>
            <li>Base pour futur certificat, drops et inventaire</li>
          </ul>
        </SectionCard>

        <SectionCard title="Top classement actuel" subtitle="Repère rapide.">
          <div className="leaderboard-list">
            {leaderboard.slice(0, 5).map((entry) => (
              <div className="leaderboard-row" key={`${entry.name}-${entry.rank}`}>
                <span>#{entry.rank}</span>
                <span>{entry.name}</span>
                <span>Niv. {entry.level}</span>
                <strong>XP {entry.xp}</strong>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Accès rapide" subtitle="Navigation utile.">
          <div className="quick-action-grid">
            <button className="blue-button" onClick={() => go("jeux")}>Aller au jeu</button>
            <button className="blue-button" onClick={() => go("passeport")}>Voir le passeport</button>
            <button className="blue-button" onClick={() => go("secret")}>Ouvrir le coffre</button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function EncorePage({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <PageHeader
        title="Encore"
        subtitle="Créateurs, certificats, extensions et futures branches 3B."
      />

      <div className="content-grid">
        <SectionCard title="Créateurs / commandes" subtitle="Module prêt pour la suite.">
          <p className="soft-text">
            Ici tu pourras brancher plus tard les créateurs, les commandes, les certifications produit et d’autres extensions.
          </p>
        </SectionCard>

        <SectionCard title="Vision" subtitle="Écosystème en croissance.">
          <ul className="bullet-list">
            <li>Programme créateurs</li>
            <li>Certificat QR</li>
            <li>Fidélité / drops / inventaire</li>
            <li>Évolutions futures de l’app</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [member, setMember] = useState(loadMember);
  const [gameProfile, setGameProfile] = useState(loadGame);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (member) {
      localStorage.setItem(STORAGE_MEMBER_KEY, JSON.stringify(member));
      localStorage.setItem(STORAGE_GAME_KEY, JSON.stringify(gameProfile));
    } else {
      localStorage.removeItem(STORAGE_MEMBER_KEY);
    }
  }, [member, gameProfile]);

  useEffect(() => {
    setGameProfile((prev) => ({
      ...prev,
      totalPercent: calcGlobalProgress(prev.level, prev.door),
      lastMode: member ? "membre" : "invité",
    }));
  }, [member]);

  const leaderboard = useMemo(
    () => buildLeaderboard(member, gameProfile),
    [member, gameProfile]
  );

  const go = (nextPage) => setPage(nextPage);

  return (
    <div className="app-shell">
      <div className="app-backdrop" />

      <main className="app-content">
        {page === "home" && <HomePage go={go} member={member} />}

        {page === "boutique" && <BoutiquePage go={go} />}

        {page === "musique" && <MusicPage go={go} />}

        {page === "communaute" && <CommunityPage go={go} />}

        {page === "passeport" && (
          <PassportPage go={go} member={member} setMember={setMember} />
        )}

        {page === "secret" && <SecretPage go={go} />}

        {page === "jeux" && (
          <GamesHubPage
            go={go}
            member={member}
            gameProfile={gameProfile}
            leaderboard={leaderboard}
          />
        )}

        {page === "jeux-play" && (
          <Jeu3B
            member={member}
            gameProfile={gameProfile}
            setGameProfile={setGameProfile}
            onBack={() => go("jeux")}
          />
        )}

        {page === "espace-membre" && (
          <MemberPage
            go={go}
            member={member}
            gameProfile={gameProfile}
            leaderboard={leaderboard}
          />
        )}

        {page === "encore" && <EncorePage go={go} />}
      </main>
    </div>
  );
}