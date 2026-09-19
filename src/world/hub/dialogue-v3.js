export const HUB_DIALOGUE_CHOICES={
 justice:[
  {id:'ecouter',label:'Écouter avant de juger',value:'Justice'},
  {id:'agir',label:'Agir tout de suite',value:'Courage'},
  {id:'relier',label:'Chercher ce qui relie les versions',value:'Sagesse'},
 ],
 memory:[
  {id:'respect',label:'Préserver le souvenir tel qu’il est',value:'Loyauté'},
  {id:'adapter',label:'L’adapter pour qu’il parle au présent',value:'Espoir'},
 ],
};

export function hubDialogueScene(npc,{hour=12,missionState={},talks=0,afterCombat=null}={}){
 const active=(npc.missionIds||[]).find(id=>missionState[id]?.status==='active');
 const completed=(npc.missionIds||[]).find(id=>missionState[id]?.status==='completed');
 if(afterCombat==='victory')return {id:'after-victory',text:'Tu es revenu debout. Maintenant, comprends ce que cette victoire change autour de toi.',choices:null};
 if(afterCombat==='defeat')return {id:'after-defeat',text:'Perdre un combat ne dit pas qui tu es. Ce que tu fais ensuite, oui.',choices:null};
 if(active)return {id:'mission-active',text:`Ta mission ${active} avance. Raconte-moi ce que tu as réellement vu, pas ce que tu espérais voir.`,choices:talks%3===0?HUB_DIALOGUE_CHOICES.justice:null};
 if(completed)return {id:'mission-complete',text:'Tu as terminé ce que tu avais commencé. La Cité gardera une trace de ce choix.',choices:null};
 if(hour>=20||hour<6)return {id:'night',text:'La ville est différente la nuit. Les mêmes lieux disent autre chose quand le bruit tombe.',choices:null};
 if(talks>=3)return {id:'familiar',text:'Je te reconnais maintenant. On peut aller au-delà des présentations.',choices:HUB_DIALOGUE_CHOICES.memory};
 return {id:'first',text:`${npc.name} · ${npc.role}. Ici, chaque quartier a une mémoire et chaque mémoire a un prix.`,choices:null};
}
