import { useEffect, useMemo, useState } from "react";
import "./App.css";
import Jeu3B from "./Jeu3B";

const MEMBER_KEY = "3b_member_final_v1";
const SECRET_PASSWORD = "blackblancbeurr";

const countries = [
  { name: "France", flag: "🇫🇷", x: 42, y: 42, activeColor: "#18a8ff" },
  { name: "Italie", flag: "🇮🇹", x: 51, y: 52, activeColor: "#00d26a" },
  { name: "Estonie", flag: "🇪🇪", x: 57, y: 29, activeColor: "#61d8ff" },
  { name: "Turquie", flag: "🇹🇷", x: 72, y: 61, activeColor: "#ff2a2a" },
  { name: "Algérie", flag: "🇩🇿", x: 43, y: 70, activeColor: "#00c76a" },
  { name: "Tunisie", flag: "🇹🇳", x: 51, y: 65, activeColor: "#ff3232" },
  { name: "Maroc", flag: "🇲🇦", x: 32, y: 71, activeColor: "#ff1d1d" },
  { name: "Espagne", flag: "🇪🇸", x: 35, y: 54, activeColor: "#ffd400" },
];

const emptyMember = null;

function todayFr() {
  return new Date().toLocaleDateString("fr-FR");
}

function createPassportNumber() {
  return `3B-PASS-${Math.floor(1000 + Math.random() * 9000)}`;
}

function loadMember() {
  try {
    const saved = localStorage.getItem(MEMBER_KEY);
    return saved ? JSON.parse(saved) : emptyMember;
  } catch {
    return emptyMember;
  }
}

function saveMember(member) {
  if (!member) return;
  localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
}

function BackButton({ onClick }) {
  return (
    <button className="back-btn" onClick={onClick}>
      ← Retour
    </button>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <header className="page-title">
      <p className="mini-brand">3B INTERNATIONAL</p>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

function LuxCard({ title, children, className = "", visual }) {
  return (
    <section className={`lux-card ${className}`}>
      <div>
        <h2>{title}</h2>
        <div className="card-content">{children}</div>
      </div>
      {visual && <div className="card-visual">{visual}</div>}
    </section>
  );
}

function MenuCard({ icon, title, text, onClick }) {
  return (
    <button className="menu-card" onClick={onClick}>
      <span className="menu-icon">{icon}</span>
      <span className="menu-text">
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <span className="menu-arrow">›</span>
    </button>
  );
}

function Home({ go, member }) {
  return (
    <main className="page home-page">
      <div className="home-grid">
        <section className="hero-presentation">
          <p>3B INTERNATIONAL</p>
          <h1>VÊTEMENTS HAUT DE GAMME</h1>
          <span>Noir • Blanc • Beur — ce n’est pas une marque, c’est un héritage.</span>
        </section>

        <section className="lux-card welcome-card">
          <span className="pill">Visiteur de mode</span>
          <h2>Bienvenue dans l’écosystème 3B</h2>
          <p>
            Explorez le menu, créez votre passeport et débloquez votre espace
            membre.
          </p>
        </section>

        <MenuCard
          icon="🛍️"
          title="Boutique"
          text="Produits premium, drops et collections."
          onClick={() => go("boutique")}
        />
        <MenuCard
          icon="♪"
          title="Musique"
          text="20 cases prêtes pour tes fils et téléchargements."
          onClick={() => go("musique")}
        />
        <MenuCard
          icon="👥"
          title="Communauté"
          text="Échange, réseau et espace de discussion 3B."
          onClick={() => go("communaute")}
        />
        <MenuCard
          icon="▣"
          title="Passeport 3B"
          text="Créez votre passeport numérique premium."
          onClick={() => go(member ? "passeport" : "passport-access")}
        />
        <MenuCard
          icon="🎮"
          title="Jeux"
          text="Jeu 3B, XP, progression et classement."
          onClick={() => go("jeux")}
        />
        <MenuCard
          icon="🔐"
          title="Coffre secret 3B"
          text="Saisir le code secret pour débloquer l’indice."
          onClick={() => go("secret")}
        />
        {member && (
          <MenuCard
            icon="💎"
            title="Espace membre 3B"
            text="Suivi, XP, fidélité, classement et certificats."
            onClick={() => go("membre")}
          />
        )}
        <MenuCard
          icon="☆"
          title="Bis"
          text="Créateurs, extras, certificats et futures extensions."
          onClick={() => go("plus")}
        />
      </div>
    </main>
  );
}

function SimplePage({ go, title, subtitle, cards }) {
  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <PageTitle title={title} subtitle={subtitle} />
      <section className="page-grid">
        {cards.map((card, index) => (
          <LuxCard key={index} title={card.title} visual={card.visual}>
            {card.content}
          </LuxCard>
        ))}
      </section>
    </main>
  );
}

function MusicPage({ go }) {
  const tracks = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <PageTitle
        title="Musique 3B"
        subtitle="Album 3B International — 20 titres. Ajoute tes musiques dans les cases."
      />

      <section className="music-grid">
        {tracks.map((n) => (
          <div className="music-slot" key={n}>
            <div className="music-number">Titre {n}</div>
            <div className="music-icon">♪</div>
            <p>Case musique prête</p>
            <label>
              Ajouter un fichier
              <input type="file" accept="audio/*" />
            </label>
          </div>
        ))}
      </section>
    </main>
  );
}

