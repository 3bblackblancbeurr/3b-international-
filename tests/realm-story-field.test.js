import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {blankCampaignState} from '../src/world/campaign-state.js';
import {campaignSnapshot} from '../src/world/campaign-runtime.js';
import {CAMPAIGN_RUNTIME_SPEC} from '../src/world/campaign-spec.js';
import {localCampaignInteraction} from '../src/world/france-field-interaction.js';
import {fieldCampaignSnapshot,fieldCampaignPanel,closeFieldCampaignAfterAction,fieldCampaignEvidence} from '../src/world/realm-story-field.js';

const regions=['algerie','maroc','tunisie','espagne','italie','turquie','estonie'];
const arrived=region=>applyWorldAction(blankSave(),{type:'visit',region});
function prepared(region,phaseIndex,step=0,extra={}){
 const save=arrived(region);save.adventure.campaigns[region]={...blankCampaignState(),active:true,completed:CAMPAIGN_RUNTIME_SPEC[region].slice(0,phaseIndex).map(phase=>phase.id),step,...extra};return save;
}
const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/world/FranceFieldInteraction.jsx',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',external:['react','react-dom','react-dom/*'],loader:{'.css':'empty'},logLevel:'silent'});
const module={exports:{}},nativeRequire=createRequire(import.meta.url);
new Function('require','module','exports',compiled.outputFiles[0].text)(name=>name==='react'?{...React,useEffect:()=>{},useRef:()=>({current:null})}:nativeRequire(name),module,module.exports);
const Component=module.exports.FranceFieldInteraction;
function allButtons(element){
 if(!React.isValidElement(element))return[];
 const here=typeof element.props.onClick==='function'?[element]:[];
 return [...here,...React.Children.toArray(element.props.children).flatMap(allButtons)];
}
function contentText(element){
 if(typeof element==='string'||typeof element==='number')return String(element);
 return React.isValidElement(element)?React.Children.toArray(element.props.children).map(contentText).join(' '):'';
}

test('seven canonical campaigns gain local presentation without changing positions, choices, clocks or rewards',()=>{
 for(const region of regions){
  const save=arrived(region),original=JSON.stringify(save),canonical=campaignSnapshot(save),current=fieldCampaignSnapshot(save);
  assert.ok(current.staging?.speaker&&current.staging?.place&&current.staging?.clue,region);
  const {staging,...gameplay}=current;assert.deepEqual(gameplay,canonical);assert.equal(JSON.stringify(save),original);
  assert.equal(fieldCampaignPanel(current,current.target),'local');assert.equal(fieldCampaignPanel(current,{x:current.target.x+20,z:current.target.z}),'dialog');
  const command={type:'campaignAction',region,objective:current.objective,operation:'interact',position:current.target,layoutVersion:2};
  const after=applyWorldAction(save,command);assert.equal(after.adventure.campaigns[region].step,1);assert.equal(closeFieldCampaignAfterAction(current,fieldCampaignSnapshot(after)),true);
  assert.deepEqual(applyWorldAction(after,command),after,'duplicate UI input never duplicates a grant');
 }
});

test('field cards reject stale objectives and invalid or distant points in every realm',()=>{
 for(const region of regions){
  const current=fieldCampaignSnapshot(arrived(region)),point=current.target;
  assert.ok(localCampaignInteraction(current,point,current.objective));
  for(const position of [{x:point.x+6.1,z:point.z},{x:NaN,z:point.z},null])assert.equal(localCampaignInteraction(current,position,current.objective),null);
  assert.equal(localCampaignInteraction(current,point,'old-objective'),null);
  assert.equal(localCampaignInteraction({...current,finished:true},point,current.objective),null);
 }
});

test('starting active trials or escort returns to their running HUD while the first relay retains its directions',()=>{
 for(const [region,phase] of [['algerie',1],['tunisie',1],['espagne',2],['italie',2]]){
  const save=prepared(region,phase,region==='italie'?1:0,{inventory:{plan_nouveau:1,semences:1,corde:1}}),before=fieldCampaignSnapshot(save);
  const next=applyWorldAction(save,{type:'campaignAction',region,objective:before.objective,position:before.target,operation:'interact',layoutVersion:2}),after=fieldCampaignSnapshot(next);
  assert.equal(after.started,true);assert.equal(closeFieldCampaignAfterAction(before,after),true,region+' active trial closes reading card');
 }
 const before={objective:'relay',mode:'relay',started:false},after={...before,started:true};assert.equal(closeFieldCampaignAfterAction(before,after),false);
 assert.equal(closeFieldCampaignAfterAction(after,{...after,clock:4}),false);assert.equal(closeFieldCampaignAfterAction(after,{...after,objective:'next'}),true);
});

