import {useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,Coins,Flag,LockKeyhole,Sparkles} from 'lucide-react';
import {CITY_CAMPAIGN_CHAPTERS,campaignSummary,missionProgress} from './city3b-campaign.js';
import './city3b-campaign.css';

export function City3BCampaignPreview({campaign,onOpen,onAction,busy,onRefresh}){
 const summary=campaignSummary(campaign),mission=summary.active;
 return <section className="city3b-campaign-preview city3b-panel" aria-label="Guide de construction">
  <div><p className="city3b-kicker">LES DEMANDES DES HABITANTS</p><h3><Flag size={19}/> Une ville qui se construit avec toi</h3>
   <p>Construis librement dès maintenant, ou suis les 8 chapitres. Les missions font progresser ta Ville et financent tes prochains bâtiments.</p></div>
  {summary.available?<><div className="city3b-campaign-count"><strong>{summary.mainClaimed}/24</strong><span>missions principales · {summary.optionalClaimed}/8 demandes facultatives</span></div>
   {mission&&<div className="city3b-campaign-next"><span>Chapitre {mission.chapter} · {mission.status==='ready'?'Récompense prête':'Prochaine demande'}</span><strong>{mission.title}</strong><div className="city3b-actions"><button type="button" className="city3b-btn primary" onClick={onOpen}>{mission.status==='ready'?'Recevoir ma récompense':'Voir les objectifs'}</button>{mission.status!=='ready'&&<button type="button" className="city3b-btn blue" onClick={()=>onAction(mission.action)}>Commencer <ArrowRight size={15}/></button>}</div></div>}
   {summary.complete&&<p className="city3b-campaign-finished"><CheckCircle2 size={19}/> Les 24 missions principales sont accomplies. Ta ville reste ouverte à toutes tes idées.</p>}
   {!mission&&<button type="button" className="city3b-btn" onClick={onOpen}>Voir les demandes facultatives</button>}</>:<Unavailable busy={busy} onRefresh={onRefresh}/>}</section>;
}

function Unavailable({busy,onRefresh}){return <div className="city3b-campaign-unavailable" role="status"><p>Le guide est momentanément indisponible. Tu peux continuer à construire, puis retrouver tes missions en actualisant.</p><button type="button" className="city3b-btn" disabled={busy} onClick={onRefresh}>Actualiser les missions</button></div>}

export default function City3BCampaign({campaign,busy,onClaim,onAction,onRefresh}){
 const summary=campaignSummary(campaign),activeChapter=summary.active?.chapter||8;
 const [chapter,setChapter]=useState(activeChapter);
 useEffect(()=>{setChapter(previous=>{
  const rows=summary.missions.filter(m=>m.chapter===previous&&!m.optional);
  return rows.length&&rows.every(m=>m.status==='claimed')&&activeChapter>previous?activeChapter:previous;
 });},[activeChapter,summary.mainClaimed]);
 if(!summary.available)return <section className="city3b-panel"><h3>Les missions de ma Ville</h3><Unavailable busy={busy} onRefresh={onRefresh}/></section>;
 const chapterInfo=CITY_CAMPAIGN_CHAPTERS.find(c=>c.id===chapter),rows=summary.missions.filter(m=>m.chapter===chapter);
 return <section className="city3b-campaign" aria-label="Campagne de ma Ville">
  <header className="city3b-campaign-intro"><p className="city3b-kicker">MA VILLE · LES HUIT QUARTIERS</p><h2>De la première maison à ta cité</h2><p>24 missions principales, 8 demandes facultatives. Chaque objectif est vérifié sur ta ville sauvegardée. Les Coins vont dans ton compte 3B ; l’XP fait grandir ta Ville.</p>
   <div className="city3b-campaign-total"><strong>{summary.mainClaimed}/24 accomplies</strong><span>{summary.optionalClaimed}/8 facultatives</span><button type="button" className="city3b-btn" disabled={busy} onClick={onRefresh}>Actualiser</button></div>
   <p className="city3b-campaign-note">La construction reste libre. Les demandes facultatives et les achats Premium ne bloquent jamais un chapitre.</p></header>
  <nav className="city3b-campaign-chapters" aria-label="Chapitres de construction">{CITY_CAMPAIGN_CHAPTERS.map(c=>{
   const main=summary.missions.filter(m=>m.chapter===c.id&&!m.optional),done=main.filter(m=>m.status==='claimed').length,locked=main.every(m=>m.status==='locked');
   return <button key={c.id} type="button" aria-current={chapter===c.id?'step':undefined} onClick={()=>setChapter(c.id)}><span>{done===3?<CheckCircle2 size={16}/>:locked?<LockKeyhole size={15}/>:c.id}</span><b>{c.title}</b><small>{done}/3</small></button>;
  })}</nav>
  <div className="city3b-campaign-heading"><p>Chapitre {chapter} · {chapterInfo.voice}</p><h3>{chapterInfo.title}</h3></div>
  <div className="city3b-campaign-missions">{rows.filter(m=>!m.optional).map(m=><Mission key={m.code} mission={m} busy={busy} onClaim={onClaim} onAction={onAction}/>)}</div>
  <h3 className="city3b-campaign-optional"><Sparkles size={18}/> Une demande en plus · facultative</h3>
  <div className="city3b-campaign-missions optional">{rows.filter(m=>m.optional).map(m=><Mission key={m.code} mission={m} busy={busy} onClaim={onClaim} onAction={onAction}/>)}</div>
 </section>;
}

function Mission({mission:m,busy,onClaim,onAction}){
 const progress=missionProgress(m),locked=m.status==='locked',claimed=m.status==='claimed';
 return <article className="city3b-campaign-mission" data-status={m.status}>
  <div className="city3b-campaign-status">{claimed?<><CheckCircle2 size={17}/> Accomplie</>:locked?<><LockKeyhole size={16}/> Chapitre à ouvrir</>:m.status==='ready'?<><Sparkles size={16}/> Objectifs remplis</>:<><Flag size={16}/> En cours</>}</div>
  <h4>{m.title}</h4><p>{m.description}</p>
  <ul>{m.objectives.map(g=><li key={g.metric}><span>{g.label}</span><strong>{Math.min(g.target,Math.max(0,g.current))}/{g.target}</strong></li>)}</ul>
  <div className="city3b-campaign-bar" role="progressbar" aria-label={`Progression de ${m.title}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${progress}%`}}/></div>
  <div className="city3b-campaign-reward"><span><Coins size={15}/> {m.coins} Coins</span><span>+{m.cityXp} XP ville</span></div>
  {claimed?<p className="city3b-campaign-note">Récompense reçue{m.claimedAt?` le ${new Date(m.claimedAt).toLocaleDateString('fr-FR')}`:''}.</p>:locked?<p className="city3b-campaign-note">Accomplis les 3 missions principales de chaque chapitre précédent pour ouvrir celui-ci. Tu peux préparer ces constructions librement.</p>:<div className="city3b-actions">{m.status==='ready'?<button type="button" className="city3b-btn primary" disabled={busy} onClick={()=>onClaim(m.code)}>{busy?'Enregistrement…':'Recevoir la récompense'}</button>:<button type="button" className="city3b-btn blue" onClick={()=>onAction(m.action)}>Passer à l’action <ArrowRight size={15}/></button>}</div>}
 </article>;
}
