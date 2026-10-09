import {useEffect,useRef,useState} from 'react';

// Original oscillator score: no recording, streaming, microphone or remote audio.
export default function useInvisibleAudio(realm){
 const [enabled,setEnabled]=useState(false),[message,setMessage]=useState('');
 const runtime=useRef(null),active=useRef(false),generation=useRef(0);
 const close=context=>{if(context&&context.state!=='closed')context.close().catch(()=>{});};
 function stop(){generation.current++;active.current=false;const current=runtime.current;runtime.current=null;close(current?.context);setEnabled(false);}
 async function toggle(){
  if(active.current){stop();return;}
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio){setMessage('Le son est indisponible sur cet appareil.');return;}
  const ticket=++generation.current;let context;
  try{
   context=new Audio();const master=context.createGain(),filter=context.createBiquadFilter();
   master.gain.value=.018;filter.type='lowpass';filter.frequency.value=850;filter.connect(master);master.connect(context.destination);
   const notes=[110,164.81,220],voices=notes.map(frequency=>{const tone=context.createOscillator();tone.type='sine';tone.frequency.value=frequency;tone.connect(filter);tone.start();return tone;});
   runtime.current={context,master,voices};active.current=true;await context.resume();
   if(ticket!==generation.current||runtime.current?.context!==context){close(context);return;}
   setEnabled(true);setMessage('Ambiance sonore activée.');
  }catch{close(context);if(ticket===generation.current){stop();setMessage('Le son est indisponible sur cet appareil.');}}
 }
 function chime(kind='echo'){
  const current=runtime.current;if(!active.current||!current||document.hidden||current.context.state!=='running')return;
  const base=kind==='fragment'?392:kind==='portal'?440:329.63;
  [base,base*1.25,base*1.5].forEach((frequency,index)=>{const tone=current.context.createOscillator(),gain=current.context.createGain(),at=current.context.currentTime+index*.1;tone.type='sine';tone.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.04,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+1.25);tone.connect(gain);gain.connect(current.context.destination);tone.start(at);tone.stop(at+1.3);tone.onended=()=>{tone.disconnect();gain.disconnect();};});
 }
 useEffect(()=>{const onHide=()=>{if(document.hidden&&runtime.current){setMessage('Son en pause. Appuie sur le bouton pour le relancer.');stop();}};document.addEventListener('visibilitychange',onHide);return()=>{document.removeEventListener('visibilitychange',onHide);generation.current++;active.current=false;close(runtime.current?.context);runtime.current=null;};},[]);
 useEffect(()=>{const shift={france:1,algerie:.89,maroc:1.06,tunisie:.94,espagne:1.12,italie:1.19,turquie:1.03,estonie:.84}[realm]||1;runtime.current?.voices.forEach((voice,i)=>voice.frequency.setTargetAtTime([110,164.81,220][i]*shift,runtime.current.context.currentTime,.5));},[realm,enabled]);
 return{enabled,message,toggle,chime};
}
