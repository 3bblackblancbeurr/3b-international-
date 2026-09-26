const YOUTUBE_NOCOOKIE='https://www.youtube-nocookie.com/embed/';
export const SPORT_PLAYER_SHELL_URL='https://3b-international.vercel.app/sport-player-shell.html';

function youtubeEmbed(videoId,{autoplay=false,muted=false}={}){
 const params=new URLSearchParams({
  rel:'0',
  playsinline:'1',
  controls:'1',
  fs:'0',
  enablejsapi:'1',
  iv_load_policy:'3'
 });
 if(autoplay)params.set('autoplay','1');
 if(muted)params.set('mute','1');
 return YOUTUBE_NOCOOKIE+videoId+'?'+params.toString();
}

function source(id,label,videoId,{provider,mode='full',autoplay=false,muted=false}={}){
 return{id,label,videoId,provider,mode,embedUrl:youtubeEmbed(videoId,{autoplay,muted})};
}

function media(entry){
 return{...entry,embedUrl:entry.sources[0]?.embedUrl||''};
}

const FULL={
 fifa2018:{id:'fifa-2018-fr-cro',label:'France · Croatie 2018',videoId:'GF-WteOINCc',provider:'FIFA'},
 fifa2006:{id:'fifa-2006-it-fr',label:'Italie · France 2006',videoId:'nELaL14ms7A',provider:'FIFA'},
 rugby2023:{id:'rugby-2023-nz-rsa',label:'Nouvelle-Zélande · Afrique du Sud 2023',videoId:'V0UKtnwL7Ss',provider:'World Rugby'},
 rugby2019:{id:'rugby-2019-eng-rsa',label:'Angleterre · Afrique du Sud 2019',videoId:'CvG69FVRsUs',provider:'World Rugby'},
 fibaU17:{id:'fiba-u17-2026-usa-srb',label:'USA · Serbie U17 2026',videoId:'lsZDzZbO_aY',provider:'FIBA Basketball'},
 fibaU17W:{id:'fiba-u17w-2026-usa-esp',label:'USA · Espagne U17F 2026',videoId:'Sc8jX2B0olE',provider:'FIBA Basketball'}
};

const h24Source=item=>source(item.id,item.label,item.videoId,{provider:item.provider,autoplay:true,muted:true});

export const H24_CHANNELS=[
 media({
  id:'h24-multisport',sport:'Multisports',badge:'H24',title:'3B Sport H24',
  description:'Rotation automatique de matchs complets officiels. Si une source tombe, 3B bascule sans quitter l’application.',
  provider:'FIFA · World Rugby · FIBA',
  sources:[FULL.fifa2018,FULL.rugby2023,FULL.fibaU17,FULL.fifa2006,FULL.rugby2019,FULL.fibaU17W].map(h24Source)
 }),
 media({
  id:'h24-foot',sport:'Football',badge:'H24',title:'Football H24',
  description:'Finales FIFA complètes en rotation continue avec secours automatique.',
  provider:'FIFA',
  sources:[FULL.fifa2018,FULL.fifa2006].map(h24Source)
 }),
 media({
  id:'h24-rugby',sport:'Rugby',badge:'H24',title:'Rugby H24',
  description:'Finales de Coupe du monde World Rugby en rotation continue avec secours automatique.',
  provider:'World Rugby',
  sources:[FULL.rugby2023,FULL.rugby2019].map(h24Source)
 }),
 media({
  id:'h24-basket',sport:'Basket',badge:'H24',title:'Basket H24',
  description:'Finales FIBA complètes en rotation continue avec secours automatique.',
  provider:'FIBA Basketball',
  sources:[FULL.fibaU17,FULL.fibaU17W].map(h24Source)
 })
];

