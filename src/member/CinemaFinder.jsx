import React,{useMemo,useState} from 'react';
import {ArrowUpRight,Clapperboard,Film,Search,ShieldCheck} from 'lucide-react';
import {cinemaSearchLinks} from './cinema-search.js';
import './cinema-finder.css';

export default function CinemaFinder(){
  const [query,setQuery]=useState('');
  const links=useMemo(()=>cinemaSearchLinks(query),[query]);
  return <section className="mx-cinema" aria-labelledby="mx-cinema-heading">
    <header className="mx-cinema-hero">
      <span className="mx-cinema-eyebrow"><Clapperboard size={18}/> CINÉMA 3B · RECHERCHE LÉGALE</span>
      <h4 id="mx-cinema-heading">Ton prochain film<br/><em>commence ici.</em></h4>
      <p>Choisis un titre, puis ouvre sa recherche sur les plateformes qui diffusent légalement leurs catalogues.</p>
      <div className="mx-cinema-reel" aria-hidden="true"><Film size={64}/></div>
    </header>
    <label htmlFor="mx-movie-title" className="mx-cinema-label">Quel film cherches-tu ?</label>
    <div className="mx-cinema-input"><Search size={20}/><input id="mx-movie-title" type="search" value={query}
      maxLength={80} autoComplete="off" placeholder="Titre du film, réalisateur…" onChange={e=>setQuery(e.target.value)}/></div>
    <div className="mx-cinema-actions">
      <a href={links.arte} target="_blank" rel="noopener noreferrer" className="mx-cinema-primary">
        <span><strong>{links.title?'Chercher sur ARTE':'Explorer ARTE Cinéma'}</strong><small>Catalogue légal · films disponibles selon pays</small></span><ArrowUpRight size={20}/>
      </a>
      <a href={links.france} target="_blank" rel="noopener noreferrer" className="mx-cinema-secondary">
        <span><strong>{links.title?'Chercher sur France.tv':'Explorer France.tv'}</strong><small>Films et programmes sur le diffuseur officiel</small></span><ArrowUpRight size={20}/>
      </a>
    </div>
    <p className="mx-honesty"><ShieldCheck size={16}/> La recherche est effectuée directement sur les sites officiels : aucun titre n’est garanti disponible, aucune vidéo tierce n’est copiée par 3B. Certaines plateformes peuvent demander une connexion ou être limitées à un territoire.</p>
  </section>;
}
