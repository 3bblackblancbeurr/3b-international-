import { useState } from "react";
import PassportUI from "./passport/PassportUI";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("menu");
  const [secretCode, setSecretCode] = useState("");
  const [secretOpen, setSecretOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      name: "3B International",
      text: "Bienvenue dans la communauté 3B.",
    },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const openSecret = () => {
    if (secretCode.trim().toLowerCase() === "italie") {
      setSecretOpen(true);
    } else {
      alert("Code incorrect");
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    setMessages([
      ...messages,
      {
        name: "Utilisateur",
        text: newMessage,
      },
    ]);

    setNewMessage("");
  };

  return (
    <main className="screen page">
      {page === "menu" && <Menu setPage={setPage} />}

      {page === "boutique" && <Boutique setPage={setPage} />}

      {page === "musique" && <Musique setPage={setPage} />}

      {page === "communaute" && (
        <Communaute
          setPage={setPage}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendMessage={sendMessage}
        />
      )}

      {page === "secret" && (
        <Secret
          setPage={setPage}
          secretCode={secretCode}
          setSecretCode={setSecretCode}
          openSecret={openSecret}
          secretOpen={secretOpen}
        />
      )}

      {page === "passport" && (
  <div>
    <button
      className="back-button"
      onClick={() => setPage("menu")}
      style={{
        position: "fixed",
        top: "16px",
        left: "16px",
        zIndex: 9999,
        padding: "10px 16px",
        borderRadius: "999px",
        border: "1px solid rgba(212, 175, 55, 0.6)",
        background: "rgba(0, 0, 0, 0.85)",
        color: "white",
        fontWeight: "bold",
        cursor: "pointer",
      }}
    >
      ← Retour menu général
    </button>

    <PassportUI />
  </div>
)}

      {page === "plus" && <PlusEncore setPage={setPage} />}
    </main>
  );
}

function Menu({ setPage }) {
  const items = [
    ["Boutique", "boutique", "🛍️"],
    ["Musique", "musique", "🎵"],
    ["Communauté", "communaute", "👥"],
    ["Secret", "secret", "🔐"],
    ["Passeport 3B", "passport", "🌍"],
    ["Plus encore", "plus", "⭐"],
  ];

  return (
    <div className="screen page">
      <section className="hero">
        <div className="eyebrow">3B INTERNATIONAL</div>
        <h1>De zéro à l’international</h1>
        <p>
          Bienvenue dans l’univers 3B : boutique, musique, communauté, secret et
          Passeport 3B.
        </p>
      </section>

      <div className="modules">
        {items.map((item) => (
          <button
            key={item[1]}
            className="module-card"
            onClick={() => setPage(item[1])}
          >
            <span className="module-icon">{item[2]}</span>
            <span>{item[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BackButton({ setPage }) {
  return (
    <button className="back-button" onClick={() => setPage("menu")}>
      ← Retour menu
    </button>
  );
}

function Boutique({ setPage }) {
  return (
    <div className="screen page">
      <BackButton setPage={setPage} />

      <section className="hero">
        <div className="eyebrow">BOUTIQUE 3B</div>
        <h1>Boutique</h1>
        <p>
          Ici tu pourras présenter les vêtements, maillots, bijoux logos,
          éditions commerciales et éditions premium 3B.
        </p>
      </section>

      <div className="modules">
        <div className="module-card">
          <span className="module-icon">👕</span>
          <span>Maillots 3B</span>
        </div>

        <div className="module-card">
          <span className="module-icon">💎</span>
          <span>Bijoux logos pays</span>
        </div>

        <div className="module-card">
          <span className="module-icon">🧥</span>
          <span>Collections premium</span>
        </div>
      </div>
    </div>
  );
}

function Musique({ setPage }) {
  return (
    <div className="screen page">
      <BackButton setPage={setPage} />

      <section className="hero">
        <div className="eyebrow">3B MUSIC</div>
        <h1>Musique</h1>
        <p>
          Espace pour l’album 3B International, les sons officiels, les hymnes,
          les musiques de campagne et les sons TikTok.
        </p>
      </section>

      <div className="modules">
        <div className="module-card">
          <span className="module-icon">🎧</span>
          <span>Album 3B International</span>
        </div>

        <div className="module-card">
          <span className="module-icon">🔥</span>
          <span>Sons de campagne</span>
        </div>

        <div className="module-card">
          <span className="module-icon">🎬</span>
          <span>Musiques publicitaires</span>
        </div>
      </div>
    </div>
  );
}

function Communaute({
  setPage,
  messages,
  newMessage,
  setNewMessage,
  sendMessage,
}) {
  return (
    <div className="screen page">
      <BackButton setPage={setPage} />

      <section className="hero">
        <div className="eyebrow">COMMUNAUTÉ 3B</div>
        <h1>Communauté</h1>
        <p>
          Un espace pour les membres 3B, les créateurs, les clients, les
          supporters et les futurs ambassadeurs.
        </p>
      </section>

      <div className="module-card" style={{ display: "block" }}>
        <h2>Messages</h2>

        <div>
          {messages.map((message, index) => (
            <div key={index} style={{ marginBottom: "12px" }}>
              <strong>{message.name}</strong>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <input
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
          placeholder="Écris ton message..."
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            marginTop: "12px",
          }}
        />

        <button className="module-card" onClick={sendMessage}>
          Envoyer
        </button>
      </div>
    </div>
  );
}

function Secret({
  setPage,
  secretCode,
  setSecretCode,
  openSecret,
  secretOpen,
}) {
  return (
    <div className="screen page">
      <BackButton setPage={setPage} />

      <section className="hero">
        <div className="eyebrow">SECRET 3B</div>
        <h1>Secret 3B</h1>
        <p>
          Indice actif : <strong>Italie s’y comprennent</strong>
        </p>
        <p>Rendez-vous : 8 juillet à 20h.</p>
      </section>

      <div className="module-card" style={{ display: "block" }}>
        <h2>Entrer le code secret</h2>

        <input
          value={secretCode}
          onChange={(event) => setSecretCode(event.target.value)}
          placeholder="Code secret"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            marginTop: "12px",
          }}
        />

        <button className="module-card" onClick={openSecret}>
          Déverrouiller
        </button>

        {secretOpen && (
          <div style={{ marginTop: "20px" }}>
            <h3>Secret ouvert</h3>
            <p>
              L’Italie est liée au premier grand indice du Passeport 3B.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PlusEncore({ setPage }) {
  return (
    <div className="screen page">
      <BackButton setPage={setPage} />

      <section className="hero">
        <div className="eyebrow">3B INTERNATIONAL</div>
        <h1>Plus encore</h1>
        <p>
          Ici tu pourras ajouter plus tard : manga, cartes de fidélité, créateurs,
          programme ambassadeur, IA, dossiers, événements et autres piliers 3B.
        </p>
      </section>

      <div className="modules">
        <button className="module-card" onClick={() => setPage("passport")}>
          <span className="module-icon">🌍</span>
          <span>Passeport 3B</span>
        </button>

        <div className="module-card">
          <span className="module-icon">🎴</span>
          <span>Cartes digitales</span>
        </div>

        <div className="module-card">
          <span className="module-icon">📖</span>
          <span>Manga 3B</span>
        </div>
      </div>
    </div>
  );
}