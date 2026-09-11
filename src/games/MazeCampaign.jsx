import React,{useState} from 'react';
import {Lock,Play,Check,Star,ArrowUpRight} from 'lucide-react';
import {MAZE_CHAPTERS,unlockedMazeLevel,mazePerk,nextMazePerk} from './maze-campaign.js';
import {nextTier,tierFor} from '../../shared/loyalty.js';

export function MazeCampaign({game,profile,onSelect,onStart,onBenefits}){
 const [chapter,setChapter]=useState(Math.floor((game.stageNumber-1)/10));
 const progress=game.campaign,unlocked=unlockedMazeLevel(progress),perk=mazePerk(progress),next=nextMazePerk(progress),tier=profile?tierFor(profile.xp):null,target=profile?nextTier(profile.xp):null;
 return <div className="game-overlay maze-intro"><div>
  <span className="arcade-eyebrow">UNE CAMPAGNE · 100 NIVEAUX</span><h2>Traverse l’Oubli.</h2>
  <div className="maze-campaign-heading"><span>{progress.completed.length} / 100 réussis</span><strong>Niveau {game.stageNumber} · {game.difficulty.label}</strong><span>{Object.values(progress.best).reduce((sum,r)=>sum+r.stars,0)} / 300 ★</span></div>
  <div className="maze-campaign-track" role="progressbar" aria-label="Campagne terminée" aria-valuenow={progress.completed.length} aria-valuemin={0} aria-valuemax={100}><i style={{width:progress.completed.length+'%'}}/></div>
  <nav className="maze-chapters" aria-label="Chapitres du Labyrinthe">{MAZE_CHAPTERS.map((name,i)=><button key={name} aria-label={'Chapitre '+(i+1)+' : '+name} aria-pressed={chapter===i} onClick={()=>setChapter(i)}>{String(i+1).padStart(2,'0')}</button>)}</nav>
  <p className="maze-chapter-name">{MAZE_CHAPTERS[chapter]} <span>· niveaux {chapter*10+1}–{chapter*10+10}</span></p>
  <div className="maze-levels" aria-label="Choisir un niveau">{Array.from({length:10},(_,i)=>chapter*10+i+1).map(level=>{
   const result=progress.best[level],locked=level>unlocked;return <button key={level} onClick={()=>onSelect(level)} disabled={locked} aria-label={'Niveau '+level+(locked?' · verrouillé':result?' · '+result.stars+' étoiles':'' )} aria-pressed={game.stageNumber===level} data-complete={!!result}><strong>{level}</strong>{locked?<Lock size={13}/>:result?<span aria-hidden="true">{'★'.repeat(result.stars)}</span>:<Play size={13}/>}</button>;
  })}</div>
  <div className="maze-campaign-cards">
   <div className="maze-perk-card"><span className="maze-card-label">TES AMÉLIORATIONS</span><strong>{perk.title}</strong><p>{perk.light?`+${perk.light} de lumière · éclat rechargé ${perk.recharge} s plus vite.`:'Les victoires renforcent ta lanterne et ton éclat.'}</p><small>{next?`${next.clears-progress.completed.length} niveaux à réussir pour « ${next.title} ».`:'Toutes les améliorations sont débloquées.'}</small></div>
   <div className="maze-account-card"><span className="maze-card-label">XP & AVANTAGES 3B</span><strong>{profile?`${profile.xp.toLocaleString('fr-FR')} XP · ${tier.name}`:'20 XP et 1 point par minute active'}</strong><p>{profile&&target?`Prochain design : ${target.name}, à ${target.xp.toLocaleString('fr-FR')} XP.`:'Ton compte débloque des designs, des auras et des avantages fidélité.'}</p><button className="maze-benefits-link" onClick={onBenefits}>{profile?'Voir mes avantages':'Relier mon compte'}<ArrowUpRight size={13}/></button></div>
  </div>
  <details className="maze-rules"><summary>Objectif, commandes et récompenses</summary><p>Retrouve les trois sceaux, puis reviens au portail. Glisse le doigt, utilise le pavé directionnel ou les flèches / ZQSD / WASD. Éclat : E ou Espace. Carte : M, le temps s’arrête.</p><p>Une victoire débloque le niveau suivant. Jusqu’à trois étoiles : terminer, subir au plus un contact, puis terminer sans contact en {game.difficulty.par} secondes pour ce niveau. Les améliorations s’obtiennent après 10, 25, 50 et 75 niveaux réussis.</p><p>Les XP 3B sont crédités sur le compte pendant le jeu actif : 20 XP et 1 point par minute, dans les plafonds quotidiens existants de 600 XP et 20 points. Les XP débloquent les designs et les auras ; les points comptent pour les avantages boutique. Les niveaux et étoiles restent disponibles en invité.</p></details>
  <button className="arcade-primary maze-start" onClick={onStart}><Play size={18}/>Entrer dans le niveau {game.stageNumber}</button>
 </div></div>;
}
export function MazeResult({game,onNext,onLevels}){
 return <><div className="maze-result-stars" aria-label={(game.stars||0)+' étoiles'}>{[1,2,3].map(n=><Star key={n} size={27} fill={n<=(game.stars||0)?'currentColor':'none'} opacity={n<=(game.stars||0)?1:.25}/>)}</div><p className="maze-result-detail">Niveau {game.stageNumber} / 100 · {game.collected} sceaux · {game.explored}% exploré</p>
 {game.won&&<p className="maze-result-detail">{game.stageNumber===100?'Les 100 niveaux sont terminés. Tu es le Gardien de l’Oubli.':game.firstClear?'Niveau suivant débloqué. Ta progression est sauvegardée.':'Record mis à jour si cette tentative était meilleure.'}</p>}
 {game.won&&game.stageNumber<100&&<button className="arcade-primary" onClick={onNext}><Check size={18}/>Continuer · niveau {game.stageNumber+1}</button>}
 <button className="game-text-button" onClick={onLevels}>Choisir un niveau</button></>;
}
