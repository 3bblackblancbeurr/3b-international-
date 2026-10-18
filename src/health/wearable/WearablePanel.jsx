import React,{useEffect,useRef,useState} from 'react';
import {Activity,Battery,Bluetooth,Download,Heart,Link2Off,ShieldCheck,Trash2} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';
import {createHeartRateController} from './heart-rate-controller.js';
import {exportHeartRateCsv,HEART_RATE_LIMIT} from './heart-rate-model.js';
import './wearable.css';
const PHASE={idle:'Prêt à choisir un capteur',choosing:'Sélection dans le navigateur',connecting:'Connexion au capteur',connected:'Capteur connecté',disconnected:'Capteur déconnecté',unavailable:'Connexion indisponible',error:'Connexion à réessayer'};
const contact=value=>value===null?'Contact non fourni':value?'Contact détecté':'Contact non détecté';
const time=value=>new Date(value).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
function downloadCsv(content){const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='3B-mesures-cardiaques-session.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export default function WearablePanel(){const account=useLoyalty();return <WearableWorkspace key={account?.user?.id||'visitor'} accountKey={account?.user?.id||'visitor'}/>;}

/** Injectable hardware only for isolated synthetic recipes; production uses navigator.bluetooth. */
export function WearableWorkspace({accountKey='visitor',bluetooth,secureContext}){return <WearableContents key={accountKey} bluetooth={bluetooth} secureContext={secureContext}/>;}
function WearableContents({bluetooth,secureContext}){
 const instance=useRef(null),[state,setState]=useState(null),[exportNotice,setExportNotice]=useState('');
 if(!instance.current)instance.current=createHeartRateController({...(bluetooth!==undefined?{bluetooth}:{}),...(secureContext!==undefined?{secureContext}:{}),onChange:setState});
 const controller=instance.current,view=state||controller.snapshot(),latest=view.readings.at(-1),pending=['choosing','connecting'].includes(view.phase),connected=view.phase==='connected';
 useEffect(()=>{
  // StrictMode rehearses setup/cleanup in development. Recreate the disposed
  // controller before the second setup and keep gestures bound to the live ref.
  if(!instance.current)instance.current=createHeartRateController({...(bluetooth!==undefined?{bluetooth}:{}),...(secureContext!==undefined?{secureContext}:{}),onChange:setState});
  const active=instance.current;setState(active.snapshot());return()=>{active.dispose();if(instance.current===active)instance.current=null;};
 },[bluetooth,secureContext]);
 const values=view.readings.map(item=>item.bpm),minimum=values.length?Math.min(...values):0,maximum=values.length?Math.max(...values):0,span=Math.max(10,maximum-minimum);
 const points=values.map((value,index)=>`${values.length===1?150:10+index*280/(values.length-1)},${85-(value-minimum)*65/span}`).join(' ');
 function exportReadings(){try{downloadCsv(exportHeartRateCsv(view.readings,view.deviceName));setExportNotice('CSV téléchargé à ta demande. Cette copie contient des données personnelles ; conserve-la à l’endroit choisi.');}catch(error){setExportNotice(error.message);}}
 return <section className="hwr" aria-labelledby="hwr-title"><header className="hwr-header"><div><span className="hwr-eyebrow"><Bluetooth size={15}/> MON CAPTEUR · MA SESSION</span><h3 id="hwr-title">Ton rythme.<br/><em>Depuis ton bracelet.</em></h3><p>Choisis toi-même un capteur Bluetooth LE qui diffuse le service standard Heart Rate. La lecture commence après ta sélection dans le navigateur.</p></div><div className="hwr-emblem" aria-hidden="true"><Heart size={38}/><span>BLUETOOTH LE</span></div></header>
  <div className="hwr-privacy"><ShieldCheck size={18}/><p><strong>Seulement dans la mémoire de cette page.</strong> Les {HEART_RATE_LIMIT} dernières mesures restent ici jusqu’à l’effacement, la fermeture du module ou le changement de compte. Aucun envoi à 3B, à l’IA ou à un service de santé.</p></div>
  <div className="hwr-status" role="status"><span className={connected?'is-connected':''}><Bluetooth size={15}/>{PHASE[view.phase]}</span>{view.deviceName&&<strong>{view.deviceName}</strong>}{view.battery!==null&&<span><Battery size={15}/>{view.battery} %</span>}</div>
  {!view.support.available&&<p className="hwr-message" role="note">{view.support.reason} Aucun appareil ni aucune mesure n’ont été simulés.</p>}
  {view.error&&<p className="hwr-error" role="alert">{view.error}</p>}
  <div className="hwr-actions"><Button variant="health" disabled={!view.support.available||pending||connected} onClick={()=>{setExportNotice('');void instance.current?.connect();}}><Bluetooth size={16}/>{view.deviceName?'Choisir et reconnecter un capteur':'Choisir mon capteur'}</Button>{(pending||connected)&&<Button variant="health" onClick={()=>instance.current?.disconnect()}><Link2Off size={16}/>{pending?'Annuler la connexion':'Déconnecter le capteur'}</Button>}<Button variant="health" disabled={!view.readings.length} onClick={exportReadings}><Download size={16}/>Exporter mes mesures CSV</Button><Button variant="health" disabled={!view.readings.length&&!view.deviceName&&!pending} onClick={()=>{instance.current?.clear();setExportNotice('Session effacée et capteur déconnecté.');}}><Trash2 size={16}/>Effacer cette session</Button></div>
  {exportNotice&&<p className="hwr-message" role="status">{exportNotice}</p>}
  <div className="hwr-reading"><div className="hwr-value"><span>{latest?'Dernière mesure reçue':'En attente d’une vraie mesure'}</span><strong>{latest?latest.bpm:'—'}<small>bpm</small></strong><p>{latest?`${time(latest.receivedAt)} · ${contact(latest.contact)}`:'Aucun capteur connecté ne fournit de données pour le moment.'}</p></div><div className="hwr-chart">{latest?<><svg viewBox="0 0 300 100" role="img" aria-label={`Évolution des ${values.length} mesures reçues, de ${minimum} à ${maximum} battements par minute`}><line x1="10" y1="85" x2="290" y2="85" className="hwr-axis"/>{values.length===1?<circle cx="150" cy="85" r="3"/>:<polyline points={points} fill="none" strokeWidth="2"/>}</svg><div><span>{values.length} / {HEART_RATE_LIMIT} mesures</span><span>{minimum}–{maximum} bpm reçus</span></div></>:<div className="hwr-empty"><Activity size={28}/><p>La courbe apparaîtra avec les données reçues de ton capteur.</p></div>}</div></div>
  {latest&&<details className="hwr-history"><summary>Les {Math.min(12,view.readings.length)} dernières réceptions</summary><div className="hwr-table"><table><caption>Horodatage local de réception, sans interprétation médicale</caption><thead><tr><th>Réception</th><th>bpm</th><th>Contact</th><th>Énergie cumulée</th><th>RR</th></tr></thead><tbody>{view.readings.slice(-12).reverse().map((item,index)=><tr key={item.receivedAt+'-'+index}><td>{time(item.receivedAt)}</td><td>{item.bpm}</td><td>{contact(item.contact)}</td><td>{item.energyKj===null?'Non fourni':item.energyKj+' kJ'}</td><td>{item.rrIntervalsMs.length?item.rrIntervalsMs.map(value=>Math.round(value)).join(' / ')+' ms':'Non fourni'}</td></tr>)}</tbody></table></div></details>}
  <p className="hwr-footnote">Tous les bracelets et navigateurs ne permettent pas cette connexion. Aucune reconnexion automatique, aucun historique de santé importé. L’énergie et les intervalles RR ne s’affichent que s’ils sont fournis par l’appareil. Les valeurs brutes ne constituent pas un diagnostic ni une alerte médicale.</p>
  <details className="hwr-help"><summary>Compatibilité et confidentialité</summary><p>Le capteur doit être allumé, proche, libre d’une connexion exclusive et exposer le service Bluetooth LE Heart Rate. Le navigateur affiche son propre sélecteur ; 3B ne parcourt pas tes appareils en arrière-plan. Refuser ou fermer le sélecteur laisse le module sans nouvelle connexion.</p><p>Le CSV contient les mesures de cette session et le nom du capteur, avec l’heure de réception dans 3B. Fermer le module déconnecte le capteur et efface sa mémoire de session. La révocation de l’autorisation Bluetooth conservée par le navigateur se fait dans les paramètres du site.</p><a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API" target="_blank" rel="noopener noreferrer">Consulter la compatibilité Web Bluetooth ↗</a></details>
 </section>;
}
