import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import './install.css';

function InstallHelp({ installation, onClose }) {
  const dialog = useRef(null);
  const [copyMessage, setCopyMessage] = useState('');
  const userAgent = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(userAgent);
  const samsung = /SamsungBrowser/.test(userAgent);
  const publicLink = new URL('/', window.location.href).href;

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopyMessage('Lien copié. Ouvre-le dans le navigateur de ton téléphone.');
    } catch {
      setCopyMessage('Sélectionne le lien ci-dessous pour le copier.');
    }
  }

  return <dialog ref={dialog} className="install3b-dialog" aria-labelledby="install3b-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header>
      <div><span className="install3b-eyebrow">TON UNIVERS, À PORTÉE DE MAIN</span><h2 id="install3b-title">Installer 3B</h2></div>
      <button type="button" className="install3b-close" onClick={onClose} aria-label="Fermer l’aide à l’installation"><X size={20} /></button>
    </header>
    <p>Retrouve 3B depuis une icône sur ton écran d’accueil. Une connexion Internet reste nécessaire.</p>
    {installation.available && <button type="button" className="install3b-button" onClick={installation.install} disabled={installation.busy}>Installer maintenant</button>}
    {ios ? <ol>
      <li>Ouvre ce lien dans <strong>Safari</strong>.</li>
      <li>Appuie sur <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.</li>
      <li>Confirme avec <strong>Ajouter</strong>.</li>
    </ol> : android ? <ol>
      <li>Ouvre ce lien dans <strong>{samsung ? 'Samsung Internet' : 'Chrome'}</strong>.</li>
      <li>{samsung
        ? <>Dans le menu du navigateur, cherche <strong>Ajouter à l’écran d’accueil</strong> ou l’option d’installation.</>
        : <>Appuie sur <strong>⋮</strong>, puis <strong>Installer et créer un raccourci → Installer</strong>. Selon ta version, l’option peut s’appeler <strong>Ajouter à l’écran d’accueil</strong>.</>}</li>
      <li>Confirme l’installation sur ton téléphone.</li>
    </ol> : <ol>
      <li>Dans Chrome ou Edge, cherche l’icône d’installation dans la barre d’adresse ou le menu du navigateur.</li>
      <li>Sur Mac avec Safari, utilise <strong>Fichier → Ajouter au Dock</strong>.</li>
      <li>Pour l’installer sur ton téléphone, ouvre le lien ci-dessous avec Chrome ou Samsung Internet sur Android, ou Safari sur iPhone.</li>
    </ol>}
    <p>Depuis une messagerie ou un réseau social, choisis d’abord <strong>Ouvrir dans le navigateur</strong>. Si seule la création d’un raccourci est proposée, celui-ci ouvrira 3B dans ton navigateur.</p>
    <label className="install3b-link-label" htmlFor="install3b-link">Lien à ouvrir ou à partager</label>
    <input id="install3b-link" className="install3b-link" readOnly value={publicLink} onFocus={event => event.target.select()} />
    <button type="button" className="install3b-copy" onClick={copyLink}>Copier le lien 3B</button>
    <p className="install3b-status" role="status">{copyMessage || installation.message}</p>
  </dialog>;
}

export default function InstallApp({ installation }) {
  const [helpOpen, setHelpOpen] = useState(false);
  if (installation.installed) return null;
  return <div className="install3b">
    <div className="install3b-card">
      <img src="/icons/3b-icon-20260912-192.png" width="48" height="48" alt="" />
      <div className="install3b-copy-text"><strong>3B sur ton téléphone</strong><span>Ton univers depuis l’écran d’accueil.</span></div>
      <button type="button" className="install3b-button" disabled={installation.busy}
        aria-haspopup={installation.available ? undefined : 'dialog'}
        onClick={() => installation.available ? installation.install() : setHelpOpen(true)}>
        <Download size={17} aria-hidden="true" />{installation.busy ? 'Confirmation…' : 'Installer 3B'}
      </button>
    </div>
    {installation.message && <p className="install3b-status" role="status">{installation.message}</p>}
    {helpOpen && <InstallHelp installation={installation} onClose={() => setHelpOpen(false)} />}
  </div>;
}
