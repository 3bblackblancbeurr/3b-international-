import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Share2, X } from 'lucide-react';
import './install.css';

function detectPlatform() {
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const samsung = /SamsungBrowser/i.test(ua);
  const safari = ios && /Safari/i.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS)/i.test(ua);
  return { ios, android, samsung, safari };
}

function InstallHelp({ installation, onClose }) {
  const dialog = useRef(null);
  const [copyMessage, setCopyMessage] = useState('');
  const { ios, android, samsung, safari } = detectPlatform();
  const publicLink = new URL('/install.html', window.location.href).href;
  const iphoneLink = new URL('/install-iphone.html', window.location.href).href;

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  async function copyLink(value = publicLink) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(ios && !safari
        ? 'Lien copié. Ouvre Safari, colle le lien puis suis les 3 étapes.'
        : 'Lien copié. Tu peux maintenant le partager.');
    } catch {
      setCopyMessage('Sélectionne le lien ci-dessous pour le copier.');
    }
  }

  async function shareLink() {
    if (!navigator.share) return copyLink(ios ? iphoneLink : publicLink);
    try {
      await navigator.share({
        title: 'Installer 3B International',
        text: 'Installation officielle 3B International',
        url: ios ? iphoneLink : publicLink,
      });
      setCopyMessage('Lien de téléchargement partagé.');
    } catch {
      // A cancelled share sheet is not an error the user needs to see.
    }
  }

  return <dialog ref={dialog} className="install3b-dialog" aria-labelledby="install3b-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header>
      <div><span className="install3b-eyebrow">INSTALLATION OFFICIELLE 3B</span><h2 id="install3b-title">{ios ? 'Installer 3B sur iPhone' : 'Installer 3B'}</h2></div>
      <button type="button" className="install3b-close" onClick={onClose} aria-label="Fermer l’aide à l’installation"><X size={20} /></button>
    </header>

    {ios ? <>
      <div className="install3b-ios-badge">iPhone · sans invitation</div>
      <p>La méthode la plus simple ne demande ni invitation ni TestFlight : installe directement la version web 3B depuis Safari.</p>
      {!safari && <div className="install3b-warning"><strong>Tu n’es pas dans Safari.</strong> Copie le lien ci-dessous, ouvre Safari et colle-le dans la barre d’adresse.</div>}
      <ol className="install3b-steps">
        <li><span>1</span><div>Ouvre 3B dans <strong>Safari</strong>.</div></li>
        <li><span>2</span><div>Appuie sur <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.</div></li>
        <li><span>3</span><div>Active <strong>Ouvrir en app web</strong> si l’option apparaît, puis touche <strong>Ajouter</strong>.</div></li>
      </ol>
      <a className="install3b-link-button" href="/install-iphone.html"><ExternalLink size={17} aria-hidden="true"/>Guide iPhone complet</a>
      <p className="install3b-note">La page iPhone affichera aussi automatiquement un lien TestFlight public ou App Store si une version native 3B est publiée.</p>
    </> : <>
      {installation.available && <button type="button" className="install3b-button" onClick={installation.install} disabled={installation.busy}>Installer maintenant</button>}
      {android ? <ol>
        <li>Ouvre ce lien dans <strong>{samsung ? 'Samsung Internet' : 'Chrome'}</strong>.</li>
        <li>{samsung
          ? <>Dans le menu du navigateur, cherche <strong>Ajouter à l’écran d’accueil</strong> ou l’option d’installation.</>
          : <>Appuie sur <strong>⋮</strong>, puis <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</>}</li>
        <li>Confirme l’installation sur ton téléphone.</li>
      </ol> : <ol>
        <li>Sur iPhone, utilise la page <a href="/install-iphone.html">Installer sur iPhone</a>.</li>
        <li>Sur Android, utilise Chrome ou Samsung Internet et choisis l’option d’installation.</li>
        <li>Sur ordinateur, Chrome/Edge proposent une icône d’installation ; Safari sur Mac propose <strong>Fichier → Ajouter au Dock</strong>.</li>
      </ol>}
    </>}

    <p>Depuis une messagerie ou un réseau social, ouvre d’abord le lien dans le navigateur du téléphone.</p>
    <label className="install3b-link-label" htmlFor="install3b-link">Lien officiel à ouvrir ou partager</label>
    <input id="install3b-link" className="install3b-link" readOnly value={ios ? iphoneLink : publicLink} onFocus={event => event.target.select()} />
    <div className="install3b-actions">
      <button type="button" className="install3b-copy" onClick={() => copyLink(ios ? iphoneLink : publicLink)}>Copier le lien</button>
      <button type="button" className="install3b-copy" onClick={shareLink}><Share2 size={16} aria-hidden="true"/>Partager</button>
    </div>
    <p className="install3b-status" role="status">{copyMessage || installation.message}</p>
  </dialog>;
}

export default function InstallApp({ installation }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const { ios } = detectPlatform();
  if (installation.installed) return null;

  const label = ios ? 'Installer sur iPhone' : 'Installer 3B';
  const subtitle = ios ? 'Sans invitation · depuis Safari.' : 'Ton univers depuis l’écran d’accueil.';

  return <div className="install3b">
    <div className="install3b-card" data-platform={ios ? 'ios' : 'other'}>
      <img src="/icons/3b-icon-20260912-192.png" width="48" height="48" alt="" />
      <div className="install3b-copy-text"><strong>{ios ? '3B sur ton iPhone' : '3B sur ton téléphone'}</strong><span>{subtitle}</span></div>
      <button type="button" className="install3b-button" disabled={installation.busy}
        aria-haspopup={ios || !installation.available ? 'dialog' : undefined}
        onClick={() => ios || !installation.available ? setHelpOpen(true) : installation.install()}>
        <Download size={17} aria-hidden="true" />{installation.busy ? 'Confirmation…' : label}
      </button>
    </div>
    <div className="install3b-platform-links" aria-label="Choisir une plateforme">
      <a href="/install-iphone.html">iPhone / iPad</a>
      <span aria-hidden="true">·</span>
      <a href="/install-android.html">Android</a>
      <span aria-hidden="true">·</span>
      <a href="/install.html">Toutes les méthodes</a>
    </div>
    {installation.message && <p className="install3b-status" role="status">{installation.message}</p>}
    {helpOpen && <InstallHelp installation={installation} onClose={() => setHelpOpen(false)} />}
  </div>;
}
