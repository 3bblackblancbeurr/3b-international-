export const SKINS=['#f4d5b3','#e8b88d','#c88e62','#a96d48','#805039','#543426'];
export const OUTFITS=['#e6c58b','#73b7d4','#9eb887','#c88b99','#a795d6','#e19559','#344954','#d8d0b6','#9a6068','#496b66','#7c6052','#bca358'];
export const AVATAR_PATHS={lumiere:{name:'Lumière',color:'#efd58f',description:'Soutenir tes liens. +3 soins lors des gardes en aventure.'},tempete:{name:'Tempête',color:'#84cce5',description:'Frapper fort. +3 attaque et −8 vitalité en aventure.'},nature:{name:'Nature',color:'#9aca89',description:'Tenir dans la durée. +14 vitalité en aventure.'},ombre:{name:'Ombre',color:'#b49ddd',description:'Explorer avec agilité. +5 % de vitesse et +1 attaque en aventure.'}};
export const blankAvatar=()=>({height:1,build:1,skinColor:null,fabric:'cotton',patternScale:1,capeLength:1,hoodFit:1,created:false,name:'Voyageur',origin:'3b',nationality:'',path:'lumiere',body:'homme',hair:3,boots:0,hairColor:'#352a24',face:0,jaw:0,nose:0,skin:2,color:0,shape:'equilibre',style:'voyageur',fabricColor:null,accentColor:'#d7bd83',trouserColor:'#77644d',bootColor:'#695239',pattern:'uni',headwear:'none',outer:'none',bag:false,travelGear:'libre'});
export function normalizeAvatar(a){
 const result=blankAvatar();if(!a||typeof a!=='object')return result;
 const clean=(s,max)=>typeof s==='string'?s.normalize('NFC').replace(/[^\p{L}\p{N} '\-]/gu,'').trim().slice(0,max):'';
 const name=clean(a.name,20);result.name=name||'Voyageur';result.created=!!a.created&&!!name;
 result.origin=['3b','france','italie','estonie','turquie','algerie','tunisie','maroc','espagne'].includes(a.origin)?a.origin:'3b';result.nationality=clean(a.nationality,50);
 result.path=AVATAR_PATHS[a.path]?a.path:'lumiere';result.skin=Number.isInteger(a.skin)&&SKINS[a.skin]?a.skin:2;result.color=Number.isInteger(a.color)&&OUTFITS[a.color]?a.color:0;
 result.shape=['equilibre','elance','solide'].includes(a.shape)?a.shape:'equilibre';result.style=['voyageur','sentinelle','mystique'].includes(a.style)?a.style:'voyageur';result.body=a.body==='femme'?'femme':'homme';
 result.hair=Number.isInteger(a.hair)&&a.hair>=0&&a.hair<=6?a.hair:3;result.boots=Number.isInteger(a.boots)&&a.boots>=0&&a.boots<=2?a.boots:0;result.hairColor=/^#[a-f0-9]{6}$/i.test(a.hairColor||'')?a.hairColor:'#352a24';
 for(const key of ['face','jaw','nose'])result[key]=Number.isFinite(a[key])?Math.max(-1,Math.min(1,a[key])):0;
 for(const key of ['fabricColor','accentColor','trouserColor','bootColor'])if(/^#[a-f0-9]{6}$/i.test(a[key]||''))result[key]=a[key];
 for(const [key,values] of Object.entries({pattern:['uni','bandes','damier','insigne','broderie'],headwear:['none','beret','brim','hood'],outer:['none','cape','scarf','apron'],travelGear:['libre','leger','renforce']}))if(values.includes(a[key]))result[key]=a[key];result.bag=a.bag===true;
 for(const [key,min,max] of [['height',.9,1.1],['build',.88,1.15],['patternScale',.5,3],['capeLength',.7,1.25],['hoodFit',.9,1.15]])result[key]=Number.isFinite(a[key])?Math.max(min,Math.min(max,a[key])):1;
 result.skinColor=/^#[a-f0-9]{6}$/i.test(a.skinColor||'')?a.skinColor:null;
 result.fabric=['cotton','linen','satin','leather'].includes(a.fabric)?a.fabric:'cotton';
 return result;
}
