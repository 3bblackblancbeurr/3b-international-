// Primary references: https://www.w3.org/TR/webxr-hit-test-1/
// https://www.w3.org/TR/webxr-dom-overlays-1/
// https://threejs.org/docs/pages/WebXRManager.html
// This module controls permissions and native handles. It never awards progress.
export async function detectARSupport(xr=globalThis.navigator?.xr){
 if(!xr?.isSessionSupported||!xr?.requestSession)return false;
 try{return await xr.isSessionSupported('immersive-ar')===true;}catch{return false;}
}
export function validPoseMatrix(input){
 if(!input||input.length!==16)return null;
 const values=Array.from(input);if(!values.every(Number.isFinite))return null;
 // XRPose transforms are rigid, homogeneous matrices: a zero/scaled basis
 // cannot represent a tracked real-world pose.
 if([3,7,11].some(index=>Math.abs(values[index])>.001)||Math.abs(values[15]-1)>.001)return null;
 const bases=[[values[0],values[1],values[2]],[values[4],values[5],values[6]],[values[8],values[9],values[10]]];
 if(bases.some(axis=>Math.abs(Math.hypot(...axis)-1)>.001))return null;
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 if(Math.abs(dot(bases[0],bases[1]))>.001||Math.abs(dot(bases[0],bases[2]))>.001||Math.abs(dot(bases[1],bases[2]))>.001)return null;
 const [x,y,z]=bases,det=x[0]*(y[1]*z[2]-y[2]*z[1])-y[0]*(x[1]*z[2]-x[2]*z[1])+z[0]*(x[1]*y[2]-x[2]*y[1]);
 return det>.999?values:null;
}
export function horizontalPoseMatrix(input){
 const matrix=validPoseMatrix(input);if(!matrix)return null;
 // A hit-test result's Y basis is the surface normal (WebXR Hit Test §5).
 // The world contains upright people and doorways, so a wall or ceiling is
 // not a placement surface. Allow gently sloped ground, up to 25 degrees.
 const normalLength=Math.hypot(matrix[4],matrix[5],matrix[6]);
 if(normalLength<.999||normalLength>1.001||matrix[5]/normalLength<Math.cos(25*Math.PI/180))return null;
 return matrix;
}
const cancelSource=source=>{try{source?.cancel();}catch{/* Already cancelled by the native session. */}};
const endSession=session=>{try{return Promise.resolve(session?.end()).catch(()=>{});}catch{return Promise.resolve();}};