function SecretPage({ go, member, setMember }) {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  function unlockSecret() {
    const clean = code.trim().toLowerCase().replaceAll(" ", "");
    if (clean === SECRET_PASSWORD) {
      setUnlocked(true);

      if (member) {
        const updated = {
          ...member,
          points: Math.max(member.points || 0, 170),
          secretUnlocked: true,
          lastActivity: "Indice secret Italie débloqué",
        };
        setMember(updated);
        saveMember(updated);
      }
    }
  }

  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <PageTitle
        title="Coffre secret 3B"
        subtitle="Entrez le code secret pour débloquer l’indice."
      />

      <section className="page-grid">
        <LuxCard title="Code secret">
          <div className="input-row">
            <input
              type="password"
              placeholder="Code secret"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") unlockSecret();
              }}
            />
            <button onClick={unlockSecret}>Débloquer</button>
          </div>
          <p className="muted">
            Le mot de passe n’est jamais affiché dans l’application.
          </p>
        </LuxCard>

        <LuxCard title="Verrouillage d’accès">
          <p>Le contenu secret apparaîtra ici après validation du bon code.</p>
        </LuxCard>

        {unlocked && (
          <LuxCard title="Indice débloqué" className="wide-card">
            <p className="secret-line">L’Italie s’y comprend — 8 juillet — 20h.</p>
            <p>TikTok en direct 3B International.</p>
            <p className="couture-line">SALON ITALIE — HAUTE COUTURE 3B</p>
            <p>
              Quand j’arriverai dans votre monde, vous comprendrez que 3B
              International entre dans une étape sérieuse : salon, Italie,
              présentation premium, univers luxe et ambition internationale.
            </p>
            <p>
              Récompense future : indice du prochain secret + prototype gratuit
              lors de sa sortie.
            </p>
          </LuxCard>
        )}
      </section>
    </main>
  );
}

function PassportAccess({ go, member }) {
  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <PageTitle
        title="Passeport 3B"
        subtitle="Accès membre et identité numérique 3B."
      />

      <section className="page-grid">
        <LuxCard title="Accès passeport">
          {member ? (
            <>
              <p>Votre passeport est déjà créé.</p>
              <button onClick={() => go("passeport")}>Ouvrir le passeport</button>
            </>
          ) : (
            <>
              <p>
                Créez votre passeport digital 3B pour débloquer votre espace
                membre, votre progression et votre identité numérique.
              </p>
              <button onClick={() => go("inscription")}>
                Créer mon Passeport 3B
              </button>
            </>
          )}
        </LuxCard>

        <LuxCard title="Déblocage">
          <p>
            Après création, une nouvelle case “Espace membre 3B” apparaît dans
            le menu général.
          </p>
        </LuxCard>
      </section>
    </main>
  );
}

