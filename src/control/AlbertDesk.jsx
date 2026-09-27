import {useEffect,useRef,useState} from 'react';
import {authClient} from '../loyalty/client.js';
const blank=()=>({note:'',tasks:[],end:null,remaining:1500});
export default function AlbertDesk({privacyMode}){
 const[owner,setOwner]=useState(''),[value,setValue]=useState(blank),[task,setTask]=useState(''),[now,setNow]=useState(Date.now),[storageError,setStorageError]=useState(false);
 const ownerRef=useRef('');
 useEffect(()=>{
  let active=true;
  authClient.auth.getSession().then(({data:{session}})=>{
   if(!active||!session?.user?.id)return;
   const id=session.user.id;ownerRef.current=id;
   try{
    const raw=JSON.parse(localStorage.getItem('3b-albert-desk:'+id)||'null');
    if(raw)setValue({note:typeof raw.note==='string'?raw.note.slice(0,20000):'',tasks:Array.isArray(raw.tasks)?raw.tasks.filter(t=>t&&typeof t.text==='string').slice(0,200).map(t=>({text:t.text.slice(0,300),done:t.done===true})):[],end:Number.isFinite(raw.end)?raw.end:null,remaining:Number.isFinite(raw.remaining)?Math.max(0,Math.min(raw.remaining,10800)):1500});
   }catch{setStorageError(true);}
   setOwner(id);
  }).catch(()=>{if(active)setStorageError(true);});
  const{data:{subscription}}=authClient.auth.onAuthStateChange((_event,session)=>{if(ownerRef.current&&session?.user?.id!==ownerRef.current){active=false;ownerRef.current='';setOwner('');setValue(blank());}});
  return()=>{active=false;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{if(!owner)return;try{localStorage.setItem('3b-albert-desk:'+owner,JSON.stringify(value));}catch{setStorageError(true);}},[owner,value]);
 useEffect(()=>{if(!value.end)return;const timer=setInterval(()=>{const t=Date.now();setNow(t);if(t>=value.end)setValue(v=>({...v,end:null,remaining:0}));},1000);return()=>clearInterval(timer);},[value.end]);
 if(!owner||privacyMode)return null;
 const seconds=value.end?Math.max(0,Math.ceil((value.end-now)/1000)):value.remaining,done=value.tasks.filter(t=>t.done).length;
 return <details className="albert-desk"><summary>Atelier personnel <span>Notes · Priorités · Concentration</span></summary><p>{storageError?'Sauvegarde locale indisponible : conservez une copie de vos notes.':'Sauvegardé sur cet appareil, séparément pour votre compte. Pas de synchronisation entre appareils.'}</p><div className="albert-desk-grid">
  <section><h3>Carnet d’idées</h3><textarea aria-label="Notes personnelles" value={value.note} maxLength={20000} onChange={e=>setValue(v=>({...v,note:e.target.value}))} placeholder="Une idée, une direction…"/></section>
  <section><h3>Mes priorités · {done}/{value.tasks.length}</h3>{value.tasks.map((t,i)=><label key={i}><input type="checkbox" checked={t.done} onChange={e=>setValue(v=>({...v,tasks:v.tasks.map((x,j)=>j===i?{...x,done:e.target.checked}:x)}))}/><span>{t.text}</span></label>)}<form onSubmit={e=>{e.preventDefault();if(!task.trim()||value.tasks.length>=200)return;setValue(v=>({...v,tasks:[...v.tasks,{text:task.trim(),done:false}]}));setTask('');}}><input aria-label="Nouvelle priorité" placeholder="Ajouter une priorité" value={task} maxLength={300} onChange={e=>setTask(e.target.value)}/><button disabled={!task.trim()||value.tasks.length>=200}>Ajouter</button></form></section>
  <section><h3>Concentration</h3><strong className="albert-timer" role="timer">{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong><div><button onClick={()=>{const t=Date.now();setNow(t);setValue(v=>v.end?{...v,remaining:Math.max(0,Math.ceil((v.end-t)/1000)),end:null}:{...v,end:t+(v.remaining||1500)*1000});}}>{value.end?'Pause':seconds===0?'Nouvelle session':'Démarrer'}</button><button onClick={()=>setValue(v=>({...v,end:null,remaining:1500}))}>Réinitialiser</button></div>{seconds===0&&<p role="status">Session terminée. Prenez une pause.</p>}</section>
 </div></details>;
}
