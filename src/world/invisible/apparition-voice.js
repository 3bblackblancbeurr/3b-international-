export const APPARITION_PHRASE='On viendra te chercher, Ish.';
export const APPARITION_AUDIO='/world/living/apparition-ish.mp3';
/** A shipped recording: no operating-system voice discovery or synthesis service. */
export function createApparitionVoice({createAudio=()=>new Audio(APPARITION_AUDIO),onSpeaking=()=>{},onLoading=()=>{},onError=()=>{},timeoutMs=8000}={}){
 let current=null,disposed=false,generation=0;
 function stop(){generation++;const old=current;current=null;if(old){clearTimeout(old.timer);for(const [name,handler] of Object.entries(old.handlers))old.audio.removeEventListener(name,handler);old.audio.pause();old.audio.removeAttribute('src');old.audio.load();}if(!disposed){onLoading(false);onSpeaking(false);}}
 function read(text){
  if(disposed||text!==APPARITION_PHRASE)return false;
  stop();const ticket=generation;let audio;
  try{audio=createAudio();}catch{onError();return false;}
  const live=()=>!disposed&&current?.audio===audio&&ticket===generation;
  const failed=()=>{if(live()){stop();onError();}};
  const handlers={playing:()=>{if(live()){clearTimeout(current.timer);onLoading(false);onSpeaking(true);}},ended:()=>{if(live())stop();},error:failed};
  current={audio,handlers,timer:null};audio.volume=1;audio.muted=false;
  for(const [name,handler] of Object.entries(handlers))audio.addEventListener(name,handler);
  onLoading(true);current.timer=setTimeout(failed,timeoutMs);
  try{Promise.resolve(audio.play()).catch(failed);return true;}catch{failed();return false;}
 }
 return{read,stop,dispose(){stop();disposed=true;}};
}
