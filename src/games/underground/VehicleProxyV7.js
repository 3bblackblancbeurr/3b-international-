import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const C=v=>new THREE.Color(v);
function physical(color,{metalness=.75,roughness=.2,clearcoat=.9,clearcoatRoughness=.06,transparent=false,opacity=1,emissive=null,emissiveIntensity=0}={}){return new THREE.MeshPhysicalMaterial({color:C(color),metalness,roughness,clearcoat,clearcoatRoughness,transparent,opacity,emissive:emissive?C(emissive):C('#000000'),emissiveIntensity});}
function shellGeometry(stations,segments=20){
  const pos=[],uv=[],idx=[];
  for(let s=0;s<stations.length;s++){
    const st=stations[s];
    for(let j=0;j<segments;j++){
      const a=j/segments*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a),shape=Math.sign(cs)*Math.pow(Math.abs(cs),.78);
      const x=shape*st.w*.5,y=st.cy+(sn>=0?st.top:st.bottom)*sn;
      pos.push(x,y,st.z);uv.push(j/segments,s/(stations.length-1));
    }
  }
  for(let s=0;s<stations.length-1;s++)for(let j=0;j<segments;j++){
    const a=s*segments+j,b=s*segments+(j+1)%segments,c=(s+1)*segments+j,d=(s+1)*segments+(j+1)%segments;idx.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function hideLegacyBody(root){root.traverse(o=>{if(!o.isMesh||!o.geometry)return;const p=o.geometry.parameters||{};if(o.geometry.type==='BoxGeometry'&&p.width>=1.45&&p.depth>=.8&&o.position.y>.2&&o.position.y<1.5)o.visible=false;});}
function addSpokes(root,wheel,material){const r=wheel.userData?.radius||.34;for(let k=0;k<8;k++){const a=k/8*Math.PI*2,spoke=new THREE.Mesh(new RoundedBoxGeometry(r*.72,.035,.055,2,.018),material);spoke.position.copy(wheel.position);spoke.rotation.x=Math.PI/2;spoke.rotation.y=a;root.add(spoke);}}

export function upgradeVehicleProxyV7(root,{ai=false}={}){
  if(!root||root.userData?.proxyV7)return root;hideLegacyBody(root);
  const c=root.userData?.assembly?.customization||{colors:{primary:'#0b0d12',secondary:'#05070a',accent:'#d7b76b',light:'#e9f2ff',caliper:'#d9aa58'}};
  const primary=ai?'#0a0d12':c.colors.primary,secondary=ai?'#050609':c.colors.secondary,accent=ai?'#c83443':c.colors.accent;
  const body=physical(primary,{metalness:.82,roughness:.17,clearcoat:1,clearcoatRoughness:.035}),lower=physical(secondary,{metalness:.5,roughness:.28,clearcoat:.5}),glass=physical('#0c1520',{metalness:.08,roughness:.055,clearcoat:1,clearcoatRoughness:.02,transparent:true,opacity:.78});
  const stations=[
    {z:-2.10,w:.78,cy:.52,top:.12,bottom:.22},{z:-1.85,w:1.55,cy:.55,top:.24,bottom:.27},{z:-1.35,w:1.88,cy:.58,top:.31,bottom:.30},{z:-.78,w:1.92,cy:.62,top:.41,bottom:.31},{z:-.22,w:1.84,cy:.67,top:.66,bottom:.32},{z:.42,w:1.82,cy:.67,top:.63,bottom:.33},{z:1.02,w:1.89,cy:.62,top:.40,bottom:.30},{z:1.52,w:1.86,cy:.59,top:.29,bottom:.28},{z:1.96,w:1.52,cy:.56,top:.20,bottom:.25},{z:2.12,w:.82,cy:.53,top:.11,bottom:.21}
  ];
  const shell=new THREE.Mesh(shellGeometry(stations,24),body);shell.name='U3B_V7_SculptedBody';shell.castShadow=true;shell.receiveShadow=true;root.add(shell);
  const canopyStations=[{z:-.82,w:1.28,cy:.89,top:.14,bottom:.06},{z:-.48,w:1.44,cy:.98,top:.34,bottom:.05},{z:.05,w:1.48,cy:1.02,top:.40,bottom:.05},{z:.58,w:1.34,cy:.98,top:.30,bottom:.05},{z:.92,w:1.02,cy:.88,top:.12,bottom:.04}];
  const canopy=new THREE.Mesh(shellGeometry(canopyStations,20),glass);canopy.name='U3B_V7_Canopy';canopy.castShadow=true;root.add(canopy);
  const splitter=new THREE.Mesh(new RoundedBoxGeometry(1.72,.055,.34,3,.025),lower);splitter.position.set(0,.29,-2.06);root.add(splitter);
  const diffuser=new THREE.Mesh(new RoundedBoxGeometry(1.64,.055,.38,3,.025),lower);diffuser.position.set(0,.28,2.05);root.add(diffuser);
  for(const x of [-.70,.70]){const skirt=new THREE.Mesh(new RoundedBoxGeometry(.10,.12,2.65,3,.035),lower);skirt.position.set(x,.32,.02);root.add(skirt);}
  const creaseMat=physical(accent,{metalness:.78,roughness:.18,clearcoat:.75});
  for(const x of [-.68,.68]){const blade=new THREE.Mesh(new RoundedBoxGeometry(.04,.07,1.55,2,.015),creaseMat);blade.position.set(x,.47,.20);root.add(blade);}
  const head=physical(c.colors.light||'#eaf3ff',{metalness:.05,roughness:.08,clearcoat:1,emissive:c.colors.light||'#eaf3ff',emissiveIntensity:5.2});
  const tail=physical('#ff1738',{metalness:.05,roughness:.08,clearcoat:1,emissive:'#ff1738',emissiveIntensity:4.8});
  for(const x of [-.57,.57]){const h=new THREE.Mesh(new RoundedBoxGeometry(.44,.07,.055,3,.025),head);h.position.set(x,.72,-2.07);root.add(h);const t=new THREE.Mesh(new RoundedBoxGeometry(.46,.065,.055,3,.025),tail);t.position.set(x,.71,2.07);root.add(t);}
  const bar=new THREE.Mesh(new RoundedBoxGeometry(1.14,.025,.04,2,.012),tail);bar.position.set(0,.72,2.075);root.add(bar);
  const rimMat=physical('#606873',{metalness:.94,roughness:.14,clearcoat:.28});for(const w of root.userData?.wheels||[])if(w.name?.startsWith('wheel-'))addSpokes(root,w,rimMat);
  root.userData.proxyV7=true;root.userData.proxyV7Materials={body,glass,lower};return root;
}
