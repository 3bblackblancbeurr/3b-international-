import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("menu");
  const [products, setProducts] = useState([]);
  const [tracks, setTracks] = useState(Array(20).fill(null));
  const [secretCode, setSecretCode] = useState("");
  const [secretOpen, setSecretOpen] = useState(false);
  const [messages, setMessages] = useState([
    { name: "3B International", text: "Bienvenue dans la communauté 3B." },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const openSecret = () => {
    if (secretCode.trim().toLowerCase() === "italie") {
      setSecretOpen(true);
    } else {
      alert("Code incorrect");
    }
  };

  const addProduct = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const updated = [...products];
    updated[index] = { image: url, name: file.name };
    setProducts(updated);
  };

  const addTrack = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const updated = [...tracks];
    updated[index] = { url, name: file.name };
    setTracks(updated);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setMessages([...messages, { name: "Moi", text: newMessage }]);
    setNewMessage("");
  };

  return (
    <div className="app">
      {page === "menu" && <Menu setPage={setPage} />}
      {page === "boutique" && (
        <Boutique setPage={setPage} products={products} addProduct={addProduct} />
      )}
      {page === "musique" && (
        <Musique setPage={setPage} tracks={tracks} addTrack={addTrack} />
      )}
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
      {page === "plus" && <PlusEncore setPage={setPage} />}
    </div>
  );
}

function Menu({ setPage }) {
  const items = [
    ["Boutique", "boutique", "🛍️"],
    ["Musique", "musique", "🎵"],
    ["Communauté", "communaute", "👥"],
    ["Secret", "secret", "🔒"],
    ["Plus encore", "plus", "⭐"],
  ];

  return (
    <main className="screen menu-screen">
      <div className="brand-zone">
        <div className="logo-3b">
  <span>3B</span>
</div>
        <div className="brand-name">INTERNATIONAL</div>
        <div className="brand-subtitle">PREMIUM CLOTHING</div>
      </div>

      <div className="menu-list">
        {items.map(([label, target, icon]) => (
          <button key={target} className="menu-card" onClick={() => setPage(target)}>
            <span className="menu-icon">{icon}</span>
            <span>{label}</span>
            <span className="chevron">›</span>
          </button>
        ))}
      </div>
    </main>
  );
}

function BackButton({ setPage }) {
  return (
    <button className="back-btn" onClick={() => setPage("menu")}>
      ← Retour
    </button>
  );
}

function Boutique({ setPage, products, addProduct }) {
  return (
    <main className="screen page-screen boutique-screen">
      <BackButton setPage={setPage} />

      <div className="small-logo">3B INTERNATIONAL</div>
      <h1>Boutique</h1>

      <div className="product-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <label className="product-card" key={index}>
            {products[index] ? (
              <>
                <img src={products[index].image} alt="Création 3B" />
                <p>{products[index].name}</p>
              </>
            ) : (
              <>
                <div className="shirt-placeholder">+</div>
                <p>Ajouter un maillot</p>
              </>
            )}
            <input type="file" accept="image/*" onChange={(e) => addProduct(e, index)} />
          </label>
        ))}
      </div>

      <div className="stripe-note">🔒 Paiement sécurisé via Stripe</div>
    </main>
  );
}

