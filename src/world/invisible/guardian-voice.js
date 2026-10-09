// Browser speech synthesis only: no microphone, upload, API key or network adapter.
export function createGuardianReader({synthesis,createUtterance,onSpeaking=()=>{}}={}){
 let generation=0,disposed=false;
 const supported=!!synthesis&&typeof synthesis.speak==='function'&&typeof synthesis.cancel==='function'&&typeof createUtterance==='function';
 const localVoice=()=>synthesis?.getVoices?.().find(item=>item.localService===true&&item.lang?.toLowerCase().startsWith('fr'));
 function stop(){generation++;if(supported)synthesis.cancel();if(!disposed)onSpeaking(false);}
 function read(value){
  const voice=localVoice();
  if(disposed||!supported||!voice||typeof value!=='string'||!value.trim()||value.length>900)return false;
  stop();const ticket=generation,utterance=createUtterance(value.trim());
  utterance.lang='fr-FR';utterance.rate=.93;
  utterance.voice=voice;
  const ended=()=>{if(!disposed&&ticket===generation)onSpeaking(false);};
  utterance.onend=ended;utterance.onerror=ended;
  onSpeaking(true);
  try{synthesis.speak(utterance);return true;}catch{ended();return false;}
 }
 return{get supported(){return supported&&!!localVoice();},read,stop,dispose(){disposed=true;stop();}};
}
