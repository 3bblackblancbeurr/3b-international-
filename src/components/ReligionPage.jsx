import { useEffect } from 'react';
export default function ReligionPage() {
  useEffect(() => { window.location.replace('/religion/index.html#home'); }, []);
  return <section className="editorial-page"><h1>Religion</h1><p>Ouverture de la bibliothèque…</p><a href="/religion/index.html#home">Ouvrir Religion</a></section>;
}