function RegisterPassport({ go, setMember }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    origin: "France",
    residence: "",
    city: "",
  });

  function update(name, value) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  function createMember() {
    const member = {
      id: createPassportNumber(),
      name: form.name.trim() || "Membre 3B",
      email: form.email.trim() || "courriel non renseigné",
      origin: form.origin || "France",
      residence: form.residence.trim() || "Non renseigné",
      city: form.city.trim() || "Non renseignée",
      createdAt: todayFr(),
      status: "Membre 3B",
      points: 0,
      gamePoints: 0,
      gameLevel: 1,
      gameDoor: 1,
      bestStreak: 0,
      hintsUsed: 0,
      validatedAnswers: 0,
      playSeconds: 0,
      secretUnlocked: false,
      lastActivity: "Passeport créé",
    };

    setMember(member);
    saveMember(member);
    go("passeport");
  }

  return (
    <main className="page">
      <BackButton onClick={() => go("passport-access")} />
      <PageTitle
        title="Inscription 3B"
        subtitle="Créez votre Passeport digital 3B pour débloquer votre accès membre."
      />

      <section className="page-grid">
        <LuxCard title="Informations membre">
          <div className="form-grid">
            <input
              placeholder="Nom ou pseudo"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
            <input
              placeholder="Adresse e-mail"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
            <select
              value={form.origin}
              onChange={(e) => update("origin", e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Pays de résidence actuelle"
              value={form.residence}
              onChange={(e) => update("residence", e.target.value)}
            />
            <input
              placeholder="Ville actuelle"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>
          <button onClick={createMember}>Créer mon Passeport 3B</button>
        </LuxCard>

        <LuxCard title="Choix du pays 3B">
          <p>
            Le pays d’origine 3B choisi pendant l’inscription sera le premier
            pays débloqué.
          </p>
          <p>Les autres pays 3B restent verrouillés.</p>
        </LuxCard>
      </section>
    </main>
  );
}

function MatrixWorldMap({ activeCountry }) {
  const active = countries.find((c) => c.name === activeCountry) || countries[0];

  return (
    <div className="matrix-map">
      <svg viewBox="0 0 900 420" role="img">
        <defs>
          <linearGradient id="ocean" x1="0" x2="1">
            <stop offset="0%" stopColor="#06131c" />
            <stop offset="50%" stopColor="#08263a" />
            <stop offset="100%" stopColor="#06121b" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="900" height="420" rx="28" fill="url(#ocean)" />
        {Array.from({ length: 18 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 52}
            y1="0"
            x2={i * 52}
            y2="420"
            stroke="#0aa8ff"
            strokeOpacity="0.08"
          />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 52}
            x2="900"
            y2={i * 52}
            stroke="#0aa8ff"
            strokeOpacity="0.08"
          />
        ))}

        <path
          d="M105 158 C115 70 210 45 286 82 C345 110 355 184 309 225 C263 265 179 243 132 212 C113 199 103 180 105 158Z"
          fill="#0b6f9c"
          stroke="#24d9ff"
          strokeWidth="3"
          opacity="0.82"
          filter="url(#glow)"
        />
        <path
          d="M354 95 C418 47 535 49 587 107 C631 155 604 232 542 257 C467 286 373 238 340 181 C320 146 327 118 354 95Z"
          fill="#0b6f9c"
          stroke="#24d9ff"
          strokeWidth="3"
          opacity="0.82"
          filter="url(#glow)"
        />
        <path
          d="M628 120 C687 72 783 92 813 158 C840 220 790 278 715 276 C649 274 600 219 610 161 C613 144 619 130 628 120Z"
          fill="#0b6f9c"
          stroke="#24d9ff"
          strokeWidth="3"
          opacity="0.82"
          filter="url(#glow)"
        />
        <path
          d="M452 287 C497 258 578 269 607 324 C630 370 590 402 526 397 C467 393 420 352 430 317 C433 304 441 294 452 287Z"
          fill="#0b6f9c"
          stroke="#24d9ff"
          strokeWidth="3"
          opacity="0.78"
          filter="url(#glow)"
        />
        <path
          d="M760 304 C810 290 862 315 872 356 C881 393 846 414 795 405 C750 397 719 366 731 335 C736 320 746 310 760 304Z"
          fill="#0b6f9c"
          stroke="#24d9ff"
          strokeWidth="3"
          opacity="0.78"
          filter="url(#glow)"
        />

        {countries.map((c) => (
          <g key={c.name}>
            <circle
              cx={(c.x / 100) * 900}
              cy={(c.y / 100) * 420}
              r={c.name === active.name ? 10 : 6}
              fill={c.name === active.name ? "#ffd86b" : "#baf8ff"}
              stroke="#24d9ff"
              strokeWidth="3"
              filter="url(#glow)"
            />
          </g>
        ))}

        {Array.from({ length: 48 }).map((_, i) => (
          <text
            key={`code-${i}`}
            x={(i * 73) % 880}
            y={30 + ((i * 41) % 360)}
            fill="#5be9ff"
            opacity="0.16"
            fontSize="11"
            fontFamily="monospace"
          >
            010101 3B
          </text>
        ))}
      </svg>
    </div>
  );
}

