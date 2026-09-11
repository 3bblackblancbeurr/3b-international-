// Short synthesized cues: no downloads, autoplay, or permanent background loop.
export function createGameAudio() {
  let context, enabled=false, last=0;
  const tones={collect:[660,990],hit:[180,110],damage:[120,55],dash:[340,780],perfect:[660,880,1320],guard:[300,450],build:[390,520,780],door:[220,330],night:[180,135],pulse:[260,900],secret:[440,660,880],upgrade:[440,660,880],victory:[523,659,784,1047],undo:[330,220]};
  return {
    set(value){enabled=value;if(enabled&&!context)try{context=new(window.AudioContext||window.webkitAudioContext)();}catch{}if(enabled)context?.resume().catch(()=>{});},
    note(type='collect'){
      if(!enabled||!context||context.state!=='running'||context.currentTime-last<.055)return;
      last=context.currentTime;
      (tones[type]||tones.collect).forEach((frequency,i)=>{
        const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+i*.055;
        oscillator.type=['hit','damage'].includes(type)?'triangle':'sine';
        oscillator.frequency.setValueAtTime(frequency,at);
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.045,at+.009);gain.gain.exponentialRampToValueAtTime(.0001,at+.2);
        oscillator.connect(gain);gain.connect(context.destination);oscillator.start(at);oscillator.stop(at+.22);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      });
    },
    close(){enabled=false;context?.close().catch(()=>{});},
  };
}
