import React,{useMemo,useState} from 'react';
import {ArrowUpRight,Clapperboard,FileLock2,Film,HeartHandshake,HeartPulse,IdCard,Landmark,Newspaper,Plane,Search,ShieldCheck,Sparkles,WalletCards,Handshake} from 'lucide-react';
import {Button} from '../design-system/index.jsx';
import {MEMBER_HUB_GROUPS,findMemberHubCards} from './member-hub-model.js';
import './member-hub.css';
const ICONS={wallet:WalletCards,passport:IdCard,file:FileLock2,plane:Plane,news:Newspaper,heart:HeartPulse,hands:HeartHandshake,bank:Landmark,partners:Handshake,sparkles:Sparkles,tv:Clapperboard,film:Film};
export default function MemberHub({goTo,profile}){
 const [query,setQuery]=useState(''),[group,setGroup]=useState('all');
 const cards=useMemo(()=>findMemberHubCards({query,group}),[query,group]);
 return <section className="member3b-hub" aria-labelledby="member3b-hub-title">
  <header className="member3b-hub-hero"><div><span className="member3b-hub-eyebrow">ESPACE MEMBRE / TON POINT DE RENCONTRE</span><h2 id="member3b-hub-title">Tout ce qui compte.<br/><em>Au même endroit.</em></h2><p>Ta fidélité fait partie de ton espace membre. Retrouve aussi tes papiers, tes voyages et tes projets, avec un accès direct à chaque espace.</p></div><span className="member3b-hub-seal" aria-hidden="true"><IdCard size={36}/><small>LE CERCLE 3B</small></span></header>
  <div className="member3b-hub-tools"><nav aria-label="Filtrer mon espace membre">{MEMBER_HUB_GROUPS.map(([id,label])=><Button key={id} variant="ghost" aria-pressed={group===id} onClick={()=>setGroup(id)}>{label}</Button>)}</nav><label><Search size={17}/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} aria-label="Rechercher dans mon espace membre" placeholder="Une carte, un papier, un projet…" maxLength={100}/></label></div>
  <div className="member3b-hub-grid">{cards.map(card=>{const Icon=ICONS[card.icon];return <article key={card.id} className={'member3b-hub-card'+(card.id==='loyalty'?' is-fidelity':'')}><span className="member3b-hub-icon"><Icon size={25}/></span><small>{card.tag}</small><h3>{card.title}</h3><p>{card.subtitle}</p>{card.id==='loyalty'&&<strong className="member3b-hub-points">{new Intl.NumberFormat('fr-FR').format(Number(profile?.points)||0)} <span>points fidélité</span></strong>}<Button variant="ghost" onClick={()=>goTo(card.id)} aria-label={'Ouvrir : '+card.title}>Ouvrir cet espace<ArrowUpRight size={18}/></Button></article>;})}</div>
  {!cards.length&&<p className="member3b-hub-empty" role="status">Aucun espace pour cette recherche. Essaie un autre mot.</p>}
  <aside className="member3b-hub-privacy"><ShieldCheck size={20}/><div><strong>Tes espaces gardent leur confidentialité.</strong><p>Les pièces du coffre sont chiffrées sur cet appareil. Leur contenu et les mesures de santé ne sont pas partagés automatiquement avec Albert ou le compagnon. Les connexions aux administrations nécessitent leurs propres autorisations.</p></div></aside>
 </section>;
}
