import React, { useEffect, useMemo, useState } from "react";
import styles from "./passport.module.css";
import passportData from "./passportData";

const QR_PATTERN = [
  "1111111110011",
  "1000000011010",
  "1011101010011",
  "1011101011100",
  "1011101010011",
  "1000000010110",
  "1111111110101",
  "0001010001100",
  "1110011110011",
  "0010110011010",
  "1101011100101",
  "1010010111010",
  "1111101101111",
];

function randomBlock() {
  return Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
}

function buildTickerLine() {
  return Array.from({ length: 8 }, () => randomBlock()).join("   ");
}

function buildStreamLine(length = 28) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function DigitalQRCode() {
  const cells = useMemo(
    () =>
      QR_PATTERN.join("")
        .split("")
        .map((value, index) => ({
          id: index,
          active: value === "1",
        })),
    []
  );

  return (
    <div className={styles.qrCode} aria-hidden="true">
      {cells.map((cell) => (
        <span
          key={cell.id}
          className={`${styles.qrCell} ${cell.active ? styles.qrCellOn : ""}`}
        />
      ))}
    </div>
  );
}

function AnimatedStream({ delay = 0 }) {
  const [value, setValue] = useState(buildStreamLine());

  useEffect(() => {
    const interval = setInterval(() => {
      setValue(buildStreamLine());
    }, 180 + delay);

    return () => clearInterval(interval);
  }, [delay]);

  return <span>{value}</span>;
}

