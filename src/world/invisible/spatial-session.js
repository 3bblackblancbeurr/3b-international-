import {validPoseMatrix} from './xr-session.js';
import {placementFromHit,manualPlacement,multiplyRigid} from './spatial-placement.js';
const quiet=fn=>{try{fn?.();}catch{/* Native handles can already be invalid after interruption. */}};
const end=async session=>{try{await session?.end();}catch{/* Session already ended. */}};
export function createSpatialSession({xr=globalThis.navigator?.xr,overlayRoot,attachSession,onState=()=>{},onPose=()=>{},onCandidate=()=>{},onLight=()=>{},makeTransform=(position,orientation)=>new globalThis.XRRigidTransform(position,orientation)}={}){
 let generation=0,placementGeneration=0,session=null,source=null,reference=null,anchor=null,offset=null,kind=null,phase='idle',requested=false,pending=false,lightProbe=null,lastState='',listeners=[];
 const emit=(next,message,canPlace=false,surface=null)=>{phase=next;const key=next+message+canPlace+surface;if(key!==lastState){lastState=key;onState({phase:next,message,canPlace,surface});}};
 function listen(target,type,handler){target.addEventListener?.(type,handler);listeners.push(()=>target.removeEventListener?.(type,handler));}
 function rePlace(){placementGeneration++;quiet(()=>anchor?.delete());anchor=null;offset=null;kind=null;pending=false;requested=false;onPose(null);onCandidate(null);emit('searching','Vise le mur à courte distance. Tu peux aussi placer le passage devant toi.');}
 function release(){quiet(()=>source?.cancel());source=null;listeners.splice(0).forEach(fn=>fn());rePlace();reference=null;session=null;lightProbe=null;}
 async function stop(){generation++;const old=session;release();emit('idle','Le passage est fermé.');await end(old);}
 async function start(){
  if(session||phase==='starting')throw Error('Une ouverture est déjà en cours.');
  if(!xr?.requestSession){emit('error','Le suivi spatial est indisponible ici. Ouvre 3B dans Chrome sur Android compatible.');return false;}
  const ticket=++generation;emit('starting','Autorise le regard spatial sur ton téléphone.');let next;
  try{
   // No await before requestSession: retain the button's user activation.
   next=await xr.requestSession('immersive-ar',{requiredFeatures:['local','hit-test','anchors','dom-overlay'],optionalFeatures:['light-estimation'],domOverlay:{root:overlayRoot}});
   if(ticket!==generation){await end(next);return false;}
   if(!next.domOverlayState)throw Error('Les commandes dans la caméra ne sont pas disponibles.');
   session=next;listen(next,'end',()=>{if(ticket!==generation)return;generation++;release();emit('idle','Le passage est fermé.');});
   listen(next,'visibilitychange',()=>{if(next.visibilityState==='hidden')stop();});
   let nextReference=await attachSession(next);if(ticket!==generation)return false;
   if(!nextReference)nextReference=await next.requestReferenceSpace('local');if(ticket!==generation)return false;reference=nextReference;
   listen(reference,'reset',()=>{rePlace();emit('searching','Le repère a changé. Replace le passage.');});
   const viewer=await next.requestReferenceSpace('viewer');if(ticket!==generation)return false;
   const candidateSource=await next.requestHitTestSource({space:viewer,entityTypes:['plane']});
   if(ticket!==generation){quiet(()=>candidateSource?.cancel());return false;}
   if(!candidateSource)throw Error('Aucune détection de surface disponible.');source=candidateSource;
   // Lighting is optional; never block placement when the device cannot estimate it.
   if(next.requestLightProbe)Promise.resolve().then(()=>next.requestLightProbe()).then(probe=>{if(ticket===generation)lightProbe=probe;}).catch(()=>{});
   emit('searching','Bouge doucement vers un bord de porte ou un meuble, puis vise le mur.');return true;
  }catch(error){
   if(ticket!==generation)return false;generation++;const old=session||next;release();await end(old);
   emit('error',error.name==='NotAllowedError'?'Accès au regard spatial refusé. Tu peux réessayer.':'Ce navigateur ne permet pas ce placement spatial. Ouvre 3B dans Chrome sur Android avec les Services Google Play pour la RA.');return false;
  }
 }
 function frame(frame){
  if(!session||!source||!reference||frame?.session!==session)return;
  try{
   const viewer=validPoseMatrix(frame.getViewerPose(reference)?.transform?.matrix);
   if(!viewer){requested=false;onPose(null);onCandidate(null);emit('tracking-lost','Le suivi est perdu. Vise un bord de porte ou un meuble et bouge doucement.');return;}
   if(lightProbe&&frame.getLightEstimate)quiet(()=>{const estimate=frame.getLightEstimate(lightProbe);if(estimate)onLight(estimate);});
   if(anchor){
    const matrix=validPoseMatrix(frame.getPose(anchor.anchorSpace,reference)?.transform?.matrix);
    onCandidate(null);onPose(matrix?(offset?multiplyRigid(matrix,offset):matrix):null);
    emit(matrix?'placed':'tracking-lost',matrix?(kind==='manual'?'Passage ancré dans la pièce. Le mur n’a pas été mesuré.':'Passage ancré. Déplace-toi pour regarder à travers.'):'Le passage attend le retour du suivi. Tu peux le replacer.');return;
   }
   if(pending){onCandidate(null);return;}
   let candidate=null;
   for(const hit of frame.getHitTestResults(source)){
    const placement=placementFromHit(hit.getPose(reference)?.transform?.matrix,viewer);if(placement){candidate={hit,...placement};break;}
   }
   const manual=manualPlacement(viewer);onCandidate(candidate?.matrix||null);
   if(!requested){emit(candidate?'surface':'searching',candidate?(candidate.kind==='wall'?'Mur détecté. Place le passage ici.':'Surface détectée. Place le passage ici.'):'Vise le mur. Sans surface détectée, tu peux ancrer le passage à 55 cm devant toi.',!!(candidate||manual),candidate?.kind||null);return;}
   requested=false;if(!candidate&&!manual)return;
   const placement=candidate||manual,ticket=generation,placeTicket=++placementGeneration;pending=true;emit('placing','Le passage prend place…');
   // Anchor creation MUST occur synchronously in this active XRFrame.
   const promise=candidate?candidate.hit.createAnchor():frame.createAnchor(makeTransform(manual.position,manual.orientation),reference);
   Promise.resolve(promise).then(value=>{
    if(ticket!==generation||placeTicket!==placementGeneration){quiet(()=>value?.delete());return;}
    if(!value?.anchorSpace)throw Error('Ancre absente');anchor=value;offset=candidate?placement.offset:null;kind=placement.kind;pending=false;
   }).catch(()=>{if(ticket===generation&&placeTicket===placementGeneration){pending=false;emit('searching','L’ancrage a échoué. Bouge doucement et réessaie.',true);}});
  }catch{requested=false;pending=false;onPose(null);onCandidate(null);emit('tracking-lost','Le suivi est interrompu. Replace le passage ou ferme puis réessaie.');}
 }
 return {start,stop,frame,rePlace,requestPlacement(){requested=true;},get active(){return !!session;},get phase(){return phase;}};
}
