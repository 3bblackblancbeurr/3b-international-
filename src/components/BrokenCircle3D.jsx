import {useEffect,useRef} from 'react';

const TAU=Math.PI*2;

function roundedStoneBlock(THREE,width,height,depth){
  const shape=new THREE.Shape();
  const x=-width/2,y=-height/2,r=Math.min(.065,width*.12,height*.18);
  shape.moveTo(x+r,y);
  shape.lineTo(x+width-r,y);
  shape.quadraticCurveTo(x+width,y,x+width,y+r);
  shape.lineTo(x+width,y+height-r);
  shape.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
  shape.lineTo(x+r,y+height);
  shape.quadraticCurveTo(x,y+height,x,y+height-r);
  shape.lineTo(x,y+r);
  shape.quadraticCurveTo(x,y,x+r,y);
  const geometry=new THREE.ExtrudeGeometry(shape,{
    depth,
    bevelEnabled:true,
    bevelThickness:.035,
    bevelSize:.028,
    bevelSegments:2,
    curveSegments:2,
    steps:1,
  });
  geometry.translate(0,0,-depth/2);
  geometry.computeVertexNormals();
  return geometry;
}

function makeStoneMaterial(THREE,map){
  return new THREE.MeshPhysicalMaterial({
    color:0xb9b8b0,
    map,
    roughness:.92,
    metalness:.02,
    clearcoat:.04,
    clearcoatRoughness:.9,
  });
}

function addRingLayer(THREE,group,{radius,count,blockHeight,depth,gapIndexes,stoneMaterial,energyMaterial,energyRadiusOffset=0}){
  const step=TAU/count;
  const width=radius*step*.78;
  const blockGeometry=roundedStoneBlock(THREE,width,blockHeight,depth);
  const energyGeometry=roundedStoneBlock(THREE,width*.82,.055,depth*.82);

  for(let i=0;i<count;i+=1){
    if(gapIndexes.has(i))continue;
    const angle=i*step;
    const wobble=Math.sin(i*12.9898)*.035;
    const radial=radius+wobble;
    const stone=new THREE.Mesh(blockGeometry,stoneMaterial);
    stone.position.set(Math.cos(angle)*radial,Math.sin(angle)*radial,Math.sin(i*2.17)*.035);
    stone.rotation.z=angle+Math.PI/2;
    stone.rotation.x=Math.sin(i*.91)*.018;
    stone.castShadow=true;
    stone.receiveShadow=true;
    group.add(stone);

    const glowRadius=radius+energyRadiusOffset;
    const glow=new THREE.Mesh(energyGeometry,energyMaterial);
    glow.position.set(Math.cos(angle)*glowRadius,Math.sin(angle)*glowRadius,-depth*.12);
    glow.rotation.z=angle+Math.PI/2;
    group.add(glow);
  }
}

function addKeystones(THREE,group,stoneMaterial,energyMaterial){
  const geometry=roundedStoneBlock(THREE,.62,.78,.52);
  const lightGeometry=roundedStoneBlock(THREE,.34,.09,.53);
  const angles=[.18,1.66,3.34,4.83];
  for(const [index,angle] of angles.entries()){
    const radius=2.18;
    const stone=new THREE.Mesh(geometry,stoneMaterial);
    stone.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,.07);
    stone.rotation.z=angle+Math.PI/2;
    stone.rotation.y=(index%2?1:-1)*.035;
    stone.castShadow=true;
    group.add(stone);

    const glow=new THREE.Mesh(lightGeometry,energyMaterial);
    glow.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,.34);
    glow.rotation.z=angle+Math.PI/2;
    group.add(glow);
  }
}

function addFractureShards(THREE,group,stoneMaterial){
  const geometry=roundedStoneBlock(THREE,.34,.5,.38);
  const specs=[
    {a:.98,r:2.48,z:.16,s:.92},
    {a:1.12,r:2.67,z:-.04,s:.68},
    {a:4.08,r:2.52,z:.1,s:.78},
    {a:5.58,r:2.55,z:-.08,s:.82},
  ];
  for(const [index,spec] of specs.entries()){
    const shard=new THREE.Mesh(geometry,stoneMaterial);
    shard.position.set(Math.cos(spec.a)*spec.r,Math.sin(spec.a)*spec.r,spec.z);
    shard.rotation.set(.12*index,.18*(index-1),spec.a+.45);
    shard.scale.setScalar(spec.s);
    shard.castShadow=true;
    group.add(shard);
  }
}

