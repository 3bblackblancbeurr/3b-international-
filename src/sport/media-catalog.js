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
 fifa1998a:{id:'fifa-1998-bra-fr-a',label:'Brésil · France 1998',videoId:'Pbyn08kfhXY',provider:'FIFA'},
 fifa1998b:{id:'fifa-1998-bra-fr-b',label:'Brésil · France 1998 · archive FIFA',videoId:'8R7ojiXL2VA',provider:'FIFA'},
 fifa2018:{id:'fifa-2018-fr-cro',label:'France · Croatie 2018',videoId:'GF-WteOINCc',provider:'FIFA'},
 fifa2006:{id:'fifa-2006-it-fr',label:'Italie · France 2006',videoId:'nELaL14ms7A',provider:'FIFA'},
 rugby2023:{id:'rugby-2023-nz-rsa',label:'Nouvelle-Zélande · Afrique du Sud 2023',videoId:'V0UKtnwL7Ss',provider:'World Rugby'},
 rugby2019:{id:'rugby-2019-eng-rsa',label:'Angleterre · Afrique du Sud 2019',videoId:'CvG69FVRsUs',provider:'World Rugby'},
 fibaU17:{id:'fiba-u17-2026-usa-srb',label:'USA · Serbie U17 2026',videoId:'lsZDzZbO_aY',provider:'FIBA Basketball'},
 fibaU17W:{id:'fiba-u17w-2026-usa-esp',label:'USA · Espagne U17F 2026',videoId:'Sc8jX2B0olE',provider:'FIBA Basketball'}
};

export const H24_CHANNELS=[
 media({
  id:'h24-auto',liveProfile:'h24-auto',sport:'Tous sports',badge:'H24',title:'Direct 3B Auto',
  description:'Uniquement du direct réel : football France en priorité, puis Europe, puis autres sports et monde.',
  provider:'Live 3B vérifié',sources:[]
 }),
 media({
  id:'h24-foot',liveProfile:'h24-foot',sport:'Football',badge:'H24',title:'Football en direct',
  description:'Match de football réellement en cours, France d’abord, puis Europe, puis monde.',
  provider:'Live 3B vérifié',sources:[]
 }),
 media({
  id:'h24-basket',liveProfile:'h24-basket',sport:'Basket',badge:'H24',title:'Basket en direct',
  description:'Match de basket réellement en cours, avec bascule automatique vers une autre source live.',
  provider:'Live 3B vérifié',sources:[]
 }),
 media({
  id:'h24-rugby',liveProfile:'h24-rugby',sport:'Rugby',badge:'H24',title:'Rugby en direct',
  description:'Match de rugby réellement en cours, sans replay et sans sortie de 3B.',
  provider:'Live 3B vérifié',sources:[]
 }),
 media({
  id:'h24-tennis',liveProfile:'h24-tennis',sport:'Tennis',badge:'H24',title:'Tennis en direct',
  description:'Match de tennis réellement en cours, avec vérification live côté serveur.',
  provider:'Live 3B vérifié',sources:[]
 }),
 media({
  id:'h24-world',liveProfile:'h24-world',sport:'Monde',badge:'H24',title:'Secours monde',
  description:'Dernier filet de sécurité : n’importe quel sport, pays ou langue, mais toujours du direct réel.',
  provider:'Live 3B vérifié',sources:[]
 })
];

