import React,{useEffect,useRef,useState} from 'react';
import {Camera,ImagePlus,RotateCcw,ScanLine,X} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {createLensCameraController} from './xr-session.js';
import SpatialPassage from './SpatialPassage.jsx';

export default function ScannerWorkbench(){
 const video=useRef(null),controller=useRef(null),mounted=useRef(false),imageUrl=useRef(null),request=useRef(0);
 const [phase,setPhase]=useState('idle'),[message,setMessage]=useState(''),[preview,setPreview]=useState(null);
 function clearPreview(){if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);imageUrl.current=null;setPreview(null);}
 useEffect(()=>{
  mounted.current=true;
  controller.current=createLensCameraController({onStream:stream=>{if(video.current){video.current.srcObject=stream;if(stream)video.current.play().catch(()=>{if(mounted.current)setMessage('Touche l’aperçu pour lancer la vidéo.');});}},onState:state=>{if(mounted.current)setPhase(state);}});
  const hide=()=>{if(document.hidden){request.current++;controller.current.stop();}};
  document.addEventListener('visibilitychange',hide);
  return()=>{mounted.current=false;request.current++;document.removeEventListener('visibilitychange',hide);controller.current.stop();if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);};
 },[]);
 async function start(){clearPreview();setMessage('');try{await controller.current.start();}catch(error){if(mounted.current)setMessage(error.name==='NotAllowedError'?'Autorisation refusée. Autorise la caméra dans ton navigateur ou importe une image.':error.name==='NotFoundError'?'Aucune caméra disponible. Tu peux importer une image.':'La caméra est indisponible. Ferme les autres applications qui l’utilisent puis réessaie, ou importe une image.');}}
 function show(blob){if(!mounted.current)return;clearPreview();imageUrl.current=URL.createObjectURL(blob);setPreview(imageUrl.current);setMessage('Aperçu local prêt. Aucune reconnaissance ni validation de mission n’est effectuée.');}
 function capture(){const element=video.current;if(!element?.videoWidth){setMessage('Attends que la caméra affiche une image.');return;}const ticket=++request.current,canvas=document.createElement('canvas');canvas.width=element.videoWidth;canvas.height=element.videoHeight;const context=canvas.getContext('2d');if(!context){setMessage('La capture est indisponible. Importe une image.');return;}context.drawImage(element,0,0);canvas.toBlob(blob=>{if(ticket!==request.current||!mounted.current)return;if(blob){controller.current.stop();show(blob);}else setMessage('La capture a échoué. Réessaie.');},'image/jpeg',.9);}
 function importImage(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;request.current++;controller.current.stop();if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){setMessage('Choisis un fichier JPG, PNG ou WebP de moins de 12 Mo.');return;}show(file);}
 function reset(){request.current++;controller.current.stop();clearPreview();setMessage('');}
 return <section className="hidden-scanner" aria-labelledby="hidden-scanner-title"><div className="hidden-section-title"><p className="hidden-eyebrow">LE REGARD 3B</p><h2 id="hidden-scanner-title">Un dessin. Une autre dimension.</h2><p>Ouvre un passage dans le lieu où tu te trouves. Les dessins à reconnaître et les lieux précis seront ajoutés avec les prochaines découvertes.</p></div><SpatialPassage onBeforeOpen={reset}/><details className="hidden-photo-tools"><summary>Préparer un dessin ou une photo</summary><div className={'hidden-viewfinder '+(preview?'has-preview':'')}>
  <video ref={video} muted playsInline aria-label="Aperçu de la caméra" onClick={()=>video.current?.play().catch(()=>setMessage('Impossible de lire la vidéo.'))} hidden={phase!=='active'||!!preview}/>
  {preview?<img src={preview} alt="Aperçu du dessin ou de la photo sélectionnée" onError={()=>{clearPreview();setMessage('Cette image ne peut pas être affichée. Essaie un JPG ou un PNG.');}}/>:phase!=='active'&&<div className="hidden-viewfinder-empty"><ScanLine size={52} strokeWidth={1}/><strong>{phase==='starting'?'Autorisation en attente…':'Ton regard ouvre le passage.'}</strong><span>Aucun dessin à reconnaître pour le moment</span></div>}
  <div className="hidden-scan-corners" aria-hidden="true"/><span className="hidden-viewfinder-badge">{preview?'APERÇU LOCAL':phase==='active'?'CAMÉRA PHOTO':'EN PRÉPARATION'}</span>
 </div><div className="hidden-scanner-actions">{phase==='active'?<><Button variant="neutral" onClick={capture}><Camera size={18}/>Prendre une photo</Button><Button variant="ghost" onClick={reset}><X size={18}/>Arrêter</Button></>:<Button variant="neutral" onClick={start} disabled={phase==='starting'}><Camera size={18}/>{phase==='starting'?'Ouverture…':'Ouvrir la caméra'}</Button>}<label className="hidden-file-button"><ImagePlus size={18}/>Importer une image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={importImage}/></label>{preview&&<Button variant="ghost" onClick={reset}><RotateCcw size={18}/>Effacer l’aperçu</Button>}</div>{message&&<p role="status" className="hidden-inline-status">{message}</p>}<p className="hidden-caption">Les images restent dans cet aperçu et sont effacées en quittant le scanner. Aucun envoi, aucun GPS, aucun micro.</p></details></section>;
}
