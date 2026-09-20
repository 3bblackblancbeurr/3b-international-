/** Pure selectors for presentation. These events never grant rewards, XP, unlocks or combat results. */
export function worldCinematicEvents(previous,next,action){
 if(!previous||!next||!action?.type)return[];
 const before=previous.adventure||{},after=next.adventure||{},seen=new Set(after.cinematicSeen||[]);
 const oldFight=before.encounter,fight=after.encounter,region=next.region||'hub',events=[];
 const add=(kind,key,context={},priority=20)=>{if(typeof key==='string'&&key.length<=96&&!seen.has(key))events.push({kind,key,region:context.region||region,context,priority});};
 const important=encounter=>!!encounter&&(encounter.final||(encounter.boss&&!encounter.patrol));

 if(action.type==='visit'&&region!=='hub'&&previous.region!==region&&!(previous.visited||[]).includes(region)&&(next.visited||[]).includes(region)){
  add('country-first-entry',`country:${region}`,{region},80);
 }

 const oldChapter=before.chapters?.[region]||{},chapter=after.chapters?.[region]||{};
 if(action.type==='help'&&!oldChapter.helped&&chapter.helped)add('story-alliance',`alliance:${region}`,{region},40);

 if(action.type==='power'&&(chapter.powers?.length||0)>(oldChapter.powers?.length||0)){
  const power=chapter.powers.at(-1);
  add('story-power',`power:${region}:${power}`,{region,power},35);
 }

 if(['solve','restore'].includes(action.type)&&(chapter.restored||0)>(oldChapter.restored||0)){
  add('story-restoration',`restore:${region}:${chapter.restored}`,{region,stage:chapter.restored,choice:chapter.choice||null},60);
 }

 if(['encounter','final'].includes(action.type)&&important(fight)&&(!oldFight||oldFight.result)&&!fight.result){
  const fightRegion=fight.region||region;
  add(fight.final?'final-combat-intro':'guardian-intro',`intro:${fightRegion}:${fight.card}:${fight.expert?'expert':'adventure'}`,{region:fightRegion,card:fight.card,final:!!fight.final,expert:!!fight.expert},100);
 }

 if(['field','battle'].includes(action.type)&&important(oldFight)&&!oldFight.result&&['victory','defeat'].includes(fight?.result)){
  const fightRegion=fight.region||region;
  add('important-combat-result',`result:${fightRegion}:${fight.card}:${fight.result}`,{region:fightRegion,card:fight.card,result:fight.result,final:!!fight.final},95);
  if(!before.finished&&after.finished)add('story-finale','story:circle-restored',{region:fightRegion},90);
 }

 if(action.type==='pactChoice'&&fight?.result==='recruited'&&oldFight?.result!=='recruited'&&!previous.collection?.[fight.card]&&next.collection?.[fight.card]){
  add('companion-first-bond',`bond:${fight.card}`,{region:fight.region||region,card:fight.card},45);
 }

 if(action.type==='survey'){
  const id=`${region}:${action.id}`;
  if(!(before.discoveries||[]).includes(id)&&(after.discoveries||[]).includes(id))add('discovery',`discovery:${id}`,{region,place:action.id},20);
 }

 return events.sort((a,b)=>b.priority-a.priority);
}
