import {useEffect,useRef,useState} from 'react';
import {useLoyalty} from './LoyaltyContext.jsx';
import {memberRequest} from './client.js';
const starts=new Map();
export function useGameRewards(game,engine,paused,ready,activity){
 const account=useLoyalty(),latest=useRef(account);latest.current=account;
 const[message,setMessage]=useState('');
 useEffect(()=>{
  const uid=account.user?.id;if(!uid){setMessage('Partie libre · connecte-toi au compte 3B pour gagner des récompenses.');return;}
  let live=true,run=null,busy=false,seq=0,totalXP=0,totalPoints=0;
  setMessage('Connexion des récompenses…');
  // Serialize starts so a slow, abandoned game cannot invalidate a newer run.
  const pending=(starts.get(uid)||Promise.resolve()).catch(()=>{}).then(()=>live?memberRequest('start',{game},uid):null);
  starts.set(uid,pending);
  pending.then(r=>{if(!r)return;if(!live){memberRequest('end',{run:r.run},uid).catch(()=>{});return;}run=r.run;setMessage('Récompenses actives · 20 XP et 1 point par minute de jeu.');}).catch(()=>{if(live)setMessage('Récompenses indisponibles pour cette partie. Tu peux continuer à jouer.');}).finally(()=>{if(starts.get(uid)===pending)starts.delete(uid);});
  const timer=setInterval(async()=>{
   if(!run||busy||!live||paused.current||!ready.current||document.hidden||engine.current.status!=='playing'||Date.now()-activity.current>20000)return;
   busy=true;
   try{const result=await memberRequest('heartbeat',{run,seq:seq+1},uid);seq++;if(!live)return;totalXP+=result.gained.xp;totalPoints+=result.gained.points;latest.current.accept(result);setMessage(`Cette partie : +${totalXP} XP · +${totalPoints} point${totalPoints>1?'s':''} · sauvegardés sur ton compte`);}
   catch{if(live)setMessage('Connexion interrompue · les gains reprendront au retour du réseau.');}
   finally{busy=false;}
  },15000);
  return()=>{live=false;clearInterval(timer);if(run)memberRequest('end',{run},uid).catch(()=>{});};
 },[game,account.user?.id]);
 return message;
}
