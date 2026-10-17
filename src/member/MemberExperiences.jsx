import {Button as GoldButton} from '../design-system/index.jsx';
import React, {useEffect, useMemo, useState} from 'react';
import {ArrowRight, ArrowUpRight, CalendarDays, Clapperboard, Compass, FileText, Film, Globe2, Handshake, HeartHandshake, Landmark, LockKeyhole, Mail, MapPin, Newspaper, Plane, Radio, RefreshCw, ShieldCheck, Sparkles, Star, UsersRound, WalletCards} from 'lucide-react';
import {MEMBER_SPACES, COUNTRY_INDEX, CONTACT_EMAIL, contactHref, countryFor, countryNewsHref, countryEventsHref, ADMIN_GUIDES, CINEMA_GUIDES, FINANCE_GUIDES, OPPORTUNITIES} from './memberSources.js';
import './member-experiences.css';
const OfficialDirectory = React.lazy(() => import('./OfficialDirectory.jsx'));
const FrenchEvents = React.lazy(() => import('./FrenchEvents.jsx'));
const MediaStudio = React.lazy(() => import('./media/MediaStudio.jsx'));
const TravelNotebook = React.lazy(() => import('./travel/TravelNotebook.jsx'));
const AdminJourney = React.lazy(() => import('./admin/AdminJourney.jsx'));
const CollaborationStudio = React.lazy(() => import('./collaboration/CollaborationStudio.jsx'));
const FinanceStudio = React.lazy(() => import('../finance/FinanceStudio.jsx'));


