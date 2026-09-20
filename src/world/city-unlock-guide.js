const COUNTRY_IDS=['france','algerie','espagne','maroc','italie','tunisie','turquie','estonie'];
const COUNTRY_NAMES={france:'France',algerie:'Algérie',espagne:'Espagne',maroc:'Maroc',italie:'Italie',tunisie:'Tunisie',turquie:'Turquie',estonie:'Estonie'};

const list=value=>Array.isArray(value)?value:[];
const chapterFor=(save,region)=>save?.adventure?.chapters?.[region]||{};
const progressScore=(save,region)=>{
 const chapter=chapterFor(save,region);
 return (chapter.solved?100:0)+(list(chapter.powers).length*10)+(chapter.helped?5:0);
};

export function cityUnlockGuide(save){
 const beacons=list(save?.beacons);
 if(beacons.length)return{unlocked:true,step:5,total:5,region:beacons[0].split(':')[0],title:'Ville 3B débloquée',detail:'Un Souvenir est enregistré sur ton compte.',action:'done',target:null};

 const visited=list(save?.visited).filter(id=>COUNTRY_IDS.includes(id));
 const current=COUNTRY_IDS.includes(save?.region)?save.region:null;
 const region=current||[...visited].sort((a,b)=>progressScore(save,b)-progressScore(save,a))[0]||null;

 if(!region)return{unlocked:false,step:1,total:5,region:null,title:'Traverse une porte',detail:'Entre dans n’importe quel pays depuis le Nexus des huit portes.',action:'atlas',target:null};

 const name=COUNTRY_NAMES[region]||region;
 const chapter=chapterFor(save,region);
 const powers=list(chapter.powers);
 const missingBeacon=[0,1,2].find(index=>!beacons.includes(region+':'+index));

 let step,title,detail,action,target;
 if(!chapter.helped){
  step=2;title='Aide l’habitant';detail='Rejoins le point histoire en '+name+' et aide l’habitant pour lancer la reconstruction.';action='story';target=region+':story';
 }else if(powers.length<3){
  step=3;title='Éveille les trois pouvoirs';detail='Au monument, active les pouvoirs dans l’ordre : Allié → Ambiance → Terrain. Progression '+powers.length+'/3.';action='story';target=region+':story';
 }else if(!chapter.solved){
  step=4;title='Résous le monument';detail='Termine l’énigme du monument. Le premier Souvenir reste verrouillé tant que cette étape n’est pas validée.';action='story';target=region+':story';
 }else{
  step=5;title='Éveille le premier Souvenir';detail='Le monument est résolu. Rejoins maintenant un point « Éveiller le souvenir » pour ouvrir l’accès à la Ville 3B.';action='beacon';target=region+':'+(missingBeacon??0);
 }

 if(!current){
  return{unlocked:false,step,total:5,region,title:'Retourne en '+name,detail:'Ta progression est en '+name+'. Traverse sa porte pour reprendre : '+title+'.',action:'travel',target:region,nextTitle:title};
 }
 return{unlocked:false,step,total:5,region,title,detail,action,target};
}

export function cityUnlockGuideStorage(enable=true){
 try{
  if(enable)sessionStorage.setItem('3b_city_unlock_guide','1');
  else sessionStorage.removeItem('3b_city_unlock_guide');
 }catch{}
}

export function cityUnlockGuideRequested(){
 try{return sessionStorage.getItem('3b_city_unlock_guide')==='1';}catch{return false;}
}
