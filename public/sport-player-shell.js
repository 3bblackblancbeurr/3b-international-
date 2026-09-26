(()=>{
'use strict';

const params=new URLSearchParams(location.search);
const video=(params.get('video')||'').trim();
const token=(params.get('token')||'').trim();
const autoplay=params.get('autoplay')==='1';
const muted=params.get('mute')==='1';
const start=Math.max(0,Math.min(86400,Number(params.get('start')||0)||0));
const player=document.getElementById('player');
const invalid=document.getElementById('invalid');
const VIDEO_RE=/^[A-Za-z0-9_-]{11}$/;
const TOKEN_RE=/^[A-Za-z0-9_-]{8,120}$/;
const YT_ORIGINS=new Set(['https://www.youtube-nocookie.com','https://www.youtube.com']);
let lastState=null;
let lastTimeSent=0;

function send(event,payload={}){
 try{
  parent.postMessage({type:'3b-sport-player',token,event,...payload},'*');
 }catch{}
}

function fail(code,message){
 player.style.display='none';
 invalid.style.display='grid';
 invalid.textContent=message||'Source vidéo non valide.';
 send('error',{code});
}

if(!VIDEO_RE.test(video)||!TOKEN_RE.test(token)){
 fail(2,'Source vidéo 3B non valide.');
 return;
}

const url=new URL('https://www.youtube-nocookie.com/embed/'+video);
url.searchParams.set('rel','0');
url.searchParams.set('playsinline','1');
url.searchParams.set('controls','1');
url.searchParams.set('fs','0');
url.searchParams.set('enablejsapi','1');
url.searchParams.set('iv_load_policy','3');
url.searchParams.set('origin',location.origin);
if(autoplay)url.searchParams.set('autoplay','1');
if(muted)url.searchParams.set('mute','1');
if(start>=2)url.searchParams.set('start',String(Math.floor(start)));
player.src=url.toString();

function post(payload){
 try{
  player.contentWindow?.postMessage(JSON.stringify(payload),'https://www.youtube-nocookie.com');
 }catch{}
}

function subscribe(){
 post({event:'listening',id:'3b-sport-shell'});
 for(const name of ['onReady','onStateChange','onError']){
  post({event:'command',func:'addEventListener',args:[name]});
 }
}

function forwardState(value){
 const state=Number(value);
 if(!Number.isFinite(state)||state===lastState)return;
 lastState=state;
 send('state',{state});
}

window.addEventListener('message',event=>{
 if(event.source===player.contentWindow&&YT_ORIGINS.has(event.origin)){
  let data=event.data;
  if(typeof data==='string'){
   try{data=JSON.parse(data);}catch{return;}
  }
  if(!data||typeof data!=='object')return;

  if(data.event==='onReady'){
   send('ready');
   subscribe();
   return;
  }
  if(data.event==='onStateChange'){
   forwardState(data.info);
   return;
  }
  if(data.event==='onError'){
   send('error',{code:Number(data.info)||0});
   return;
  }
  if(data.event==='infoDelivery'&&data.info){
   if('playerState' in data.info)forwardState(data.info.playerState);
   const currentTime=Number(data.info.currentTime);
   const now=Date.now();
   if(Number.isFinite(currentTime)&&now-lastTimeSent>=2000){
    lastTimeSent=now;
    send('time',{currentTime,state:Number(data.info.playerState)});
   }
  }
  return;
 }

 if(event.source!==parent)return;
 const data=event.data;
 if(!data||data.type!=='3b-sport-command'||data.token!==token)return;
 if(data.command==='ping')send('pong');
 if(data.command==='play')post({event:'command',func:'playVideo',args:[]});
 if(data.command==='pause')post({event:'command',func:'pauseVideo',args:[]});
 if(data.command==='seek'){
  const seconds=Math.max(0,Math.min(86400,Number(data.seconds)||0));
  post({event:'command',func:'seekTo',args:[seconds,true]});
 }
});

player.addEventListener('load',()=>{
 send('shell-ready');
 subscribe();
});
setInterval(subscribe,1200);
send('shell-boot');
})();