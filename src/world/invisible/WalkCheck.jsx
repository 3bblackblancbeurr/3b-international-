import React, {useEffect, useRef, useState} from 'react';
import {LocateFixed, Square} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';

export default function WalkCheck({onRemote}) {
 const [status,setStatus]=useState('GPS désactivé. La balade et les énigmes restent disponibles sans localisation.'),[checking,setChecking]=useState(false),[received,setReceived]=useState(false);
 const watch=useRef(null),request=useRef(0),timeout=useRef(null);
 function clear(){request.current++;if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current);watch.current=null;clearTimeout(timeout.current);}
 function stop(){clear();setChecking(false);setReceived(false);setStatus('GPS arrêté. Le repère de cette session a été effacé.');}
 useEffect(()=>{const hidden=()=>{if(document.hidden){clear();setChecking(false);setReceived(false);setStatus('GPS arrêté lorsque l’application passe en arrière-plan.');}};document.addEventListener('visibilitychange',hidden);return()=>{clear();document.removeEventListener('visibilitychange',hidden);};},[]);
 function locate(){
  clear();setReceived(false);
  if(!navigator.geolocation){setStatus('GPS indisponible ici. Continue sans localisation ou choisis le mode à distance.');return;}
  const ticket=request.current;setChecking(true);setStatus('Autorise, si tu le souhaites, une seule mesure de ta position.');
  const fail=error=>{if(ticket!==request.current)return;clear();setChecking(false);setStatus(error?.code===1?'Autorisation refusée. Tu peux continuer sans GPS.':'Le signal GPS est indisponible. Tu peux continuer sans GPS.');};
  // A cancellable watch is released immediately after its first measurement.
  // Coordinates never leave this callback and are never stored or sent.
  watch.current=navigator.geolocation.watchPosition(position=>{if(ticket!==request.current)return;const accuracy=Math.round(position.coords.accuracy);clear();setChecking(false);setReceived(true);setStatus(`Une mesure reçue${Number.isFinite(accuracy)?` · précision estimée ${accuracy} m`:''}. GPS arrêté ; aucune coordonnée conservée.`);},fail,{enableHighAccuracy:false,maximumAge:0,timeout:12000});
  timeout.current=setTimeout(()=>fail({code:3}),15000);
 }
 return <section className="invisible-walk" aria-label="Localisation facultative">
  <div className="invisible-inline-title"><LocateFixed size={18} aria-hidden="true"/><strong>Une balade à ton rythme</strong></div>
  <p>Choisis les espaces publics ouverts et arrête-toi pour jouer. Reste sur les chemins ; les coffres sont virtuels, jamais dans l’eau ou une propriété privée.</p>
  <div className="invisible-actions"><Button variant="ghost" onClick={locate} disabled={checking}><LocateFixed size={16} aria-hidden="true"/>{received?'Actualiser le repère':'Demander un repère GPS'}</Button>{(checking||received)&&<Button variant="ghost" onClick={stop}><Square size={14} aria-hidden="true"/>Arrêter / effacer</Button>}<Button variant="ghost" onClick={()=>{stop();onRemote();}}>Revenir au mode à distance</Button></div>
  <p className="invisible-small" role="status">{status}</p>
 </section>;
}