function ZoomMap({ activeCountry }) {
  const active = countries.find((c) => c.name === activeCountry) || countries[0];

  const zoomCountries = [
    { name: "France", flag: "🇫🇷", x: 30, y: 38 },
    { name: "Espagne", flag: "🇪🇸", x: 24, y: 58 },
    { name: "Maroc", flag: "🇲🇦", x: 20, y: 75 },
    { name: "Algérie", flag: "🇩🇿", x: 38, y: 76 },
    { name: "Tunisie", flag: "🇹🇳", x: 48, y: 68 },
    { name: "Italie", flag: "🇮🇹", x: 48, y: 49 },
    { name: "Estonie", flag: "🇪🇪", x: 58, y: 18 },
    { name: "Turquie", flag: "🇹🇷", x: 74, y: 62 },
  ];

  return (
    <div className="zoom-map">
      <svg viewBox="0 0 900 430" role="img">
        <defs>
          <filter id="zoomGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="900" height="430" rx="28" fill="#05141f" />
        {Array.from({ length: 16 }).map((_, i) => (
          <line
            key={`zv-${i}`}
            x1={i * 60}
            y1="0"
            x2={i * 60}
            y2="430"
            stroke="#15d8ff"
            strokeOpacity="0.07"
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`zh-${i}`}
            x1="0"
            y1={i * 60}
            x2="900"
            y2={i * 60}
            stroke="#15d8ff"
            strokeOpacity="0.07"
          />
        ))}

        <path
          d="M160 160 C240 85 355 95 430 165 C500 230 505 315 420 348 C315 389 200 330 142 250 C117 215 124 186 160 160Z"
          fill="#0c6e9c"
          stroke="#24d9ff"
          strokeWidth="4"
          opacity="0.82"
          filter="url(#zoomGlow)"
        />
        <path
          d="M402 148 C486 96 625 105 718 174 C805 239 785 330 674 355 C550 384 448 326 390 241 C365 205 369 169 402 148Z"
          fill="#0c6e9c"
          stroke="#24d9ff"
          strokeWidth="4"
          opacity="0.82"
          filter="url(#zoomGlow)"
        />
        <path
          d="M288 290 C360 257 482 270 530 342 C555 379 520 409 441 410 C350 411 271 370 255 330 C248 313 258 300 288 290Z"
          fill="#0c6e9c"
          stroke="#24d9ff"
          strokeWidth="4"
          opacity="0.76"
          filter="url(#zoomGlow)"
        />
        <path
          d="M636 272 C712 242 812 266 832 326 C845 366 792 398 714 383 C650 371 603 328 616 295 C620 286 627 278 636 272Z"
          fill="#0c6e9c"
          stroke="#24d9ff"
          strokeWidth="4"
          opacity="0.76"
          filter="url(#zoomGlow)"
        />

        {zoomCountries.map((c) => {
          const isActive = c.name === active.name;
          const x = (c.x / 100) * 900;
          const y = (c.y / 100) * 430;
          return (
            <g key={c.name}>
              <circle
                cx={x}
                cy={y}
                r={isActive ? 10 : 6}
                fill={isActive ? "#ffd86b" : "#c9fbff"}
                stroke={isActive ? "#ffd86b" : "#25d8ff"}
                strokeWidth="3"
                filter="url(#zoomGlow)"
              />
              <line
                x1={x}
                y1={y}
                x2={x + 52}
                y2={y - 23}
                stroke="#9df5ff"
                strokeOpacity="0.75"
              />
              <rect
                x={x + 52}
                y={y - 41}
                width="105"
                height="34"
                rx="12"
                fill={isActive ? "#133f55" : "#09141e"}
                stroke={isActive ? "#ffd86b" : "#25d8ff"}
              />
              <text
                x={x + 64}
                y={y - 19}
                fill={isActive ? "#ffd86b" : "#f8ffff"}
                fontSize="16"
                fontWeight="700"
              >
                {c.name}
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
      <div className="chip"></div>
      <div className="matrix-rain">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i}>0101</span>
        ))}
      </div>
      <div className="passport-left">
        <p>3B ACCÈS NUMÉRIQUE</p>
        <h3>3B PASSEPORT NUMÉRIQUE</h3>
        <div className="passport-line"></div>
        <strong>{member?.name || "Membre 3B"}</strong>
        <strong>{member?.id || "3B-PASS-0000"}</strong>
        <small>Accès premium · identité numérique · membre 3B</small>
      </div>
      <div className="passport-portrait">
        <div className="portrait-head"></div>
        <div className="portrait-body"></div>
        <span>PORTRAIT DIGITAL</span>
      </div>
    </div>
  );
}