function Musique({ setPage, tracks, addTrack }) {
  return (
    <main className="screen page-screen music-screen">
      <BackButton setPage={setPage} />

      <h1>Musique</h1>

      <div className="music-grid">
        {tracks.map((track, index) => (
          <div className="music-card" key={index}>
            <label>
              <span className="play-icon">▶</span>
              <div>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <p>{track ? track.name : `Piste ${String(index + 1).padStart(2, "0")}`}</p>
              </div>
              <input type="file" accept="audio/*" onChange={(e) => addTrack(e, index)} />
            </label>

            {track && <audio controls src={track.url}></audio>}
          </div>
        ))}
      </div>
    </main>
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
    <main className="screen page-screen community-screen">
      <BackButton setPage={setPage} />

      <h1>Communauté</h1>

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
          <strong>{messages.length}</strong>
          <span>Messages</span>
        </div>
      </div>

      <div className="chat-list">
        {messages.map((msg, index) => (
          <div className="chat-card" key={index}>
            <strong>{msg.name}</strong>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrivez votre message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>➤</button>
      </div>
    </main>
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
    <main className="screen page-screen secret-screen">
      <BackButton setPage={setPage} />

      <div className="small-logo">3B INTERNATIONAL</div>
      <h1>Secret</h1>
      <p className="intro">Entrez le code secret pour débloquer l’indice.</p>

      <h2>Code secret</h2>

      <div className="secret-input">
        <input
          value={secretCode}
          onChange={(e) => setSecretCode(e.target.value)}
          placeholder="Entrez le code secret"
        />
        <button onClick={openSecret}>Ouvrir le secret</button>
      </div>

      {secretOpen && (
        <div className="indice-box">
          <strong>Indice débloqué :</strong>
          <p>7 Italie — les 8 logos — 20h — tout va commencer.</p>
        </div>
      )}

      <h2>Cadre 3B relief 3D tactile</h2>
      <p className="intro">
        Touchez le 3B, déplacez-le, puis lancez-le contre les bords du cadre.
      </p>

      <Bouncing3B />
    </main>
  );
}

function Bouncing3B() {
  const frameRef = useRef(null);
  const ballRef = useRef(null);
  const pos = useRef({ x: 80, y: 80, vx: 2.5, vy: 2 });
  const dragging = useRef(false);

  useEffect(() => {
    let animation;

    const animate = () => {
      const frame = frameRef.current;
      const ball = ballRef.current;

      if (!frame || !ball || dragging.current) {
        animation = requestAnimationFrame(animate);
        return;
      }

      const maxX = frame.clientWidth - ball.clientWidth;
      const maxY = frame.clientHeight - ball.clientHeight;

      pos.current.x += pos.current.vx;
      pos.current.y += pos.current.vy;

      if (pos.current.x <= 0 || pos.current.x >= maxX) {
        pos.current.vx *= -1;
      }

      if (pos.current.y <= 0 || pos.current.y >= maxY) {
        pos.current.vy *= -1;
      }

      pos.current.x = Math.max(0, Math.min(maxX, pos.current.x));
      pos.current.y = Math.max(0, Math.min(maxY, pos.current.y));

      ball.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;

      animation = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animation);
  }, []);

  const startDrag = (e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e) => {
    if (!dragging.current || !frameRef.current || !ballRef.current) return;

    const rect = frameRef.current.getBoundingClientRect();
    const ball = ballRef.current;

    const maxX = frameRef.current.clientWidth - ball.clientWidth;
    const maxY = frameRef.current.clientHeight - ball.clientHeight;

    pos.current.x = Math.max(0, Math.min(maxX, e.clientX - rect.left - ball.clientWidth / 2));
    pos.current.y = Math.max(0, Math.min(maxY, e.clientY - rect.top - ball.clientHeight / 2));

    pos.current.vx = e.movementX || 3;
    pos.current.vy = e.movementY || 3;

    ball.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
  };

  const endDrag = () => {
    dragging.current = false;
  };

  return (
    <div className="relief-frame" ref={frameRef}>
      <div
        ref={ballRef}
        className="relief-<span>3B</span>"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        3B
      </div>
    </div>
  );
}

function PlusEncore({ setPage }) {
  const modules = [
    "Cartes de fidélité 3B",
    "Manga 3B International",
    "8 logos internationaux",
    "Album musique 20 titres",
    "Créateurs de programmes / commandes",
    "Certificat de produit avec code QR",
  ];

  return (
    <main className="screen page-screen plus-screen">
      <BackButton setPage={setPage} />

      <h1>Plus encore</h1>

      <div className="module-list">
        {modules.map((item) => (
          <div className="module-card" key={item}>
            <span>{item}</span>
            <span>›</span>
          </div>
        ))}
      </div>
    </main>
  );
}