export default function PassportUI({
  memberName = "Zakaria",
  memberEmail = "3bblackblancbeurre@gmail.com",
  onBack,
  onHome,
  onEntry,
}) {
  const [tickerLines, setTickerLines] = useState([
    buildTickerLine(),
    buildTickerLine(),
    buildTickerLine(),
  ]);

  const [liveTime, setLiveTime] = useState("");
  const [scanPercent, setScanPercent] = useState(82);
  const [securityPulse, setSecurityPulse] = useState(0);

  useEffect(() => {
    const tickerInterval = setInterval(() => {
      setTickerLines([buildTickerLine(), buildTickerLine(), buildTickerLine()]);
    }, 220);

    return () => clearInterval(tickerInterval);
  }, []);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    const scanInterval = setInterval(() => {
      setScanPercent((prev) => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1);
        if (next < 78) return 79;
        if (next > 99) return 98;
        return next;
      });
    }, 900);

    return () => clearInterval(scanInterval);
  }, []);

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setSecurityPulse((prev) => (prev + 1) % 4);
    }, 700);

    return () => clearInterval(pulseInterval);
  }, []);

  const data = {
    ...passportData,
    member: {
      ...passportData.member,
      name: memberName,
      email: memberEmail,
    },
  };

  return (
    <div className={styles.page}>
      <div className={styles.backgroundGlow} />
      <div className={styles.backgroundGlowTwo} />

      <header className={styles.topBar}>
        <div className={styles.topBarSide}>
          <button
            className={styles.topButton}
            onClick={onHome}
            type="button"
          >
            Accueil
          </button>
        </div>

        <div className={styles.topBarCenter}>
          <div className={styles.miniBrand}>3B INTERNATIONAL</div>
          <div className={styles.miniTitle}>Passeport 3B</div>
        </div>

        <div className={styles.topBarSideRight}>
          <button
            className={styles.topButton}
            onClick={onEntry}
            type="button"
          >
            Entrée
          </button>
        </div>
      </header>

      <main className={styles.mainCard}>
        <div className={styles.headerZone}>
          <div className={styles.headerLeft}>
            <button
              className={styles.backButton}
              onClick={onBack}
              type="button"
            >
              ← Retour
            </button>

            <div className={styles.titleBlock}>
              <div className={styles.kicker}>3B INTERNATIONAL</div>
              <h1 className={styles.title}>Passeport Digital 3B</h1>
              <p className={styles.subtitle}>
                Identité numérique, accès mondial, avantages exclusifs et carte
                membre vivante.
              </p>
            </div>
          </div>

          <button className={styles.verifyButton} type="button">
            Vérifier l’authenticité
          </button>
        </div>

        <section className={styles.layout}>
          {/* COLONNE GAUCHE */}
          <aside className={styles.leftColumn}>
            <div className={styles.panel}>
              <div className={styles.panelLabel}>ACCÈS MONDIAL 3B</div>
              <h2 className={styles.panelTitle}>Carte du monde 3B</h2>

              <div className={styles.worldMap}>
                <div className={styles.mapGlow} />
                <div className={styles.mapNode} style={{ top: "34%", left: "30%" }}>
                  France
                </div>
                <div className={styles.mapNode} style={{ top: "25%", left: "43%" }}>
                  Estonie
                </div>
                <div className={styles.mapNode} style={{ top: "54%", left: "25%" }}>
                  Maroc
                </div>
                <div className={styles.mapNode} style={{ top: "48%", left: "36%" }}>
                  Espagne
                </div>
                <div className={styles.mapNode} style={{ top: "61%", left: "45%" }}>
                  Tunisie
                </div>
                <div className={styles.mapNode} style={{ top: "45%", left: "54%" }}>
                  Turquie
                </div>
                <div className={styles.mapNode} style={{ top: "57%", left: "52%" }}>
                  Algérie
                </div>
                <div className={styles.orbitLine} />
              </div>

              <div className={styles.statRow}>
                <div className={styles.statBox}>
                  <strong>{data.stats.connectedCountries}</strong>
                  <span>Pays connectés</span>
                </div>

                <div className={styles.statBox}>
                  <strong>{data.stats.globalAccess}</strong>
                  <span>Accès global</span>
                </div>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeaderInline}>
                <div>
                  <div className={styles.panelLabel}>FOCUS RÉGIONAL</div>
                  <h3 className={styles.panelTitleSmall}>Zoom 8 pays</h3>
                </div>

                <span className={styles.badgeTag}>Europe / Méditerranée</span>
              </div>

              <div className={styles.regionMap}>
                {data.countries.map((country) => (
                  <div
                    key={country.name}
                    className={styles.regionNode}
                    style={country.position}
                  >
                    {country.name}
                  </div>
                ))}
                <div className={styles.regionZoom}>ZOOM</div>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeaderInline}>
                <div>
                  <div className={styles.panelLabel}>INFORMATIONS MEMBRE</div>
                  <h3 className={styles.panelTitleSmall}>Identité et statut</h3>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoRow}>
                  <span>Nom</span>
                  <strong>{data.member.name}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>E-mail</span>
                  <strong>{data.member.email}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Statut</span>
                  <strong>{data.member.status}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Date d’adhésion</span>
                  <strong>{data.member.joinDate}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>ID Membre</span>
                  <strong>{data.member.memberId}</strong>
                </div>
              </div>
            </div>
          </aside>

          {/* CENTRE */}
          <section className={styles.centerColumn}>
            <div className={styles.passportCard}>
              <div className={styles.cardNoise} />
              <div className={styles.cardScanLine} />

              <div className={styles.tickerTop}>
                {tickerLines.map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>

              <div className={styles.watermark}>3B</div>

              <div className={styles.cardTopRow}>
                <div className={styles.chipBlock}>
                  <div className={styles.cardChip} />
                  <div className={styles.contactless}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className={styles.cardHeaderText}>
                  <div className={styles.cardMiniLabel}>3B ACCÈS NUMÉRIQUE</div>
                  <h2 className={styles.cardMainTitle}>3B Passport Numérique</h2>
                </div>

                <div className={styles.flagBox}>
                  <span>FRANCE</span>
                  <div className={styles.frFlag}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardIdentity}>
                  <div className={styles.identityRow}>
                    <span>Titulaire</span>
                    <strong>{data.member.name}</strong>
                  </div>

                  <div className={styles.identityRow}>
                    <span>Statut</span>
                    <strong>
                      {data.member.status}
                      <em className={styles.activeBadge}>ACTIF</em>
                    </strong>
                  </div>

                  <div className={styles.identityRow}>
                    <span>N°</span>
                    <strong>{data.member.passNumber}</strong>
                  </div>

                  <div className={styles.identityRow}>
                    <span>Pays 3B</span>
                    <strong>{data.member.originCountry}</strong>
                  </div>

                  <div className={styles.identityRow}>
                    <span>Résidence</span>
                    <strong>{data.member.residenceCountry}</strong>
                  </div>

                  <div className={styles.identityFooter}>
                    IDENTITÉ NUMÉRIQUE MEMBRE 3B
                  </div>
                </div>

                <div className={styles.cardVisualZone}>
                  <div className={styles.avatarFrame}>
                    <div className={styles.avatarGrid} />
                    <div className={styles.avatarHead} />
                    <div className={styles.avatarShoulders} />
                  </div>

                  <div className={styles.visualBottomRow}>
                    <DigitalQRCode />

                    <div className={styles.nfcBadge}>NFC</div>
                  </div>

                  <div className={styles.emissionDate}>
                    ÉMISSION <strong>{data.member.issueDate}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.digitalStreams}>
                <div className={styles.streamColumn}>
                  <AnimatedStream delay={0} />
                  <AnimatedStream delay={50} />
                  <AnimatedStream delay={100} />
                </div>
                <div className={styles.streamColumn}>
                  <AnimatedStream delay={20} />
                  <AnimatedStream delay={70} />
                  <AnimatedStream delay={120} />
                </div>
              </div>
            </div>

            <div className={styles.bottomGrid}>
              <div className={styles.panel}>
                <div className={styles.panelHeaderInline}>
                  <div>
                    <div className={styles.panelLabel}>RÉSIDENCE ET ORIGINE</div>
                    <h3 className={styles.panelTitleSmall}>
                      Repères du membre 3B
                    </h3>
                  </div>
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoRow}>
                    <span>Pays 3B</span>
                    <strong>{data.member.originCountry}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Résidence</span>
                    <strong>{data.member.residenceCountry}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Ville</span>
                    <strong>{data.member.city}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Numéro</span>
                    <strong>{data.member.passNumber}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Origine sélectionnée</span>
                    <strong>{data.member.originCountry}</strong>
                  </div>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeaderInline}>
                  <div>
                    <div className={styles.panelLabel}>BONUS PAYS D’ORIGINE</div>
                    <h3 className={styles.panelTitleSmall}>
                      Avantages exclusifs déverrouillés
                    </h3>
                  </div>
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoRow}>
                    <span>Pays choisi</span>
                    <strong>{data.member.originCountry}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Bonus spécial</span>
                    <strong>{data.bonus.title}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Effet</span>
                    <strong>{data.bonus.effect}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Détail</span>
                    <strong>{data.bonus.detail}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.footerStrip}>
              <div className={styles.footerBrand}>
                <strong>3B</strong>
                <span>INTERNATIONAL</span>
                <small>LUXE • FUTURISME • HÉRITAGE</small>
              </div>

              <div className={styles.footerCenter}>
                <div className={styles.footerItem}>
                  <strong>RÉSEAU MONDIAL SÉCURISÉ</strong>
                  <span>Connexion chiffrée & protégée</span>
                </div>
                <div className={styles.footerItem}>
                  <strong>SUPPORT 3B</strong>
                  <span>Assistance prioritaire membre 3B</span>
                </div>
              </div>

              <button className={styles.helpButton} type="button">
                Besoin d’aide ?
              </button>
            </div>
          </section>

          {/* COLONNE DROITE */}
          <aside className={styles.rightColumn}>
            <div className={styles.panel}>
              <div className={styles.panelHeaderInline}>
                <div>
                  <div className={styles.panelLabel}>SÉCURITÉ & AUTHENTIFICATION</div>
                  <h3 className={styles.panelTitleSmall}>Système actif</h3>
                </div>
              </div>

              <div className={styles.securityList}>
                {data.security.map((item, index) => (
                  <div className={styles.securityRow} key={index}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div
                className={`${styles.sealBlock} ${
                  securityPulse === 1
                    ? styles.sealPulseOne
                    : securityPulse === 2
                    ? styles.sealPulseTwo
                    : securityPulse === 3
                    ? styles.sealPulseThree
                    : ""
                }`}
              >
                <div className={styles.sealOuter}>
                  <div className={styles.sealMiddle}>
                    <div className={styles.sealInner}>3B</div>
                  </div>
                </div>
              </div>

              <div className={styles.sealMeta}>
                <div className={styles.metaCode}>{data.securityId}</div>
                <div className={styles.metaLine}>
                  Dernière vérification <strong>{liveTime || "11:42:00"}</strong>
                </div>
                <div className={styles.systemOk}>● SYSTÈME SÉCURISÉ</div>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeaderInline}>
                <div>
                  <div className={styles.panelLabel}>ACTIVITÉ NUMÉRIQUE</div>
                  <h3 className={styles.panelTitleSmall}>Carte vivante</h3>
                </div>
              </div>

              <div className={styles.activityBlock}>
                <div className={styles.activityRow}>
                  <span>Analyse biométrique</span>
                  <strong>{scanPercent}%</strong>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${scanPercent}%` }}
                  />
                </div>

                <div className={styles.activitySmallList}>
                  <div>
                    <AnimatedStream delay={10} />
                  </div>
                  <div>
                    <AnimatedStream delay={40} />
                  </div>
                  <div>
                    <AnimatedStream delay={80} />
                  </div>
                  <div>
                    <AnimatedStream delay={110} />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}