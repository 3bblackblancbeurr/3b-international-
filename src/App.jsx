import { useMemo, useState } from "react";
import "./App.css";

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

const origin3BCountries = official3BCountries.map((c) => c.name);

const residenceCountries = [
  "France", "Maroc", "Algérie", "Tunisie", "Italie", "Espagne", "Turquie", "Estonie",
  "Portugal", "Belgique", "Suisse", "Allemagne", "Royaume-Uni", "Irlande", "Pays-Bas",
  "Luxembourg", "Autriche", "Pologne", "République tchèque", "Slovaquie", "Hongrie",
  "Roumanie", "Bulgarie", "Grèce", "Croatie", "Slovénie", "Serbie", "Bosnie-Herzégovine",
  "Albanie", "Monténégro", "Macédoine du Nord", "Kosovo", "Danemark", "Suède", "Norvège",
  "Finlande", "Islande", "Lettonie", "Lituanie", "Ukraine", "Moldavie", "Malte", "Chypre",
  "États-Unis", "Canada", "Mexique", "Brésil", "Argentine", "Colombie", "Chili", "Pérou",
  "Sénégal", "Mali", "Côte d’Ivoire", "Comores", "Cameroun", "Gabon", "Congo",
  "République démocratique du Congo", "Guinée", "Guinée-Bissau", "Burkina Faso", "Niger",
  "Tchad", "Mauritanie", "Égypte", "Libye", "Afrique du Sud", "Madagascar", "Arabie saoudite",
  "Émirats arabes unis", "Qatar", "Koweït", "Jordanie", "Liban", "Palestine", "Inde",
  "Pakistan", "Chine", "Japon", "Corée du Sud", "Australie", "Autre pays",
];

