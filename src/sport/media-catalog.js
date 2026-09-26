const YOUTUBE_NOCOOKIE='https://www.youtube-nocookie.com/embed/';

function youtubeEmbed(videoId,{playlist=[],autoplay=false,muted=false,loop=false}={}){
 const params=new URLSearchParams({
  rel:'0',
  playsinline:'1',
  modestbranding:'1'
 });
 if(autoplay)params.set('autoplay','1');
 if(muted)params.set('mute','1');
 if(loop)params.set('loop','1');
 if(playlist.length)params.set('playlist',playlist.join(','));
 return YOUTUBE_NOCOOKIE+videoId+'?'+params.toString();
}

export const H24_CHANNELS=[
 {
  id:'h24-multisport',
  sport:'Multisports',
  badge:'H24',
  title:'3B Sport H24',
  description:'Flux continu 3B de matchs complets issus de chaînes sportives officielles. La lecture reste dans l’application.',
  provider:'FIFA · World Rugby · FIBA',
  embedUrl:youtubeEmbed('GF-WteOINCc',{playlist:['nELaL14ms7A','V0UKtnwL7Ss','CvG69FVRsUs','lsZDzZbO_aY','Sc8jX2B0olE'],autoplay:true,muted:true,loop:true})
 },
 {
  id:'h24-foot',
  sport:'Football',
  badge:'H24',
  title:'Football H24',
  description:'Rotation continue de finales et matchs complets FIFA officiels.',
  provider:'FIFA',
  embedUrl:youtubeEmbed('GF-WteOINCc',{playlist:['nELaL14ms7A'],autoplay:true,muted:true,loop:true})
 },
 {
  id:'h24-rugby',
  sport:'Rugby',
  badge:'H24',
  title:'Rugby H24',
  description:'Rotation continue de finales de Coupe du monde publiées par World Rugby.',
  provider:'World Rugby',
  embedUrl:youtubeEmbed('V0UKtnwL7Ss',{playlist:['CvG69FVRsUs'],autoplay:true,muted:true,loop:true})
 },
 {
  id:'h24-basket',
  sport:'Basket',
  badge:'H24',
  title:'Basket H24',
  description:'Rotation continue de finales complètes publiées par FIBA Basketball.',
  provider:'FIBA Basketball',
  embedUrl:youtubeEmbed('lsZDzZbO_aY',{playlist:['Sc8jX2B0olE'],autoplay:true,muted:true,loop:true})
 }
];

export const SPORT_FINALS=[
 {
  id:'final-foot-2018',
  sport:'Football',
  year:'2018',
  title:'France · Croatie',
  subtitle:'Finale Coupe du monde 2018 · match complet',
  provider:'FIFA',
  embedUrl:youtubeEmbed('GF-WteOINCc')
 },
 {
  id:'final-foot-2006',
  sport:'Football',
  year:'2006',
  title:'Italie · France',
  subtitle:'Finale Coupe du monde 2006 · match complet',
  provider:'FIFA',
  embedUrl:youtubeEmbed('nELaL14ms7A')
 },
 {
  id:'final-rugby-2023',
  sport:'Rugby',
  year:'2023',
  title:'Nouvelle-Zélande · Afrique du Sud',
  subtitle:'Finale Coupe du monde de rugby 2023 · match complet',
  provider:'World Rugby',
  embedUrl:youtubeEmbed('V0UKtnwL7Ss')
 },
 {
  id:'final-rugby-2019',
  sport:'Rugby',
  year:'2019',
  title:'Angleterre · Afrique du Sud',
  subtitle:'Finale Coupe du monde de rugby 2019 · match complet',
  provider:'World Rugby',
  embedUrl:youtubeEmbed('CvG69FVRsUs')
 },
 {
  id:'final-basket-u17-2026',
  sport:'Basket',
  year:'2026',
  title:'USA · Serbie',
  subtitle:'Finale Coupe du monde U17 2026 · match complet',
  provider:'FIBA Basketball',
  embedUrl:youtubeEmbed('lsZDzZbO_aY')
 },
 {
  id:'final-basket-u17w-2026',
  sport:'Basket',
  year:'2026',
  title:'USA · Espagne',
  subtitle:'Finale Coupe du monde U17 féminine 2026 · match complet',
  provider:'FIBA Basketball',
  embedUrl:youtubeEmbed('Sc8jX2B0olE')
 }
];

export function isTrustedSportEmbed(value){
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&url.hostname==='www.youtube-nocookie.com'&&url.pathname.startsWith('/embed/');
 }catch{
  return false;
 }
}
