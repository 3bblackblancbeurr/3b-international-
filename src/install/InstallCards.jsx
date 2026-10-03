import { useState } from 'react';
import { Monitor, Smartphone, Apple } from 'lucide-react';
import './InstallCards.css';

export default function InstallCards({ installation }) {
  const [help, setHelp] = useState('');
  if (installation?.installed) return null;

  function select(platform) {
    setHelp('');
    if (platform === 'iphone') {
      window.location.assign('/install-iphone.html');
      return;
    }
    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    const matching = platform === 'android' ? android : !ios && !android;
    if (matching && installation?.available) {
      installation.install();
      return;
    }
    if (!matching) {
      setHelp(platform === 'pc' ? 'Ouvre 3B sur ton PC pour l’installer.' : 'Ouvre 3B sur ton téléphone Android pour l’installer.');
      return;
    }
    setHelp(platform === 'pc'
      ? 'Dans Chrome ou Edge : menu ⋮ → Installer 3B (ou Installer cette page en tant qu’application).'
      : 'Dans Chrome ou Samsung Internet : menu ⋮ → Installer l’application / Ajouter à l’écran d’accueil.');
  }

  return <section className="threeb-install" aria-label="Installer 3B">
    <p className="threeb-install-title">Installer 3B</p>
    <div className="threeb-install-grid">
      {[['pc', 'PC', Monitor], ['android', 'Android', Smartphone], ['iphone', 'iPhone', Apple]].map(([id, label, Icon]) =>
        <button key={id} type="button" className="threeb-install-card" disabled={installation?.busy} onClick={() => select(id)} aria-label={`Installer 3B sur ${label}`}>
          <Icon size={24} aria-hidden="true"/><strong>{label}</strong>
        </button>)}
    </div>
    {(help || installation?.message) && <p className="threeb-install-help" role="status">{help || installation.message}</p>}
  </section>;
}