export const SPORT_FINALS=[
 media({
  id:'final-foot-1998',sport:'Football',year:'1998',title:'Brésil · France',
  subtitle:'Finale Coupe du monde 1998 · match complet',provider:'FIFA',
  sources:[
   source('fifa-1998-full-new','Match complet FIFA',FULL.fifa1998a.videoId,{provider:'FIFA',mode:'full'}),
   source('fifa-1998-full-archive','Archive complète FIFA de secours',FULL.fifa1998b.videoId,{provider:'FIFA',mode:'full'})
  ]
 }),
 media({
  id:'final-foot-2010',sport:'Football',year:'2010',title:'Pays-Bas · Espagne',
  subtitle:'Finale Coupe du monde 2010 · match complet',provider:'FIFA',
  sources:[
   source('fifa-2010-full','Match complet FIFA','7fOG8j_ncWY',{provider:'FIFA',mode:'full'})
  ]
 }),
 media({
  id:'final-foot-1986',sport:'Football',year:'1986',title:'Argentine · Allemagne de l’Ouest',
  subtitle:'Finale Coupe du monde 1986 · match complet',provider:'FIFA',
  sources:[
   source('fifa-1986-full','Match complet FIFA','zXVMBHmw-60',{provider:'FIFA',mode:'full'})
  ]
 }),
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
  sources:[
   source('fiba-u17-full','Match complet',FULL.fibaU17.videoId,{provider:'FIBA Basketball',mode:'full'}),
   source('fiba-u17-highlights','Highlights officiels de secours','8Nyj6BmqA5M',{provider:'FIBA Basketball',mode:'fallback'})
  ]
 }),
 media({
  id:'final-basket-u17w-2026',sport:'Basket',year:'2026',title:'USA · Espagne',
  subtitle:'Finale Coupe du monde U17 féminine 2026 · match complet',provider:'FIBA Basketball',
  sources:[
   source('fiba-u17w-full','Match complet',FULL.fibaU17W.videoId,{provider:'FIBA Basketball',mode:'full'}),
   source('fiba-u17w-highlights','Highlights officiels de secours','8LxnM5GiWwA',{provider:'FIBA Basketball',mode:'fallback'})
  ]
 }),
 media({
  id:'final-basket-olympics-2024',sport:'Basket',year:'2024',title:'USA · France',
  subtitle:'Finale olympique hommes Paris 2024 · replay complet',provider:'Olympic Games',
  sources:[
   source('olympics-basket-2024-full','Replay complet officiel','uJs693eNfuQ',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-volley-olympics-2024',sport:'Volley',year:'2024',title:'USA · Italie',
  subtitle:'Finale olympique femmes Paris 2024 · replay complet',provider:'Olympic Games',
  sources:[
   source('olympics-volley-2024-full','Replay complet officiel','0ErDRrg9tM8',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-badminton-olympics-2016',sport:'Badminton',year:'2016',title:'Chen Long · Lee Chong Wei',
  subtitle:'Finale olympique simple hommes Rio 2016 · match complet',provider:'Olympic Games',
  sources:[
   source('olympics-badminton-2016-full','Replay complet officiel','ceJuAyf6Gng',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-badminton-mixed-olympics-2016',sport:'Badminton',year:'2016',title:'Finale double mixte',
  subtitle:'Finale olympique double mixte Rio 2016 · replay officiel',provider:'Olympic Games',
  sources:[
   source('olympics-badminton-mixed-2016-full','Replay officiel','EcENXl4bU4s',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-beach-volley-men-olympics-2016',sport:'Beach-volley',year:'2016',title:'Brésil · Italie',
  subtitle:'Finale olympique hommes Rio 2016 · replay complet',provider:'Olympic Games',
  sources:[
   source('olympics-beach-volley-men-2016-full','Replay complet officiel','k4ux0jau_ws',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-beach-volley-women-olympics-2016',sport:'Beach-volley',year:'2016',title:'Finale olympique femmes',
  subtitle:'Finale olympique femmes Rio 2016 · replay complet',provider:'Olympic Games',
  sources:[
   source('olympics-beach-volley-women-2016-full','Replay complet officiel','-6TVvxs5sow',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-table-tennis-olympics-2016',sport:'Tennis de table',year:'2016',title:'Ma Long · Zhang Jike',
  subtitle:'Finale olympique simple hommes Rio 2016 · match complet',provider:'Olympic Games',
  sources:[
   source('olympics-table-tennis-2016-full','Replay complet officiel','F5H-Eq_Kcxw',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-archery-olympics-2016',sport:'Tir à l’arc',year:'2016',title:'Finale individuelle hommes',
  subtitle:'Finale olympique Rio 2016 · replay officiel',provider:'Olympic Games',
  sources:[
   source('olympics-archery-2016-full','Replay officiel','rzj4FFi7wt8',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-ice-hockey-olympics-2002',sport:'Hockey sur glace',year:'2002',title:'Canada · USA',
  subtitle:'Finale olympique hommes Salt Lake City 2002 · replay officiel',provider:'Olympic Games',
  sources:[
   source('olympics-ice-hockey-2002-full','Replay officiel','g2QdHGLGBVA',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-basket-tokyo-2020',sport:'Basket',year:'2020',title:'France · USA',
  subtitle:'Finale olympique hommes Tokyo 2020 · match complet',provider:'Olympic Games',
  sources:[
   source('olympics-basket-tokyo-2020-full','Replay complet officiel','8YSrNfcKvA0',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-volley-rio-men-2016',sport:'Volley',year:'2016',title:'Italie · Brésil',
  subtitle:'Finale olympique hommes Rio 2016 · match complet',provider:'Olympic Games',
  sources:[
   source('olympics-volley-rio-men-2016-full','Replay complet officiel','KLIa2UaE2KE',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-badminton-women-tokyo-2020',sport:'Badminton',year:'2020',title:'Chen Yufei · Tai Tzu-ying',
  subtitle:'Finale olympique simple femmes Tokyo 2020 · match complet',provider:'Olympic Games',
  sources:[
   source('olympics-badminton-women-tokyo-2020-full','Replay complet officiel','_O_7FAcc7fE',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-badminton-men-tokyo-2020',sport:'Badminton',year:'2020',title:'Viktor Axelsen · Chen Long',
  subtitle:'Finale olympique simple hommes Tokyo 2020 · match complet',provider:'Olympic Games',
  sources:[
   source('olympics-badminton-men-tokyo-2020-full','Replay complet officiel','uIj03RsGrJA',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-wrestling-greco-tokyo-2020',sport:'Lutte',year:'2020',title:'Mijaín López · Iakobi Kajaia',
  subtitle:'Finale olympique gréco-romaine 130 kg Tokyo 2020 · replay officiel',provider:'Olympic Games',
  sources:[
   source('olympics-wrestling-greco-tokyo-2020-full','Replay officiel','IRHxI5EJ0u4',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-field-hockey-women-tokyo-2020',sport:'Hockey sur gazon',year:'2020',title:'Pays-Bas · Argentine',
  subtitle:'Finale olympique femmes Tokyo 2020 · replay complet',provider:'Olympic Games',
  sources:[
   source('olympics-field-hockey-women-tokyo-2020-full','Replay complet officiel','3mZ2-aEDAzc',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-athletics-long-jump-rio-2016',sport:'Athlétisme',year:'2016',title:'Saut en longueur hommes',
  subtitle:'Finale olympique Rio 2016 · replay officiel',provider:'Olympic Games',
  sources:[
   source('olympics-athletics-long-jump-rio-2016-full','Replay officiel','fXIbLmlUdOQ',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-athletics-triple-jump-rio-2016',sport:'Athlétisme',year:'2016',title:'Triple saut hommes',
  subtitle:'Finale olympique Rio 2016 · replay officiel',provider:'Olympic Games',
  sources:[
   source('olympics-athletics-triple-jump-rio-2016-full','Replay officiel','Rmb48a2t008',{provider:'Olympic Games',mode:'full'})
  ]
 }),
 media({
  id:'final-judo-100-rio-2016',sport:'Judo',year:'2016',title:'Teddy Riner · Hisayoshi Harasawa',
  subtitle:'Finale olympique +100 kg hommes Rio 2016 · replay officiel',provider:'Olympic Games',
  sources:[
   source('olympics-judo-100-rio-2016-full','Replay officiel','w84H1S2SPgw',{provider:'Olympic Games',mode:'full'})
  ]
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
