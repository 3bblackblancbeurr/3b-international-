import React,{Suspense,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Orbit,RotateCcw} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {hiddenARCapabilities,openHiddenAR} from '../../native/hidden-ar.js';
const PortalPreview=React.lazy(()=>import('./PortalPreview.jsx'));
export default function SpatialPortalPanel({onBeforeOpen}){
 const [capabilities,setCapabilities]=useState(null),[opening,setOpening]=useState(false),[preview,setPreview]=useState(false),[message,setMessage]=useState('');
 const alive=useRef(false),locked=useRef(false);
 useEffect(()=>{alive.current=true;hiddenARCapabilities().then(value=>{if(alive.current)setCapabilities(value);});return()=>{alive.current=false;};},[]);
 async function refresh(){setCapabilities(null);const value=await hiddenARCapabilities();if(alive.current)setCapabilities(value);}
 async function open(){
  if(locked.current)return;locked.current=true;onBeforeOpen();setOpening(true);setMessage('');setPreview(false);
  try{const result=await openHiddenAR();if(alive.current)setMessage(result.message||'Le portail est fermé. La caméra a été libérée.');}
  catch{if(alive.current)setMessage('Le module spatial ne peut pas s’ouvrir. Vérifie la mise à jour Android ou utilise l’aperçu 3D.');}
  finally{locked.current=false;if(alive.current)setOpening(false);}
 }
 const native=capabilities?.platform==='android',ready=native&&capabilities.available;
 return <section className="hidden-spatial-panel" aria-labelledby="hidden-spatial-title"><div className="hidden-spatial-heading"><Orbit size={28}/><div><p className="hidden-eyebrow">LE PASSAGE</p><h3 id="hidden-spatial-title">Un portail dans ton espace.</h3></div></div><p>Découvre le rendu du passage. Dans la version Android compatible, place-le sur le sol et déplace-toi pour l’observer. Aucune énigme, aucun lieu imposé, aucune récompense.</p><div className="hidden-spatial-features"><span>Placement spatial</span><span>Lumière du décor</span><span>Profondeur selon le téléphone</span></div>
 <div className="hidden-scanner-actions"><Button variant="neutral" onClick={()=>setPreview(value=>!value)} disabled={opening}>{preview?'Fermer l’aperçu':'Voir le portail en 3D'}</Button>{ready&&<Button onClick={open} disabled={opening}><ArrowUpRight size={18}/>{opening?'Portail ouvert…':'Placer dans mon espace'}</Button>}{capabilities?.checking&&<Button variant="ghost" onClick={refresh}><RotateCcw size={18}/>Vérifier la compatibilité</Button>}</div>
 {!capabilities?<p className="hidden-caption">Vérification de la compatibilité…</p>:!native?<p className="hidden-caption">Le placement spatial nécessite le module de l’application Android. Ici, tu peux consulter l’aperçu 3D et utiliser le scanner photo.</p>:!ready?<p className="hidden-caption">{capabilities.reason==='update-required'?'Cette version Android ne contient pas encore le module spatial. Une nouvelle version Android est nécessaire.':capabilities.checking?'Compatibilité en cours de vérification.':'Le suivi spatial est indisponible sur cet appareil. L’aperçu 3D et le scanner restent accessibles.'}</p>:<p className="hidden-caption">Choisis un espace dégagé et bien éclairé. Les dessins à reconnaître et les lieux précis seront ajoutés ultérieurement.</p>}
 {message&&<p role="status" className="hidden-inline-status">{message}</p>}
 {preview&&<Suspense fallback={<p role="status">Ouverture du portail…</p>}><PortalPreview/></Suspense>}
 <details className="hidden-ar-privacy"><summary>À propos de la caméra et du suivi spatial</summary><p>Le module Android utilise les Services Google Play pour la RA (ARCore). Google traite des données de capteurs pour suivre le téléphone et comprendre l’environnement. Le module 3B n’enregistre ni ne transmet de photo ou de carte du lieu, et ne demande ni GPS ni micro.</p><a href="https://developers.google.com/ar/privacy-requirements" target="_blank" rel="noopener noreferrer">Informations ARCore et confidentialité</a></details></section>;
}
