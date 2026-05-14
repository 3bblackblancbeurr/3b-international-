import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export default function App() {
  const [started, setStarted] = useState(false);
  const [page, setPage] = useState("menu");

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const chatBottomRef = useRef(null);

  const arenaRef = useRef(null);
  const logoRef = useRef(null);
  const posRef = useRef({ x: 140, y: 120 });
  const velRef = useRef({ x: 3.2, y: 2.4 });
  const dragRef = useRef({
    active: false,
    offsetX: 0,
    offsetY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
  });

  useEffect(() => {
    if (page === "communaute") {
      loadMessages();
    }
  }, [page]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!supabase || page !== "communaute") return;

    const channel = supabase
      .channel("messages-realtime-3b")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          setMessages((currentMessages) => {
            const exists = currentMessages.some(
              (message) => message.id === payload.new.id
            );

            if (exists) return currentMessages;

            return [...currentMessages, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [page]);

  useEffect(() => {
    if (page !== "secret") return;

    let animationFrame;

    function animateLogo() {
      const arena = arenaRef.current;
      const logo = logoRef.current;

      if (!arena || !logo) {
        animationFrame = requestAnimationFrame(animateLogo);
        return;
      }

      const arenaRect = arena.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();

      if (!dragRef.current.active) {
        posRef.current.x += velRef.current.x;
        posRef.current.y += velRef.current.y;

        if (posRef.current.x <= 0) {
          posRef.current.x = 0;
          velRef.current.x *= -1;
        }

        if (posRef.current.y <= 0) {
          posRef.current.y = 0;
          velRef.current.y *= -1;
        }

        if (posRef.current.x + logoRect.width >= arenaRect.width) {
          posRef.current.x = arenaRect.width - logoRect.width;
          velRef.current.x *= -1;
        }

        if (posRef.current.y + logoRect.height >= arenaRect.height) {
          posRef.current.y = arenaRect.height - logoRect.height;
          velRef.current.y *= -1;
        }
      }

      logo.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) rotateX(18deg) rotateY(${Date.now() / 25}deg)`;

      animationFrame = requestAnimationFrame(animateLogo);
    }

    animateLogo();

    return () => cancelAnimationFrame(animationFrame);
  }, [page]);

  async function loadMessages() {
    const welcomeMessage = {
      id: "welcome",
      author: "3B",
      text: "Bienvenue dans Discussion privée 3B.",
      created_at: new Date().toISOString(),
    };

    if (!supabase) {
      setMessages([welcomeMessage]);
      return;
    }

    setLoadingMessages(true);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    setLoadingMessages(false);

    if (error) {
      console.warn("Supabase lecture bloquée :", error);
      setMessages([welcomeMessage]);
      return;
    }

    if (!data || data.length === 0) {
      setMessages([welcomeMessage]);
      return;
    }

    setMessages(data);
  }

  async function sendMessage() {
    const text = newMessage.trim();

    if (!text) return;

    const localMessage = {
      id: `local-${Date.now()}`,
      author: "Moi",
      text,
      created_at: new Date().toISOString(),
    };

    setMessages((currentMessages) => [...currentMessages, localMessage]);
    setNewMessage("");

    if (!supabase) return;

    const { error } = await supabase.from("messages").insert([
      {
        author: "Moi",
        text,
      },
    ]);

    if (error) {
      console.warn("Supabase envoi bloqué :", error);
    }
  }

  function handleMessageKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  }

  function playStartSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(120, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        980,
        audioContext.currentTime + 0.22
      );

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.22, audioContext.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.32);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.34);
    } catch (error) {
      console.warn("Son non disponible :", error);
    }
  }

  function startApp() {
    playStartSound();
    setStarted(true);
  }

  function BackToMenu() {
    return (
      <button style={styles.backButton} onClick={() => setPage("menu")}>
        ← Retour au menu général
      </button>
    );
  }

  function onLogoPointerDown(event) {
    const logo = logoRef.current;
    if (!logo) return;

    const rect = logo.getBoundingClientRect();

    dragRef.current.active = true;
    dragRef.current.offsetX = event.clientX - rect.left;
    dragRef.current.offsetY = event.clientY - rect.top;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
    dragRef.current.lastTime = Date.now();

    logo.setPointerCapture(event.pointerId);
  }

  function onLogoPointerMove(event) {
    if (!dragRef.current.active) return;

    const arena = arenaRef.current;
    const logo = logoRef.current;

    if (!arena || !logo) return;

    const arenaRect = arena.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();

    const now = Date.now();
    const deltaTime = Math.max(now - dragRef.current.lastTime, 16);

    const newX = event.clientX - arenaRect.left - dragRef.current.offsetX;
    const newY = event.clientY - arenaRect.top - dragRef.current.offsetY;

    velRef.current.x =
      ((event.clientX - dragRef.current.lastX) / deltaTime) * 16;
    velRef.current.y =
      ((event.clientY - dragRef.current.lastY) / deltaTime) * 16;

    posRef.current.x = Math.max(
      0,
      Math.min(newX, arenaRect.width - logoRect.width)
    );

    posRef.current.y = Math.max(
      0,
      Math.min(newY, arenaRect.height - logoRect.height)
    );

    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
    dragRef.current.lastTime = now;
  }

  function onLogoPointerUp(event) {
    const logo = logoRef.current;

    dragRef.current.active = false;

    if (logo) {
      logo.releasePointerCapture(event.pointerId);
    }

    if (Math.abs(velRef.current.x) < 1) velRef.current.x = 2.5;
    if (Math.abs(velRef.current.y) < 1) velRef.current.y = 2.2;
  }

  function StartPage() {
    return (
      <main style={styles.startPage}>
        <div style={styles.startGlow}></div>

        <section style={styles.startPanel}>
          <p style={styles.kicker}>3B INTERNATIONAL</p>
          <h1 style={styles.startTitle}>De zéro à l’international</h1>
          <p style={styles.subtitle}>
            Studio créatif, communauté, musique, logos, secret et futur écosystème 3B.
          </p>

          <button style={styles.startButton} onClick={startApp}>
            Commencer
          </button>
        </section>
      </main>
    );
  }

  function MenuPage() {
    return (
      <main style={styles.page}>
        <section style={styles.hero}>
          <p style={styles.kicker}>3B INTERNATIONAL</p>
          <h1 style={styles.title}>De zéro à l’international</h1>
          <p style={styles.subtitle}>
            Studio créatif, communauté, musique, univers 3B et futurs projets.
          </p>

          <div style={styles.grid}>
            <button style={styles.card} onClick={() => setPage("creation")}>
              <span style={styles.cardTitle}>Création</span>
              <span style={styles.cardText}>
                Créer, préparer et imaginer les futurs vêtements 3B.
              </span>
            </button>

            <button style={styles.card} onClick={() => setPage("communaute")}>
              <span style={styles.cardTitle}>Communauté</span>
              <span style={styles.cardText}>
                Salon privé pour discuter autour de 3B International.
              </span>
            </button>

            <button style={styles.card} onClick={() => setPage("musique")}>
              <span style={styles.cardTitle}>3B Musique</span>
              <span style={styles.cardText}>
                Sons officiels, ambiance de défilé, hymne et TikTok.
              </span>
            </button>

            <button style={styles.card} onClick={() => setPage("secret")}>
              <span style={styles.cardTitle}>Secret 3B</span>
              <span style={styles.cardText}>
                Indices, dates, mystère et histoire cachée de la marque.
              </span>
            </button>

            <button style={styles.card} onClick={() => setPage("logos")}>
              <span style={styles.cardTitle}>Logos 3B</span>
              <span style={styles.cardText}>
                France, Italie, Estonie, Turquie, Algérie, Tunisie, Maroc, Espagne.
              </span>
            </button>

            <button style={styles.emptyCard}>
              <span style={styles.cardTitle}>Projet futur</span>
              <span style={styles.cardText}>Case vide à compléter.</span>
            </button>

            <button style={styles.emptyCard}>
              <span style={styles.cardTitle}>Pilier futur</span>
              <span style={styles.cardText}>Case vide à compléter.</span>
            </button>

            <button style={styles.emptyCard}>
              <span style={styles.cardTitle}>Module futur</span>
              <span style={styles.cardText}>Case vide à compléter.</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  function CreationPage() {
    return (
      <main style={styles.page}>
        <BackToMenu />

        <section style={styles.panel}>
          <p style={styles.kicker}>CRÉATION</p>
          <h1 style={styles.pageTitle}>Création</h1>

          <div style={styles.creationGrid}>
            <div style={styles.creationBox}>
              <h2 style={styles.boxTitle}>Studio vêtements</h2>
              <p style={styles.text}>
                Zone prévue pour les maillots, prototypes, matières, couleurs,
                placement des logos et fiches techniques.
              </p>
            </div>

            <div style={styles.creationBox}>
              <h2 style={styles.boxTitle}>Sauvegarde projets</h2>
              <p style={styles.text}>
                Ici viendra plus tard la sauvegarde des créations 3B et des versions.
              </p>
            </div>

            <div style={styles.creationBox}>
              <h2 style={styles.boxTitle}>Exports</h2>
              <p style={styles.text}>
                Zone prévue pour les exports image, PDF, fiche usine et présentation.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function CommunityPage() {
    return (
      <main style={styles.page}>
        <BackToMenu />

        <section style={styles.chatSection}>
          <p style={styles.kicker}>COMMUNAUTÉ</p>
          <h1 style={styles.pageTitle}>Discussion privée 3B</h1>
          <p style={styles.text}>
            Salon de discussion connecté à Supabase pour la communauté 3B.
          </p>

          <div style={styles.chatBox}>
            <div style={styles.chatHeader}>Discussion privée 3B</div>

            <div style={styles.messagesArea}>
              {loadingMessages && (
                <p style={styles.systemText}>Chargement des messages...</p>
              )}

              {!loadingMessages &&
                messages.map((message) => (
                  <div
                    key={message.id}
                    style={
                      message.author === "Moi"
                        ? styles.myMessage
                        : styles.otherMessage
                    }
                  >
                    <div style={styles.messageAuthor}>{message.author}</div>
                    <div style={styles.messageText}>{message.text}</div>
                  </div>
                ))}

              <div ref={chatBottomRef} />
            </div>

            <div style={styles.inputRow}>
              <input
                style={styles.chatInput}
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                onKeyDown={handleMessageKeyDown}
                placeholder="Écris ton message..."
              />

              <button style={styles.sendButton} onClick={sendMessage}>
                Envoyer
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function MusicPage() {
    return (
      <main style={styles.page}>
        <BackToMenu />

        <section style={styles.panel}>
          <p style={styles.kicker}>3B MUSIQUE</p>
          <h1 style={styles.pageTitle}>3B Musique</h1>
          <p style={styles.text}>
            Sons officiels, ambiance de défilé, hymne 3B, sons TikTok, playlists
            et futures collaborations.
          </p>

          <div style={styles.musicGrid}>
            <div style={styles.musicCard}>
              <h2 style={styles.boxTitle}>Sons officiels</h2>
              <p style={styles.text}>
                Zone pour les musiques de campagne et les sons de lancement.
              </p>
            </div>

            <div style={styles.musicCard}>
              <h2 style={styles.boxTitle}>Ambiance défilé</h2>
              <p style={styles.text}>
                Sons premium pour présentation luxe, vidéo, podium et teasing.
              </p>
            </div>

            <div style={styles.musicCard}>
              <h2 style={styles.boxTitle}>TikTok 3B</h2>
              <p style={styles.text}>
                Sons courts, viraux, mystérieux et puissants pour les annonces.
              </p>
            </div>

            <div style={styles.musicCard}>
              <h2 style={styles.boxTitle}>Hymne 3B</h2>
              <p style={styles.text}>
                Futur hymne officiel : héritage, international, famille et vision.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function SecretPage() {
    return (
      <main style={styles.page}>
        <BackToMenu />

        <section style={styles.secretPanel}>
          <div style={styles.secretTextBlock}>
            <p style={styles.kicker}>SECRET 3B</p>
            <h1 style={styles.pageTitle}>Le secret continue</h1>
            <p style={styles.secretText}>Italie s’y comprennent.</p>
            <p style={styles.text}>
              À Milan, le textile cache plus qu’un tissu. Le luxe cache plus
              qu’un nom. La création cache plus qu’une idée.
            </p>

            <div style={styles.secretDate}>08.07 — 20H</div>
          </div>

          <div ref={arenaRef} style={styles.secretArena}>
            <div
              ref={logoRef}
              style={styles.movingLogo}
              onPointerDown={onLogoPointerDown}
              onPointerMove={onLogoPointerMove}
              onPointerUp={onLogoPointerUp}
            >
              3B
            </div>
          </div>
        </section>
      </main>
    );
  }

  function LogosPage() {
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
      <main style={styles.page}>
        <BackToMenu />

        <section style={styles.panel}>
          <p style={styles.kicker}>LOGOS 3B</p>
          <h1 style={styles.pageTitle}>Logos officiels 3B</h1>
          <p style={styles.text}>
            Espace prévu pour intégrer les huit logos principaux de la collection
            internationale 3B.
          </p>

          <div style={styles.logoGrid}>
            {logos.map((logoName) => (
              <div key={logoName} style={styles.logoCard}>
                <div style={styles.logoCircle}>3B</div>
                <h2 style={styles.boxTitle}>{logoName}</h2>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (!started) {
    return <StartPage />;
  }

  return (
    <div style={styles.app}>
      {page === "menu" && <MenuPage />}
      {page === "creation" && <CreationPage />}
      {page === "communaute" && <CommunityPage />}
      {page === "musique" && <MusicPage />}
      {page === "secret" && <SecretPage />}
      {page === "logos" && <LogosPage />}
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    width: "100vw",
    background:
      "radial-gradient(circle at top, #1d1d1d 0%, #080808 45%, #000 100%)",
    color: "white",
    fontFamily: "Arial, sans-serif",
    overflowX: "hidden",
  },

  startPage: {
    minHeight: "100vh",
    width: "100vw",
    background:
      "radial-gradient(circle at center, rgba(212,175,55,0.20) 0%, #090909 45%, #000 100%)",
    color: "white",
    fontFamily: "Arial, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },

  startGlow: {
    position: "absolute",
    width: "520px",
    height: "520px",
    borderRadius: "50%",
    background: "rgba(212,175,55,0.18)",
    filter: "blur(80px)",
  },

  startPanel: {
    position: "relative",
    zIndex: 2,
    maxWidth: "900px",
    padding: "50px",
    border: "1px solid rgba(212,175,55,0.65)",
    borderRadius: "34px",
    background: "rgba(0,0,0,0.55)",
    textAlign: "center",
    boxShadow: "0 0 60px rgba(212,175,55,0.16)",
  },

  startTitle: {
    fontSize: "72px",
    lineHeight: "0.95",
    color: "#d4af37",
    margin: "0 0 22px 0",
    fontWeight: "900",
    textTransform: "uppercase",
  },

  startButton: {
    marginTop: "30px",
    padding: "18px 34px",
    borderRadius: "18px",
    border: "none",
    background: "#d4af37",
    color: "black",
    fontSize: "18px",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow: "0 0 35px rgba(212,175,55,0.45)",
  },

  page: {
    minHeight: "100vh",
    padding: "40px",
    boxSizing: "border-box",
  },

  hero: {
    maxWidth: "1200px",
    margin: "0 auto",
    paddingTop: "60px",
  },

  kicker: {
    color: "#d4af37",
    fontSize: "14px",
    fontWeight: "900",
    letterSpacing: "5px",
    textTransform: "uppercase",
    marginBottom: "12px",
  },

  title: {
    fontSize: "72px",
    lineHeight: "0.95",
    color: "#d4af37",
    margin: "0 0 20px 0",
    fontWeight: "900",
  },

  subtitle: {
    fontSize: "20px",
    color: "#e8e8e8",
    maxWidth: "820px",
    marginBottom: "42px",
    lineHeight: "1.5",
  },

  pageTitle: {
    fontSize: "54px",
    lineHeight: "1",
    color: "#d4af37",
    margin: "0 0 16px 0",
    fontWeight: "900",
  },

  text: {
    fontSize: "17px",
    lineHeight: "1.6",
    color: "#e5e5e5",
    maxWidth: "900px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "22px",
    marginTop: "40px",
  },

  card: {
    border: "1px solid rgba(212, 175, 55, 0.7)",
    background: "rgba(255, 255, 255, 0.035)",
    color: "white",
    padding: "28px",
    borderRadius: "24px",
    minHeight: "175px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 0 30px rgba(0,0,0,0.35)",
  },

  emptyCard: {
    border: "1px dashed rgba(212, 175, 55, 0.45)",
    background: "rgba(255, 255, 255, 0.02)",
    color: "white",
    padding: "28px",
    borderRadius: "24px",
    minHeight: "175px",
    textAlign: "left",
    cursor: "default",
    opacity: 0.72,
  },

  cardTitle: {
    display: "block",
    color: "#d4af37",
    fontSize: "25px",
    fontWeight: "900",
    marginBottom: "14px",
  },

  cardText: {
    display: "block",
    color: "#eeeeee",
    fontSize: "16px",
    lineHeight: "1.5",
  },

  panel: {
    maxWidth: "1100px",
    margin: "35px auto 0 auto",
    padding: "42px",
    border: "1px solid rgba(212, 175, 55, 0.68)",
    borderRadius: "30px",
    background: "rgba(255, 255, 255, 0.035)",
    boxShadow: "0 0 45px rgba(0,0,0,0.45)",
  },

  backButton: {
    border: "1px solid rgba(212, 175, 55, 0.75)",
    background: "transparent",
    color: "#d4af37",
    padding: "13px 20px",
    borderRadius: "16px",
    cursor: "pointer",
    fontWeight: "900",
    marginBottom: "30px",
  },

  creationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "20px",
    marginTop: "30px",
  },

  creationBox: {
    border: "1px solid rgba(212,175,55,0.55)",
    borderRadius: "24px",
    padding: "24px",
    background: "rgba(0,0,0,0.35)",
  },

  musicGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "20px",
    marginTop: "34px",
  },

  musicCard: {
    border: "1px solid rgba(212,175,55,0.65)",
    borderRadius: "24px",
    padding: "24px",
    background:
      "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(255,255,255,0.03))",
  },

  boxTitle: {
    color: "#d4af37",
    fontSize: "24px",
    fontWeight: "900",
    margin: "0 0 12px 0",
  },

  chatSection: {
    maxWidth: "1150px",
    margin: "20px auto 0 auto",
  },

  chatBox: {
    marginTop: "25px",
    border: "1px solid rgba(212, 175, 55, 0.75)",
    borderRadius: "28px",
    padding: "24px",
    background: "rgba(0, 0, 0, 0.45)",
    boxShadow: "0 0 45px rgba(0,0,0,0.45)",
  },

  chatHeader: {
    color: "#d4af37",
    fontSize: "23px",
    fontWeight: "900",
    paddingBottom: "18px",
    borderBottom: "1px solid rgba(212, 175, 55, 0.28)",
    marginBottom: "20px",
  },

  messagesArea: {
    height: "360px",
    overflowY: "auto",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  myMessage: {
    alignSelf: "flex-end",
    maxWidth: "75%",
    background: "#d4af37",
    color: "black",
    padding: "12px 16px",
    borderRadius: "18px 18px 4px 18px",
    fontWeight: "700",
  },

  otherMessage: {
    alignSelf: "flex-start",
    maxWidth: "75%",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    padding: "12px 16px",
    borderRadius: "18px 18px 18px 4px",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  messageAuthor: {
    fontSize: "12px",
    opacity: "0.75",
    marginBottom: "4px",
    fontWeight: "900",
  },

  messageText: {
    fontSize: "16px",
    lineHeight: "1.4",
    wordBreak: "break-word",
  },

  systemText: {
    textAlign: "center",
    color: "#cccccc",
  },

  inputRow: {
    display: "flex",
    gap: "14px",
    marginTop: "20px",
  },

  chatInput: {
    flex: 1,
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid rgba(212, 175, 55, 0.75)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontSize: "16px",
    outline: "none",
  },

  sendButton: {
    padding: "16px 26px",
    borderRadius: "16px",
    border: "none",
    background: "#d4af37",
    color: "black",
    fontWeight: "900",
    cursor: "pointer",
  },

  secretPanel: {
    maxWidth: "1180px",
    margin: "35px auto 0 auto",
    padding: "42px",
    border: "1px solid rgba(212, 175, 55, 0.72)",
    borderRadius: "30px",
    background:
      "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(255,255,255,0.025))",
    boxShadow: "0 0 45px rgba(0,0,0,0.5)",
  },

  secretTextBlock: {
    position: "relative",
    zIndex: 2,
  },

  secretText: {
    fontSize: "32px",
    color: "#d4af37",
    fontWeight: "900",
    margin: "16px 0",
  },

  secretDate: {
    marginTop: "28px",
    padding: "20px",
    borderRadius: "18px",
    border: "1px solid rgba(212,175,55,0.65)",
    background: "rgba(212,175,55,0.12)",
    color: "#fff2b3",
    fontSize: "22px",
    fontWeight: "900",
    textAlign: "center",
  },

  secretArena: {
    position: "relative",
    height: "320px",
    marginTop: "35px",
    border: "1px solid rgba(212,175,55,0.65)",
    borderRadius: "26px",
    overflow: "hidden",
    background:
      "radial-gradient(circle at center, rgba(212,175,55,0.08), rgba(0,0,0,0.50))",
    perspective: "900px",
  },

  movingLogo: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "150px",
    height: "95px",
    borderRadius: "24px",
    background:
      "linear-gradient(135deg, #fff4a8 0%, #d4af37 38%, #6c530d 100%)",
    color: "black",
    fontSize: "44px",
    fontWeight: "900",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "grab",
    userSelect: "none",
    touchAction: "none",
    boxShadow:
      "0 18px 35px rgba(0,0,0,0.55), inset 0 3px 0 rgba(255,255,255,0.55), inset 0 -8px 15px rgba(0,0,0,0.35)",
    textShadow: "0 2px 0 rgba(255,255,255,0.25)",
    border: "1px solid rgba(255,255,255,0.35)",
  },

  logoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "20px",
    marginTop: "35px",
  },

  logoCard: {
    border: "1px solid rgba(212,175,55,0.62)",
    borderRadius: "24px",
    padding: "24px",
    textAlign: "center",
    background: "rgba(0,0,0,0.38)",
  },

  logoCircle: {
    width: "86px",
    height: "86px",
    margin: "0 auto 18px auto",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #fff2a0 0%, #d4af37 48%, #70570f 100%)",
    color: "black",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "28px",
    boxShadow: "0 0 28px rgba(212,175,55,0.35)",
  },
};