import * as T from 'three';
export function createImpactLabels(scene){const labels=[];
 const release=e=>{e.sprite.removeFromParent();e.sprite.material.map.dispose();e.sprite.material.dispose();};
 return {add(event,y){if(!Number.isFinite(event.damage)||event.damage<=0)return;const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.font='bold 56px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=7;ctx.strokeStyle='#071019';ctx.strokeText(String(event.damage),128,46);ctx.fillStyle=event.type==='hurt'?'#ffac99':'#ffe4ad';ctx.fillText(String(event.damage),128,46);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const material=new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}),sprite=new T.Sprite(material);sprite.position.set(event.x,y+2.05,event.z);sprite.scale.set(1.5,.56,1);sprite.renderOrder=9;scene.add(sprite);labels.push({sprite,age:0});if(labels.length>6)release(labels.shift());},
 update(dt){for(let i=labels.length-1;i>=0;i--){const e=labels[i];e.age+=dt;e.sprite.position.y+=dt*.65;e.sprite.material.opacity=Math.max(0,1-e.age/.7);if(e.age>=.7){release(e);labels.splice(i,1);}}},
 dispose(){labels.forEach(release);labels.length=0;}
 };}
