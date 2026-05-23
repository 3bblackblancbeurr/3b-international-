import { useMemo, useState } from "react";
import "./App.css";

const origin3BCountries = [
  "France",
  "Italie",
  "Estonie",
  "Turquie",
  "Algérie",
  "Tunisie",
  "Maroc",
  "Espagne",
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
  "République tchèque",
  "Slovaquie",
  "Hongrie",
  "Roumanie",
  "Bulgarie",
  "Grèce",
  "Croatie",
  "Slovénie",
  "Serbie",
  "Bosnie-Herzégovine",
  "Albanie",
  "Monténégro",
  "Macédoine du Nord",
  "Kosovo",
  "Danemark",
  "Suède",
  "Norvège",
  "Finlande",
  "Islande",
  "Lettonie",
  "Lituanie",
  "Ukraine",
  "Moldavie",
  "Malte",
  "Chypre",
  "États-Unis",
  "Canada",
  "Mexique",
  "Brésil",
  "Argentine",
  "Colombie",
  "Chili",
  "Pérou",
  "Uruguay",
  "Paraguay",
  "Bolivie",
  "Équateur",
  "Venezuela",
  "Sénégal",
  "Mali",
  "Côte d’Ivoire",
  "Comores",
  "Cameroun",
  "Gabon",
  "Congo",
  "République démocratique du Congo",
  "Guinée",
  "Guinée-Bissau",
  "Burkina Faso",
  "Niger",
  "Tchad",
  "Mauritanie",
  "Égypte",
  "Libye",
  "Soudan",
  "Éthiopie",
  "Kenya",
  "Tanzanie",
  "Afrique du Sud",
  "Madagascar",
  "Maurice",
  "Arabie saoudite",
  "Émirats arabes unis",
  "Qatar",
  "Koweït",
  "Bahreïn",
  "Oman",
  "Jordanie",
  "Liban",
  "Israël",
  "Palestine",
  "Irak",
  "Iran",
  "Inde",
  "Pakistan",
  "Bangladesh",
  "Chine",
  "Japon",
  "Corée du Sud",
  "Indonésie",
  "Malaisie",
  "Thaïlande",
  "Vietnam",
  "Philippines",
  "Australie",
  "Nouvelle-Zélande",
  "Autre pays",
];

const official3BCountries = [
  {
    name: "France",
    worldX: 505,
    worldY: 150,
    zoomX: 328,
    zoomY: 170,
    labelX: 366,
    labelY: 145,
  },
  {
    name: "Italie",
    worldX: 536,
    worldY: 165,
    zoomX: 430,
    zoomY: 236,
    labelX: 470,
    labelY: 214,
  },
  {
    name: "Estonie",
    worldX: 556,
    worldY: 115,
    zoomX: 520,
    zoomY: 106,
    labelX: 560,
    labelY: 84,
  },
  {
    name: "Turquie",
    worldX: 605,
    worldY: 183,
    zoomX: 650,
    zoomY: 260,
    labelX: 690,
    labelY: 238,
  },
  {
    name: "Algérie",
    worldX: 493,
    worldY: 214,
    zoomX: 312,
    zoomY: 362,
    labelX: 350,
    labelY: 386,
  },
  {
    name: "Tunisie",
    worldX: 518,
    worldY: 203,
    zoomX: 372,
    zoomY: 337,
    labelX: 414,
    labelY: 338,
  },
  {
    name: "Maroc",
    worldX: 468,
    worldY: 205,
    zoomX: 205,
    zoomY: 340,
    labelX: 128,
    labelY: 328,
  },
  {
    name: "Espagne",
    worldX: 479,
    worldY: 168,
    zoomX: 233,
    zoomY: 250,
    labelX: 110,
    labelY: 236,
  },
];

