import * as THREE from 'three';
import {BIOMES,randomFor} from './terrain.js';

/**
 * Inexpensive distant identity layer for the eight REALMS, never for the Hub.
 * These silhouettes sit beyond the present 260m gameplay boundary: they
 * improve visible scale and cinematics but DO NOT claim 50–200x playable maps.
 * Existing navigation/collision/quests remain unchanged.
 */
export const HORIZON_PROFILES=Object.freeze({
 france:{name:'Contreforts et reliefs',form:'ridge',count:33,range:[310,435],height:[12,52],width:[16,40]},
 algerie:{name:'Dunes et massifs lointains',form:'dune',count:38,range:[300,455],height:[7,23],width:[23,66]},
 maroc:{name:'Crêtes de l’Atlas',form:'ridge',count:42,range:[320,465],height:[22,83],width:[23,50]},
 tunisie:{name:'Rivage et collines',form:'dune',count:29,range:[330,462],height:[6,20],width:[21,48]},
 espagne:{name:'Sierras et falaises',form:'ridge',count:37,range:[325,465],height:[13,52],width:[18,42]},
 italie:{name:'Collines et contreforts',form:'ridge',count:35,range:[320,460],height:[9,38],width:[19,48]},
 turquie:{name:'Reliefs de Cappadoce',form:'spire',count:43,range:[325,468],height:[14,49],width:[9,24]},
 estonie:{name:'Canopée baltique lointaine',form:'pine',count:52,range:[322,466],height:[9,24],width:[3,8]},
});
const vary=(rnd,min,max)=>min+(max-min)*rnd();
export function createRealmHorizons(region,heightAt=()=>0){
 const profile=HORIZON_PROFILES[region];
 if(!profile)return{root:new THREE.Group(),count:0,dispose(){}};
 const biome=BIOMES[region],random=randomFor(biome.seed*11+2141),root=new THREE.Group();
 root.name='3B-'+region+'-Distant-Horizons';
 const ridge=profile.form==='dune'?new THREE.SphereGeometry(1,9,6):
  new THREE.ConeGeometry(1,1,profile.form==='pine'?5:profile.form==='spire'?7:8,1);
 const color=new THREE.Color(biome.rock),low=new THREE.Color(biome.low);
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.97,metalness:0,flatShading:true});
 const mesh=new THREE.InstancedMesh(ridge,material,profile.count);mesh.name='3B-Batched-Country-Horizon';
 mesh.castShadow=false;mesh.receiveShadow=true;
 mesh.frustumCulled=false; // The broad panorama is one draw call, not individual culls.
 const transform=new THREE.Object3D();
 for(let i=0;i<profile.count;i++){
  const angle=(i+(random()-.5)*.74)/profile.count*Math.PI*2,radial=vary(random,...profile.range);
  const x=Math.sin(angle)*radial,z=Math.cos(angle)*radial;
  const h=vary(random,...profile.height),w=vary(random,...profile.width);
  const sample=heightAt(x,z),floor=Number.isFinite(sample)?sample:0;
  transform.position.set(x,floor+(profile.form==='dune'?0:h*.49),z);
  transform.rotation.set(0,random()*Math.PI*2,0);
  transform.scale.set(w,h,profile.form==='dune'?w*.88:w*(.65+.45*random()));
  transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
  mesh.setColorAt(i,low.clone().lerp(color,.35+.5*random()));
 }
 mesh.instanceMatrix.needsUpdate=true;
 if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 mesh.computeBoundingSphere();root.add(mesh);
 let disposed=false;
 return{root,count:profile.count,profile,
  dispose(){if(disposed)return;disposed=true;mesh.removeFromParent();mesh.dispose();ridge.dispose();material.dispose();}
 };
}
