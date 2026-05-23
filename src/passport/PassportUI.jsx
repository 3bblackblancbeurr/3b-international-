import { useMemo, useState } from "react";
import { usePassportState } from "./usePassportState";
import styles from "./passport.module.css";

const TABS = [
  { id: "home", label: "Accueil Passeport" },
  { id: "world", label: "Carte du monde" },
  { id: "cards", label: "Mes cartes" },
  { id: "logos", label: "Logos digitaux" },
  { id: "missions", label: "Missions & Quiz" },
  { id: "bonuses", label: "Bonus pays" },
];

function statusLabel(status) {
  const labels = {
    locked: "Verrouillé",
    origin: "Pays d'origine",
    hint_active: "Indice actif",
    mission: "Mission en cours",
    unlocked: "Débloqué",
  };
  return labels[status] || status;
}

function getProgressPercent(points) {
  return Math.min(100, Math.round((points / 3000) * 100));
}

function PassportHeader({ user, resetPassport }) {
  return (
    <header className={styles.header}>
      <div className={styles.kicker}>3B International</div>
      <h1 className={styles.title}>Passeport 3B</h1>
      <p className={styles.subtitle}>
        Un espace vivant où l’utilisateur crée son identité, voyage sur la carte du monde,
        débloque les pays, gagne des cartes, des tampons, des logos digitaux et des bonus uniques.
      </p>
      {user.passportActivated && (
        <button className={styles.dangerButton} onClick={resetPassport}>
          Réinitialiser la V1 locale
        </button>
      )}
    </header>
  );
}

function CreatePassport({ createPassport }) {
  const [pseudo, setPseudo] = useState("Zakaria");
  const [countryOrigin, setCountryOrigin] = useState("Maroc");
  const [avatar, setAvatar] = useState("explorateur");

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Crée ton identité 3B</h2>
        <p className={styles.muted}>
          Choisis ton pays d’origine. Ton Explorateur 3B apparaîtra directement sur ce pays.
        </p>

        <div className={styles.form}>
          <label>
            Pseudo
            <input className={styles.input} value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
          </label>

          <label>
            Avatar
            <select className={styles.select} value={avatar} onChange={(e) => setAvatar(e.target.value)}>
              <option value="explorateur">Explorateur 3B</option>
              <option value="voyageur">Voyageur 3B</option>
              <option value="guide">Guide 3B</option>
            </select>
          </label>

          <label>
            Pays d’origine
            <select className={styles.select} value={countryOrigin} onChange={(e) => setCountryOrigin(e.target.value)}>
              <option>France</option>
              <option>Maroc</option>
              <option>Italie</option>
              <option>Algérie</option>
              <option>Tunisie</option>
              <option>Espagne</option>
              <option>Turquie</option>
              <option>Estonie</option>
            </select>
          </label>

          <button className={styles.button} onClick={() => createPassport({ pseudo, countryOrigin, avatar })}>
            Créer mon Passeport 3B
          </button>
        </div>
      </section>
    </div>
  );
}

function RewardModal({ reward, onClose }) {
  if (!reward) return null;

  return (
    <div className={styles.reward}>
      <div className={styles.rewardBox}>
        <div className={styles.kicker}>Récompense 3B</div>
        <h2 className={styles.cardTitle}>{reward.title}</h2>
        {reward.details?.map((detail) => <p key={detail}>✨ {detail}</p>)}
        <button className={styles.button} onClick={onClose}>Continuer</button>
      </div>
    </div>
  );
}

function ProgressCard({ user }) {
  const percent = getProgressPercent(user.points);

  return (
    <section className={`${styles.card} ${styles.cardHalf}`}>
      <h2 className={styles.cardTitle}>{user.pseudo} — Niveau {user.level}</h2>
      <p className={styles.muted}>Pays d’origine : {user.countryOrigin}</p>
      <p>Points : <strong>{user.points}</strong></p>
      <div className={styles.progressOuter}>
        <div className={styles.progressInner} style={{ width: `${percent}%` }} />
      </div>
      <p className={styles.muted}>Progression globale : {percent}%</p>
      <span className={styles.badge}>Pays débloqués : {user.unlockedCountries.length}/8</span>
      <span className={styles.badge}>Cartes : {user.cardsOwned.length}</span>
      <span className={styles.badge}>Bonus actifs : {user.activeBonuses.length}</span>
    </section>
  );
}