function normalizeCountry(country) {
  return (country || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getUnlockedCountry(originCountry) {
  const cleanOrigin = normalizeCountry(originCountry);
  return official3BCountries.find(
    (country) => normalizeCountry(country.name) === cleanOrigin
  );
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

function InfoCard({ title, children }) {
  return (
    <div className="info-card">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function Field({ icon, children }) {
  return (
    <div className="input-row">
      <span className="input-icon">{icon}</span>
      {children}
    </div>
  );
}

function MatrixDigits({ count = 40 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <text
          key={i}
          x={20 + ((i * 47) % 860)}
          y={20 + ((i * 29) % 480)}
          fill="rgba(73, 192, 255, 0.12)"
          fontSize="10"
          fontFamily="monospace"
        >
          0101101010110010
        </text>
      ))}
    </>
  );
}

function WorldMap3B({ originCountry }) {
  const unlocked = useMemo(
    () => getUnlockedCountry(originCountry),
    [originCountry]
  );

  return (
    <div className="worldmap-card">
      <h3>Carte du monde 3B</h3>
      <p className="map-intro">
        Vue monde + zoom sur les 8 pays 3B. Seul le pays d’origine 3B choisi
        pendant l’inscription se déverrouille.
      </p>

      <div className="world-strip">
        <svg viewBox="0 0 1000 260" width="100%" height="100%">
          <defs>
            <linearGradient id="worldBlueFill" x1="0" x2="1">
              <stop offset="0%" stopColor="#0f2942" />
              <stop offset="100%" stopColor="#173b59" />
            </linearGradient>
            <filter id="worldGlow">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="1000" height="260" fill="#071018" />
          <MatrixDigits count={48} />

          <path
            d="M70 105 C85 80, 125 65, 175 75 C210 82, 245 100, 250 125 C255 150, 220 170, 175 173 C120 177, 80 155, 70 105 Z"
            fill="url(#worldBlueFill)"
            stroke="#1e5d88"
            strokeWidth="2"
          />
          <path
            d="M210 175 C250 175, 298 205, 286 246 C250 255, 218 242, 204 212 C195 194, 194 182, 210 175 Z"
            fill="url(#worldBlueFill)"
            stroke="#1e5d88"
            strokeWidth="2"
          />
          <path
            d="M398 88 C445 53, 508 48, 565 64 C614 77, 646 108, 645 136 C642 168, 602 184, 546 175 C500 167, 466 154, 442 143 C414 129, 388 115, 398 88 Z"
            fill="url(#worldBlueFill)"
            stroke="#1e5d88"
            strokeWidth="2"
          />
          <path
            d="M480 170 C530 166, 580 182, 603 222 C585 251, 540 255, 503 240 C472 226, 450 202, 480 170 Z"
            fill="url(#worldBlueFill)"
            stroke="#1e5d88"
            strokeWidth="2"
          />
          <path
            d="M660 115 C715 95, 818 107, 882 137 C922 156, 932 184, 898 201 C836 221, 774 211, 725 194 C687 180, 650 146, 660 115 Z"
            fill="url(#worldBlueFill)"
            stroke="#1e5d88"
            strokeWidth="2"
          />
          <path
            d="M814 58 C859 44, 916 56, 952 76 C974 89, 956 103, 916 105 C870 107, 836 96, 814 58 Z"
            fill="url(#worldBlueFill)"
            stroke="#1e5d88"
            strokeWidth="2"
          />

          {official3BCountries.map((country) => {
            const isUnlocked =
              unlocked &&
              normalizeCountry(unlocked.name) === normalizeCountry(country.name);

            return (
              <circle
                key={country.name}
                cx={country.worldX}
                cy={country.worldY}
                r={isUnlocked ? 8 : 6}
                fill={isUnlocked ? "#73e6ff" : "#163a58"}
                stroke={isUnlocked ? "#9cf0ff" : "#58b5ea"}
                strokeWidth="2"
                filter={isUnlocked ? "url(#worldGlow)" : "none"}
              />
            );
          })}
        </svg>
      </div>

      <div className="world-zoom">
        <svg viewBox="0 0 900 520" width="100%" height="100%">
          <defs>
            <linearGradient id="zoomSea" x1="0" x2="1">
              <stop offset="0%" stopColor="#06111a" />
              <stop offset="100%" stopColor="#081722" />
            </linearGradient>
            <linearGradient id="zoomLand" x1="0" x2="1">
              <stop offset="0%" stopColor="#112638" />
              <stop offset="100%" stopColor="#173146" />
            </linearGradient>
            <filter id="zoomGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="900" height="520" fill="url(#zoomSea)" />
          <MatrixDigits count={95} />

          <g opacity="0.22">
            {Array.from({ length: 28 }).map((_, i) => (
              <line
                key={i}
                x1="0"
                y1={i * 20}
                x2="900"
                y2={i * 20}
                stroke="#114765"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 38 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 24}
                y1="0"
                x2={i * 24}
                y2="520"
                stroke="#114765"
                strokeWidth="1"
              />
            ))}
          </g>

          <path
            d="M92 240 C135 210, 180 190, 230 188 C278 186, 318 166, 355 145 C388 126, 418 112, 460 110 C507 108, 550 114, 594 132 C631 147, 662 162, 700 181 C730 198, 740 220, 734 246 C726 274, 702 280, 672 278 C638 276, 616 268, 592 261 C560 251, 528 250, 494 260 C461 270, 444 287, 436 312 C424 348, 393 366, 344 372 C286 379, 234 377, 189 365 C155 356, 128 337, 110 310 C94 285, 84 261, 92 240 Z"
            fill="url(#zoomLand)"
            stroke="#2a89ba"
            strokeWidth="2.2"
          />

          <path
            d="M152 223 C183 210, 220 206, 255 213 C283 219, 302 232, 298 253 C293 275, 268 286, 231 286 C194 286, 160 274, 145 252 C136 239, 138 229, 152 223 Z"
            fill="#16344b"
            stroke="#58b5ea"
            strokeWidth="2"
          />
          <path
            d="M286 160 C314 142, 351 138, 382 147 C407 154, 423 169, 421 192 C418 220, 393 236, 360 236 C330 236, 301 226, 286 205 C274 188, 272 172, 286 160 Z"
            fill="#17384f"
            stroke="#69c9ff"
            strokeWidth="2.2"
          />
          <path
            d="M413 199 C431 199, 444 205, 451 219 C454 229, 449 239, 439 245 C450 255, 458 268, 460 282 C455 295, 442 300, 430 297 C424 283, 420 270, 412 260 C402 248, 395 233, 399 220 C401 208, 406 200, 413 199 Z"
            fill="#16344b"
            stroke="#58b5ea"
            strokeWidth="2"
          />
          <path
            d="M493 88 C510 80, 534 80, 551 89 C559 96, 557 107, 545 113 C528 120, 506 118, 492 108 C487 101, 487 93, 493 88 Z"
            fill="#16344b"
            stroke="#58b5ea"
            strokeWidth="2"
          />
          <path
            d="M581 240 C614 225, 652 223, 694 232 C719 237, 737 247, 738 261 C735 275, 718 285, 691 288 C656 292, 620 291, 592 285 C568 280, 551 270, 552 258 C554 249, 564 244, 581 240 Z"
            fill="#16344b"
            stroke="#58b5ea"
            strokeWidth="2"
          />
          <path
            d="M152 307 C173 297, 196 296, 210 305 C219 312, 222 326, 213 338 C200 350, 179 353, 161 345 C148 337, 143 319, 152 307 Z"
            fill="#16344b"
            stroke="#58b5ea"
            strokeWidth="2"
          />
          <path
            d="M226 321 C267 311, 318 312, 350 324 C370 332, 374 346, 365 357 C354 370, 327 375, 286 373 C250 371, 217 362, 202 347 C196 336, 204 327, 226 321 Z"
            fill="#17384f"
            stroke="#69c9ff"
            strokeWidth="2.2"
          />
          <path
            d="M363 312 C375 308, 387 311, 393 319 C396 327, 391 338, 380 343 C370 345, 362 339, 360 329 C359 321, 360 315, 363 312 Z"
            fill="#16344b"
            stroke="#58b5ea"
            strokeWidth="2"
          />

          <path
            d="M136 215 C248 170, 386 124, 542 133"
            fill="none"
            stroke="rgba(115,230,255,0.22)"
            strokeWidth="1.5"
          />
          <path
            d="M174 296 C240 285, 320 286, 436 300"
            fill="none"
            stroke="rgba(115,230,255,0.18)"
            strokeWidth="1.2"
          />

          {official3BCountries.map((country) => {
            const isUnlocked =
              unlocked &&
              normalizeCountry(unlocked.name) === normalizeCountry(country.name);

            return (
              <g key={country.name}>
                <line
                  x1={country.zoomX}
                  y1={country.zoomY}
                  x2={country.labelX}
                  y2={country.labelY}
                  stroke={isUnlocked ? "#9cf0ff" : "#58b5ea"}
                  strokeWidth="1.5"
                  opacity="0.9"
                />
                <circle
                  cx={country.zoomX}
                  cy={country.zoomY}
                  r={isUnlocked ? 8 : 6}
                  fill={isUnlocked ? "#73e6ff" : "#17384f"}
                  stroke={isUnlocked ? "#baf6ff" : "#58b5ea"}
                  strokeWidth="2"
                  filter={isUnlocked ? "url(#zoomGlow)" : "none"}
                />
                <rect
                  x={country.labelX - 6}
                  y={country.labelY - 16}
                  rx="8"
                  ry="8"
                  width={country.name.length * 9 + 46}
                  height="24"
                  fill={
                    isUnlocked
                      ? "rgba(8, 48, 70, 0.92)"
                      : "rgba(7, 24, 36, 0.90)"
                  }
                  stroke={isUnlocked ? "#8deeff" : "#2e7ba5"}
                  strokeWidth="1.4"
                />
                <circle
                  cx={country.labelX + 8}
                  cy={country.labelY - 4}
                  r="4"
                  fill={isUnlocked ? "#73e6ff" : "#1b4f70"}
                />
                <text
                  x={country.labelX + 18}
                  y={country.labelY}
                  fill={isUnlocked ? "#baf6ff" : "#7dd7ff"}
                  fontSize="13"
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  {country.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="map-summary-grid">
        <div className="map-summary-box">
          <span>Pays 3B activé</span>
          <strong>{unlocked ? unlocked.name : "Aucun"}</strong>
        </div>
        <div className="map-summary-box">
          <span>Pays 3B disponibles</span>
          <strong>8 pays</strong>
        </div>
        <div className="map-summary-box">
          <span>Mode carte</span>
          <strong>Digital bleu Matrix</strong>
        </div>
      </div>
    </div>
  );
}

function Home({ go }) {
  return (
    <div className="page">
      <LogoHeader />

      <div className="menu-list home-grid">
        <MenuCard icon="🛍️" title="Boutique" onClick={() => go("boutique")} />
        <MenuCard icon="♪" title="Musique" onClick={() => go("musique")} />
        <MenuCard icon="👥" title="Communauté" onClick={() => go("communaute")} />
        <MenuCard icon="🛂" title="Passeport 3B" onClick={() => go("passeport-access")} />
        <MenuCard icon="🔒" title="Coffre secret 3B" onClick={() => go("secret")} />
        <MenuCard icon="☆" title="Plus encore" onClick={() => go("plus")} />
      </div>

      <div className="diamond">◆</div>
    </div>
  );
}

function Boutique({ go }) {
  const slots = Array.from({ length: 6 });

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <h1>Boutique</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Ajoutez vos créations. Chaque maillot que vous créez apparaîtra ici,
        prêt à être porté.
      </p>

      <div className="shop-grid">
        {slots.map((_, i) => (
          <button className="product-slot" key={i}>
            <div className="shirt">⌁</div>
            <div className="plus">+</div>
            <p>Ajouter un maillot</p>
            <span>◆</span>
          </button>
        ))}
      </div>

      <p className="secure">🛍️ Paiement sécurisé via Stripe</p>
    </div>
  );
}

function Musique({ go }) {
  const tracks = Array.from({ length: 20 });

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />

      <h1>Musique</h1>
      <div className="gold-line">◆</div>

      <div className="music-grid">
        {tracks.map((_, i) => (
          <button className="track-card" key={i}>
            <span className="play">▶</span>
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
    {
      name: "Alexandre M.",
      role: "3B Élite",
      text: "Très belle journée à tous ! Restez focus et continuez d’avancer, le meilleur est à venir. ✨",
      likes: 24,
      time: "09:32",
    },
    {
      name: "Sarah B.",
      role: "Ambassadrice 3B",
      text: "Merci Alexandre ! 🙏 Qui participe à l’atelier de ce soir ?",
      likes: 18,
      time: "09:45",
    },
    {
      name: "Julien T.",
      role: "3B Leader",
      text: "Je partagerai ma stratégie sur les réseaux à 18h. Ne manquez pas ça ! 🔥",
      likes: 31,
      time: "10:02",
    },
    {
      name: "3B International",
      role: "Officiel",
      text: "Rappel : Webinaire exclusif ce jeudi à 20h. Préparez vos questions ! 🚀",
      likes: 42,
      time: "10:15",
    },
  ];

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />

      <h1>Communauté</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Échangez, partagez et grandissez au sein de la communauté 3B International.
      </p>

      <div className="stats-card">
        <div>
          <strong>1 256</strong>
          <span>Membres</span>
        </div>
        <div>
          <strong className="online">● 24</strong>
          <span>En ligne</span>
        </div>
        <div>
          <strong>387</strong>
          <span>Messages aujourd’hui</span>
        </div>
      </div>

      <div className="posts">
        {posts.map((post, i) => (
          <div className="post-card" key={i}>
            <div className="avatar">
              {post.name === "3B International" ? "3B" : "👤"}
            </div>

            <div className="post-content">
              <div className="post-top">
                <div>
                  <strong>{post.name}</strong>
                  <span>{post.role}</span>
                </div>
                <em>{post.time}</em>
              </div>

              <p>{post.text}</p>

              <button className="like">💛 {post.likes}</button>
            </div>
          </div>
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
    if (code.trim().toLowerCase() === "italie") {
      setUnlocked(true);
    } else {
      alert("Code incorrect");
    }
  }

  return (
    <div className="page secret-page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <h1>Coffre secret 3B</h1>

      <p className="intro">
        Entrez le code secret pour débloquer l’indice caché dans l’univers 3B.
      </p>

      <h2>Code secret</h2>

      <div className="input-row">
        <span className="input-icon">🔒</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Entrez le code secret"
        />
        <button onClick={checkSecret}>Ouvrir</button>
      </div>

      <p className="intro small-text">
        Tapez le code exact. Le code actuel est prévu dans votre univers 3B.
      </p>

      {unlocked && (
        <div className="info-card">
          <h3>Indice débloqué</h3>
          <p>Italie s’y comprennent — 8 juillet — 20h.</p>
        </div>
      )}

      <h2>Cadre 3B relief 3D tactile</h2>

      <p className="intro small-text">
        Touchez le 3B, gardez le doigt dessus, déplacez-le, puis lancez-le
        contre les bords du cadre.
      </p>

      <div className="relief-box">
        <div className="relief-logo">3B</div>
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

      <p className="intro">
        Votre Passeport 3B regroupera votre identité, vos origines, votre pays,
        vos points, vos cartes, vos certificats et votre position dans le monde 3B.
      </p>

      <WorldMap3B originCountry="" />

      <InfoCard title="Comprendre les deux pays">
        <p>
          Le pays d’origine 3B sert à activer un des 8 pays officiels 3B sur la carte.
        </p>
        <p>
          Le pays de résidence sert seulement à indiquer où vous vivez aujourd’hui.
        </p>
      </InfoCard>

      <InfoCard title="Récompense d’entrée">
        <p>Création du compte : +100 points 3B</p>
        <p>Pays d’origine 3B sélectionné : +50 points 3B</p>
        <p>Pays 3B officiel déverrouillé : +75 points 3B</p>
      </InfoCard>

      <div className="menu-list">
        <MenuCard
          icon="👤"
          title="Créer mon compte 3B"
          onClick={() => go("passeport-inscription")}
        />

        <MenuCard
          icon="🔐"
          title="Me connecter"
          onClick={() => go("passeport-connexion")}
        />
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

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function createAccount() {
    const pseudo = form.pseudo.trim() || "Membre 3B";
    const originCountry = form.originCountry || "Non renseigné";
    const residenceCountry = form.residenceCountry || "Non renseigné";
    const city = form.city.trim() || "Non renseignée";
    const unlockedCountry = getUnlockedCountry(originCountry);

    const points =
      100 +
      (form.originCountry ? 50 : 0) +
      (form.residenceCountry ? 25 : 0) +
      (form.city.trim() ? 25 : 0) +
      (unlockedCountry ? 75 : 0);

    setMember({
      pseudo,
      email: form.email.trim() || "email non renseigné",
      originCountry,
      residenceCountry,
      city,
      unlockedCountry: unlockedCountry ? unlockedCountry.name : "Aucun pays 3B officiel",
      points,
      level: points >= 250 ? "Héritier" : "Découverte",
      card: "Carte Découverte 3B",
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

      <p className="intro">
        Créez votre compte pour débloquer votre Passeport 3B. Choisissez d’abord
        votre pays d’origine 3B parmi les 8 pays officiels, puis indiquez le pays
        où vous vivez aujourd’hui.
      </p>

      <Field icon="👤">
        <input
          value={form.pseudo}
          onChange={(e) => updateField("pseudo", e.target.value)}
          placeholder="Nom ou pseudo"
        />
      </Field>

      <Field icon="✉️">
        <input
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="Adresse e-mail"
        />
      </Field>

      <Field icon="🔒">
        <input
          value={form.password}
          onChange={(e) => updateField("password", e.target.value)}
          type="password"
          placeholder="Mot de passe"
        />
      </Field>

      <InfoCard title="1. Pays d’origine 3B à activer">
        <p>
          Choisissez le pays que vous voulez représenter dans l’univers 3B.
          Cette sélection déverrouille un seul pays sur la carte.
        </p>
        <p>
          Disponible uniquement : France, Italie, Estonie, Turquie, Algérie,
          Tunisie, Maroc, Espagne.
        </p>
      </InfoCard>

      <Field icon="🌍">
        <select
          value={form.originCountry}
          onChange={(e) => updateField("originCountry", e.target.value)}
        >
          <option value="">Choisir mon pays d’origine 3B</option>
          {origin3BCountries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </Field>

      <InfoCard title="2. Pays de résidence actuel">
        <p>
          Indiquez ici le pays où vous vivez actuellement. Cette information ne
          déverrouille pas la carte 3B, elle sert seulement à compléter votre profil.
        </p>
      </InfoCard>

      <Field icon="📍">
        <select
          value={form.residenceCountry}
          onChange={(e) => updateField("residenceCountry", e.target.value)}
        >
          <option value="">Choisir mon pays de résidence</option>
          {residenceCountries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </Field>

      <Field icon="🏙️">
        <input
          value={form.city}
          onChange={(e) => updateField("city", e.target.value)}
          placeholder="Ville de résidence"
        />
      </Field>

      <WorldMap3B originCountry={form.originCountry} />

      <button className="menu-card" onClick={createAccount}>
        <div className="icon-circle">◆</div>
        <span>Créer mon compte</span>
        <b>›</b>
      </button>

      <InfoCard title="Points débloqués à l’inscription">
        <p>Compte créé : +100 points</p>
        <p>Pays d’origine 3B sélectionné : +50 points</p>
        <p>Pays de résidence renseigné : +25 points</p>
        <p>Ville renseignée : +25 points</p>
        <p>Pays 3B officiel déverrouillé : +75 points</p>
      </InfoCard>

      <p className="intro small-text">
        Pour l’instant, c’est une maquette. Après, cette inscription sera connectée à Supabase.
      </p>
    </div>
  );
}

function PasseportConnexion({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("passeport-access")} />
      <LogoHeader small />

      <h1>Connexion 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Connectez-vous pour accéder à votre Passeport 3B.
      </p>

      <Field icon="✉️">
        <input placeholder="Adresse e-mail" />
      </Field>

      <Field icon="🔒">
        <input type="password" placeholder="Mot de passe" />
      </Field>

      <button className="menu-card" onClick={() => go("passeport")}>
        <div className="icon-circle">◆</div>
        <span>Entrer dans mon Passeport</span>
        <b>›</b>
      </button>

      <p className="intro small-text">
        Pour l’instant, c’est une maquette. Après, cette connexion sera connectée à Supabase.
      </p>
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
    points: 0,
    level: "Découverte",
    card: "Carte Découverte 3B",
    serial: "3B-PASS-0001",
    createdAt: new Date().toLocaleDateString("fr-FR"),
  };

  const progress = Math.min(profile.points, 300);
  const progressPercent = Math.round((progress / 300) * 100);

  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />
      <LogoHeader small />

      <h1>Mon Passeport 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Bienvenue dans votre espace membre 3B International.
      </p>

      <WorldMap3B originCountry={profile.originCountry} />

      <InfoCard title="Carte membre digitale">
        <p>Nom : {profile.pseudo}</p>
        <p>E-mail : {profile.email}</p>
        <p>Numéro passeport : {profile.serial}</p>
        <p>Date de création : {profile.createdAt}</p>
      </InfoCard>

      <InfoCard title="Origine et résidence">
        <p>Pays d’origine 3B activé : {profile.originCountry}</p>
        <p>Pays de résidence actuel : {profile.residenceCountry}</p>
        <p>Ville : {profile.city}</p>
        <p>Pays 3B déverrouillé : {profile.unlockedCountry}</p>
      </InfoCard>

      <InfoCard title="Points et niveau">
        <p>Points 3B : {profile.points}</p>
        <p>Niveau actuel : {profile.level}</p>
        <p>Carte : {profile.card}</p>
        <p>Progression vers Gardien : {progressPercent}%</p>
      </InfoCard>

      <InfoCard title="Pays verrouillés">
        <p>Les 8 pays 3B sont visibles sur la carte.</p>
        <p>Le pays d’origine 3B choisi pendant l’inscription est déverrouillé.</p>
        <p>Les autres pays 3B restent verrouillés.</p>
        <p>Le reste du monde reste visible en mode digital sans noms.</p>
      </InfoCard>

      <InfoCard title="Avantages débloqués">
        <p>Accès au Passeport 3B</p>
        <p>Accès aux indices secrets</p>
        <p>Suivi des cartes de fidélité</p>
        <p>Accès futur aux drops privés</p>
      </InfoCard>

      <InfoCard title="Missions 3B">
        <p>Compléter son profil : +50 points</p>
        <p>Partager une création 3B : +100 points</p>
        <p>Inviter un membre : +150 points</p>
        <p>Participer à un drop : +200 points</p>
      </InfoCard>

      <InfoCard title="QR Code et certificat futur">
        <p>
          Ici viendra le QR Code personnel du membre, relié à son compte, à ses
          produits, à ses achats, à ses cartes et à ses certificats 3B.
        </p>
      </InfoCard>
    </div>
  );
}

function CartesFidelite({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>Cartes de fidélité 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Les cartes de fidélité 3B serviront à récompenser les membres, débloquer
        des avantages et créer un lien premium avec la communauté.
      </p>

      <InfoCard title="Carte Découverte">
        <p>Accès aux premiers avantages 3B.</p>
        <p>Suivi des achats et premières récompenses.</p>
      </InfoCard>

      <InfoCard title="Carte Héritier">
        <p>Accès prioritaire à certaines collections.</p>
        <p>Récompenses renforcées et codes privés.</p>
      </InfoCard>

      <InfoCard title="Carte Légende">
        <p>Accès VIP, drops limités et événements exclusifs.</p>
      </InfoCard>
    </div>
  );
}

function Manga({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>Manga 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Le Manga 3B International racontera l’univers, les personnages, les pays,
        les secrets et la montée de zéro à l’international.
      </p>

      <InfoCard title="Univers">
        <p>Une histoire entre identité, héritage, ambition et mystère.</p>
      </InfoCard>

      <InfoCard title="Personnages">
        <p>Chaque personnage pourra représenter une force, un pays ou une mission 3B.</p>
      </InfoCard>

      <InfoCard title="Secret 3B">
        <p>Le manga pourra aussi cacher des indices reliés à l’application.</p>
      </InfoCard>
    </div>
  );
}

function LogosInternationaux({ go }) {
  const logos = [
    "France",
    "Italie",
    "Estonie",
    "Turquie",
    "Algérie",
    "Tunisie",
    "Maroc",
    "Espagne",
  ];

  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>8 Logos Internationaux</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Espace officiel des 8 logos premium 3B International.
      </p>

      <div className="shop-grid">
        {logos.map((logo) => (
          <button className="product-slot" key={logo}>
            <div className="plus">◆</div>
            <p>{logo}</p>
            <span>3B</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateursCommandes({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>Créateurs</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Ici viendra l’espace pour les créateurs, développeurs, designers et partenaires
        qui veulent participer à l’écosystème 3B.
      </p>

      <InfoCard title="Créateurs de contenu">
        <p>Inscription, missions, vidéos UGC et commissions futures.</p>
      </InfoCard>

      <InfoCard title="Commandes spéciales">
        <p>Demandes de visuels, maillots, concepts, logos et créations premium.</p>
      </InfoCard>

      <InfoCard title="Programme ambassadeur">
        <p>Classement, récompenses et sélection des meilleurs contenus.</p>
      </InfoCard>
    </div>
  );
}

function CertificatProduit({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>Certificat Produit</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Chaque produit 3B pourra avoir un certificat digital avec numéro de série,
        QR Code, preuve d’authenticité et rareté.
      </p>

      <InfoCard title="Authenticité">
        <p>Produit officiel 3B International.</p>
        <p>Numéro de série unique.</p>
      </InfoCard>

      <InfoCard title="QR Code">
        <p>Scan du produit pour afficher son certificat digital.</p>
      </InfoCard>

      <InfoCard title="Édition limitée">
        <p>Preuve de rareté, collection et historique du produit.</p>
      </InfoCard>
    </div>
  );
}

function PlusEncore({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("home")} />

      <h1>Plus encore</h1>
      <div className="gold-line">◆</div>

      <div className="menu-list">
        <MenuCard
          icon="💳"
          title="Cartes de fidélité 3B"
          onClick={() => go("fidelite")}
        />

        <MenuCard
          icon="🛂"
          title="Passeport 3B"
          onClick={() => go("passeport-access")}
        />

        <MenuCard
          icon="📖"
          title="Manga 3B International"
          onClick={() => go("manga")}
        />

        <MenuCard
          icon="🌍"
          title="8 logos internationaux"
          onClick={() => go("logos")}
        />

        <MenuCard
          icon="♪"
          title="Album musique 20 titres"
          onClick={() => go("musique")}
        />

        <MenuCard
          icon="💻"
          title="Créateurs de programmes / commandes"
          onClick={() => go("createurs")}
        />

        <MenuCard
          icon="▣"
          title="Certificat de produit avec code QR"
          onClick={() => go("certificat")}
        />
      </div>

      <div className="diamond">◆</div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [member, setMember] = useState(null);

  return (
    <main className="app">
      {page === "home" && <Home go={setPage} />}
      {page === "boutique" && <Boutique go={setPage} />}
      {page === "musique" && <Musique go={setPage} />}
      {page === "communaute" && <Communaute go={setPage} />}
      {page === "secret" && <Secret go={setPage} />}
      {page === "passeport-access" && <PasseportAccess go={setPage} />}
      {page === "passeport-inscription" && (
        <PasseportInscription go={setPage} setMember={setMember} />
      )}
      {page === "passeport-connexion" && <PasseportConnexion go={setPage} />}
      {page === "passeport" && <Passeport go={setPage} member={member} />}
      {page === "plus" && <PlusEncore go={setPage} />}
      {page === "fidelite" && <CartesFidelite go={setPage} />}
      {page === "manga" && <Manga go={setPage} />}
      {page === "logos" && <LogosInternationaux go={setPage} />}
      {page === "createurs" && <CreateursCommandes go={setPage} />}
      {page === "certificat" && <CertificatProduit go={setPage} />}
    </main>
  );
}