function PassportPage({ go, member, setMember }) {
  if (!member) return <PassportAccess go={go} member={member} />;

  function deletePassport() {
    localStorage.removeItem(MEMBER_KEY);
    setMember(null);
    go("home");
  }

  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <PageTitle
        title="Passeport 3B"
        subtitle="Accès membre et identité numérique 3B."
      />

      <section className="page-grid">
        <LuxCard title="Carte du monde 3B" className="wide-card">
          <p>
            Vue monde + zoom premium sur les 8 pays officiels 3B. Seul le pays
            d’origine sélectionné pendant l’inscription est mis en avant.
          </p>
          <MatrixWorldMap activeCountry={member.origin} />
          <ZoomMap activeCountry={member.origin} />
        </LuxCard>

        <LuxCard title="Carte membre digitale">
          <DigitalPassportCard member={member} />
        </LuxCard>

        <LuxCard title="Informations membre">
          <p>Nom : {member.name}</p>
          <p>E-mail : {member.email}</p>
          <p>Numéro : {member.id}</p>
          <p>Date : {member.createdAt}</p>
        </LuxCard>

        <LuxCard title="Origine et résidence">
          <p>Pays 3B : {member.origin}</p>
          <p>Résidence : {member.residence}</p>
          <p>Ville : {member.city}</p>
          <p>Pays débloqué : {member.origin}</p>
        </LuxCard>

        <LuxCard title="Gestion locale">
          <p>Le passeport est enregistré localement sur cet appareil.</p>
          <button onClick={deletePassport}>Supprimer le passeport local</button>
        </LuxCard>
      </section>
    </main>
  );
}

function MemberSpace({ go, member }) {
  if (!member) {
    return (
      <main className="page">
        <BackButton onClick={() => go("home")} />
        <PageTitle title="Espace membre 3B" subtitle="Passeport requis." />
        <LuxCard title="Accès verrouillé">
          <p>Créez votre passeport pour ouvrir l’espace membre 3B.</p>
          <button onClick={() => go("inscription")}>Créer mon passeport</button>
        </LuxCard>
      </main>
    );
  }

  const leaderboard = [
    { name: member.name, level: member.gameLevel || 1, xp: member.gamePoints || 0 },
    { name: "Alya", level: 11, xp: 985 },
    { name: "Noé", level: 9, xp: 820 },
    { name: "Yanis", level: 8, xp: 730 },
  ].sort((a, b) => b.xp - a.xp);

  return (
    <main className="page">
      <BackButton onClick={() => go("home")} />
      <PageTitle
        title="Espace membre 3B"
        subtitle="Suivi, profil, progression et état du compte."
      />

      <section className="page-grid">
        <LuxCard title="Résumé membre">
          <p>Nom : {member.name}</p>
          <p>Numéro : {member.id}</p>
          <p>Statut : {member.status}</p>
          <p>Créé le : {member.createdAt}</p>
        </LuxCard>

        <LuxCard title="Fidélité / carte membre">
          <p>Carte : Découverte 3B</p>
          <p>Points 3B : {member.points || 0}</p>
          <p>Points jeu : {member.gamePoints || 0}</p>
          <p>Prochain palier : 500 points</p>
        </LuxCard>

        <LuxCard title="Jeux de progression">
          <p>Niveau : {member.gameLevel || 1} / 1000</p>
          <p>Porte : {member.gameDoor || 1} / 10</p>
          <p>XP : {member.gamePoints || 0}</p>
          <p>Progression totale : {(((member.gameLevel || 1) - 1) / 1000).toFixed(2)}%</p>
        </LuxCard>

        <LuxCard title="Activité récente">
          <p>Réponses validées : {member.validatedAnswers || 0}</p>
          <p>Indices utilisés : {member.hintsUsed || 0}</p>
          <p>Meilleure série : {member.bestStreak || 0}</p>
          <p>Dernière activité : {member.lastActivity || "Aucune activité"}</p>
        </LuxCard>

        <LuxCard title="Top classement actuel">
          <div className="leaderboard-list">
            {leaderboard.map((p, i) => (
              <div key={p.name} className="leader-row">
                <span>#{i + 1}</span>
                <strong>{p.name}</strong>
                <span>Niv. {p.level}</span>
                <span>XP {p.xp}</span>
              </div>
            ))}
          </div>
        </LuxCard>

        <LuxCard title="Inventaire & certificats">
          <p>Certificats produits : à venir</p>
          <p>Drops suivis : à venir</p>
          <p>Cartes 3B : Découverte 3B activée</p>
          <p>QR personnel : relié au passeport</p>
        </LuxCard>

        <LuxCard title="Objectifs / missions">
          <p>Débloquer 500 points pour passer au prochain palier.</p>
          <p>Découvrir les prochains secrets 3B.</p>
          <p>Suivre les drops et les futures cartes premium.</p>
        </LuxCard>

        <LuxCard title="Accès rapide">
          <div className="button-stack">
            <button onClick={() => go("jeux")}>Aller au jeu</button>
            <button onClick={() => go("passeport")}>Voir le passeport</button>
            <button onClick={() => go("secret")}>Ouvrir le coffre</button>
          </div>
        </LuxCard>
      </section>
    </main>
  );
}

