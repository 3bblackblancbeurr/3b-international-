const waves=new WeakMap();
const instruments={
 strings:{harmonics:[1,.32,.18,.11,.08,.04,.03,.02],attack:.11,filter:2300,type:'triangle'},
 lowstring:{harmonics:[1,.35,.15,.06,.035,.02],attack:.04,filter:900,type:'triangle'},
 pluck:{harmonics:[1,.49,.23,.11,.06,.025,.012],attack:.005,filter:3200,type:'triangle'},
 reed:{harmonics:[1,.14,.30,.075,.12,.04,.05],attack:.055,filter:1950,type:'triangle'},
 bell:{harmonics:[1,.055,.14,.025,.055,.012],attack:.004,filter:5200,type:'sine'},
};
/** A single oscillator per musical voice. Shared harmonic waves avoid sample
 * downloads; the caller tracks every node and can stop scheduled tails on mute. */
export function createScoreVoice(ctx,bus,note,{start=ctx.currentTime,duration=.8}={}){
 const profile=instruments[note.instrument]||instruments.strings,source=ctx.createOscillator(),volume=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createStereoPanner?.(),gain=Math.max(.0001,Math.min(.08,note.gain||.02));
 source.type=profile.type;source.frequency.setValueAtTime(Math.max(30,Math.min(8000,note.frequency)),start);
 if(ctx.createPeriodicWave&&source.setPeriodicWave){
  let cache=waves.get(ctx);if(!cache){cache=new Map();waves.set(ctx,cache);}if(!cache.has(note.instrument)){const real=new Float32Array(profile.harmonics.length+1),imag=new Float32Array(real.length);imag.set(profile.harmonics,1);cache.set(note.instrument,ctx.createPeriodicWave(real,imag));}source.setPeriodicWave(cache.get(note.instrument));
 }
 duration=Math.max(.06,Math.min(6,duration));const attack=Math.min(profile.attack,duration*.24),end=start+duration;
 volume.gain.setValueAtTime(.0001,start);volume.gain.exponentialRampToValueAtTime(gain,start+attack);volume.gain.exponentialRampToValueAtTime(gain*.54,start+duration*.48);volume.gain.exponentialRampToValueAtTime(.0001,end);
 filter.type='lowpass';filter.frequency.value=profile.filter;filter.Q.value=.55;source.connect(filter).connect(volume);
 if(pan){pan.pan.value=Math.max(-.5,Math.min(.5,note.pan||0));volume.connect(pan).connect(bus);}else volume.connect(bus);
 source.start(start);source.stop(end+.025);return {source,volume,nodes:[source,filter,volume,...(pan?[pan]:[])],end};
}