function addPedestal(THREE,scene,stoneMaterial){
  const pedestal=new THREE.Group();
  pedestal.position.set(0,-2.55,-.28);

  const lower=new THREE.Mesh(roundedStoneBlock(THREE,4.7,.48,.95),stoneMaterial);
  lower.position.y=-.16;
  lower.receiveShadow=true;
  pedestal.add(lower);

  const upper=new THREE.Mesh(roundedStoneBlock(THREE,3.55,.34,.78),stoneMaterial);
  upper.position.set(0,.22,.06);
  upper.receiveShadow=true;
  pedestal.add(upper);

  const inlayMaterial=new THREE.MeshStandardMaterial({
    color:0x1b789f,
    emissive:0x2ecbff,
    emissiveIntensity:2.8,
    roughness:.42,
    metalness:.08,
  });
  const inlay=new THREE.Mesh(new THREE.BoxGeometry(2.55,.035,.82),inlayMaterial);
  inlay.position.set(0,.42,.08);
  pedestal.add(inlay);

  scene.add(pedestal);
}

export default function BrokenCircle3D(){
  const mountRef=useRef(null);

  useEffect(()=>{
    const mount=mountRef.current;
    if(!mount)return undefined;

    let disposed=false;
    let frame=0;
    let renderer=null;
    let scene=null;
    let camera=null;
    let rotor=null;
    let resizeObserver=null;
    let intersectionObserver=null;
    let visible=true;
    let running=false;
    let reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
    let lastTime=performance.now();

    const onMotionChange=(event)=>{reducedMotion=event.matches;};
    const onVisibility=()=>{if(document.hidden)stop();else start();};

    const stop=()=>{
      running=false;
      if(frame)cancelAnimationFrame(frame);
      frame=0;
    };

    const renderLoop=(now)=>{
      if(disposed||!renderer||!scene||!camera||!rotor){stop();return;}
      const dt=Math.min((now-lastTime)/1000,.05);
      lastTime=now;
      if(!reducedMotion)rotor.rotation.z-=dt*(TAU/18);
      renderer.render(scene,camera);
      if(running)frame=requestAnimationFrame(renderLoop);
    };

    const start=()=>{
      if(disposed||running||!renderer||document.hidden||!visible)return;
      running=true;
      lastTime=performance.now();
      frame=requestAnimationFrame(renderLoop);
    };

    (async()=>{
      const THREE=await import('three');
      if(disposed)return;

      scene=new THREE.Scene();
      camera=new THREE.PerspectiveCamera(31,1,.1,100);
      camera.position.set(0,.04,8.35);
      camera.lookAt(0,.05,0);

      renderer=new THREE.WebGLRenderer({
        alpha:true,
        antialias:true,
        powerPreference:'high-performance',
        premultipliedAlpha:true,
      });
      renderer.setClearColor(0x000000,0);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.12;
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.domElement.className='home-world-webgl-canvas';
      renderer.domElement.setAttribute('aria-hidden','true');
      mount.appendChild(renderer.domElement);

      const maxAnisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      const textureLoader=new THREE.TextureLoader();
      const stoneTexture=textureLoader.load('/world/origins/limestone-color.webp',()=>{
        if(disposed)return;
        stoneTexture.colorSpace=THREE.SRGBColorSpace;
        stoneTexture.wrapS=stoneTexture.wrapT=THREE.RepeatWrapping;
        stoneTexture.repeat.set(2.2,2.2);
        stoneTexture.anisotropy=maxAnisotropy;
        stoneTexture.needsUpdate=true;
      });
      stoneTexture.colorSpace=THREE.SRGBColorSpace;
      stoneTexture.wrapS=stoneTexture.wrapT=THREE.RepeatWrapping;
      stoneTexture.repeat.set(2.2,2.2);
      stoneTexture.anisotropy=maxAnisotropy;

      const stoneMaterial=makeStoneMaterial(THREE,stoneTexture);
      const darkerStone=stoneMaterial.clone();
      darkerStone.color.setHex(0x858781);

      const energyMaterial=new THREE.MeshStandardMaterial({
        color:0x2f9dcb,
        emissive:0x34cfff,
        emissiveIntensity:4.4,
        roughness:.28,
        metalness:.06,
        transparent:true,
        opacity:.96,
      });

      const veilMaterial=new THREE.MeshBasicMaterial({
        color:0x02070b,
        transparent:true,
        opacity:.86,
        depthWrite:false,
      });
      const veil=new THREE.Mesh(new THREE.CircleGeometry(2.62,96),veilMaterial);
      veil.position.z=-.72;
      scene.add(veil);

      const haloMaterial=new THREE.MeshBasicMaterial({
        color:0x30c9ff,
        transparent:true,
        opacity:.2,
        blending:THREE.AdditiveBlending,
        depthWrite:false,
      });
      const halo=new THREE.Mesh(new THREE.TorusGeometry(2.33,.045,12,128),haloMaterial);
      halo.position.z=-.52;
      scene.add(halo);

      addPedestal(THREE,scene,darkerStone);

      rotor=new THREE.Group();
      rotor.position.set(0,.17,0);
      rotor.rotation.x=-.055;
      rotor.rotation.y=.095;
      scene.add(rotor);

      addRingLayer(THREE,rotor,{
        radius:2.08,
        count:34,
        blockHeight:.62,
        depth:.52,
        gapIndexes:new Set([0,1,6,7,15,16,25,26]),
        stoneMaterial,
        energyMaterial,
        energyRadiusOffset:-.03,
      });
      addRingLayer(THREE,rotor,{
        radius:1.56,
        count:30,
        blockHeight:.38,
        depth:.46,
        gapIndexes:new Set([0,5,6,13,20,21,27]),
        stoneMaterial:darkerStone,
        energyMaterial,
        energyRadiusOffset:.04,
      });
      addKeystones(THREE,rotor,stoneMaterial,energyMaterial);
      addFractureShards(THREE,rotor,stoneMaterial);

      const innerEnergy=new THREE.Mesh(
        new THREE.TorusGeometry(1.34,.028,10,128),
        new THREE.MeshStandardMaterial({
          color:0x2698c8,
          emissive:0x31d5ff,
          emissiveIntensity:3.5,
          roughness:.25,
          transparent:true,
          opacity:.82,
        })
      );
      innerEnergy.position.z=-.03;
      rotor.add(innerEnergy);

      const hemi=new THREE.HemisphereLight(0x9bcfff,0x171511,.82);
      scene.add(hemi);

      const key=new THREE.DirectionalLight(0xffd9a6,2.7);
      key.position.set(4.2,5.5,6.5);
      key.castShadow=true;
      key.shadow.mapSize.set(512,512);
      key.shadow.camera.near=.5;
      key.shadow.camera.far=20;
      scene.add(key);

      const rim=new THREE.DirectionalLight(0x55cfff,3.15);
      rim.position.set(-5.5,1.8,4);
      scene.add(rim);

      const bottomGlow=new THREE.PointLight(0x35cfff,10,7.2,2);
      bottomGlow.position.set(0,-2.05,1.25);
      scene.add(bottomGlow);

      const resize=()=>{
        if(disposed||!renderer||!camera)return;
        const rect=mount.getBoundingClientRect();
        const width=Math.max(1,Math.floor(rect.width));
        const height=Math.max(1,Math.floor(rect.height));
        const mobile=window.matchMedia('(max-width: 720px)').matches;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.35:1.65));
        renderer.setSize(width,height,false);
        camera.aspect=width/height;
        camera.position.z=mobile?8.75:8.25;
        camera.updateProjectionMatrix();
        renderer.render(scene,camera);
      };

      resizeObserver=new ResizeObserver(resize);
      resizeObserver.observe(mount);

      intersectionObserver=new IntersectionObserver(([entry])=>{
        visible=Boolean(entry?.isIntersecting);
        if(visible)start(); else stop();
      },{threshold:.05});
      intersectionObserver.observe(mount);

      motionQuery.addEventListener?.('change',onMotionChange);
      document.addEventListener('visibilitychange',onVisibility);

      resize();
      start();
    })();

    return()=>{
      disposed=true;
      stop();
      motionQuery.removeEventListener?.('change',onMotionChange);
      document.removeEventListener('visibilitychange',onVisibility);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if(renderer){
        renderer.dispose();
        renderer.domElement?.remove();
      }
      scene?.traverse?.((node)=>{
        node.geometry?.dispose?.();
        if(Array.isArray(node.material))node.material.forEach((material)=>material.dispose?.());
        else node.material?.dispose?.();
      });
    };
  },[]);

  return <div ref={mountRef} className="home-world-webgl-shell" aria-hidden="true"/>;
}
