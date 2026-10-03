import {campaignSummary,CITY_CAMPAIGN_CHAPTERS} from './city3b-campaign.js';
export const CITY_ADVISORS={
 Lina:{name:'Lina',role:'Habitante',initial:'L',color:'#e8b79a'},
 Sami:{name:'Sami',role:'Commerçant',initial:'S',color:'#e7c97d'},
 Nora:{name:'Nora',role:'Mobilité',initial:'N',color:'#8fcbdd'},
 Aïcha:{name:'Aïcha',role:'Services publics',initial:'A',color:'#a8c7a1'},
 Élio:{name:'Élio',role:'Culture',initial:'É',color:'#bcb0de'},
 Inès:{name:'Inès',role:'Urbaniste',initial:'I',color:'#98c8b8'},
 Maël:{name:'Maël',role:'Médiateur',initial:'M',color:'#e8b5c5'},
 Conseil:{name:'Conseil des quartiers',role:'Les huit quartiers',initial:'8',color:'#cfbb81'},
 Jade:{name:'Jade',role:'Journaliste · 3B Actualités',initial:'J',color:'#9abbdc'},
};
export function cityAdvisorBulletin(campaign){
 const summary=campaignSummary(campaign);
 if(!summary.available)return null;
 const mission=summary.active;
 if(!mission)return {id:'campaign-finished',advisor:CITY_ADVISORS.Jade,title:'Le mandat continue',text:`Maire, les ${summary.mainTotal} missions principales sont accomplies. Votre ville peut continuer à grandir.`,progress:`${summary.mainClaimed}/${summary.mainTotal}`,action:null};
 const chapter=CITY_CAMPAIGN_CHAPTERS.find(c=>c.id===mission.chapter);
 const name=chapter?.voice.split(' · ')[0].split(' ')[0];
 const advisor=CITY_ADVISORS[name]||CITY_ADVISORS.Conseil;
 return {id:mission.code+':'+mission.status,advisor,title:mission.title,
  text:mission.status==='ready'?'Maire, les objectifs sont remplis. Votre récompense vous attend dans les missions.':mission.description,
  progress:`${summary.mainClaimed}/${summary.mainTotal}`,action:mission.action,
  objectives:mission.objectives||[],ready:mission.status==='ready'};
}