const ICONS = {wallet: WalletCards, globe:Globe2, heart:HeartHandshake, handshake:Handshake, landmark:Landmark, plane:Plane, users:UsersRound, tv:Clapperboard, file:FileText, film:Film};
const FAVORITES_KEY = 'threeb_member_spaces_favorites_v1';
function readFavorites() {
  try { const data = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); return Array.isArray(data) ? data.filter(id => MEMBER_SPACES.some(x => x.id === id)) : []; }
  catch { return []; }
}
function SourceLink({href, children, className='', primary=false}) {
  return <a className={'mx-link '+(primary?'mx-primary ':'')+className} href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={17} aria-hidden="true"/></a>;
}
function SourceRows({rows}) {
  return <div className="mx-source-rows">{rows.map(row=><SourceLink key={row.href} href={row.href}><span><strong>{row.title}</strong>{row.description&&<small>{row.description}</small>}</span></SourceLink>)}</div>;
}
function SectionIntro({eyebrow,title,children}) {
  return <div className="mx-section-intro"><span className="mx-eyebrow">{eyebrow}</span><h3>{title}</h3>{children&&<p>{children}</p>}</div>;
}
function PrimaryAction({children,onClick}) {
  return <GoldButton variant="health" type="button" className="mx-primary mx-link" onClick={onClick}>{children}<ArrowRight size={17} aria-hidden="true"/></GoldButton>;
}
function formatPublished(value) {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(d) : 'Date indisponible';
}
function WorldBrief({country, onCountryChange, mode, setMode}) {
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [retry,setRetry] = useState(0);
  const chosen = countryFor(country);
  const feed = country === 'FR' ? 'fr' : 'world';

  useEffect(()=>{
    if(mode !== 'news')return;
    const controller = new AbortController();
    setLoading(true);setError('');setItems([]);
    fetch('/api/member-brief?feed='+feed, {signal:controller.signal,credentials:'omit'})
      .then(async response=>{
        if(!response.ok)throw new Error('Source indisponible');
        const payload=await response.json();
        if(!Array.isArray(payload.items))throw new Error('Réponse source invalide');
        setItems(payload.items);
      })
      .catch(e=>{if(!controller.signal.aborted)setError(e.message||'Flux inaccessible');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[feed,mode,retry]);

  return <>
    <div className="mx-world-controls">
      <label className="mx-country"><span>Explorer un pays</span><select value={country} onChange={e=>onCountryChange(e.target.value)}>{COUNTRY_INDEX.map(c=><option key={c[0]} value={c[0]}>{c[3]} {c[1]}</option>)}</select></label>
      <div className="mx-switch" role="group" aria-label="Mode d’exploration">
        <GoldButton variant="health" type="button" aria-pressed={mode==='news'} onClick={()=>setMode('news')}><Newspaper size={16}/> Actualités</GoldButton>
        <GoldButton variant="health" type="button" aria-pressed={mode==='events'} onClick={()=>setMode('events')}><CalendarDays size={16}/> Événements</GoldButton>
      </div>
    </div>
    {mode==='news'?<>
      <SectionIntro eyebrow="INFORMATIONS DATÉES" title={country==='FR'?'Actus de France · France 24':'Vue mondiale · BBC News'}>{country==='FR'?'Titres d’un éditeur indépendant, liens vers les articles d’origine.':'Le fil intégré est mondial et non filtré par pays. Utilise le lien ci-dessous pour les actualités locales de '+chosen[1]+'.'}</SectionIntro>
      {loading&&<p className="mx-status" role="status">Récupération des titres publiés…</p>}
      {error&&<p className="mx-status" role="status">Impossible de lire le flux actuellement. <GoldButton variant="health" type="button" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={15}/> Réessayer</GoldButton></p>}
      {!loading&&!error&&!items.length&&<p className="mx-status">Aucun titre récent disponible depuis cette source.</p>}
      {!!items.length&&<div className="mx-news-feed">{items.map(item=><a key={item.link} href={item.link} target="_blank" rel="noopener noreferrer"><span><small>{item.source} · {formatPublished(item.published)}</small><strong>{item.title}</strong></span><ArrowUpRight size={18}/></a>)}</div>}
      <SourceLink primary href={countryNewsHref(country)}>Actualités de {chosen[1]} sur Google Actualités</SourceLink>
    </>:<>
      <SectionIntro eyebrow="SORTIES, RENCONTRES, CULTURE" title={country==='FR'?'Que se passe-t-il en France ?':'Événements en '+chosen[1]}>Consulte les agendas directement à la source : les dates et les lieux doivent être confirmés par l’organisateur. Aucun événement inventé ni ancienne affiche présentée comme actuelle.</SectionIntro>
      {country==='FR'&&<React.Suspense fallback={<p role="status" className="mx-status">Ouverture des événements publics…</p>}><FrenchEvents/></React.Suspense>}
      <SourceLink primary href={countryEventsHref(country)}>{country==='FR'?'Explorer tous les agendas OpenAgenda':'Chercher des événements dans le pays'}</SourceLink>
      {country==='FR'&&<p className="mx-honesty">Le flux RSS libre d’accès couvre une sélection d’événements culturels ; les autres programmes restent accessibles auprès de leurs organisateurs.</p>}
    </>}
  </>;
}

export default function MemberExperiences({goTo,profile,initialSpace='loyalty',standalone=false}) {
  const [active,setActive]=useState(()=>MEMBER_SPACES.some(item=>item.id===initialSpace)?initialSpace:'loyalty');
  useEffect(()=>{setActive(MEMBER_SPACES.some(item=>item.id===initialSpace)?initialSpace:'loyalty');},[initialSpace]);
  const [favorites,setFavorites]=useState(readFavorites);
  const [country,setCountry]=useState('FR');
  const [mode,setMode]=useState('news');
  const space=useMemo(()=>MEMBER_SPACES.find(item=>item.id===active)||MEMBER_SPACES[0],[active]);
  const Icon=ICONS[space.icon]||Sparkles;
  const pinned = favorites.includes(active);
  useEffect(()=>{
    try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(favorites));}catch{/* Private browsing and disabled storage are supported. */}
  },[favorites]);
  function toggleFavorite() {
    setFavorites(old=>old.includes(active)?old.filter(x=>x!==active):[...old,active]);
  }
  function changeSpace(id) {
    if(standalone){goTo(id);return;}
    setActive(id);
    document.getElementById('mx-content-title')?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  return <section className="mx-shell" data-standalone={standalone||undefined} aria-label="Univers et services de l’espace membre">
    <div className="mx-hero">
      <div className="mx-hero-copy">
        <span className="mx-eyebrow">LE GRAND ESPACE MEMBRE · 3B INTERNATIONAL</span>
        <h2>Un seul univers.<br/><em>La vie entière.</em></h2>
        <p>Découvre les services 3B sans perdre ton Passeport, tes avantages ni ton identité. Choisis un monde, tout le reste s’efface.</p>
        <div className="mx-hero-facts"><span><span aria-hidden="true"/> {MEMBER_SPACES.length} expériences</span><span>Sources identifiées</span><span>Libre d’explorer</span></div>
      </div>
      <div className="mx-planet" aria-hidden="true"><div className="mx-planet-ring"/><div className="mx-planet-core"><span>3B</span></div><i/><i/><i/></div>
    </div>

    <nav className="mx-rail" aria-label="Rubriques de mon espace membre">
      {MEMBER_SPACES.map(item=>{const ItemIcon=ICONS[item.icon];return <GoldButton variant="health" type="button" key={item.id} aria-pressed={active===item.id} onClick={()=>changeSpace(item.id)}><ItemIcon size={20} strokeWidth={1.6}/><span>{item.name}</span>{favorites.includes(item.id)&&<Star size={12} className="mx-pinned" fill="currentColor" aria-label="Favori"/>}</GoldButton>})}
    </nav>

    <div className="mx-stage" id="mx-content-title">
      <header className="mx-stage-heading">
        <div className="mx-stage-glyph"><Icon size={30} strokeWidth={1.4}/></div>
        <div><span className="mx-eyebrow">{space.eyebrow}</span><h3>{space.tagline}</h3><p>{space.hint}</p></div>
        <GoldButton variant="health" type="button" className="mx-star-action" onClick={toggleFavorite} aria-pressed={pinned} aria-label={pinned?'Retirer cette rubrique des favoris':'Ajouter cette rubrique aux favoris'} title={pinned?'Retirer des favoris':'Mettre en favori'}><Star size={20} fill={pinned?'currentColor':'none'}/></GoldButton>
      </header>
      <div className="mx-stage-body">
        {active==='loyalty'&&<>
          <SectionIntro eyebrow="DÉJÀ DANS TON COMPTE" title="Ta fidélité existe déjà.">Une seule carte boutique 3B et ta collection XP : pas de nouvelle inscription ni de portefeuille fictif.</SectionIntro>
          {profile&&<p className="mx-highlight"><WalletCards size={22}/><span><strong>{Number(profile.points||0).toLocaleString('fr-FR')} points boutique</strong><small>Le montant réel de ton compte 3B connecté.</small></span></p>}
          <PrimaryAction onClick={()=>goTo('loyalty')}>{profile?'Ouvrir mes cartes et avantages':'Découvrir les cartes 3B'}</PrimaryAction>
          {!profile&&<p className="mx-honesty">Connecte-toi pour synchroniser tes points entre tes appareils.</p>}
        </>}

        {active==='news'&&<WorldBrief country={country} onCountryChange={setCountry} mode={mode} setMode={setMode}/>}

        {active==='association'&&<>
          <React.Suspense fallback={<p className="mx-status" role="status">Ouverture des initiatives 3B…</p>}><CollaborationStudio space={active} ownerId={profile?.user_id}/></React.Suspense>
          <details className="mx-admin-guides"><summary>Projet associatif et sources officielles <ArrowRight size={17}/></summary>
          <SectionIntro eyebrow="L’ASSOCIATION 3B" title="Unir les cultures, agir localement.">Rencontres, entraide, transmission des histoires, projets culturels et sportifs, initiatives des membres. Une vision à faire vivre avec des actions concrètes.</SectionIntro>
          <p className="mx-highlight"><ShieldCheck size={23}/><span><strong>Statut administratif à vérifier</strong><small>L’enregistrement d’une association, son numéro RNA, ses statuts et sa capacité à recevoir des dons ne sont pas vérifiés par 3B à ce stade.</small></span></p>
          <SourceRows rows={[{title:'Créer ou gérer une association',description:'Formalités et obligations · Service-Public',href:'https://www.service-public.gouv.fr/associations'},{title:'Consulter une annonce au JOAFE',description:'Publication officielle des associations déclarées',href:'https://www.journal-officiel.gouv.fr/pages/associations-recherche-annonce/' }]}/>
          <SourceLink primary href={contactHref('Participer au projet associatif 3B')}>Participer à l’association 3B</SourceLink>
          </details>
        </>}

        {active==='partners'&&<>
          <React.Suspense fallback={<p className="mx-status" role="status">Ouverture de l’atelier collaborations…</p>}><CollaborationStudio space={active} ownerId={profile?.user_id}/></React.Suspense>
          <details className="mx-admin-guides"><summary>Présentation et contact 3B <ArrowRight size={17}/></summary>
          <SectionIntro eyebrow="CRÉER DES LIENS RÉELS" title="Les collaborations sont ouvertes.">Mode, création, jeux, sport, culture et diffusion : explore les formats possibles. Aucune marque externe n’est annoncée comme partenaire avant accord écrit.</SectionIntro>
          <div className="mx-keywords"><span>Mode & licences</span><span>Événements</span><span>Création vidéo</span><span>Jeu & e-sport</span><span>Territoires</span></div>
          <SourceLink primary href="/partenariats-3b.html">Voir la présentation officielle 3B</SourceLink>
          <SourceLink href={contactHref('Proposition de collaboration 3B International')}>Proposer un partenariat à 3B</SourceLink>
          </details>
        </>}

        {active==='finance'&&<>
          <React.Suspense fallback={<p role="status" className="mx-status">Ouverture du laboratoire financier 3B…</p>}><FinanceStudio/></React.Suspense>
          <details className="mx-admin-guides"><summary>Comprendre la finance et vérifier les organismes <ArrowRight size={17} aria-hidden="true"/></summary>
            <p>3B ne conserve pas de fonds, ne réalise pas de transactions crypto et ne délivre pas de conseil en investissement.</p>
            <SourceRows rows={FINANCE_GUIDES}/>
            <p className="mx-honesty"><LockKeyhole size={16}/> Les services financiers réels nécessiteraient un partenaire autorisé, une conformité réglementaire et une intégration de sécurité distincte.</p>
          </details>
        </>}

        {active==='travel'&&<>
          <React.Suspense fallback={<p className="mx-status" role="status">Ouverture de ton carnet de voyage…</p>}><TravelNotebook initialCountry={country}/></React.Suspense>
        </>}

        {active==='join'&&<>
          <React.Suspense fallback={<p className="mx-status" role="status">Ouverture de tes propositions…</p>}><CollaborationStudio space={active} ownerId={profile?.user_id}/></React.Suspense>
          <details className="mx-admin-guides"><summary>Domaines de participation et contact <ArrowRight size={17}/></summary>
          <SectionIntro eyebrow="DES PERSONNES AVANT DES CV" title="Tu peux construire 3B avec nous.">Voici les domaines où proposer tes idées et tes compétences. Il s’agit de prises de contact, pas d’offres d’emploi salariées confirmées.</SectionIntro>
          <div className="mx-source-rows">{OPPORTUNITIES.map(o=><SourceLink key={o.title} href={contactHref('3B · '+o.title)}><span><strong>{o.title}</strong><small>{o.text}</small></span></SourceLink>)}</div>
          <p className="mx-honesty"><Mail size={16}/> Les candidatures utilisent ton application de messagerie et sont envoyées à {CONTACT_EMAIL}. Aucun CV n’est collecté dans l’espace membre.</p>
          </details>
        </>}

        {active==='tv'&&<>
          <React.Suspense fallback={<p className="mx-status" role="status">Ouverture des récits ORIGINS…</p>}><MediaStudio mode="tv" goTo={goTo}/></React.Suspense>
        </>}

        {active==='admin'&&<>
          <React.Suspense fallback={<p className="mx-status" role="status">Ouverture de ton suivi administratif…</p>}><AdminJourney/></React.Suspense>
          <h3 className="mx-directory-title">Trouver le bon organisme</h3>
          <React.Suspense fallback={<p className="mx-status" role="status">Ouverture de l’annuaire public…</p>}><OfficialDirectory/></React.Suspense>
          <details className="mx-admin-guides"><summary>Explorer les autres démarches officielles <ArrowRight size={17} aria-hidden="true"/></summary>
            <p>Identité, emploi, logement, santé, impôts, justice, entreprise et Europe : ouvre le site de l’organisme compétent.</p>
            <SourceRows rows={ADMIN_GUIDES}/>
          </details>
          <p className="mx-honesty"><ShieldCheck size={16}/> Ton suivi reste sur cet appareil. Les justificatifs, identifiants et dossiers officiels se transmettent auprès des organismes compétents.</p>
        </>}

        {active==='cinema'&&<>
          <React.Suspense fallback={<p role="status" className="mx-status">Ouverture de ta médiathèque…</p>}><MediaStudio mode="cinema" goTo={goTo}/></React.Suspense>
          <details className="mx-admin-guides"><summary>Autres catalogues légaux et droits de diffusion <ArrowRight size={17} aria-hidden="true"/></summary>
            <SourceRows rows={CINEMA_GUIDES}/>
          </details>
          <p className="mx-honesty"><Film size={16}/> 3B ne diffuse pas de films tiers sans licences de diffusion. Les éventuels abonnements des plateformes restent séparés de 3B.</p>
        </>}
      </div>
      <footer className="mx-stage-footer"><ShieldCheck size={16}/><span>Liens publics identifiés · aucune affiliation externe présumée · informations à revérifier sur le site d’origine</span></footer>
    </div>
  </section>;
}
