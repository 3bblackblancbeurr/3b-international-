import * as THREE from 'three';
import {worldArtMaterials,worldRealmArt} from '../design-system/tokens.js';
import {GUARDIAN_BOSS_PHASES} from './guardian-combat.js';

const mechanics=Object.freeze({algerie:'Les trois charges du convoi',maroc:'L’ouvrage confié à ta garde',tunisie:'Les jalons du courage',espagne:'L’instrument de l’intensité',italie:'Les six assemblages de la défense',turquie:'Le compas du repère fiable',estonie:'Les cadres des copies'});
const amount=(value,max=100)=>Math.max(0,Math.min(max,Number.isFinite(value)?value:0));

/** Read-only mechanism projections. Every changing value comes from
 * guardianBossPresentation; these objects add neither collision nor combat
 * rules, targets, safety windows, lights or autonomous animation clocks. */
export function createGuardianMechanicArt(region,{reducedMotion=false}={}){
 if(!mechanics[region])return null;
 const root=new THREE.Group();root.name='3B · '+mechanics[region];root.userData.mechanic=region;root.userData.projection=true;
 const owned=[],parts=[],groups=[],batches=[],own=value=>(owned.push(value),value),box=own(new THREE.BoxGeometry(1,1,1)),gem=own(new THREE.OctahedronGeometry(1));
 const palette=worldRealmArt[region],materials={stone:own(new THREE.MeshStandardMaterial({color:palette.stone,roughness:.8,transparent:true,opacity:.68,depthWrite:false})),metal:own(new THREE.MeshStandardMaterial({color:worldArtMaterials.monumentGold,roughness:.44,metalness:.5,transparent:true,opacity:.82,depthWrite:false})),ink:own(new THREE.MeshStandardMaterial({color:palette.cloth,roughness:.75,transparent:true,opacity:.58,depthWrite:false}))};
 const matrix=new THREE.Matrix4(),inverse=new THREE.Matrix4();let dead=false;
 const group=name=>{const node=new THREE.Group();node.name=name;root.add(node);groups.push(node);return node;};
 function piece(parent,name,slot,x,y,z,sx,sy,sz,{yaw=0,roll=0,shape='box'}={}){const node=new THREE.Object3D();node.name=name;node.position.set(x,y,z);node.scale.set(sx,sy,sz);node.rotation.set(0,yaw,roll);parent.add(node);parts.push({node,slot,shape});return node;}
 function ring(parent,slot,radius,y,count=32){for(let i=0;i<count;i++){const a=i*Math.PI*2/count;piece(parent,'segment gravé',slot,Math.sin(a)*radius,y,Math.cos(a)*radius,Math.PI*2*radius/count*.83,.035,.065,{yaw:a});}}
 function frame(parent,width=1.8,height=2.9){for(const side of [-1,1])piece(parent,'montant du cadre','stone',side*width/2,height/2,0,.11,height,.14);for(const y of [.10,height-.10])piece(parent,'traverse du cadre','metal',0,y,0,width,.11,.16);}
 const nodes={};
 if(region==='algerie'){
  nodes.radius=group('Périmètre du lien');ring(nodes.radius,'metal',1,.045);
  nodes.charges=Array.from({length:3},(_,i)=>{const pack=group('Charge du voyageur '+(i+1));piece(pack,'ballot','ink',0,.65,0,1.05,1.16,.88);piece(pack,'couverture roulée','stone',0,1.29,0,1.25,.22,.66);for(const side of [-1,1])piece(pack,'sangle','metal',side*.29,.73,.46,.08,1.13,.035);piece(pack,'poignée','metal',0,1.47,0,.42,.08,.09);return pack;});
  nodes.stable=group('Lien stable · fermoirs réunis');for(const x of [-.38,0,.38])piece(nodes.stable,'fermoir','metal',x,.08,0,.24,.055,.42);
 }else if(region==='maroc'){
  nodes.radius=group('Périmètre de l’héritage');ring(nodes.radius,'metal',1,.045);
  nodes.heritage=group('Reliquaire de l’ouvrage');nodes.heritage.position.set(-4,0,-3);
  piece(nodes.heritage,'socle','stone',0,.20,0,1.9,.40,1.6);frame(nodes.heritage,1.6,2.7);piece(nodes.heritage,'ouvrage','metal',0,1.36,0,.50,.60,.37,{shape:'gem'});piece(nodes.heritage,'barrette du nom','ink',0,.55,.83,1.40,.13,.035);
  nodes.integrity=Array.from({length:10},(_,i)=>piece(nodes.heritage,'feuillet protégé '+(i+1),'metal',-.72+i*.16,.78,.85,.10,.22,.055));
 }else if(region==='tunisie'){
  nodes.route=group('Jalons dirigés vers la menace');
  for(let i=0;i<4;i++){const z=2+i*1.65;for(const side of [-1,1])piece(nodes.route,'chevron du passage','metal',side*.38,.06,z,.99,.045,.12,{yaw:side*.70});}
  for(const side of [-1,1]){piece(nodes.route,'jalon de l’issue','stone',side*2.25,1.25,7.7,.20,2.5,.25);piece(nodes.route,'tête du jalon','ink',side*2.25,2.55,7.7,.53,.20,.48);piece(nodes.route,'encoche de courage','metal',side*2.25,1.6,7.86,.09,.83,.035);}
  nodes.advance=group('Mesure d’avancée de la phase');for(let i=0;i<3;i++)piece(nodes.advance,'mesure','ink',-1.1+i*1.1,.035,9.25,.82,.035,.28);
 }else if(region==='espagne'){
  nodes.instrument=group('Instrument gradué · intensité');nodes.instrument.position.set(-4,0,-3);
  piece(nodes.instrument,'base','stone',0,.16,0,2.4,.32,1.25);piece(nodes.instrument,'fond gradué','ink',0,1.93,0,1.25,3.55,.18);for(const side of [-1,1])piece(nodes.instrument,'montant','stone',side*.83,1.96,0,.13,3.8,.25);
  nodes.heat=Array.from({length:10},(_,i)=>piece(nodes.instrument,'degré d’intensité '+(i+1),'metal',0,.47+i*.30,.14,.96,.18,.08));
  for(let i=0;i<10;i++)piece(nodes.instrument,'repère gravé','stone',.64,.47+i*.30,.16,.18,.035,.05);
  nodes.needle=piece(nodes.instrument,'curseur de la valeur acceptée','metal',-.94,.47,.15,.35,.13,.11);
 }else if(region==='italie'){
  nodes.defences=Array.from({length:6},(_,i)=>{const panel=group('Assemblage de la défense '+(i+1)),a=(i-2.5)*.58;panel.position.set(Math.sin(a)*5.7,0,-Math.cos(a)*5.7);panel.rotation.y=-a;frame(panel,1.65,2.9);piece(panel,'clé de voûte','metal',0,3.02,0,.34,.25,.25);return panel;});
  nodes.shield=nodes.defences.map((panel,i)=>piece(panel,'défense présente '+(i+1),'ink',0,1.5,.03,1.31,2.37,.065));
 }else if(region==='turquie'){
  nodes.compass=group('Compas sur le repère fiable');ring(nodes.compass,'stone',1.6,.07,24);ring(nodes.compass,'metal',.69,.08,16);
  for(const side of [-1,1]){piece(nodes.compass,'axe du compas','metal',side*.83,.09,0,1.18,.045,.09);piece(nodes.compass,'axe du compas','metal',0,.09,side*.83,.09,.045,1.18);}
  piece(nodes.compass,'ancrage','metal',0,.20,0,.22,.25,.22,{shape:'gem'});
  nodes.partial=group('Information partielle · trois signes');for(let i=0;i<3;i++){const a=i*Math.PI*2/3;piece(nodes.partial,'signe conservé','ink',Math.sin(a)*2.1,.14,Math.cos(a)*2.1,.42,.09,.16,{yaw:a});}
 }else if(region==='estonie'){
  nodes.copies=Array.from({length:2},(_,i)=>{const copy=group('Cadre du leurre '+(i+1));frame(copy,1.65,3.7);for(const side of [-1,1])piece(copy,'double entaille','metal',side*.18,.08,.62,.09,.04,.50);return copy;});
 }
 const byKey=new Map();for(const part of parts){const key=part.slot+':'+part.shape;if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(part);}
 for(const pieces of byKey.values()){const first=pieces[0],mesh=own(new THREE.InstancedMesh(first.shape==='gem'?gem:box,materials[first.slot],pieces.length));mesh.name='Mécanique · '+first.slot+' · '+first.shape;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);batches.push({mesh,pieces});}
 const visible=node=>{for(let current=node;current&&current!==root;current=current.parent)if(!current.visible)return false;return true;};
 function sync(){root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();for(const {mesh,pieces} of batches){let count=0;for(const part of pieces)if(visible(part.node)){matrix.multiplyMatrices(inverse,part.node.matrixWorld);mesh.setMatrixAt(count++,matrix);}mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}}
 const relative=(node,point,anchor)=>{node.position.set((point?.x||0)-anchor.x,0,(point?.z||0)-anchor.z);};
 function update(presentation,fallbackAnchor={x:0,z:0}){
  if(dead)return;root.visible=!!presentation;if(!presentation)return;const anchor=presentation.anchor||fallbackAnchor;let state={region,phase:presentation.index||1};
  if(nodes.radius){const radius=amount(presentation.radius,30);nodes.radius.visible=radius>0;nodes.radius.scale.set(radius||1,1,radius||1);}
  if(region==='algerie'){nodes.charges.forEach((node,i)=>{const point=presentation.link?.points?.[i];node.visible=!!point;if(point)relative(node,point,anchor);});nodes.stable.visible=presentation.link?.stable===true;state={...state,stable:!!presentation.link?.stable,points:(presentation.link?.points||[]).map(point=>({...point})),radius:presentation.radius};}
  else if(region==='maroc'){const integrity=amount(presentation.heritage?.integrity);nodes.integrity.forEach((node,i)=>node.visible=integrity>=i*10+1);state={...state,integrity,point:presentation.heritage?.point?{...presentation.heritage.point}:null};}
  else if(region==='tunisie'){const advance=amount(presentation.advance,3);nodes.route.scale.z=.8+advance*.16;nodes.advance.scale.x=.8+advance*.2;state={...state,advance};}
  else if(region==='espagne'){const intensity=amount(presentation.intensity);nodes.heat.forEach((node,i)=>node.visible=intensity>=i*10+1);nodes.needle.position.y=.47+intensity/100*2.7;state={...state,intensity};}
  else if(region==='italie'){const shield=amount(presentation.shield),capacity=(GUARDIAN_BOSS_PHASES.italie[presentation.index-1]||GUARDIAN_BOSS_PHASES.italie[0]).shield;nodes.shield.forEach((node,i)=>node.visible=shield>i*capacity/6);state={...state,shield,capacity,assemblages:nodes.shield.filter(node=>node.visible).length};}
  else if(region==='turquie'){const reliable=presentation.signal?.reliable;nodes.compass.visible=!!reliable;nodes.partial.visible=!!reliable&&presentation.signal?.hidden===true;if(reliable){relative(nodes.compass,reliable,anchor);nodes.partial.position.copy(nodes.compass.position);}state={...state,hidden:!!presentation.signal?.hidden,reliable:reliable?{...reliable}:null};}
  else if(region==='estonie'){nodes.copies.forEach((node,i)=>{const point=presentation.decoys?.[i];node.visible=!!point;if(point)relative(node,point,anchor);});state={...state,decoys:(presentation.decoys||[]).map(point=>({...point}))};}
  root.userData.state=state;sync();
 }
 root.visible=false;
 return{root,update,get diagnostics(){return{region,renderMeshes:batches.length,parts:parts.length,reducedMotion};},dispose(){if(dead)return;dead=true;root.removeFromParent();owned.forEach(resource=>resource.dispose());root.clear();}};
}
