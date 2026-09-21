const COUNTRY_REGION=Object.freeze({
 France:'france',Algérie:'algerie',Maroc:'maroc',Tunisie:'tunisie',Espagne:'espagne',Italie:'italie',Turquie:'turquie',Estonie:'estonie',
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rowsFor=(save,npcId)=>(save?.hub?.stats?.dialogueHistory||[]).filter(row=>row?.npcId===npcId&&row.sceneId==='intent');
const missionRows=(item,save)=>(item?.missionIds||[]).map(id=>[id,save?.hub?.missions?.[id]]).filter(([,row])=>row);

export function npcGuardianRegion(item){return item?.guardianRegion||COUNTRY_REGION[item?.country]||null;}

export function hubNpcMemory(item,save,{hour=12,weather='clear'}={}){
 const npcId=item?.npcId||item?.id||'',history=rowsFor(save,npcId),uniqueIntents=[...new Set(history.map(row=>row.choiceId))],missions=missionRows(item,save);
 const active=missions.filter(([,row])=>row.status==='active').map(([id])=>id),completed=missions.filter(([,row])=>row.status==='completed').map(([id])=>id);
 const directTalks=Math.max(0,Math.floor(Number(save?.hub?.stats?.npcTalks?.[npcId])||0)),region=npcGuardianRegion(item),guardianLiberated=!!region&&save?.seals?.includes(region);
 const familiarityScore=clamp(directTalks*7+history.length*3+uniqueIntents.length*4+completed.length*18+(guardianLiberated?8:0),0,100);
 const familiarity=familiarityScore>=75?'trusted':familiarityScore>=45?'familiar':familiarityScore>=18?'known':'stranger';
 let tension=(active.length?22:0)+(weather==='storm'||weather==='heavy_rain'?24:weather==='rain'?9:0)+(hour>=22||hour<6?8:0)-(completed.length?12:0)-(guardianLiberated?10:0);
 tension=clamp(tension,0,100);
 const mood=tension>=45?'tendu':weather==='storm'||weather==='heavy_rain'?'vigilant':guardianLiberated?'soulagé':familiarity==='trusted'?'confiant':familiarity==='familiar'?'ouvert':'neutre';
 const last=history.at(-1)||null,previous=history.at(-2)||null;
 return Object.freeze({
  npcId,region,guardianLiberated,
  talks:directTalks,conversationTurns:history.length,uniqueIntents:Object.freeze(uniqueIntents),
  lastIntent:last?.choiceId||null,previousIntent:previous?.choiceId||null,
  activeMissions:Object.freeze(active),completedMissions:Object.freeze(completed),
  familiarity,familiarityScore,tension,mood,
 });
}

export function hubNpcMemorySummary(memory){
 if(!memory)return 'Aucune mémoire sociale.';
 const familiar={stranger:'première relation',known:'visage reconnu',familiar:'relation familière',trusted:'confiance établie'}[memory.familiarity]||memory.familiarity;
 const guardian=memory.guardianLiberated?' · Gardien revenu':'';
 return `${familiar} · humeur ${memory.mood} · ${memory.uniqueIntents.length} sujets mémorisés${guardian}`;
}

export function validateNpcMemory(memory){
 if(!memory||!['stranger','known','familiar','trusted'].includes(memory.familiarity))return false;
 if(!Number.isInteger(memory.familiarityScore)||memory.familiarityScore<0||memory.familiarityScore>100)return false;
 if(!Number.isInteger(memory.tension)||memory.tension<0||memory.tension>100)return false;
 return Array.isArray(memory.uniqueIntents)&&Array.isArray(memory.activeMissions)&&Array.isArray(memory.completedMissions);
}