function MorePage({ go }) {
  return (
    <SimplePage
      go={go}
      title="Bis"
      subtitle="Créateurs, certificats, extensions et futures branches 3B."
      cards={[
        {
          title: "Créateurs / commandes",
          content: (
            <>
              <p>Programme créateurs, commissions, vidéos UGC et futures ADS.</p>
              <p>Les meilleures vidéos pourront devenir des publicités 3B.</p>
            </>
          ),
        },
        {
          title: "Certificat produit avec QR",
          content: (
            <>
              <p>Chaque produit pourra recevoir un QR code personnel.</p>
              <p>Certificat, numéro de série, rareté et preuve d’authenticité.</p>
            </>
          ),
        },
        {
          title: "Cartes de fidélité",
          content: (
            <>
              <p>Cartes Découverte, Héritier, Gardien, Légende.</p>
              <p>Système évolutif selon les points, achats et missions.</p>
            </>
          ),
        },
        {
          title: "Extensions futures",
          content: (
            <>
              <p>Manga, drops, inventaire, boutique, musique, secrets.</p>
              <p>L’écosystème pourra grandir étape par étape.</p>
            </>
          ),
        },
      ]}
    />
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [member, setMember] = useState(() => loadMember());

  useEffect(() => {
    if (member) saveMember(member);
  }, [member]);

  const go = (target) => setPage(target);

  const commonProps = useMemo(
    () => ({ go, member, setMember }),
    [member]
  );

  if (page === "home") return <Home go={go} member={member} />;

  if (page === "boutique") {
    return (
      <SimplePage
        go={go}
        title="Boutique 3B"
        subtitle="Produits premium, drops et collections."
        cards={[
          {
            title: "Produits premium",
            content: <p>Maillots, polos, hoodies, vestes et pièces futures.</p>,
          },
          {
            title: "Drops",
            content: <p>Les sorties limitées seront affichées ici.</p>,
          },
          {
            title: "Commandes",
            content: <p>La boutique sera reliée plus tard à un paiement sécurisé.</p>,
          },
          {
            title: "Certificats",
            content: <p>Chaque produit pourra être relié à un QR code 3B.</p>,
          },
        ]}
      />
    );
  }

  if (page === "musique") return <MusicPage go={go} />;

  if (page === "communaute") {
    return (
      <SimplePage
        go={go}
        title="Communauté 3B"
        subtitle="Échange, réseau et espace de discussion 3B."
        cards={[
          {
            title: "Tchat temps réel",
            content: <p>Le tchat sera relié à Supabase quand la base sera prête.</p>,
          },
          {
            title: "Créateurs",
            content: <p>Les membres pourront partager des créations et idées.</p>,
          },
          {
            title: "Salon 3B",
            content: <p>Un espace de discussion premium pour les membres.</p>,
          },
          {
            title: "Règles",
            content: <p>Respect, entraide, créativité et esprit 3B.</p>,
          },
        ]}
      />
    );
  }

  if (page === "passport-access") return <PassportAccess {...commonProps} />;
  if (page === "inscription") return <RegisterPassport {...commonProps} />;
  if (page === "passeport") return <PassportPage {...commonProps} />;
  if (page === "secret") return <SecretPage {...commonProps} />;
  if (page === "membre") return <MemberSpace {...commonProps} />;
  if (page === "plus") return <MorePage go={go} />;

  if (page === "jeux") {
    return (
      <Jeu3B
        go={go}
        member={member}
        setMember={setMember}
        saveMember={saveMember}
      />
    );
  }

  return <Home go={go} member={member} />;
}