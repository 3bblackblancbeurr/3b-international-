import { useEffect, useRef, useState } from "react";

export default function App() {
  const [started, setStarted] = useState(false);
  const [page, setPage] = useState("menu");

  const [messages, setMessages] = useState([
    { author: "3B", text: "Bienvenue dans le salon privé 3B." },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const arenaRef = useRef(null);
  const logoRef = useRef(null);

  const posRef = useRef({ x: 120, y: 120 });
  const velRef = useRef({ x: 3.2, y: 2.4 });

  const dragRef = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
  });

  const [logoPos, setLogoPos] = useState({ x: 120, y: 120 });

  useEffect(() => {
    let animationId;

    function animate() {
      const arena = arenaRef.current;
      const logo = logoRef.current;

      if (arena && logo && !dragRef.current.active) {
        const arenaRect = arena.getBoundingClientRect();
        const logoRect = logo.getBoundingClientRect();

        let nextX = posRef.current.x + velRef.current.x;
        let nextY = posRef.current.y + velRef.current.y;

        const maxX = arenaRect.width - logoRect.width;
        const maxY = arenaRect.height - logoRect.height;

        if (nextX <= 0) {
          nextX = 0;
          velRef.current.x *= -0.95;
        }

        if (nextX >= maxX) {
          nextX = maxX;
          velRef.current.x *= -0.95;
        }

        if (nextY <= 0) {
          nextY = 0;
          velRef.current.y *= -0.95;
        }

        if (nextY >= maxY) {
          nextY = maxY;
          velRef.current.y *= -0.95;
        }

        velRef.current.x *= 0.998;
        velRef.current.y *= 0.998;

        posRef.current = { x: nextX, y: nextY };
        setLogoPos({ x: nextX, y: nextY });
      }

      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, []);

  function playStartSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audio = new AudioContext();

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(950, audio.currentTime + 0.2);
    osc.frequency.exponentialRampToValueAtTime(90, audio.currentTime + 0.65);

    gain.gain.setValueAtTime(0.001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.7);

    osc.connect(gain);
    gain.connect(audio.destination);

    osc.start();
    osc.stop(audio.currentTime + 0.75);
  }

  function enterApp() {
    playStartSound();
    setStarted(true);
    setPage("menu");
  }

  function startDrag(e) {
    e.preventDefault();

    dragRef.current.active = true;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    dragRef.current.lastTime = Date.now();

    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }

  function moveDrag(e) {
    if (!dragRef.current.active) return;

    const arena = arenaRef.current;
    const logo = logoRef.current;

    if (!arena || !logo) return;

    const arenaRect = arena.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();

    const now = Date.now();
    const deltaTime = Math.max(now - dragRef.current.lastTime, 16);

    const deltaX = e.clientX - dragRef.current.lastX;
    const deltaY = e.clientY - dragRef.current.lastY;

    let nextX = posRef.current.x + deltaX;
    let nextY = posRef.current.y + deltaY;

    const maxX = arenaRect.width - logoRect.width;
    const maxY = arenaRect.height - logoRect.height;

    nextX = Math.max(0, Math.min(maxX, nextX));
    nextY = Math.max(0, Math.min(maxY, nextY));

    velRef.current = {
      x: (deltaX / deltaTime) * 22,
      y: (deltaY / deltaTime) * 22,
    };

    posRef.current = { x: nextX, y: nextY };
    setLogoPos({ x: nextX, y: nextY });

    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    dragRef.current.lastTime = now;
  }

  function endDrag(e) {
    dragRef.current.active = false;

    if (e.currentTarget.releasePointerCapture) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function sendMessage() {
    if (!newMessage.trim()) return;

    setMessages([
      ...messages,
      {
        author: "Moi",
        text: newMessage,
      },
    ]);

    setNewMessage("");
  }

  return (
    <div style={styles.app}>
      <style>
        {`
          @keyframes pulseGold {
            0% { box-shadow: 0 0 16px rgba(212,175,55,0.35); }
            50% { box-shadow: 0 0 50px rgba(212,175,55,0.9); }
            100% { box-shadow: 0 0 16px rgba(212,175,55,0.35); }
          }

          @keyframes rotate3D {
            0% { transform: rotateY(0deg) rotateX(13deg); }
            100% { transform: rotateY(360deg) rotateX(13deg); }
          }

          @keyframes backgroundMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes glowSecret {
            0% { opacity: 0.35; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(1.18); }
            100% { opacity: 0.35; transform: scale(1); }
          }
        `}
      </style>

      {!started ? (
        <div style={styles.intro}>
          <div style={styles.introTextBlock}>
            <h1 style={styles.bigTitle}>3B INTERNATIONAL</h1>
            <p style={styles.subtitle}>Studio IA — De Z à I</p>
          </div>

          <button style={styles.startButton} onClick={enterApp}>
            Commencer
          </button>
        </div>
      ) : (
        <div style={styles.screen}>
          <header style={styles.header}>
            <button style={styles.homeButton} onClick={() => setPage("menu")}>
              3B
            </button>

            <div>
              <h1 style={styles.headerTitle}>3B INTERNATIONAL</h1>
              <p style={styles.headerSubtitle}>Studio IA — De Z à I</p>
            </div>
          </header>

          {page === "menu" && (
            <main style={styles.menuGrid}>
              <MenuButton
                title="Logos internationaux"
                active
                onClick={() => setPage("logos")}
              />

              <MenuButton
                title="Musique"
                active
                onClick={() => setPage("musique")}
              />

              <MenuButton title="Manga" disabled />

              <MenuButton title="Cartes de fidélité" disabled />

              <MenuButton
                title="Secret 3B"
                active
                onClick={() => setPage("secret")}
              />

              <MenuButton
                title="Communauté +"
                active
                onClick={() => setPage("communaute")}
              />

              <MenuButton title="Case future 1" empty />
              <MenuButton title="Case future 2" empty />
              <MenuButton title="Case future 3" empty />
              <MenuButton title="Case future 4" empty />
              <MenuButton title="Case future 5" empty />
            </main>
          )}

          {page === "logos" && (
            <main style={styles.page}>
              <BackToMenu onClick={() => setPage("menu")} />

              <h2 style={styles.pageTitle}>Logos internationaux</h2>

              <p style={styles.pageText}>
                Ici, on intégrera les 8 logos officiels 3B que tu vas me donner.
              </p>

              <div style={styles.logoGrid}>
                {[
                  "France",
                  "Maroc",
                  "Algérie",
                  "Tunisie",
                  "Italie",
                  "Espagne",
                  "Turquie",
                  "Estonie",
                ].map((country) => (
                  <div key={country} style={styles.logoCard}>
                    <div style={styles.logoPlaceholder}>3B</div>
                    <h3>{country}</h3>
                    <p>Logo officiel à intégrer</p>
                  </div>
                ))}
              </div>
            </main>
          )}

          {page === "musique" && (
            <main style={styles.page}>
              <BackToMenu onClick={() => setPage("menu")} />

              <h2 style={styles.pageTitle}>3B Music</h2>

              <p style={styles.pageText}>
                Ici, on ajoutera les musiques officielles que tu vas me donner.
              </p>

              <div style={styles.musicList}>
                <div style={styles.musicCard}>
                  <span>Son officiel 3B</span>
                  <button style={styles.smallGold}>Bientôt</button>
                </div>

                <div style={styles.musicCard}>
                  <span>Hymne 3B</span>
                  <button style={styles.smallGold}>Bientôt</button>
                </div>

                <div style={styles.musicCard}>
                  <span>Ambiance défilé</span>
                  <button style={styles.smallGold}>Bientôt</button>
                </div>

                <div style={styles.musicCard}>
                  <span>Son TikTok secret</span>
                  <button style={styles.smallGold}>Bientôt</button>
                </div>
              </div>
            </main>
          )}

          {page === "secret" && (
            <main style={styles.secretPage}>
              <BackToMenu onClick={() => setPage("menu")} />

              <h2 style={styles.pageTitle}>Secret 3B</h2>

              <p style={styles.pageText}>
                Touche le logo avec ton pouce, tire-le puis relâche : il part et
                rebondit sur les côtés.
              </p>

              <div ref={arenaRef} style={styles.secretArena}>
                <div style={styles.secretLight}></div>

                <div
                  ref={logoRef}
                  onPointerDown={startDrag}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  style={{
                    ...styles.secretMovingLogo,
                    left: `${logoPos.x}px`,
                    top: `${logoPos.y}px`,
                  }}
                >
                  <div style={styles.secret3D}>
                    {Array.from({ length: 22 }).map((_, index) => (
                      <span
                        key={index}
                        style={{
                          ...styles.secretLayer,
                          transform: `translateZ(${-index * 3}px)`,
                          color: index === 0 ? "#ffe28a" : "#6d4708",
                          textShadow:
                            index === 0
                              ? "0 0 35px rgba(255,220,120,0.95), 0 0 95px rgba(212,175,55,0.75)"
                              : "none",
                        }}
                      >
                        3B
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </main>
          )}

          {page === "communaute" && (
            <main style={styles.page}>
              <BackToMenu onClick={() => setPage("menu")} />

              <h2 style={styles.pageTitle}>Communauté 3B</h2>

              <p style={styles.pageText}>
                Salon de discussion local pour commencer.
              </p>

              <div style={styles.chatBox}>
                <div style={styles.messages}>
                  {messages.map((msg, index) => (
                    <div key={index} style={styles.message}>
                      <strong>{msg.author} :</strong> {msg.text}
                    </div>
                  ))}
                </div>

                <div style={styles.chatInputRow}>
                  <input
                    style={styles.chatInput}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écris un message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                  />

                  <button style={styles.sendButton} onClick={sendMessage}>
                    Envoyer
                  </button>
                </div>
              </div>
            </main>
          )}
        </div>
      )}
    </div>
  );
}

function MenuButton({ title, active, disabled, empty, onClick }) {
  return (
    <button
      onClick={disabled || empty ? undefined : onClick}
      style={{
        ...styles.menuButton,
        ...(active ? styles.menuActive : {}),
        ...(disabled ? styles.menuDisabled : {}),
        ...(empty ? styles.menuEmpty : {}),
      }}
    >
      {title}
    </button>
  );
}

function BackToMenu({ onClick }) {
  return (
    <button style={styles.backButton} onClick={onClick}>
      ← Retour au menu général
    </button>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    width: "100vw",
    background: "#030303",
    color: "white",
    fontFamily: "Arial, sans-serif",
    overflowX: "hidden",
  },

  intro: {
    minHeight: "100vh",
    width: "100%",
    background:
      "linear-gradient(135deg, #000000, #080808, #1a1405, #000000)",
    backgroundSize: "300% 300%",
    animation: "backgroundMove 9s ease infinite",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "24px",
    boxSizing: "border-box",
  },

  introTextBlock: {
    marginBottom: "58px",
  },

  bigTitle: {
    fontSize: "clamp(36px, 9vw, 78px)",
    color: "#d4af37",
    margin: "0 0 22px 0",
    lineHeight: 1,
    letterSpacing: "2px",
    textShadow: "0 0 35px rgba(212,175,55,0.55)",
  },

  subtitle: {
    fontSize: "clamp(18px, 4vw, 26px)",
    color: "white",
    opacity: 0.85,
    margin: 0,
  },

  startButton: {
    padding: "22px 72px",
    borderRadius: "24px",
    border: "1px solid rgba(255,230,150,0.8)",
    background: "linear-gradient(135deg, #d4af37, #ffe28a, #b88918)",
    color: "black",
    fontSize: "24px",
    fontWeight: "900",
    cursor: "pointer",
    animation: "pulseGold 2.4s infinite",
  },

  screen: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #1b1504 0%, #060606 45%, #000000 100%)",
  },

  header: {
    minHeight: "95px",
    borderBottom: "1px solid rgba(212,175,55,0.25)",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    padding: "18px 24px",
    boxSizing: "border-box",
  },

  homeButton: {
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    border: "1px solid #d4af37",
    background: "#0b0b0b",
    color: "#d4af37",
    fontWeight: "900",
    fontSize: "20px",
    cursor: "pointer",
  },

  headerTitle: {
    margin: 0,
    color: "#d4af37",
    fontSize: "clamp(24px, 5vw, 38px)",
    lineHeight: 1.05,
    letterSpacing: "1px",
  },

  headerSubtitle: {
    margin: "8px 0 0 0",
    opacity: 0.78,
    fontSize: "clamp(14px, 3vw, 18px)",
  },

  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "20px",
    padding: "32px",
  },

  menuButton: {
    minHeight: "125px",
    borderRadius: "24px",
    fontSize: "20px",
    fontWeight: "900",
    cursor: "pointer",
    transition: "0.2s",
  },

  menuActive: {
    background: "linear-gradient(135deg, #d4af37, #ffe28a, #b88918)",
    color: "black",
    border: "1px solid #fff0b0",
    boxShadow: "0 0 30px rgba(212,175,55,0.35)",
  },

  menuDisabled: {
    background: "#050505",
    color: "white",
    border: "1px solid rgba(255,255,255,0.15)",
    opacity: 0.6,
    cursor: "not-allowed",
  },

  menuEmpty: {
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.35)",
    border: "1px dashed rgba(212,175,55,0.25)",
    cursor: "default",
  },

  page: {
    padding: "32px",
  },

  secretPage: {
    padding: "32px",
  },

  backButton: {
    marginBottom: "24px",
    padding: "13px 22px",
    borderRadius: "14px",
    border: "1px solid rgba(212,175,55,0.55)",
    background: "#080808",
    color: "#d4af37",
    fontWeight: "900",
    fontSize: "15px",
    cursor: "pointer",
    boxShadow: "0 0 18px rgba(212,175,55,0.18)",
  },

  pageTitle: {
    color: "#d4af37",
    fontSize: "clamp(32px, 7vw, 52px)",
    margin: "0 0 12px 0",
  },

  pageText: {
    opacity: 0.75,
    fontSize: "18px",
    marginBottom: "28px",
  },

  logoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "18px",
  },

  logoCard: {
    background: "#080808",
    border: "1px solid rgba(212,175,55,0.35)",
    borderRadius: "22px",
    padding: "22px",
    textAlign: "center",
  },

  logoPlaceholder: {
    width: "86px",
    height: "86px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #d4af37, #ffe28a)",
    color: "black",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 14px auto",
    fontWeight: "900",
    fontSize: "26px",
  },

  musicList: {
    display: "grid",
    gap: "16px",
  },

  musicCard: {
    background: "#080808",
    border: "1px solid rgba(212,175,55,0.35)",
    borderRadius: "18px",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  smallGold: {
    border: "none",
    borderRadius: "12px",
    padding: "10px 18px",
    background: "#d4af37",
    color: "black",
    fontWeight: "bold",
  },

  secretArena: {
    height: "65vh",
    minHeight: "430px",
    position: "relative",
    overflow: "hidden",
    borderRadius: "28px",
    border: "1px solid rgba(212,175,55,0.35)",
    background:
      "radial-gradient(circle at center, #1a1405 0%, #030303 60%, #000 100%)",
    perspective: "1200px",
  },

  secretLight: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "420px",
    height: "420px",
    transform: "translate(-50%, -50%)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(212,175,55,0.32), transparent 70%)",
    animation: "glowSecret 3s ease-in-out infinite",
    pointerEvents: "none",
  },

  secretMovingLogo: {
    position: "absolute",
    width: "230px",
    height: "160px",
    cursor: "grab",
    transformStyle: "preserve-3d",
    touchAction: "none",
    userSelect: "none",
  },

  secret3D: {
    position: "relative",
    width: "230px",
    height: "160px",
    transformStyle: "preserve-3d",
    animation: "rotate3D 4.5s linear infinite",
  },

  secretLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    fontSize: "150px",
    fontWeight: "900",
    letterSpacing: "-10px",
    WebkitTextStroke: "2px #fff0b0",
    lineHeight: "150px",
  },

  chatBox: {
    background: "#070707",
    border: "1px solid rgba(212,175,55,0.35)",
    borderRadius: "24px",
    padding: "20px",
    maxWidth: "850px",
  },

  messages: {
    minHeight: "280px",
    maxHeight: "360px",
    overflowY: "auto",
    background: "#020202",
    borderRadius: "18px",
    padding: "16px",
    marginBottom: "16px",
  },

  message: {
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  chatInputRow: {
    display: "flex",
    gap: "12px",
  },

  chatInput: {
    flex: 1,
    padding: "16px",
    borderRadius: "14px",
    border: "1px solid rgba(212,175,55,0.35)",
    background: "#111",
    color: "white",
    fontSize: "16px",
  },

  sendButton: {
    padding: "16px 24px",
    borderRadius: "14px",
    border: "none",
    background: "#d4af37",
    color: "black",
    fontWeight: "900",
    cursor: "pointer",
  },
};