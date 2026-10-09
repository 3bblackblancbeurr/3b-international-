// Primary references: https://www.w3.org/TR/webxr-hit-test-1/
// https://threejs.org/docs/pages/WebXRManager.html
// This module controls permissions and native handles. It never awards progress.
export async function detectARSupport(xr=globalThis.navigator?.xr){
 if(!xr?.isSessionSupported||!xr?.requestSession)return false;
 try{return await xr.isSessionSupported('immersive-ar')===true;}catch{return false;}
}
export function validPoseMatrix(input){
 if(!input||input.length!==16)return null;
 const values=Array.from(input);return values.every(Number.isFinite)?values:null;
}
const cancelSource=source=>{try{source?.cancel();}catch{/* Already cancelled by the native session. */}};
const endSession=session=>{try{return Promise.resolve(session?.end()).catch(()=>{});}catch{return Promise.resolve();}};

export function createXRSessionController({xr=globalThis.navigator?.xr,overlayRoot,attachSession,onPose=()=>{},onSelect=()=>{},onState=()=>{}}={}){
 let generation=0,session=null,source=null,reference=null,lastPose=null,endListener=null,selectListener=null,phase='idle';
 const emit=(next,message)=>{if(phase!==next){phase=next;onState({phase:next,message});}};
 function release(){
  cancelSource(source);source=null;lastPose=null;reference=null;
  if(session){session.removeEventListener('end',endListener);session.removeEventListener('select',selectListener);}
  endListener=null;selectListener=null;session=null;onPose(null);
 }
 function stop(){generation++;const previous=session;release();emit('idle','AR arrêtée. Tu peux continuer en 3D.');return endSession(previous);}
 async function start(){
  if(session)throw Error('Une session AR est déjà active.');
  if(!xr?.requestSession)throw Error('L’AR avec suivi spatial n’est pas disponible ici.');
  const ticket=++generation;
  emit('starting','Autorisation AR en attente…');
  let next=null;
  try{
   // Called directly in the user's activation handler, with no support-check
   // await beforehand: immersive session requests require user activation.
   next=await xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','local'],...(overlayRoot?{optionalFeatures:['dom-overlay'],domOverlay:{root:overlayRoot}}:{})});
   if(ticket!==generation){await endSession(next);return false;}
   session=next;
   endListener=()=>{if(ticket!==generation)return;generation++;release();emit('idle','AR terminée. L’exploration 3D reste disponible.');};
   selectListener=event=>{if(ticket===generation&&session===next)onSelect({pose:lastPose?.slice()||null,event,referenceSpace:reference});};
   next.addEventListener('end',endListener);next.addEventListener('select',selectListener);
   const attachedReference=await attachSession?.(next);
   if(ticket!==generation)return false;
   reference=attachedReference||await next.requestReferenceSpace('local');
   if(ticket!==generation)return false;
   const viewer=await next.requestReferenceSpace('viewer');
   if(ticket!==generation)return false;
   const created=await next.requestHitTestSource({space:viewer});
   if(ticket!==generation){cancelSource(created);return false;}
   if(!created)throw Error('Le suivi de surface n’a pas fourni de source de détection.');
   source=created;emit('searching','Regarde autour de toi. Vise une surface pour faire apparaître le repère.');return true;
  }catch(error){
   if(ticket!==generation)return false;
   generation++;const previous=session||next;release();await endSession(previous);
   emit('error','AR refusée ou suivi de surface indisponible. Continue en 3D ou avec l’aperçu caméra.');
   throw error;
  }
 }
 function frame(frame){
  if(!source||!reference||!frame||frame.session!==session)return;
  try{
   const hit=frame.getHitTestResults(source)[0];
   lastPose=hit?validPoseMatrix(hit.getPose(reference)?.transform?.matrix):null;
   onPose(lastPose?.slice()||null);emit(lastPose?'surface':'searching',lastPose?'Surface détectée. Touche l’écran pour placer ton univers.':'Regarde autour de toi et vise une surface.');
  }catch{lastPose=null;onPose(null);emit('searching','Le repère est perdu. Vise une autre surface.');}
 }
 return {start,stop,frame,get active(){return !!session;},get phase(){return phase;}};
}

export function createLensCameraController({mediaDevices=globalThis.navigator?.mediaDevices,onStream=()=>{},onState=()=>{}}={}){
 let generation=0,stream=null,tracks=[];
 function stopped(){stop();}
 function stop(){generation++;const previous=stream;stream=null;tracks.forEach(track=>track.removeEventListener?.('ended',stopped));tracks=[];previous?.getTracks().forEach(track=>track.stop());onStream(null);onState('idle');}
 async function start(){
  stop();const ticket=generation;
  if(!mediaDevices?.getUserMedia)throw Error('La caméra est indisponible ici.');
  onState('starting');
  try{
   const next=await mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
   if(ticket!==generation){next.getTracks().forEach(track=>track.stop());return false;}
   stream=next;tracks=next.getTracks();tracks.forEach(track=>track.addEventListener?.('ended',stopped));onStream(next);onState('active');return true;
  }catch(error){if(ticket!==generation)return false;onState('error');throw error;}
 }
 return {start,stop,get active(){return !!stream;}};
}
