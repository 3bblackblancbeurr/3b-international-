import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {city3bRequest,CITY_COUNTRIES} from './city3b-client.js';
import {CITY3B_POIS,city3bVisualStage} from './city3b-world.js';
import '../styles/city-3b.css';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';

export function City3BPanel({uid,onLogin,onNotice,onWorldCitySync}){
 const[data,setData]=useState(null),[loading,setLoading]=useState(!!uid),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const account=useLoyalty(),country=account.passport?.userId===uid?account.passport.country:'';
 const scope=useRef(uid);scope.current=uid;const worldSyncRef=useRef(onWorldCitySync);worldSyncRef.current=onWorldCitySync;const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const[name,setName]=useState('Ma Ville 3B');
 const refresh=useCallback(async()=>{if(!uid)return;setLoading(true);setError('');try{const next=await city3bRequest('snapshot',{},uid);if(mounted.current&&scope.current===uid){setData(next);if(next?.city)worldSyncRef.current?.();}}catch(e){if(mounted.current&&scope.current===uid)setError(e.message);}finally{if(mounted.current&&scope.current===uid)setLoading(false);}},[uid]);
 useEffect(()=>{setData(null);setBusy('');refresh();},[refresh]);
 async function action(kind,body={}){if(!uid||busy)return;setBusy(kind);setError('');try{const next=await city3bRequest(kind,body,uid);if(!mounted.current||scope.current!==uid)return;setData(next);onNotice?.(kind==='sync_world'?'Ville 3B synchronisée avec le Monde du 3B.':'Ville 3B mise à jour.');if(next?.city)await worldSyncRef.current?.();}catch(e){if(mounted.current&&scope.current===uid)setError(e.message);}finally{if(mounted.current&&scope.current===uid)setBusy('');}}
 const stage=useMemo(()=>city3bVisualStage(data),[data]);
 if(!uid)return <div className="city3b-world-panel"><span className="city3b-kicker">VILLE 3B · COMPTE REQUIS</span><h3>Ta ville appartient à ton Passeport 3B.</h3><p>Connecte ton compte pour charger ta ville, ses quartiers, ses placements et sa progression.</p><button className="city3b-btn primary" onClick={onLogin}>Ouvrir mon compte 3B</button></div>;
 if(loading&&!data)return <div className="city3b-loading">CHARGEMENT DE VILLE 3B…</div>;
 if(!data?.city)return <div className="city3b-world-panel"><span className="city3b-kicker">FONDATION</span><h3>Créer la première fondation de Ville 3B</h3><p>Une seule ville par compte. Elle grandit avec ta progression et les quartiers que tu débloques.</p>{error&&<p className="city3b-error">{error}</p>}<div className="city3b-form"><label>Nom<input maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label><label>Pays d’origine · lié au Passeport 3B<input value={country} readOnly aria-label="Pays du Passeport 3B" placeholder="Complète ton Passeport"/></label><button className="city3b-btn primary" disabled={!!busy||name.trim().length<2||!country} onClick={()=>action('create',{name:name.trim(),country})}>{busy?'Création…':'Créer ma Ville 3B'}</button></div></div>;
 const city=data.city,wallet=data.wallet||{},districts=Array.isArray(data.districts)?data.districts:[],placements=Array.isArray(data.placements)?data.placements:[],definitions=Array.isArray(data.buildings)?data.buildings:[];
 return <div className="city3b-world-panel">
  <section className="city3b-world-hero">
   <div className="city3b-world-grid"/><div className="city3b-world-skyline" aria-hidden="true">{stage.towers.map(t=><i key={t.id} data-active={t.active} style={{height:t.height+'%'}}/>)}</div>
   <div className="city3b-world-copy"><span className="city3b-kicker">VILLE 3B · NIVEAU {stage.level}</span><h3>{city.name}</h3><p>{city.origin_country||'3B International'} · {stage.unlocked}/8 quartiers internationaux actifs · {stage.placements} constructions placées.</p><div className="city3b-stats"><span className="city3b-chip">{Number(wallet.coins||0)} Coins</span><span className="city3b-chip">{Number(wallet.xp||0)} XP</span><span className="city3b-chip">{Number(city.visitors||0)} visites</span></div></div>
  </section>
  {error&&<p className="city3b-error">{error}</p>}
  <div className="city3b-actions"><button className="city3b-btn primary" disabled={!!busy} onClick={()=>action('sync_world')}>{busy==='sync_world'?'Synchronisation…':'Synchroniser avec le Monde 3B'}</button><button className="city3b-btn blue" disabled={!!busy} onClick={()=>action('recalculate')}>Recalculer la ville</button><button className="city3b-btn" disabled={!!busy} onClick={refresh}>Actualiser</button></div>
  <section className="city3b-panel"><h3>Les huit quartiers</h3><div className="city3b-country-grid">{CITY_COUNTRIES.map(name=>{const row=districts.find(d=>d.country===name);return <article key={name} data-unlocked={!!row&&row.unlocked!==false}><strong>{name}</strong><span>{row&&row.unlocked!==false?'Ouvert · niveau '+(row.level||1):'À débloquer'}</span></article>;})}</div></section>
  <section className="city3b-panel"><h3>Lieux centraux</h3><div className="city3b-poi-grid">{CITY3B_POIS.map(p=><article key={p.id}><small>{p.kind}</small><strong>{p.name}</strong><p>{p.detail}</p></article>)}</div></section>
  <section className="city3b-panel"><h3>Construction réelle de ta ville</h3><p>{definitions.length} types de bâtiments disponibles · {placements.length} placements enregistrés côté serveur.</p><div className="city3b-building-strip">{definitions.slice(0,12).map((b,i)=><span key={b.building_code||b.code||b.id||i}>{b.name||b.building_code||b.code||'Bâtiment '+(i+1)}</span>)}</div></section>
  <p className="city3b-world-note">Direction artistique : noir profond, or champagne et bleu Matrix. Les données de ville, quartiers et placements viennent du backend ; le skyline ci-dessus est une visualisation légère adaptée au mobile.</p>
 </div>;
}
