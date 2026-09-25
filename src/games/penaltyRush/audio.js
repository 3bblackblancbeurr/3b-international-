let ctx=null;
let master=null;
let crowd=null;
let unlocked=false;

function ensure(){
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return null;
  if(!ctx){
    ctx=new AudioCtx();
    master=ctx.createGain();
    master.gain.value=.28;
    master.connect(ctx.destination);
    crowd=ctx.createGain();
    crowd.gain.value=.045;
    crowd.connect(master);
  }
  return ctx;
}

function tone(freq,duration=.12,type='sine',gain=.08,when=0){
  const c=ensure(); if(!c||!master)return;
  const osc=c.createOscillator(),g=c.createGain();
  osc.type=type; osc.frequency.value=freq;
  const t=c.currentTime+when;
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.015);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(g);g.connect(master);osc.start(t);osc.stop(t+duration+.03);
}

function noiseBurst(duration=.16,gain=.05,highpass=800){
  const c=ensure(); if(!c||!master)return;
  const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
  const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();
  src.buffer=buffer;filter.type='highpass';filter.frequency.value=highpass;g.gain.value=gain;
  src.connect(filter);filter.connect(g);g.connect(master);src.start();
}
export async function unlockPenaltyAudio(){
  const c=ensure(); if(!c)return false;
  try{if(c.state==='suspended')await c.resume();unlocked=c.state==='running';return unlocked;}catch{return false;}
}

export function penaltySfx(type,power=.7){
  if(!unlocked||!ctx)return;
  const p=Math.max(.2,Math.min(1,Number(power)||.7));
  if(type==='kick'){tone(105+p*45,.075,'triangle',.09*p);noiseBurst(.055,.025*p,1300);}
  if(type==='goal'){
    tone(392,.16,'sawtooth',.08);tone(523,.22,'triangle',.09,.07);tone(659,.28,'triangle',.075,.15);
    noiseBurst(.5,.055,300);
  }else if(type==='save'){tone(180,.11,'square',.05);tone(128,.16,'triangle',.06,.08);noiseBurst(.18,.04,650);}
  else if(type==='frame'){tone(860,.05,'square',.04);tone(640,.14,'triangle',.035,.03);}
  else if(type==='dive'){noiseBurst(.09,.022,1100);}
}

export function setPenaltyAudioMuted(muted){
  if(master)master.gain.value=muted?0:.28;
}

export function stopPenaltyAudio(){
  if(!ctx)return;
  try{ctx.close();}catch{}
  ctx=null;master=null;crowd=null;unlocked=false;
}