export const SPORT_FINALS=[
 media({
  id:'final-foot-2018',sport:'Football',year:'2018',title:'France · Croatie',
  subtitle:'Finale Coupe du monde 2018 · match complet',provider:'FIFA',
  sources:[
   source('fifa-2018-full','Match complet',FULL.fifa2018.videoId,{provider:'FIFA',mode:'full'}),
   source('fifa-2018-extended','Résumé officiel de secours','0rtw9uCevMg',{provider:'FIFA',mode:'fallback'})
  ]
 }),
 media({
  id:'final-foot-2006',sport:'Football',year:'2006',title:'Italie · France',
  subtitle:'Finale Coupe du monde 2006 · match complet',provider:'FIFA',
  sources:[
   source('fifa-2006-full','Match complet',FULL.fifa2006.videoId,{provider:'FIFA',mode:'full'}),
   source('fifa-2006-extended','Résumé officiel de secours','cfRkHzhM4vE',{provider:'FIFA',mode:'fallback'})
  ]
 }),
 media({
  id:'final-rugby-2023',sport:'Rugby',year:'2023',title:'Nouvelle-Zélande · Afrique du Sud',
  subtitle:'Finale Coupe du monde de rugby 2023 · match complet',provider:'World Rugby',
  sources:[
   source('rugby-2023-full','Match complet',FULL.rugby2023.videoId,{provider:'World Rugby',mode:'full'}),
   source('rugby-2023-extended','Résumé officiel de secours','FykXCpCuhNM',{provider:'World Rugby',mode:'fallback'})
  ]
 }),
 media({
  id:'final-rugby-2019',sport:'Rugby',year:'2019',title:'Angleterre · Afrique du Sud',
  subtitle:'Finale Coupe du monde de rugby 2019 · match complet',provider:'World Rugby',
  sources:[
   source('rugby-2019-full','Match complet',FULL.rugby2019.videoId,{provider:'World Rugby',mode:'full'}),
   source('rugby-2019-extended','Résumé officiel de secours','Fr26b5D2rj8',{provider:'World Rugby',mode:'fallback'})
  ]
 }),
 media({
  id:'final-basket-u17-2026',sport:'Basket',year:'2026',title:'USA · Serbie',
  subtitle:'Finale Coupe du monde U17 2026 · match complet',provider:'FIBA Basketball',
  sources:[source('fiba-u17-full','Match complet',FULL.fibaU17.videoId,{provider:'FIBA Basketball',mode:'full'})]
 }),
 media({
  id:'final-basket-u17w-2026',sport:'Basket',year:'2026',title:'USA · Espagne',
  subtitle:'Finale Coupe du monde U17 féminine 2026 · match complet',provider:'FIBA Basketball',
  sources:[source('fiba-u17w-full','Match complet',FULL.fibaU17W.videoId,{provider:'FIBA Basketball',mode:'full'})]
 })
];

export function mediaSources(item){
 if(Array.isArray(item?.sources)&&item.sources.length)return item.sources;
 return item?.embedUrl?[{id:item.id+'-legacy',label:'Source principale',provider:item.provider,mode:'full',embedUrl:item.embedUrl,videoId:''}]:[];
}

export function sportPlayerShellUrl(source,{autoplay=false,muted=false,start=0,token=''}={}){
 if(!source?.videoId||!/^[A-Za-z0-9_-]{11}$/.test(source.videoId))return'';
 const url=new URL(SPORT_PLAYER_SHELL_URL);
 url.searchParams.set('video',source.videoId);
 url.searchParams.set('token',token);
 if(autoplay)url.searchParams.set('autoplay','1');
 if(muted)url.searchParams.set('mute','1');
 if(Number(start)>=2)url.searchParams.set('start',String(Math.floor(Number(start))));
 return url.toString();
}

export function isTrustedSportEmbed(value){
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&url.hostname==='www.youtube-nocookie.com'&&url.pathname.startsWith('/embed/')&&url.searchParams.get('enablejsapi')==='1';
 }catch{
  return false;
 }
}

export function isTrustedSportShellOrigin(value){
 try{
  return new URL(value).origin==='https://3b-international.vercel.app';
 }catch{
  return false;
 }
}
