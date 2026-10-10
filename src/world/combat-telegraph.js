import * as THREE from 'three';
import {GUARDIAN_BOSS_PHASES} from './guardian-combat.js';
import {worldCombatArt} from '../design-system/tokens.js';

export function threatKind(encounter){
 if(!encounter||encounter.result||encounter.pact)return null;
 if(encounter.intent==='soin')return 'healing';
 if(encounter.intent==='rempart')return 'shield';
 return ['rituel','gel','éclipse','sable','vague'].includes(encounter.intent)?'area':'strike';
}

// Preview only: accepted field.windup drives the gauge. A local render clock
// never schedules an impact, changes an aim, or grants a dodge/reward.
export function createCombatTelegraph({reducedMotion=false,heightAt}={}){
 const root=new THREE.Group();root.name='Enemy intent';root.visible=false;
 const materials=[],geometries=[];
 const make=(name,geometry,color,opacity,order)=>{
  geometries.push(geometry);const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});materials.push(material);
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.rotation.x=-Math.PI/2;mesh.position.y=order*.001;mesh.renderOrder=order;root.add(mesh);return mesh;
 };
 const sector=make('Strike danger fill',new THREE.RingGeometry(.02,8.2,36,1,Math.PI*.19,Math.PI*.62),worldCombatArt.dangerFill,.19,20);
 const outline=make('Strike danger edge',new THREE.RingGeometry(8.08,8.2,40,1,Math.PI*.19,Math.PI*.62),worldCombatArt.strikeEdge,.85,22);
 const area=make('Area danger edge',new THREE.RingGeometry(5.62,5.8,48),worldCombatArt.areaEdge,.7,22);
 const areaFill=make('Area danger fill',new THREE.RingGeometry(.02,5.8,48),worldCombatArt.dangerFill,.12,20);
 const rune=make('Intent rune',new THREE.RingGeometry(1.05,1.18,6),worldCombatArt.intentRune,.8,23);
 const charge=make('Accepted windup gauge',new THREE.RingGeometry(1.3,1.46,48,1,Math.PI/2),worldCombatArt.windupGauge,.95,24);
 const chargeIndices=charge.geometry.index.count;
 let preparing=false,duration=0,progress=0,windup=0,shape=null;
 const expectedWindup=e=>{
  const ratio=(Number(e.enemy)||0)/Math.max(1,Number(e.enemyMax)||1),index=ratio<.35?2:ratio<.7?1:0;
  const rule=e.boss&&!e.patrol&&!e.final?GUARDIAN_BOSS_PHASES[e.region]?.[index]:null;
  return (rule?.windup||1000)*(e.expert?.8:1);
 };
 return{root,update(encounter,time,hero,enemy,busy=false){
  const field=encounter?.field,kind=field?(['rituel','gel','éclipse','sable','vague'].includes(encounter.intent)?'area':'strike'):threatKind(encounter);
  root.visible=!!hero&&!!enemy&&(field?!encounter.result&&!encounter.pact&&field.phase==='windup':!!kind&&!busy);
  if(!root.visible){preparing=false;progress=0;shape=null;charge.visible=false;return;}
  if(field){
   windup=Math.max(0,Number(field.windup)||0);
   if(!preparing)duration=Math.max(windup,expectedWindup(encounter));
   // A canonical resonance can prolong this exact preparation. Follow the
   // accepted extension instead of silently completing an obsolete countdown.
   duration=Math.max(duration,windup);preparing=true;progress=Math.max(0,Math.min(1,1-windup/Math.max(1,duration)));
  }else{preparing=false;progress=0;windup=0;duration=0;}
  shape=kind==='strike'?'cone':'circle';
  const hiddenSignal=encounter.boss&&encounter.region==='turquie'&&encounter.guardianFlag;
  const shownProgress=hiddenSignal?0:progress,pulse=reducedMotion||field?1:.85+Math.sin(time*3)*.15,aim=field?.aim||hero;
  const x=field&&kind==='area'?aim.x:enemy.x,z=field&&kind==='area'?aim.z:enemy.z,ground=typeof heightAt==='function'?heightAt(x,z):enemy.y;
  root.position.set(x,(Number.isFinite(ground)?ground:enemy.y||0)+.12,z);root.rotation.y=Math.atan2(aim.x-enemy.x,aim.z-enemy.z);
  sector.rotation.z=outline.rotation.z=Math.PI;
  sector.visible=outline.visible=kind==='strike';area.visible=kind!=='strike';areaFill.visible=kind==='area';rune.visible=kind==='shield'||kind==='healing';
  sector.material.opacity=(.15+shownProgress*.17)*pulse;outline.material.opacity=(.76+shownProgress*.2)*pulse;area.material.opacity=(.7+shownProgress*.25)*pulse;areaFill.material.opacity=.1+shownProgress*.2;
  area.material.color.set(kind==='healing'?worldCombatArt.healingArea:kind==='shield'?worldCombatArt.shieldArea:worldCombatArt.areaIntent);rune.material.color.copy(area.material.color);
  area.scale.setScalar(kind==='healing'?.7:kind==='shield'?.55:1);rune.rotation.z=reducedMotion||field?0:time*.2;
  charge.visible=!!field&&progress>0&&!hiddenSignal;charge.geometry.setDrawRange(0,Math.min(chargeIndices,Math.ceil(progress*48)*6));
  charge.material.opacity=.72+progress*.25;
 },get state(){return{active:root.visible,preparing,progress,remaining:windup,duration,shape,draws:root.children.filter(child=>child.visible).length};},dispose(){materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());root.removeFromParent();}};
}
