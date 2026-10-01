import {blankSave} from '../../src/world/rules.js';
import {applyWorldAction} from '../../src/world/engine.js';
import {GUARDIAN_VALUES} from '../../src/world/guardian-values.js';

export const REAL_PUZZLE_INPUTS=Object.freeze({
 france:[0,1,2,3],italie:[0,3,4,7,8],estonie:[2],turquie:[0,0,1,1,2,2],
 algerie:[0,0,1,3,3,3],tunisie:[0,0,1,2,2,2],maroc:[0,1,1,2,2,2],espagne:[0,1,2,2],
});

export function prepareRealGuardian(region,input=blankSave()){
 let save=input;const commands=[];
 const act=command=>{commands.push(command);save=applyWorldAction(save,command);};
 if(save.region!=='hub'&&save.region!==region)act({type:'visit',region:'hub'});
 act({type:'visit',region});act({type:'help'});
 for(const power of ['ally','ambiance','terrain'])act({type:'power',power});
 for(const index of REAL_PUZZLE_INPUTS[region])act({type:'puzzleStep',index});
 act({type:'solve'});
 for(let i=0;i<3;i++)act({type:'beacon',id:region+':'+i});
 act({type:'restore',choice:'garden'});
 for(const [choiceId] of GUARDIAN_VALUES[region].choices)act({type:'guardianValueChoice',choiceId});
 act({type:'encounter',id:region+':guardian'});act({type:'fieldStart'});
 return {save,commands};
}

// Reads actual wind-up/recovery windows. Only legal movement/buttons are sent;
// never HP, damage, a winning result or a forged seal.
export function realCombatInput(encounter){
 const f=encounter.field,dx=f.enemy.x-f.p.x,dz=f.enemy.z-f.p.z,d=Math.hypot(dx,dz)||1;
 let x=d>6?dx/d:0,z=d>6?dz/d:0,kind;
 if(f.phase==='windup'&&f.windup<=500&&!f.cooldown&&f.guard<=200){
  if(encounter.region==='tunisie'){kind='dodge';x=dx/d;z=dz/d;}else kind='guard';
 }else if(f.phase==='recovery'&&!f.cooldown)kind=encounter.focus>=2?'power':'strike';
 return {type:'field',x,z,...(kind?{kind}:{})};
}

export function playRealGuardian(input,{limit=1200,onTick}={}){
 let save=input;const commands=[],observed={guards:0,dodges:0,impacts:0,verifiedHits:0,recoveryHits:0};
 for(let tick=0;tick<limit&&!save.adventure.encounter?.result;tick++){
  const previous=save.adventure.encounter,command=realCombatInput(previous);
  save=applyWorldAction(save,command);commands.push(command);const next=save.adventure.encounter;
  if(next.field.last==='guard')observed.guards++;
  if(next.field.last==='dodge')observed.dodges++;
  if(['enemy','miss'].includes(next.field.last))observed.impacts++;
  if(next.enemy<previous.enemy&&previous.guardianFlag)observed.verifiedHits++;
  if(next.enemy<previous.enemy&&previous.field.phase==='recovery')observed.recoveryHits++;
  onTick?.(save,tick);
 }
 return {save,commands,observed};
}

export function finishRealCountry(region,input=blankSave()){
 const prepared=prepareRealGuardian(region,input),battle=playRealGuardian(prepared.save);
 if(battle.save.adventure.encounter?.result!=='victory')throw Error('Real guardian fixture did not win: '+region);
 let save=applyWorldAction(battle.save,{type:'restore'});
 save=applyWorldAction(save,{type:'visit',region:'hub'});
 return {save,commands:[...prepared.commands,...battle.commands,{type:'restore'},{type:'visit',region:'hub'}],observed:battle.observed};
}