const memberCards = [
  { name: "Découverte 3B", status: "automatique", type: "inscription", icon: "💠" },
  { name: "Héritier 3B", status: "bloquée", type: "points futurs", icon: "♛" },
  { name: "Gardien 3B", status: "bloquée", type: "points futurs", icon: "🛡️" },
  { name: "Élite 3B", status: "bloquée", type: "mission future", icon: "✦" },
  { name: "Légende 3B", status: "sur demande", type: "commande premium", icon: "★" },
  { name: "Secret 3B", status: "sur demande", type: "accès spécial", icon: "🔐" },
  { name: "Musique 3B", status: "sur demande", type: "univers musical", icon: "♪" },
  { name: "Jeux 3B", status: "sur demande", type: "Jeux XP", icon: "🎮" },
  { name: "International 3B", status: "sur demande", type: "monde 3B", icon: "🌍" },
  { name: "Drop 3B", status: "sur demande", type: "drop privé", icon: "🔥" },
  { name: "Prototype 3B", status: "sur demande", type: "prototype", icon: "🎁" },
  { name: "Legacy 3B", status: "sur demande", type: "patrimoine", icon: "◆" },
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCountry(name) {
  return official3BCountries.find((c) => normalize(c.name) === normalize(name));
}

function getLevel(points) {
  if (points >= 10000) return { name: "Légende", next: 10000, icon: "◆", percent: 100 };
  if (points >= 6000) return { name: "Élite", next: 10000, icon: "✦", percent: Math.round((points / 10000) * 100) };
  if (points >= 3000) return { name: "Gardien", next: 6000, icon: "🛡️", percent: Math.round((points / 6000) * 100) };
  if (points >= 1500) return { name: "Héritier", next: 3000, icon: "♛", percent: Math.round((points / 3000) * 100) };
  if (points >= 500) return { name: "Membre 3B", next: 1500, icon: "3B", percent: Math.round((points / 1500) * 100) };
  return { name: "Découverte", next: 500, icon: "3B", percent: Math.round((points / 500) * 100) };
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
  const r = 47;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(percent, 100) / 100) * c;

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
          {percent}%
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
    <div className="passport-visual">
      <div className="passport-inner">
        <strong>3B</strong>
        <span>PASSEPORT DIGITAL</span>
        <em>{member?.pseudo || "Membre 3B"}</em>
        <div className="qr-box">QR</div>
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
        <span>{selected.flag} {selected.name} activé</span>
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
    <section className="worldmap-card">
      <h3>Carte du monde 3B</h3>
      <p>
        Vue monde + zoom sur les 8 pays 3B. Seul le pays d’origine 3B choisi pendant
        l’inscription se déverrouille.
      </p>

      <div className="world-strip">
        <svg viewBox="0 0 900 260" width="100%" height="100%">
          <rect width="900" height="260" fill="#061018" />
          <g opacity="0.28">
            {Array.from({ length: 50 }).map((_, i) => (
              <text key={i} x={(i * 41) % 870} y={20 + ((i * 23) % 220)} fill="#58b5ea" fontSize="9">
                010110101001
              </text>
            ))}
          </g>
          <path d="M70 110 C100 65 190 65 230 115 C245 150 200 178 135 166 C92 158 55 140 70 110Z" className="land" />
          <path d="M210 178 C260 175 300 210 278 250 C238 252 205 226 210 178Z" className="land" />
          <path d="M360 90 C430 42 565 55 610 120 C640 170 555 196 460 170 C395 152 330 125 360 90Z" className="land" />
          <path d="M450 178 C515 168 570 205 560 250 C500 260 445 226 450 178Z" className="land" />
          <path d="M640 115 C720 80 845 120 850 170 C825 220 675 205 640 115Z" className="land" />
          {official3BCountries.map((country) => {
            const isUnlocked = unlocked?.name === country.name;
            return (
              <circle
                key={country.name}
                cx={country.x}
                cy={country.y / 2}
                r={isUnlocked ? 8 : 5}
                className={isUnlocked ? "map-dot unlocked" : "map-dot"}
              />
            );
          })}
        </svg>
      </div>

      <div className="world-zoom">
        <svg viewBox="0 0 900 520" width="100%" height="100%">
          <rect width="900" height="520" fill="#061018" />
          <g opacity="0.3">
            {Array.from({ length: 26 }).map((_, i) => (
              <line key={`h-${i}`} x1="0" x2="900" y1={i * 20} y2={i * 20} stroke="#174660" />
            ))}
            {Array.from({ length: 36 }).map((_, i) => (
              <line key={`v-${i}`} y1="0" y2="520" x1={i * 25} x2={i * 25} stroke="#174660" />
            ))}
          </g>

          <path d="M95 270 C155 210 235 205 310 225 C355 195 420 150 520 155 C610 160 685 230 725 300 C660 280 590 265 520 285 C455 300 410 365 300 370 C185 374 95 335 95 270Z" className="continent" />
          <path d="M205 310 C250 300 310 320 330 355 C300 390 220 385 175 350 C160 328 175 315 205 310Z" className="continent" />
          <path d="M400 270 C430 260 465 275 470 305 C460 335 420 345 395 318 C382 300 385 280 400 270Z" className="continent" />
          <path d="M625 300 C680 270 755 292 760 330 C725 370 640 360 608 330 C598 318 605 308 625 300Z" className="continent" />

          {official3BCountries.map((country) => {
            const isUnlocked = unlocked?.name === country.name;
            return (
              <g key={country.name}>
                <line x1={country.x} y1={country.y} x2={country.x + 22} y2={country.y - 22} className="map-line" />
                <circle cx={country.x} cy={country.y} r={isUnlocked ? 8 : 6} className={isUnlocked ? "map-dot unlocked" : "map-dot"} />
                <rect x={country.x + 18} y={country.y - 38} width={country.name.length * 8 + 34} height="24" rx="8" className={isUnlocked ? "label unlocked" : "label"} />
                <text x={country.x + 34} y={country.y - 22} className="country-label">{country.name}</text>
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
        {member && (
          <MenuCard icon="💎" title="Espace Membre 3B" onClick={() => go("espace-membre")} />
        )}
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
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <h1>Musique</h1>
      <div className="gold-line">◆</div>

      <div className="page-grid">
        {Array.from({ length: 20 }).map((_, i) => (
          <button className="track-card" key={i}>
            <span>▶</span>
            <div>
              <strong>{String(i + 1).padStart(2, "0")}</strong>
              <p>Piste {String(i + 1).padStart(2, "0")}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Communaute({ go }) {
  const posts = [
    ["Alexandre M.", "3B Élite", "Très belle journée à tous ! Restez focus et continuez d’avancer. ✨"],
    ["Sarah B.", "Ambassadrice 3B", "Qui participe à l’atelier de ce soir ? 🙏"],
    ["Julien T.", "3B Leader", "Je partagerai ma stratégie sur les réseaux à 18h. 🔥"],
    ["3B International", "Officiel", "Rappel : webinaire exclusif ce jeudi à 20h. 🚀"],
  ];

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <h1>Communauté</h1>
      <div className="gold-line">◆</div>

      <div className="stats-card">
        <div><strong>1 256</strong><span>Membres</span></div>
        <div><strong>24</strong><span>En ligne</span></div>
        <div><strong>387</strong><span>Messages aujourd’hui</span></div>
      </div>

      <div className="page-grid">
        {posts.map(([name, role, text]) => (
          <InfoCard key={name} title={name} visual={<div className="avatar-big">{name === "3B International" ? "3B" : "👤"}</div>}>
            <p>{role}</p>
            <p>{text}</p>
          </InfoCard>
        ))}
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
          <p>Live TikTok 3B International.</p>
          <p
            style={{
              color: "#e2be64",
              letterSpacing: "3px",
              textTransform: "uppercase",
              fontStyle: "italic",
              fontWeight: "800",
            }}
          >
            Salon Italie — Haute Couture 3B
          </p>
          <p>
            Quand vous arriverez dans mon monde, vous comprendrez que 3B International
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

function Jeux({ go, member }) {
  const gamePercent = member ? Math.min(Math.round(((member.gamePoints || 0) / 500) * 100), 100) : 0;

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <h1>Jeux 3B</h1>
      <div className="gold-line">◆</div>

      <div className="page-grid">
        <InfoCard title="Jeux à venir" visual={<LevelLogo level={{ name: "Jeux", icon: "🎮" }} />}>
          <p>Mini-jeux 3B</p>
          <p>Défis communautaires</p>
          <p>Classements entre membres</p>
          <p>Points gagnés en jouant</p>
        </InfoCard>

        <InfoCard title="XP Jeux 3B" visual={<ProgressCircle percent={gamePercent} label="XP Jeux" icon="🎮" />}>
          <p>Points jeux : {member?.gamePoints || 0}</p>
          <p>Victoire : points bonus</p>
          <p>Passage de niveau : points bonus</p>
          <p>Le logo Jeux deviendra évolutif plus tard.</p>
        </InfoCard>
      </div>
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

      <div className="page-grid">
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
      email: form.email.trim() || "email non renseigné",
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

      <div className="page-grid">
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
            {origin3BCountries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </Field>

        <Field icon="📍">
          <select value={form.residenceCountry} onChange={(e) => update("residenceCountry", e.target.value)}>
            <option value="">Pays de résidence actuel</option>
            {residenceCountries.map((country) => <option key={country} value={country}>{country}</option>)}
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
      <div className="page-grid">
        <Field icon="✉️"><input placeholder="Adresse e-mail" /></Field>
        <Field icon="🔒"><input type="password" placeholder="Mot de passe" /></Field>
        <MenuCard icon="◆" title="Entrer dans mon Passeport" onClick={() => go("passeport")} />
      </div>
    </div>
  );
}

function Passeport({ go, member }) {
  const profile = member || {
    pseudo: "Membre 3B",
    email: "email non renseigné",
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

      <div className="page-grid">
        <InfoCard title="Carte membre digitale" visual={<PassportCardVisual member={profile} />}>
          <p>Nom : {profile.pseudo}</p>
          <p>E-mail : {profile.email}</p>
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

function EspaceMembre({ go, member }) {
  const profile = member || {
    points: 0,
    gamePoints: 0,
    level: "Découverte",
    originCountry: "Non renseigné",
    unlockedCountry: "Aucun pays 3B officiel",
  };

  const level = getLevel(profile.points);
  const gamePercent = Math.min(Math.round(((profile.gamePoints || 0) / 500) * 100), 100);
  const unlocked = getCountry(profile.originCountry);

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />
      <h1>Espace Membre 3B</h1>
      <div className="gold-line">◆</div>

      <div className="page-grid">
        <InfoCard title="Résumé actuel" visual={<LevelLogo level={level} />}>
          <p>Points 3B : {profile.points}</p>
          <p>Points jeux : {profile.gamePoints || 0}</p>
          <p>Niveau actuel : {level.name}</p>
          <p>Prochain palier : {level.next} points</p>
        </InfoCard>

        <InfoCard title="Progression niveau" visual={<ProgressCircle percent={level.percent} label={`Vers ${level.next} points`} icon={level.icon} />}>
          <p>La progression est volontairement plus lente.</p>
          <p>Les niveaux font évoluer le statut et le logo.</p>
          <p>Les cartes restent séparées des niveaux.</p>
        </InfoCard>

        <InfoCard title="Progression Jeux 3B" visual={<ProgressCircle percent={gamePercent} label="XP Jeux" icon="🎮" />}>
          <p>Points jeux : {profile.gamePoints || 0}</p>
          <p>Gagner un jeu : points bonus.</p>
          <p>Passer un niveau : points bonus.</p>
          <p>Le logo Jeux deviendra évolutif.</p>
        </InfoCard>

        <InfoCard title="Pays verrouillés" visual={<FlagVisual country={unlocked} />}>
          {official3BCountries.map((country) => {
            const active = unlocked?.name === country.name;
            return <p key={country.name}>{country.flag} {active ? "✅ Déverrouillé" : "🔒 Verrouillé"} : {country.name}</p>;
          })}
        </InfoCard>

        <InfoCard title="Avantages à débloquer" visual={<PassportCardVisual member={member} />}>
          <p>Accès au Passeport 3B</p>
          <p>Indices supplémentaires selon niveau</p>
          <p>Suivi des cartes possédées</p>
          <p>Drops privés plus tard</p>
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
            {memberCards.map((card) => <MiniCard key={card.name} card={card} />)}
          </div>
        </InfoCard>

        <InfoCard title="QR Code et certificat futur" visual={<div className="qr-large">QR</div>}>
          <p>QR Code personnel du membre</p>
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
      <div className="page-grid">
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
      <div className="page-grid">
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
  const [member, setMember] = useState(null);

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
      {page === "jeux" && <Jeux go={go} member={member} />}
      {page === "passeport-access" && <PasseportAccess go={go} />}
      {page === "passeport-inscription" && <PasseportInscription go={go} setMember={setMember} />}
      {page === "passeport-connexion" && <PasseportConnexion go={go} />}
      {page === "passeport" && <Passeport go={go} member={member} />}
      {page === "espace-membre" && <EspaceMembre go={go} member={member} />}
      {page === "plus" && <PlusEncore go={go} />}
      {page === "fidelite" && <SimplePage go={go} title="Cartes de fidélité 3B" lines={[
        { title: "Carte Découverte", icon: "💠", text: "Automatique à l’inscription." },
        { title: "Cartes sur demande", icon: "💳", text: "La majorité des cartes seront demandées ou commandées." },
      ]} />}
      {page === "manga" && <SimplePage go={go} title="Manga 3B" lines={[
        { title: "Univers", icon: "📖", text: "Histoire, pays, personnages et secret 3B." },
        { title: "Chapitres", icon: "✦", text: "Chaque pays pourra devenir un chapitre 3B." },
      ]} />}
      {page === "logos" && <SimplePage go={go} title="8 logos internationaux" lines={official3BCountries.map((c) => ({
        title: c.name,
        icon: c.flag,
        text: `Logo officiel 3B ${c.name}.`,
      }))} />}
      {page === "createurs" && <SimplePage go={go} title="Créateurs / commandes" lines={[
        { title: "Créateurs", icon: "🎥", text: "Programme UGC, vidéos et contenus 3B." },
        { title: "Commandes", icon: "💻", text: "Demandes spéciales, visuels et créations." },
      ]} />}
      {page === "certificat" && <SimplePage go={go} title="Certificat produit" lines={[
        { title: "Authenticité", icon: "▣", text: "Produit officiel 3B avec numéro de série." },
        { title: "QR Code", icon: "QR", text: "Scan futur du produit et certificat digital." },
      ]} />}
    </main>
  );
}