export function createXRSessionController({xr=globalThis.navigator?.xr,overlayRoot,attachSession,onPose=()=>{},onSelect=()=>{},onReferenceReset=()=>{},onState=()=>{}}={}){
 let generation=0,session=null,source=null,reference=null,lastPose=null,lastViewer=null,endListener=null,selectListener=null,visibilityListener=null,resetListener=null,phase='idle';
 const emit=(next,message,force=false)=>{if(force||phase!==next){phase=next;onState({phase:next,message});}};
 function release(){
  cancelSource(source);source=null;lastPose=null;lastViewer=null;reference?.removeEventListener?.('reset',resetListener);reference=null;
  if(session){session.removeEventListener('end',endListener);session.removeEventListener('select',selectListener);session.removeEventListener('visibilitychange',visibilityListener);}
  endListener=null;selectListener=null;visibilityListener=null;resetListener=null;session=null;onPose(null);
 }
 function stop(){generation++;const previous=session;release();emit('idle','AR arrêtée. Tu peux continuer en 3D.');return endSession(previous);}
 async function start(){
  if(session||phase==='starting')throw Error('Une session AR est déjà active.');
  if(!xr?.requestSession)throw Error('L’AR avec suivi spatial n’est pas disponible ici.');
  const ticket=++generation;
  emit('starting','Autorisation AR en attente…');
  let next=null;
  try{
   // Called directly in the user's activation handler, with no support-check
   // await beforehand: immersive session requests require user activation.
   next=await xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','local',...(overlayRoot?['dom-overlay']:[])],...(overlayRoot?{domOverlay:{root:overlayRoot}}:{})});
   if(ticket!==generation){await endSession(next);return false;}
   // The in-world controls are part of the experience. Never attach a native
   // session that accepted the request without actually enabling its HUD.
   if(overlayRoot&&!next.domOverlayState)throw Error('Le navigateur n’a pas activé les commandes AR. Continue avec la caméra ou la visite 3D.');
   session=next;
   endListener=()=>{if(ticket!==generation)return;generation++;release();emit('idle','AR terminée. L’exploration 3D reste disponible.');};
   selectListener=event=>{if(ticket===generation&&session===next)onSelect({pose:lastPose?.slice()||null,viewerPosition:lastViewer?{...lastViewer}:null,event,referenceSpace:reference});};
   visibilityListener=()=>{if(ticket===generation&&next.visibilityState==='hidden')stop();};
   next.addEventListener('end',endListener);next.addEventListener('select',selectListener);next.addEventListener('visibilitychange',visibilityListener);
   const attachedReference=await attachSession?.(next);
   if(ticket!==generation)return false;
   reference=attachedReference||await next.requestReferenceSpace('local');
   if(ticket!==generation)return false;
   const viewer=await next.requestReferenceSpace('viewer');
   if(ticket!==generation)return false;
   const created=await next.requestHitTestSource({space:viewer});
   if(ticket!==generation){cancelSource(created);return false;}
   if(!created)throw Error('Le suivi de surface n’a pas fourni de source de détection.');
   source=created;
   resetListener=()=>{if(ticket!==generation)return;lastPose=null;lastViewer=null;onPose(null);onReferenceReset();emit('searching','Le repère spatial a changé. Vise le sol pour replacer ton monde.',true);};
   reference.addEventListener?.('reset',resetListener);
   emit('searching','Vise un sol dégagé pour faire apparaître le repère.');return true;
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
   if(frame.getViewerPose){
    const viewer=frame.getViewerPose(reference)?.transform?.position;
    if(!viewer||![viewer.x,viewer.y,viewer.z].every(Number.isFinite)){lastPose=null;lastViewer=null;onPose(null);emit('tracking-lost','Le suivi du téléphone est perdu. Attends son retour pour revoir le monde.');return;}
    lastViewer={x:viewer.x,y:viewer.y,z:viewer.z};
   }
   lastPose=null;
   for(const hit of frame.getHitTestResults(source)){const candidate=horizontalPoseMatrix(hit.getPose(reference)?.transform?.matrix);if(candidate){lastPose=candidate;break;}}
   onPose(lastPose?.slice()||null);emit(lastPose?'surface':'searching',lastPose?'Sol détecté. Touche l’écran pour placer ton univers.':'Vise un sol dégagé devant toi.');
  }catch{lastPose=null;lastViewer=null;onPose(null);emit('searching','Le repère est perdu. Vise un autre sol.');}
 }
 return {start,stop,frame,get active(){return !!session;},get phase(){return phase;}};
}

export function createLensCameraController({mediaDevices=globalThis.navigator?.mediaDevices,onStream=()=>{},onState=()=>{}}={}){
 let generation=0,stream=null,tracks=[];
 function release(){
  const previousTracks=tracks;stream=null;tracks=[];
  previousTracks.forEach(track=>{track.removeEventListener?.('ended',stopped);try{track.stop();}catch{/* Release the other camera tracks even if a driver has already ended one. */}});
 }
 function stopped(){stop();}
 function stop(){generation++;release();onStream(null);onState('idle');}
 async function start(){
  stop();const ticket=generation;
  if(!mediaDevices?.getUserMedia)throw Error('La caméra est indisponible ici.');
  onState('starting');
  try{
   const next=await mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:false});
   if(ticket!==generation){next.getTracks().forEach(track=>{try{track.stop();}catch{/* The prompt can finish after the camera view has closed. */}});return false;}
   stream=next;tracks=next.getTracks();
   if(!tracks.length||tracks.every(track=>track.readyState==='ended'))throw Error('La caméra n’a pas fourni de vidéo active.');
   tracks.forEach(track=>track.addEventListener?.('ended',stopped));onStream(next);onState('active');return true;
  }catch(error){if(ticket!==generation)return false;release();onStream(null);onState('error');throw error;}
 }
 return {start,stop,get active(){return !!stream;}};
}
