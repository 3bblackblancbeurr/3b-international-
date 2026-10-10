// Short lines appear at the active objective, with no new interruption, reward
// or invented choice. Completed effects come from the canonical quest ledger.
export function journeyPresence(campaign,distance=Infinity){
 if(!campaign||campaign.finished)return null;
 if(distance<=14)return{speaker:/Léa|témoin|Amel|Yanis/.test(campaign.name)?campaign.name.split(' · ')[0]:'Kaïs',text:campaign.dialogue,near:true};
 if(campaign.phaseId==='homecoming')return{speaker:'Kaïs',text:'Ce fragment porte ce que nous avons traversé ensemble. Ramenons-le à la Cité.'};
 const effects=campaign.effects||[];
 if(campaign.region==='france'){
  if(campaign.phaseId==='post')return{speaker:'Kaïs',text:'Le registre porte encore une correction. Allons écouter celui qu’elle concerne.'};
  if(campaign.phaseId==='guardian')return{speaker:'Kaïs',text:'Céliane ne cédera pas à des coups aveugles. Je dois lire sa garde et trouver une vraie ouverture.'};
  if(effects.includes('dossier_resolu'))return{speaker:'Kaïs',text:'Le nom est revenu. L’erreur reste écrite : c’est ainsi qu’on peut la réparer.'};
  if(effects.includes('noms_retablis'))return{speaker:'Kaïs',text:'Léa retrouve sa page. Je dois encore comprendre ce que Céliane protège.'};
  if(effects.includes('archives_ouvertes'))return{speaker:'Kaïs',text:'La date et la couture concordent. Maintenant, rendons cette histoire à sa propriétaire.'};
  return{speaker:'Kaïs',text:'Un nom effacé laisse quelqu’un derrière lui. Je dois écouter avant de juger.'};
 }
 return{speaker:'Kaïs',text:campaign.phaseId==='homecoming'?'Ce fragment porte ce que nous avons traversé ensemble. Ramenons-le à la Cité.':campaign.dialogue};
}

export function campaignPerson(item){
 const lea=item.region==='france'&&/relieuse|atelier|reparer/.test(item.id);
 return{body:lea?'femme':'homme',style:lea?'mystique':'voyageur',color:lea?2:0,skin:2,hair:lea?4:1};
}
