import * as THREE from 'three';
import {createLivingActor} from './living.js';
import {normalizeAvatar} from './avatar-rules.js';
export function createPartyActors(models,root,height,onError){
 const actors=new Map();let peers=[];
 function destroy(a){a.actor.dispose();a.actor.object.removeFromParent();a.label.material.map.dispose();a.label.material.dispose();}
 function label(text){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;const c=canvas.getContext('2d');c.fillStyle='rgba(9,24,28,.78)';c.roundRect(8,8,496,64,20);c.fill();c.fillStyle='#fff4d5';c.textAlign='center';c.font='500 27px sans-serif';c.fillText(text.slice(0,28),256,49);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,transparent:true}));s.scale.set(6.8,1.05,1);s.position.y=5.4;return s;}
 return{setPeers(value){peers=value;},tick(dt,region){
  const active=new Set();
  for(const p of peers){if(p.region!==region)continue;active.add(p.id);let a=actors.get(p.id);
   if(!a){const actor=createLivingActor(models.living,{avatar:normalizeAvatar(p.avatar),scale:2.2,onError}),tag=label(p.avatar?.name||'Voyageur');actor.object.add(tag);actor.object.position.set(p.x,height(p.x,p.z),p.z);root.add(actor.object);a={actor,label:tag,signal:null};actors.set(p.id,a);}
   const object=a.actor.object,old=object.position.clone(),blend=1-Math.exp(-dt*13);object.position.x+=(p.x-object.position.x)*blend;object.position.z+=(p.z-object.position.z)*blend;object.position.y=height(object.position.x,object.position.z);a.actor.update(dt,object.position.x-old.x,object.position.z-old.z,object.position.distanceTo(old));
   if(object.position.distanceTo(old)<.01)object.rotation.y=Math.PI-p.heading*Math.PI/180;
   if(p.signal!==a.signal){a.signal=p.signal;a.label.material.map.dispose();a.label.material.dispose();a.label.removeFromParent();a.label=label(p.signal?({hello:'Bonjour !',follow:'Suivez-moi',help:'Besoin d’aide'})[p.signal]:p.avatar?.name||'Voyageur');object.add(a.label);if(p.signal==='hello')a.actor.action('Cast');}
  }
  for(const [id,a] of actors)if(!active.has(id)){destroy(a);actors.delete(id);}
 },dispose(){actors.forEach(destroy);actors.clear();}};
}
