let ctx=null;
function context(){
  const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioContext)return null;
  if(!ctx)ctx=new AudioContext();
  return ctx;
}
export function dadaTone(type='move',enabled=true){
  if(!enabled)return;
  const audio=context();if(!audio)return;
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  const presets={
    roll:[320,.055],move:[430,.045],six:[660,.12],capture:[160,.22],
    door:[540,.18],finish:[760,.24],victory:[880,.38],error:[120,.14],
  };
  const [frequency,duration]=presets[type]||presets.move;
  const oscillator=audio.createOscillator(),gain=audio.createGain();
  oscillator.type=type==='capture'?'sawtooth':'sine';
  oscillator.frequency.setValueAtTime(frequency,audio.currentTime);
  if(type==='victory')oscillator.frequency.exponentialRampToValueAtTime(1320,audio.currentTime+duration);
  gain.gain.setValueAtTime(.0001,audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.07,audio.currentTime+.015);
  gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();oscillator.stop(audio.currentTime+duration+.03);
}
export function dadaHaptic(type='move',enabled=true){
  if(!enabled||!navigator.vibrate)return;
  const patterns={roll:12,six:[18,25,18],capture:[30,24,55],door:[16,20,30],finish:[20,20,20,20,45],victory:[35,30,55,30,80]};
  navigator.vibrate(patterns[type]||8);
}
export function dadaSpeak(text,enabled=false){
  if(!enabled||!globalThis.speechSynthesis||!text)return;
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(String(text).slice(0,110));
  utterance.lang='fr-FR';utterance.rate=.96;utterance.pitch=.88;utterance.volume=.72;
  speechSynthesis.speak(utterance);
}
export function closeDadaAudio(){try{ctx?.close();}catch{}ctx=null;}