test('real field component preserves strike, guard, repair choices and server cooldowns',()=>{
 const rhythm=fieldCampaignSnapshot(prepared('espagne',2,0,{started:true,tick:20,actionTick:20})),calls=[];
 const view=Component({current:rhythm,position:rhythm.target,objective:rhythm.objective,onAction:(...args)=>calls.push(args),onClose:()=>{},onNavigate:()=>{}});
 const actions=allButtons(view).filter(button=>button.props.children==='Frappe sur le temps'||button.props.children==='Garde · reprendre le contrôle');
 assert.equal(actions.length,2);assert.ok(actions.every(button=>button.props.disabled));
 actions.forEach(button=>button.props.onClick());assert.deepEqual(calls,[['strike'],['guard']]);
 const save=prepared('italie',2,1,{started:true,trial:2,clock:5,inventory:{plan_nouveau:1,semences:1}}),current=fieldCampaignSnapshot(save),repairs=[];
 const repairView=Component({current,position:current.target,objective:current.objective,onAction:(...args)=>repairs.push(args),onClose:()=>{},onNavigate:()=>{}});
 const choices=allButtons(repairView).filter(button=>['Renforcer le nouvel assemblage','Recommencer le plan qui a échoué'].includes(button.props.children));
 assert.equal(choices.length,2);choices.forEach(button=>button.props.onClick());assert.deepEqual(repairs,[['repair','alternative'],['repair','identique']]);
 const cold=prepared('italie',2,1,{started:true,trial:2,clock:2,inventory:{plan_nouveau:1,semences:1}});
 assert.equal(fieldCampaignSnapshot(cold).actionReady,false);
 assert.throws(()=>applyWorldAction(cold,{type:'campaignAction',region:'italie',objective:current.objective,position:current.target,operation:'repair',choice:'alternative',layoutVersion:2,tick:0,clock:99}),/Observe/,'submitted clocks cannot bypass the canonical repair cooldown');
});

test('the realm notebook displays only accepted, unconsumed canonical tokens with human labels',()=>{
 for(const region of regions){
  const current=fieldCampaignSnapshot(arrived(region)),token=CAMPAIGN_RUNTIME_SPEC[region][0].steps[0].grant;
  assert.deepEqual(fieldCampaignEvidence(current),[]);
  const evidence=fieldCampaignEvidence({...current,inventory:{[token]:1,invented:99}});assert.equal(evidence.length,1);assert.equal(evidence[0].id,token);assert.equal(evidence[0].label,CAMPAIGN_RUNTIME_SPEC[region][0].steps[0].name);
  assert.deepEqual(fieldCampaignEvidence({...current,inventory:{[token]:0}}),[]);
 }
});

test('local value decisions retain their authored consequences, and reopening a rhythm retains its accepted timing window',()=>{
 const current=fieldCampaignSnapshot(prepared('turquie',4)),view=Component({current,position:current.target,objective:current.objective,onAction:()=>{},onClose:()=>{},onNavigate:()=>{}});
 for(const choice of current.choices)assert.ok(contentText(view).includes(choice.consequence),'the player can assess the consequence before choosing');
 const rhythm=fieldCampaignSnapshot(prepared('espagne',2,0,{started:true,clock:6,tick:20})),rhythmView=Component({current:rhythm,position:rhythm.target,objective:rhythm.objective,onAction:()=>{},onClose:()=>{},onNavigate:()=>{}});
 const find=(element,predicate)=>React.isValidElement(element)?predicate(element)?element:React.Children.toArray(element.props.children).map(child=>find(child,predicate)).find(Boolean):null;
 const timing=find(rhythmView,element=>element.props.className==='realm-timing');
 assert.equal(timing?.props['aria-label'],'Fenêtre d’action ouverte');assert.equal(rhythm.safe,true);
});
