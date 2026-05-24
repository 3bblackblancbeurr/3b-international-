import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import Jeu3B from "./Jeu3B";

const MEMBER_STORAGE_KEY = "3b_member_profile_v3";
const SECRET_CODE = "blackblancbeurr";

const OFFICIAL_COUNTRIES = [
  "France",
  "Italie",
  "Estonie",
  "Turquie",
  "Algérie",
  "Tunisie",
  "Maroc",
  "Espagne",
];

const HOME_MENU = [
  { key: "boutique", title: "Boutique", icon: "🛍️" },
  { key: "musique", title: "Musique", icon: "♪" },
  { key: "communaute", title: "Communauté", icon: "👥" },
  { key: "passport", title: "Passeport 3B", icon: "🪪" },
  { key: "jeux", title: "Jeux", icon: "🎮" },
  { key: "secret", title: "Coffre secret 3B", icon: "🔐" },
  { key: "plus", title: "Plus encore", icon: "⭐" },
];

function readStoredMember() {
  try {
    const raw = localStorage.getItem(MEMBER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function makePassportId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `3B-PASS-${random}`;
}

function BrandBlock({ compact = false }) {
  return (
    <div className={`brand-block ${compact ? "compact" : ""}`}>
      <div className="brand-main">3B INTERNATIONAL</div>
      <div className="brand-sub">VÊTEMENTS HAUT DE GAMME</div>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button className="back-button" onClick={onClick}>
      ← Retour
    </button>
  );
}

function MenuCard({ icon, title, onClick }) {
  return (
    <button className="menu-card" onClick={onClick}>
      <div className="menu-card-left">
        <div className="icon-circle">{icon}</div>
        <div className="menu-card-title">{title}</div>
      </div>
      <div className="menu-card-arrow">›</div>
    </button>
  );
}

function FeatureCard({ title, children, className = "" }) {
  return (
    <div className={`feature-card lux-card ${className}`}>
      {title ? <h3 className="card-title">{title}</h3> : null}
      <div className="card-body">{children}</div>
    </div>
  );
}

function PageFrame({ title, subtitle, onBack, children }) {
  return (
    <div className="app-screen page">
      <div className="page-shell">
        <div className="page-topbar">
          <BackButton onClick={onBack} />
        </div>

        <BrandBlock compact />

        <div className="page-heading">
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>

        <div className="gold-line" />

        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [member, setMember] = useState(() => readStoredMember());
  const [secretInput, setSecretInput] = useState("");
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [secretError, setSecretError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    originCountry: "France",
    residenceCountry: "",
    city: "",
  });

  useEffect(() => {
    if (member) {
      localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(member));
      setForm({
        name: member.name || "",
        email: member.email || "",
        originCountry: member.originCountry || "France",
        residenceCountry: member.residenceCountry || "",
        city: member.city || "",
      });
    } else {
      localStorage.removeItem(MEMBER_STORAGE_KEY);
      setForm({
        name: "",
        email: "",
        originCountry: "France",
        residenceCountry: "",
        city: "",
      });
    }
  }, [member]);

  const musicSlots = useMemo(() => {
    return Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      title: `Musique ${String(index + 1).padStart(2, "0")}`,
      subtitle: "Case prête pour ajouter ton morceau 3B.",
    }));
  }, []);

  const go = (next) => setScreen(next);

  const handleCreatePassport = () => {
    if (!form.name.trim()) {
      alert("Remplis au minimum le nom ou pseudo.");
      return;
    }

    const profile = {
      name: form.name.trim(),
      email: form.email.trim(),
      originCountry: form.originCountry,
      residenceCountry: form.residenceCountry.trim(),
      city: form.city.trim(),
      passportId: member?.passportId || makePassportId(),
      createdAt: member?.createdAt || new Date().toISOString(),
      status: "Membre 3B",
    };

    setMember(profile);
    go("passport");
  };

  const handleDeletePassport = () => {
    const ok = window.confirm(
      "Tu veux vraiment supprimer le passeport local 3B sur cet appareil ?"
    );
    if (!ok) return;

    setMember(null);
    go("passport");
  };

  const handleUnlockSecret = () => {
    if (secretInput.trim().toLowerCase() === SECRET_CODE) {
      setSecretUnlocked(true);
      setSecretError("");
      return;
    }

    setSecretUnlocked(false);
    setSecretError("Code incorrect.");
  };

  if (screen === "jeu3b") {
    return <Jeu3B go={go} member={member} />;
  }

  if (screen === "home") {
    return (
      <div className="app-screen home-page">
        <div className="page-shell home-shell">
          <BrandBlock />

          <div className="home-menu card-grid page-grid compact-grid">
            {HOME_MENU.map((item) => (
              <MenuCard
                key={item.key}
                icon={item.icon}
                title={item.title}
                onClick={() => go(item.key)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "boutique") {
    return (
      <PageFrame
        title="Boutique 3B"
        subtitle="Sélection premium 3B International."
        onBack={() => go("home")}
      >
        <div className="card-grid page-grid compact-grid">
          <FeatureCard title="Maillots premium">
            <p>Collection luxe sportive 3B.</p>
            <p className="meta-text">Design noir / or • identité premium.</p>
          </FeatureCard>

          <FeatureCard title="Polos & t-shirts">
            <p>Essentiels 3B pour la vitrine de marque.</p>
            <p className="meta-text">Pièces simples, fortes, internationales.</p>
          </FeatureCard>

          <FeatureCard title="Hoodies & vestes">
            <p>Univers street-luxe et haute gamme.</p>
            <p className="meta-text">Future boutique connectée aux drops.</p>
          </FeatureCard>

          <FeatureCard title="Badges & accessoires">
            <p>Logos 3B, cartes, certificats et produits premium.</p>
            <p className="meta-text">À enrichir plus tard.</p>
          </FeatureCard>
        </div>
      </PageFrame>
    );
  }

  if (screen === "musique") {
    return (
      <PageFrame
        title="Musique 3B"
        subtitle="20 cases prêtes pour tes 20 musiques."
        onBack={() => go("home")}
      >
        <div className="card-grid page-grid compact-grid">
          <FeatureCard title="Album 3B International" className="full-span">
            <p>Voici la zone musique 3B avec 20 emplacements dédiés.</p>
            <p className="meta-text">
              Tu pourras y mettre tes sons, titres, clips et contenus futurs.
            </p>
          </FeatureCard>

          {musicSlots.map((track) => (
            <FeatureCard key={track.id} title={track.title}>
              <div className="music-slot">
                <div className="track-number">
                  #{String(track.id).padStart(2, "0")}
                </div>
                <p>{track.subtitle}</p>
                <div className="status-chip">Emplacement musique</div>
              </div>
            </FeatureCard>
          ))}
        </div>
      </PageFrame>
    );
  }

  if (screen === "communaute") {
    return (
      <PageFrame
        title="Communauté 3B"
        subtitle="Espace social et futur chat temps réel."
        onBack={() => go("home")}
      >
        <div className="card-grid page-grid compact-grid">
          <FeatureCard title="Chat communauté">
            <p>Le chat temps réel sera branché ici.</p>
            <p className="meta-text">
              Membres 3B • entraide • avis • progression.
            </p>
          </FeatureCard>

          <FeatureCard title="Espace créateurs">
            <p>Les membres pourront partager idées, projets et contenus.</p>
            <p className="meta-text">Base parfaite pour la suite.</p>
          </FeatureCard>

          <FeatureCard title="Missions & échanges">
            <p>Défis, réseau, feedback et interaction entre membres.</p>
          </FeatureCard>

          <FeatureCard title="Statut actuel">
            <p>Page visuelle prête.</p>
            <p className="meta-text">Connexion réelle à développer plus tard.</p>
          </FeatureCard>
        </div>
      </PageFrame>
    );
  }

  if (screen === "passport") {
    return (
      <PageFrame
        title="Passeport 3B"
        subtitle="Accès membre et identité digitale 3B."
        onBack={() => go("home")}
      >
        <div className="card-grid page-grid compact-grid">
          {!member ? (
            <>
              <FeatureCard title="Aucun passeport créé" className="full-span">
                <p>Tu n’as pas encore créé ton Passeport digital 3B.</p>
                <p className="meta-text">
                  Crée-le pour enregistrer l’accès membre, l’identité et la base
                  de progression.
                </p>
              </FeatureCard>

              <FeatureCard title="Créer un passeport">
                <p>Accès à l’inscription 3B.</p>
                <button
                  className="primary-button"
                  onClick={() => go("inscription")}
                >
                  Ouvrir l’inscription
                </button>
              </FeatureCard>

              <FeatureCard title="Pourquoi le créer ?">
                <p>Le passeport servira à lier le compte, les cartes et la suite.</p>
              </FeatureCard>
            </>
          ) : (
            <>
              <FeatureCard title="Carte membre digitale" className="full-span">
                <div className="passport-badge">
                  <div className="passport-badge-top">3B</div>
                  <div className="passport-badge-middle">PASSEPORT DIGITAL</div>
                  <div className="passport-badge-name">{member.name}</div>
                  <div className="passport-badge-id">{member.passportId}</div>
                </div>
              </FeatureCard>

              <FeatureCard title="Informations membre">
                <p>
                  <span className="value-strong">Nom :</span> {member.name || "-"}
                </p>
                <p>
                  <span className="value-strong">E-mail :</span>{" "}
                  {member.email || "non renseigné"}
                </p>
                <p>
                  <span className="value-strong">Statut :</span>{" "}
                  {member.status || "Membre 3B"}
                </p>
              </FeatureCard>

              <FeatureCard title="Résidence & origine">
                <p>
                  <span className="value-strong">Pays 3B :</span>{" "}
                  {member.originCountry || "-"}
                </p>
                <p>
                  <span className="value-strong">Résidence :</span>{" "}
                  {member.residenceCountry || "-"}
                </p>
                <p>
                  <span className="value-strong">Ville :</span> {member.city || "-"}
                </p>
              </FeatureCard>

              <FeatureCard title="Création du passeport">
                <p>
                  <span className="value-strong">Numéro :</span>{" "}
                  {member.passportId}
                </p>
                <p>
                  <span className="value-strong">Date :</span>{" "}
                  {member.createdAt
                    ? new Date(member.createdAt).toLocaleDateString("fr-FR")
                    : "-"}
                </p>
              </FeatureCard>

              <FeatureCard title="Gestion locale">
                <p>Le passeport est enregistré localement sur cet appareil.</p>
                <button className="secondary-button" onClick={handleDeletePassport}>
                  Supprimer le passeport local
                </button>
              </FeatureCard>
            </>
          )}
        </div>
      </PageFrame>
    );
  }

  if (screen === "inscription") {
    return (
      <PageFrame
        title="Inscription 3B"
        subtitle="Crée ton Passeport digital 3B."
        onBack={() => go("passport")}
      >
        <div className="card-grid page-grid compact-grid">
          <FeatureCard title="Créer mon Passeport 3B" className="full-span">
            <div className="form-grid">
              <div className="field-group">
                <label>Nom ou pseudo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nom ou pseudo"
                />
              </div>

              <div className="field-group">
                <label>Adresse e-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="Adresse e-mail"
                />
              </div>

              <div className="field-group">
                <label>Pays d’origine 3B</label>
                <select
                  value={form.originCountry}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      originCountry: e.target.value,
                    }))
                  }
                >
                  {OFFICIAL_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label>Pays de résidence actuelle</label>
                <input
                  type="text"
                  value={form.residenceCountry}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      residenceCountry: e.target.value,
                    }))
                  }
                  placeholder="Pays de résidence"
                />
              </div>

              <div className="field-group full-form-line">
                <label>Ville actuelle</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="Ville actuelle"
                />
              </div>
            </div>

            <div className="button-row">
              <button className="primary-button" onClick={handleCreatePassport}>
                Créer mon Passeport 3B
              </button>
            </div>
          </FeatureCard>

          <FeatureCard title="Note">
            <p>
              Cette version crée une inscription locale simple et propre.
            </p>
            <p className="meta-text">
              Le branchement complet backend viendra plus tard.
            </p>
          </FeatureCard>

          <FeatureCard title="Objectif">
            <p>
              Avoir une base claire pour l’identité membre, les cartes et la suite.
            </p>
          </FeatureCard>
        </div>
      </PageFrame>
    );
  }

  if (screen === "secret") {
    return (
      <PageFrame
        title="Coffre secret 3B"
        subtitle="Entre le code secret pour débloquer l’indice."
        onBack={() => go("home")}
      >
        <div className="card-grid page-grid compact-grid">
          <FeatureCard title="Code secret" className="full-span">
            <div className="secret-box">
              <input
                type="text"
                value={secretInput}
                onChange={(e) => {
                  setSecretInput(e.target.value);
                  setSecretError("");
                }}
                placeholder="Code secret"
              />
              <button className="primary-button" onClick={handleUnlockSecret}>
                Débloquer
              </button>
            </div>
            {secretError ? <p className="error-text">{secretError}</p> : null}
          </FeatureCard>

          {!secretUnlocked ? (
            <>
              <FeatureCard title="Accès verrouillé">
                <p>Le contenu secret apparaîtra ici après validation du bon code.</p>
              </FeatureCard>

              <FeatureCard title="Mot de passe">
                <p className="meta-text">
                  Code actuel configuré : <strong>blackblancbeurr</strong>
                </p>
              </FeatureCard>
            </>
          ) : (
            <>
              <FeatureCard title="Indice débloqué" className="full-span">
                <p>L’Italie s’y comprend — 8 juillet — 20h.</p>
                <p>Live TikTok 3B International.</p>
                <p className="secret-highlight">
                  SALON ITALIE — HAUTE COUTURE 3B
                </p>
                <p>
                  Quand j’arrive dans votre monde, vous comprendrez que 3B
                  International entre dans une étape sérieuse : salon, Italie,
                  présentation premium, univers luxe et ambition internationale.
                </p>
              </FeatureCard>

              <FeatureCard title="Récompense future">
                <p>Indice du prochain secret + prototype gratuit lors de sa sortie.</p>
              </FeatureCard>

              <FeatureCard title="Statut">
                <p>Secret actuellement déverrouillé sur cet appareil.</p>
              </FeatureCard>
            </>
          )}
        </div>
      </PageFrame>
    );
  }

  if (screen === "jeux") {
    return (
      <PageFrame
        title="Jeu 3B"
        subtitle="Centre de lancement du jeu actuel."
        onBack={() => go("home")}
      >
        <div className="card-grid page-grid compact-grid">
          <FeatureCard title="Jeu actuel">
            <p>Portes 3B — mots, pays, secret, musique et ADN 3B.</p>
            <p className="meta-text">
              1000 niveaux • 10 portes par niveau • progression actuelle dans
              Jeu3B.
            </p>
            <button className="primary-button" onClick={() => go("jeu3b")}>
              Ouvrir le jeu
            </button>
          </FeatureCard>

          <FeatureCard title="Sauvegarde">
            <p>
              La page de jeu détaillée est gérée dans ton fichier <strong>Jeu3B.jsx</strong>.
            </p>
            <p className="meta-text">
              Ici on garde une entrée propre dans le même style.
            </p>
          </FeatureCard>

          <FeatureCard title="Classement">
            <p>Le classement général du jeu sera visible depuis l’espace jeu.</p>
          </FeatureCard>

          <FeatureCard title="Mode actuel">
            <p>{member ? "Mode membre détecté." : "Mode invité détecté."}</p>
            <p className="meta-text">
              {member
                ? "Passeport 3B créé sur cet appareil."
                : "Crée ton passeport pour relier plus tard la progression."}
            </p>
          </FeatureCard>
        </div>
      </PageFrame>
    );
  }

  if (screen === "plus") {
    return (
      <PageFrame
        title="Plus encore"
        subtitle="Autres zones de l’univers 3B."
        onBack={() => go("home")}
      >
        <div className="card-grid page-grid compact-grid">
          <FeatureCard title="8 logos internationaux">
            <p>Zone future dédiée aux pays et aux emblèmes 3B.</p>
          </FeatureCard>

          <FeatureCard title="Manga 3B">
            <p>Univers visuel et narration à venir.</p>
          </FeatureCard>

          <FeatureCard title="Créateurs / commandes">
            <p>Espace futur pour demandes, commandes et créateurs.</p>
          </FeatureCard>

          <FeatureCard title="Certificats avec QR">
            <p>Bloc prévu pour la partie traçabilité et authenticité.</p>
          </FeatureCard>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="3B International"
      subtitle="Page non trouvée."
      onBack={() => go("home")}
    >
      <div className="card-grid page-grid compact-grid">
        <FeatureCard title="Retour">
          <button className="primary-button" onClick={() => go("home")}>
            Revenir à l’accueil
          </button>
        </FeatureCard>
      </div>
    </PageFrame>
  );
}