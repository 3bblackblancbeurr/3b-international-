import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import vertexShader from './ar-assets/hidden-ar/portal.vert?raw';
import fragmentShader from './ar-assets/hidden-ar/portal.frag?raw';

// The preview and native Android module use the exact same portal shader artwork.
// This is a 3D preview, never a simulated camera or a claim of spatial tracking.
export default function PortalPreview(){
 const host=useRef(null),[error,setError]=useState('');
 useEffect(()=>{
  const element=host.current;let renderer,resize,frame,disposed=false;const resources=[];
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x080e16);element.appendChild(renderer.domElement);
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.05,30);camera.position.set(0,1.6,4.5);camera.lookAt(0,1.1,0);
   const group=new THREE.Group();scene.add(group);let angle=.12,startX=null,startAngle=0;
   const texture=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);texture.needsUpdate=true;resources.push(texture);
   function mesh(geometry,kind){
    geometry.setAttribute('aPosition',geometry.attributes.position);geometry.setAttribute('aNormal',geometry.attributes.normal);
    const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)if(kind!==0)uv.setXY(i,uv.getX(i)*2-1,uv.getY(i)*2-1);geometry.setAttribute('aUV',uv);
    const material=new THREE.RawShaderMaterial({vertexShader,fragmentShader,transparent:kind!==0,depthWrite:kind!==2,side:THREE.DoubleSide,uniforms:{uModel:{value:new THREE.Matrix4()},uView:{value:new THREE.Matrix4()},uProjection:{value:new THREE.Matrix4()},uDepth:{value:texture},uDepthUV:{value:new THREE.Matrix3()},uHasDepth:{value:false},uTime:{value:0},uLight:{value:1.1},uLightDirection:{value:new THREE.Vector3(.3,.8,.5)},uViewport:{value:new THREE.Vector2(1,1)},uKind:{value:kind}}});
    const object=new THREE.Mesh(geometry,material);object.onBeforeRender=()=>{material.uniforms.uModel.value.copy(object.matrixWorld);material.uniforms.uView.value.copy(camera.matrixWorldInverse);material.uniforms.uProjection.value.copy(camera.projectionMatrix);renderer.getDrawingBufferSize(material.uniforms.uViewport.value);};
    group.add(object);resources.push(geometry,material);return material;
   }
   mesh(new THREE.PlaneGeometry(2.9,2.9).rotateX(-Math.PI/2).translate(0,.008,0),2);
   mesh(new THREE.CylinderGeometry(1.03,1.03,.06,64).scale(1,1,.32/1.03).translate(0,.03,0),0);
   mesh(new THREE.TorusGeometry(.82,.06,12,96).scale(1,1.1/.82,1).translate(0,1.15,0),0);
   const portal=mesh(new THREE.CircleGeometry(.82,96).scale(1,1.1/.82,1).translate(0,1.15,0),1);
   resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(element);
   const down=event=>{startX=event.clientX;startAngle=angle;renderer.domElement.setPointerCapture(event.pointerId);};
   const move=event=>{if(startX!==null)angle=startAngle+(event.clientX-startX)*.006;};const up=()=>{startX=null;};
   renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let previous=0;
   function render(time){if(disposed)return;frame=requestAnimationFrame(render);if(document.hidden||time-previous<33)return;previous=time;group.rotation.y=angle;portal.uniforms.uTime.value=reduced?0:time/1000;renderer.render(scene,camera);}
   frame=requestAnimationFrame(render);
  }catch{setError('L’aperçu 3D est indisponible sur cet appareil. Le scanner photo reste accessible.');}
  return()=>{disposed=true;cancelAnimationFrame(frame);resize?.disconnect();resources.forEach(resource=>resource.dispose());renderer?.dispose();renderer?.forceContextLoss();element.replaceChildren();};
 },[]);
 return <div><div ref={host} className="hidden-portal-preview" role="img" aria-label="Aperçu 3D du portail champagne et bleu, sans caméra"/>{error?<p role="status">{error}</p>:<p className="hidden-caption">Aperçu 3D · Glisse pour tourner autour du portail. Aucun placement dans ton environnement.</p>}</div>;
}
