export function cityNews(data={}){
 const life=data.life||{},city=data.city||{},campaign=data.campaign||{};
 const news=[];
 const active=(life.events||[]).find(e=>['active','ready'].includes(e.status));
 if(active)news.push({id:'event:'+active.code,title:active.status==='ready'?'Le dossier est résolu':active.title,text:active.status==='ready'?'Les engagements ont été tenus. La récompense du maire est disponible.':`${active.heldCycles||0}/${active.cycles} cycles maintenus. ${active.description}`,tab:'life'});
 const weak=(life.needs||[]).filter(n=>n.demand>0&&n.score<70).sort((a,b)=>a.score-b.score)[0];
 if(weak)news.push({id:'need:'+weak.code,title:`Les habitants demandent : ${weak.label}`,text:`${weak.score}% du besoin est couvert. Il faut ${weak.demand} places de service ; ${weak.capacity} sont disponibles.`,tab:'life'});
 if(life.workingPopulation>life.employed)news.push({id:'jobs',title:'L’emploi au conseil municipal',text:`${life.workingPopulation-life.employed} actifs cherchent un poste. Les commerces et services peuvent les accueillir.`,tab:'life'});
 if(life.placedBuildings>life.connectedBuildings)news.push({id:'routes',title:'Des lieux à relier',text:`${life.placedBuildings-life.connectedBuildings} bâtiments terminés attendent une route à proximité.`,tab:'life'});
 const ready=(campaign.missions||[]).filter(m=>m.status==='ready');
 if(ready.length)news.push({id:'rewards',title:'Les habitants ont validé vos objectifs',text:`${ready.length} récompense(s) de campagne vous attendent.`,tab:'missions'});
 const history=life.history||[];if(history.length>1){const delta=history.at(-1).population-history.at(-2).population;news.push({id:'census',title:`Recensement · cycle ${life.day}`,text:delta>0?`${delta} nouveaux habitants ont rejoint la ville.`:delta<0?`${-delta} habitants en moins : vérifiez les logements disponibles.`:'La population reste stable sur le dernier cycle.',tab:'life'});}
 if(!news.length)news.push({id:'mayor',title:'La ville prépare la suite',text:`Maire, votre ville est au niveau ${city.city_level||1}. Les dossiers et les demandes des habitants vous attendent.`,tab:'missions'});
 return news.slice(0,6);
}
export const CITY_MAYOR_MILESTONES=[15,20,25,30,40,45,55,60,70,80,90,100];
export function nextMayorMilestone(level){const next=CITY_MAYOR_MILESTONES.find(n=>n>Number(level||1));return next?{level:next,text:`Niveau ${next} · nouveau dossier du maire`}:{level:100,text:'Tous les dossiers du maire sont débloqués par niveau'};}
