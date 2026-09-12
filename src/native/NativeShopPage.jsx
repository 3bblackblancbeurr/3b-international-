import { useState } from 'react';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import { openWebShop } from './runtime.js';

export default function NativeShopPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    if (busy) return;
    setBusy(true);
    setError('');
    try { await openWebShop(); }
    catch { setError('La boutique n’a pas pu s’ouvrir. Réessaie dans un instant.'); }
    finally { setBusy(false); }
  }
  return <section className="page-section">
    <p className="eyebrow">3B INTERNATIONAL</p>
    <h1>La boutique 3B</h1>
    <article className="premium-panel">
      <ShoppingBag aria-hidden="true" />
      <h2>Vêtements et accessoires</h2>
      <p>Découvre les collections sur la boutique en ligne. Tu pourras y retrouver ton compte 3B et tes avantages en te connectant.</p>
      <button type="button" className="primary-button" onClick={open} disabled={busy}>
        {busy ? 'Ouverture…' : 'Ouvrir la boutique'} <ArrowUpRight size={18} aria-hidden="true" />
      </button>
      {error && <p role="alert">{error}</p>}
    </article>
  </section>;
}
