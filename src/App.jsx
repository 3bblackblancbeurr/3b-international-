import { useState } from "react";
import "./App.css";

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

function Home({ go }) {
  return (
    <div className="page">
      <LogoHeader />

      <div className="menu-list">
        <MenuCard icon="🛍️" title="Boutique" onClick={() => go("boutique")} />
        <MenuCard icon="♪" title="Musique" onClick={() => go("musique")} />
        <MenuCard icon="👥" title="Communauté" onClick={() => go("communaute")} />
        <MenuCard icon="🔒" title="Secret" onClick={() => go("secret")} />
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

      <h1>Secret</h1>

      <p className="intro">
        Entrez le code secret pour débloquer l’indice.
      </p>

      <h2>Code secret</h2>

      <div className="secret-input">
        <span>🔒</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Entrez le code secret"
        />
        <button onClick={checkSecret}>Ouvrir le secret</button>
      </div>

      <p className="intro small-text">
        Tapez le code exact. Le code actuel est prévu dans votre univers 3B.
      </p>

      {unlocked && (
        <div className="indice">
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

function Passeport({ go }) {
  return (
    <div className="page">
      <BackButton onClick={() => go("plus")} />
      <LogoHeader small />

      <h1>Passeport 3B</h1>
      <div className="gold-line">◆</div>

      <p className="intro">
        Le Passeport 3B est l’espace premium qui regroupera l’identité du membre,
        son niveau, ses accès, ses avantages et son parcours dans l’univers 3B International.
      </p>

      <div className="indice">
        <h3>Identité membre</h3>
        <p>Nom : Membre 3B</p>
        <p>Statut : Fondateur / Ambassadeur / Client premium</p>
        <p>Niveau : 3B Élite</p>
      </div>

      <div className="indice">
        <h3>Accès 3B</h3>
        <p>Boutique privée</p>
        <p>Collections limitées</p>
        <p>Événements exclusifs</p>
        <p>Codes secrets et indices</p>
      </div>

      <div className="indice">
        <h3>QR Code futur</h3>
        <p>
          Ici viendra le futur QR Code personnel du membre, relié au certificat,
          aux achats et aux avantages 3B.
        </p>
      </div>
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
          onClick={() => alert("Bientôt disponible")}
        />

        <MenuCard
          icon="🛂"
          title="Passeport 3B"
          onClick={() => go("passeport")}
        />

        <MenuCard
          icon="📖"
          title="Manga 3B International"
          onClick={() => alert("Bientôt disponible")}
        />

        <MenuCard
          icon="🌍"
          title="8 logos internationaux"
          onClick={() => alert("Bientôt disponible")}
        />

        <MenuCard
          icon="♪"
          title="Album musique 20 titres"
          onClick={() => go("musique")}
        />

        <MenuCard
          icon="💻"
          title="Créateurs de programmes / commandes"
          onClick={() => alert("Bientôt disponible")}
        />

        <MenuCard
          icon="▣"
          title="Certificat de produit avec code QR"
          onClick={() => alert("Bientôt disponible")}
        />
      </div>

      <div className="diamond">◆</div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");

  return (
    <main className="app">
      {page === "home" && <Home go={setPage} />}
      {page === "boutique" && <Boutique go={setPage} />}
      {page === "musique" && <Musique go={setPage} />}
      {page === "communaute" && <Communaute go={setPage} />}
      {page === "secret" && <Secret go={setPage} />}
      {page === "plus" && <PlusEncore go={setPage} />}
      {page === "passeport" && <Passeport go={setPage} />}
    </main>
  );
}