function ExplorerCard({ user }) {
  return (
    <section className={`${styles.card} ${styles.cardHalf}`}>
      <h2 className={styles.cardTitle}>Explorateur 3B</h2>
      <div className={styles.explorer}>🧭</div>
      <p>Position actuelle : <strong>{user.currentCountry || user.countryOrigin}</strong></p>
      <p className={styles.muted}>L’explorateur représente l’utilisateur et se déplace quand un pays est débloqué.</p>
    </section>
  );
}

function HomeView({ user, setTab }) {
  return (
    <div className={styles.grid}>
      <ProgressCard user={user} />
      <ExplorerCard user={user} />
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Accès rapide</h2>
        <div className={styles.nav}>
          {TABS.filter((tab) => tab.id !== "home").map((tab) => (
            <button key={tab.id} className={styles.button} onClick={() => setTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function WorldView({ countries, user, setSelectedCountryId, setTab }) {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Carte du monde 3B</h2>
        <div className={styles.mapBox}>
          <div>
            <div className={styles.explorer}>🧭</div>
            <h3>Explorateur placé sur : {user.currentCountry || user.countryOrigin}</h3>
            <p className={styles.muted}>Version V1 simplifiée. La vraie carte interactive viendra après validation.</p>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Les 8 pays</h2>
        <div className={styles.countryList}>
          {countries.map((country) => (
            <article key={country.id} className={styles.countryCard}>
              <div className={styles.countryEmoji}>{country.emoji}</div>
              <h3>{country.name}</h3>
              <span className={styles.badge}>{statusLabel(country.status)}</span>
              <p className={styles.muted}>{country.bonusName}</p>
              <p>Fragments : {country.fragments}/{country.fragmentsRequired}</p>
              <button className={styles.secondaryButton} onClick={() => { setSelectedCountryId(country.id); setTab("country"); }}>
                Voir le pays
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CountryDetailView({ country, gainFragment, unlockCountry }) {
  if (!country) return <section className={styles.card}><h2 className={styles.cardTitle}>Pays introuvable</h2></section>;

  return (
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.cardHalf}`}>
        <div className={styles.countryEmoji}>{country.emoji}</div>
        <h2 className={styles.cardTitle}>{country.name}</h2>
        <span className={styles.badge}>{statusLabel(country.status)}</span>
        <p>{country.theme}</p>
        <p className={styles.muted}>Couleurs : {country.colors}</p>
        {country.secretHint && (
          <p>Indice : <strong>“{country.secretHint}”</strong><br />Ouverture : {country.unlockDate}</p>
        )}
      </section>

      <section className={`${styles.card} ${styles.cardHalf}`}>
        <h2 className={styles.cardTitle}>Logo digital</h2>
        <p>Fragments : {country.fragments}/{country.fragmentsRequired}</p>
        <div className={styles.progressOuter}>
          <div className={styles.progressInner} style={{ width: `${(country.fragments / country.fragmentsRequired) * 100}%` }} />
        </div>
        <span className={styles.badge}>Bonus : {country.bonusName}</span>
        <p className={styles.muted}>{country.bonusEffect}</p>
        <p className={styles.muted}>Effet personnage : {country.characterEffect}</p>
        <div className={styles.nav}>
          <button className={styles.button} onClick={() => gainFragment(country.id)}>Gagner 1 fragment</button>
          <button className={styles.secondaryButton} onClick={() => unlockCountry(country.id)}>Débloquer le pays V1</button>
        </div>
      </section>
    </div>
  );
}

function CardsView({ cards }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Mes cartes</h2>
      <div className={styles.countryList}>
        {cards.map((card) => (
          <article key={card.id} className={styles.countryCard}>
            <h3>{card.name}</h3>
            <span className={styles.badge}>{card.rarity}</span>
            <span className={styles.badge}>{card.unlocked ? "Obtenue" : "Verrouillée"}</span>
            <p className={styles.muted}>{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LogosView({ countries }) {
  function stage(country) {
    if (country.fragments <= 0) return "Logo caché";
    if (country.fragments === 1) return "Ombre";
    if (country.fragments === 2) return "Contour";
    if (country.fragments === 3) return "Logo simple";
    if (country.fragments === 4) return "Logo premium";
    return "Logo prestige";
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Logos digitaux évolutifs</h2>
      <div className={styles.countryList}>
        {countries.map((country) => (
          <article key={country.id} className={styles.countryCard}>
            <div className={styles.countryEmoji}>{country.emoji}</div>
            <h3>{country.name}</h3>
            <span className={styles.badge}>{stage(country)}</span>
            <p>{country.fragments}/{country.fragmentsRequired} fragments</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MissionsView({ missions, completeMission, user }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Missions & Quiz</h2>
      <div className={styles.countryList}>
        {missions.map((mission) => {
          const completed = user.completedMissions.includes(mission.id);
          return (
            <article key={mission.id} className={styles.countryCard}>
              <h3>{mission.title}</h3>
              <p className={styles.muted}>{mission.description}</p>
              <span className={styles.badge}>+{mission.rewardPoints} points</span>
              {mission.rewardFragmentCountry && <span className={styles.badge}>+1 fragment</span>}
              <button className={completed ? styles.secondaryButton : styles.button} onClick={() => completeMission(mission.id)} disabled={completed}>
                {completed ? "Terminée" : "Réclamer V1"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BonusesView({ countries, user }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Bonus pays 3B</h2>
      <div className={styles.countryList}>
        {countries.map((country) => {
          const active = user.activeBonuses.some((bonus) => bonus.countryId === country.id);
          return (
            <article key={country.id} className={styles.countryCard}>
              <div className={styles.countryEmoji}>{country.emoji}</div>
              <h3>{country.bonusName}</h3>
              <p>{country.name}</p>
              <span className={styles.badge}>{active ? "Actif niveau 1" : "Verrouillé"}</span>
              <p className={styles.muted}>{country.bonusEffect}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function PassportUI() {
  const passport = usePassportState();
  const [tab, setTab] = useState("home");
  const [selectedCountryId, setSelectedCountryId] = useState("italie");

  const selectedCountry = useMemo(
    () => passport.countries.find((country) => country.id === selectedCountryId),
    [passport.countries, selectedCountryId]
  );

  if (!passport.user.passportActivated) {
    return (
      <main className={styles.shell}>
        <div className={styles.container}>
          <PassportHeader user={passport.user} resetPassport={passport.resetPassport} />
          <CreatePassport createPassport={passport.createPassport} />
          <RewardModal reward={passport.lastReward} onClose={() => passport.setLastReward(null)} />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <PassportHeader user={passport.user} resetPassport={passport.resetPassport} />

        <nav className={styles.nav}>
          {TABS.map((item) => (
            <button key={item.id} className={tab === item.id ? styles.button : styles.secondaryButton} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        {tab === "home" && <HomeView user={passport.user} setTab={setTab} />}
        {tab === "world" && (
          <WorldView countries={passport.countries} user={passport.user} setSelectedCountryId={setSelectedCountryId} setTab={setTab} />
        )}
        {tab === "country" && <CountryDetailView country={selectedCountry} gainFragment={passport.gainFragment} unlockCountry={passport.unlockCountry} />}
        {tab === "cards" && <CardsView cards={passport.cards} />}
        {tab === "logos" && <LogosView countries={passport.countries} />}
        {tab === "missions" && <MissionsView missions={passport.missions} completeMission={passport.completeMission} user={passport.user} />}
        {tab === "bonuses" && <BonusesView countries={passport.countries} user={passport.user} />}

        <RewardModal reward={passport.lastReward} onClose={() => passport.setLastReward(null)} />
      </div>
    </main>
  );
}
