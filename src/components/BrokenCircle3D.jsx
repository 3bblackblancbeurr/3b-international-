import {useEffect,useRef} from 'react';

const TAU=Math.PI*2;
const DEG=Math.PI/180;

function annularSectorGeometry(THREE,{innerRadius,outerRadius,startDeg,lengthDeg,depth,bevel=.045,curveSegments=14}){
  const start=startDeg*DEG;
  const end=(startDeg+lengthDeg)*DEG;
  const shape=new THREE.Shape();
  shape.moveTo(Math.cos(start)*outerRadius,Math.sin(start)*outerRadius);
  shape.absarc(0,0,outerRadius,start,end,false);
  shape.lineTo(Math.cos(end)*innerRadius,Math.sin(end)*innerRadius);
  shape.absarc(0,0,innerRadius,end,start,true);
  shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{
    depth,
    bevelEnabled:bevel>0,
    bevelThickness:bevel,
    bevelSize:bevel*.82,
    bevelSegments:2,
    curveSegments,
    steps:1,
  });
  geometry.translate(0,0,-depth/2);
  geometry.computeVertexNormals();
  return geometry;
}

function makeStoneMaterials(THREE,texture,variant='stone'){
  const menu=variant==='menu';
  const tones=menu
    ? [0xd2a94f,0x6f5934,0x9c9588,0x3d4342]
    : [0xc5c2b7,0xaaa9a2,0x8d918e,0xb5b0a4];
  return tones.map((color,index)=>new THREE.MeshPhysicalMaterial({
    color,
    map:texture,
    bumpMap:texture,
    bumpScale:menu ? .032 : .045,
    roughness:menu ? (index===0 ? .48 : .67) : .94,
    metalness:menu ? (index===0 ? .34 : .16) : .015,
    clearcoat:menu ? .22 : .025,
    clearcoatRoughness:menu ? .48 : .96,
  }));
}

function segmentGroup(THREE,spec,materials,energyMaterial,index){
  const group=new THREE.Group();
  const stone=new THREE.Mesh(
    annularSectorGeometry(THREE,{
      innerRadius:spec.innerRadius,
      outerRadius:spec.outerRadius,
      startDeg:spec.start,
      lengthDeg:spec.length,
      depth:spec.depth,
      bevel:spec.bevel??.05,
      curveSegments:spec.curveSegments??16,
    }),
    materials[index%materials.length]
  );
  stone.castShadow=true;
  stone.receiveShadow=true;
  group.add(stone);

  const inset=.018;
  const railInner=spec.energyRadius-inset;
  const railOuter=spec.energyRadius+inset;
  const railLength=Math.max(4,spec.length-4);
  const rail=new THREE.Mesh(
    annularSectorGeometry(THREE,{
      innerRadius:railInner,
      outerRadius:railOuter,
      startDeg:spec.start+2,
      lengthDeg:railLength,
      depth:.075,
      bevel:.008,
      curveSegments:14,
    }),
    energyMaterial
  );
  rail.position.z=spec.depth*.51;
  group.add(rail);

  const mid=(spec.start+spec.length/2)*DEG;
  const offset=spec.offset??0;
  group.position.x=Math.cos(mid)*offset;
  group.position.y=Math.sin(mid)*offset;
  group.position.z=spec.z??0;
  group.rotation.z=(spec.twist??0)*DEG;
  group.rotation.x=(spec.tiltX??0)*DEG;
  group.rotation.y=(spec.tiltY??0)*DEG;
  return group;
}

function addBrokenRing(THREE,rotor,materials,energyMaterial){
  const outer=[
    {start:10,length:42,innerRadius:1.96,outerRadius:2.48,energyRadius:2.06,depth:.56,offset:.03,twist:-.5,z:.02},
    {start:63,length:34,innerRadius:1.96,outerRadius:2.48,energyRadius:2.06,depth:.56,offset:.08,twist:.8,z:.08,tiltY:1.6},
    {start:111,length:43,innerRadius:1.96,outerRadius:2.48,energyRadius:2.06,depth:.56,offset:.02,twist:-.3,z:-.01},
    {start:168,length:37,innerRadius:1.96,outerRadius:2.48,energyRadius:2.06,depth:.56,offset:.10,twist:1.1,z:.05,tiltX:-1.1},
    {start:219,length:44,innerRadius:1.96,outerRadius:2.48,energyRadius:2.06,depth:.56,offset:.04,twist:-.7,z:-.03},
    {start:277,length:33,innerRadius:1.96,outerRadius:2.48,energyRadius:2.06,depth:.56,offset:.12,twist:.9,z:.09,tiltY:-1.7},
    {start:322,length:25,innerRadius:1.96,outerRadius:2.48,energyRadius:2.06,depth:.56,offset:.06,twist:-.9,z:.02},
  ];

  const inner=[
    {start:26,length:46,innerRadius:1.50,outerRadius:1.84,energyRadius:1.58,depth:.42,offset:.02,twist:.6,z:.08},
    {start:84,length:28,innerRadius:1.50,outerRadius:1.84,energyRadius:1.58,depth:.42,offset:.08,twist:-1.0,z:.02,tiltY:1.4},
    {start:132,length:39,innerRadius:1.50,outerRadius:1.84,energyRadius:1.58,depth:.42,offset:.03,twist:.4,z:-.04},
    {start:190,length:49,innerRadius:1.50,outerRadius:1.84,energyRadius:1.58,depth:.42,offset:.07,twist:-.5,z:.05},
    {start:255,length:36,innerRadius:1.50,outerRadius:1.84,energyRadius:1.58,depth:.42,offset:.04,twist:.8,z:-.02},
    {start:309,length:31,innerRadius:1.50,outerRadius:1.84,energyRadius:1.58,depth:.42,offset:.11,twist:-.9,z:.07,tiltX:1.1},
  ];

  outer.forEach((spec,index)=>rotor.add(segmentGroup(THREE,spec,materials,energyMaterial,index)));
  inner.forEach((spec,index)=>rotor.add(segmentGroup(THREE,spec,materials,energyMaterial,index+2)));

  const keystones=[
    {start:42,length:9,innerRadius:2.30,outerRadius:2.63,energyRadius:2.36,depth:.64,offset:.10,twist:-1.4,z:.12},
    {start:119,length:10,innerRadius:2.30,outerRadius:2.63,energyRadius:2.36,depth:.64,offset:.07,twist:1.2,z:.08},
    {start:234,length:10,innerRadius:2.30,outerRadius:2.63,energyRadius:2.36,depth:.64,offset:.11,twist:-.9,z:.10},
    {start:325,length:9,innerRadius:2.30,outerRadius:2.63,energyRadius:2.36,depth:.64,offset:.08,twist:1.5,z:.15},
  ];
  keystones.forEach((spec,index)=>rotor.add(segmentGroup(THREE,spec,materials,energyMaterial,index+1)));

  const shardMaterial=materials[2];
  const shards=[
    {start:100,length:7,innerRadius:2.02,outerRadius:2.39,depth:.38,x:-.09,y:.14,z:.30,rz:-7,rx:10,ry:-8},
    {start:155,length:6,innerRadius:1.64,outerRadius:1.97,depth:.34,x:-.14,y:-.02,z:.22,rz:9,rx:-6,ry:12},
    {start:267,length:7,innerRadius:2.07,outerRadius:2.43,depth:.38,x:.11,y:-.12,z:.26,rz:-9,rx:8,ry:6},
    {start:350,length:6,innerRadius:1.62,outerRadius:1.96,depth:.34,x:.13,y:.10,z:.21,rz:11,rx:-7,ry:-10},
  ];
  shards.forEach((spec)=>{
    const shard=new THREE.Mesh(
      annularSectorGeometry(THREE,{
        innerRadius:spec.innerRadius,
        outerRadius:spec.outerRadius,
        startDeg:spec.start,
        lengthDeg:spec.length,
        depth:spec.depth,
        bevel:.055,
        curveSegments:10,
      }),
      shardMaterial
    );
    shard.position.set(spec.x,spec.y,spec.z);
    shard.rotation.set(spec.rx*DEG,spec.ry*DEG,spec.rz*DEG);
    shard.castShadow=true;
    rotor.add(shard);
  });
}

function addArchitecturalDetails(THREE,rotor,materials){
  const detailMaterial=materials[2];
  const specs=[
    {start:18,length:15,r0:2.17,r1:2.31,z:.33},
    {start:72,length:12,r0:2.17,r1:2.31,z:.33},
    {start:126,length:14,r0:2.17,r1:2.31,z:.33},
    {start:181,length:13,r0:2.17,r1:2.31,z:.33},
    {start:230,length:15,r0:2.17,r1:2.31,z:.33},
    {start:287,length:12,r0:2.17,r1:2.31,z:.33},
    {start:328,length:12,r0:2.17,r1:2.31,z:.33},
  ];
  specs.forEach((spec)=>{
    const detail=new THREE.Mesh(
      annularSectorGeometry(THREE,{
        innerRadius:spec.r0,
        outerRadius:spec.r1,
        startDeg:spec.start,
        lengthDeg:spec.length,
        depth:.10,
        bevel:.012,
        curveSegments:10,
      }),
      detailMaterial
    );
    detail.position.z=spec.z;
    detail.castShadow=true;
    rotor.add(detail);
  });
}

export default function BrokenCircle3D({variant='stone'}){
  const mountRef=useRef(null);

  useEffect(()=>{
    const menuMode=variant==='menu';
    const mount=mountRef.current;
    if(!mount)return undefined;

    let disposed=false;
    let frame=0;
    let renderer=null;
    let scene=null;
    let camera=null;
    let rotor=null;
    let ambientRig=null;
    let resizeObserver=null;
    let intersectionObserver=null;
    let visible=true;
    let running=false;
    let reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
    let lastTime=performance.now();

    const stop=()=>{
      running=false;
      if(frame)cancelAnimationFrame(frame);
      frame=0;
    };

    const start=()=>{
      if(disposed||running||!renderer||document.hidden||!visible)return;
      running=true;
      lastTime=performance.now();
      frame=requestAnimationFrame(renderLoop);
    };

    const onMotionChange=(event)=>{reducedMotion=event.matches;};
    const onVisibility=()=>{if(document.hidden)stop();else start();};

    const renderLoop=(now)=>{
      if(disposed||!renderer||!scene||!camera||!rotor){stop();return;}
      const dt=Math.min((now-lastTime)/1000,.05);
      lastTime=now;
      if(!reducedMotion){
        rotor.rotation.z-=dt*(TAU/24);
        if(menuMode){
          const t=now/1000;
          rotor.rotation.x=-.06+Math.sin(t*.42)*.012;
          rotor.rotation.y=.16+Math.cos(t*.34)*.026;
          if(ambientRig){
            ambientRig.rotation.z+=dt*.018;
            ambientRig.rotation.x=Math.sin(t*.21)*.018;
            ambientRig.children.forEach((child,index)=>{
              if(child.userData?.orbit) child.rotation.z+=(index%2===0?1:-1)*dt*(.028+index*.004);
            });
          }
        }
      }
      renderer.render(scene,camera);
      if(running)frame=requestAnimationFrame(renderLoop);
    };

    (async()=>{
      const THREE=await import('three');
      if(disposed)return;

      scene=new THREE.Scene();
      camera=new THREE.PerspectiveCamera(29,1,.1,100);
      camera.position.set(0,.02,8.55);
      camera.lookAt(0,.06,0);

      renderer=new THREE.WebGLRenderer({
        alpha:true,
        antialias:true,
        powerPreference:'high-performance',
        premultipliedAlpha:true,
      });
      renderer.setClearColor(0x000000,0);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=menuMode ? 1.18 : 1.08;
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.domElement.className='home-world-webgl-canvas';
      renderer.domElement.setAttribute('aria-hidden','true');
      renderer.domElement.addEventListener('webglcontextlost',(event)=>{
        event.preventDefault();
        stop();
        mount.dataset.state='fallback';
      },{passive:false});
      mount.appendChild(renderer.domElement);

      const maxAnisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      const textureLoader=new THREE.TextureLoader();
      const stoneTexture=textureLoader.load('/world/origins/limestone-color.webp');
      stoneTexture.colorSpace=THREE.SRGBColorSpace;
      stoneTexture.wrapS=stoneTexture.wrapT=THREE.RepeatWrapping;
      stoneTexture.repeat.set(2.8,2.2);
      stoneTexture.anisotropy=maxAnisotropy;

      const stoneMaterials=makeStoneMaterials(THREE,stoneTexture,variant);
      const energyMaterial=new THREE.MeshStandardMaterial({
        color:0x2b9bc8,
        emissive:0x35d5ff,
        emissiveIntensity:menuMode ? 5.2 : 4.0,
        roughness:.22,
        metalness:.02,
        transparent:true,
        opacity:menuMode ? .96 : .90,
      });

      rotor=new THREE.Group();
      rotor.position.set(0,.08,0);
      rotor.rotation.x=menuMode ? -.06 : -.045;
      rotor.rotation.y=menuMode ? .16 : .13;
      scene.add(rotor);

      addBrokenRing(THREE,rotor,stoneMaterials,energyMaterial);
      addArchitecturalDetails(THREE,rotor,stoneMaterials);

      const innerGlow=new THREE.Mesh(
        new THREE.TorusGeometry(1.39,.022,8,112),
        new THREE.MeshBasicMaterial({
          color:0x48dbff,
          transparent:true,
          opacity:.32,
          blending:THREE.AdditiveBlending,
          depthWrite:false,
        })
      );
      innerGlow.position.z=-.20;
      rotor.add(innerGlow);

      const outerHalo=new THREE.Mesh(
        new THREE.TorusGeometry(2.53,.035,8,128),
        new THREE.MeshBasicMaterial({
          color:0x39cfff,
          transparent:true,
          opacity:.15,
          blending:THREE.AdditiveBlending,
          depthWrite:false,
        })
      );
      outerHalo.position.z=-.28;
      rotor.add(outerHalo);

      if(menuMode){
        ambientRig=new THREE.Group();
        ambientRig.position.z=-.45;
        scene.add(ambientRig);

        const goldOrbit=new THREE.Mesh(
          new THREE.TorusGeometry(2.92,.014,6,160),
          new THREE.MeshBasicMaterial({
            color:0xe8b84d,
            transparent:true,
            opacity:.34,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
          })
        );
        goldOrbit.rotation.x=1.08;
        goldOrbit.rotation.y=.34;
        goldOrbit.userData.orbit=true;
        ambientRig.add(goldOrbit);

        const cyanOrbit=new THREE.Mesh(
          new THREE.TorusGeometry(3.12,.010,6,160),
          new THREE.MeshBasicMaterial({
            color:0x51ddff,
            transparent:true,
            opacity:.27,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
          })
        );
        cyanOrbit.rotation.x=.72;
        cyanOrbit.rotation.y=-.44;
        cyanOrbit.userData.orbit=true;
        ambientRig.add(cyanOrbit);

        const count=84;
        const positions=new Float32Array(count*3);
        for(let i=0;i<count;i+=1){
          const angle=i*2.399963229728653;
          const radius=2.72+(i%9)*.085;
          const wave=Math.sin(i*1.73)*.24;
          positions[i*3]=Math.cos(angle)*radius;
          positions[i*3+1]=Math.sin(angle)*radius;
          positions[i*3+2]=wave+(i%5)*.035;
        }
        const particleGeometry=new THREE.BufferGeometry();
        particleGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
        const particles=new THREE.Points(
          particleGeometry,
          new THREE.PointsMaterial({
            color:0x8be8ff,
            size:.032,
            sizeAttenuation:true,
            transparent:true,
            opacity:.54,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
          })
        );
        particles.userData.orbit=true;
        ambientRig.add(particles);
      }

      const hemi=new THREE.HemisphereLight(0xbadfff,0x27231e,1.12);
      scene.add(hemi);

      const key=new THREE.DirectionalLight(0xffd9a8,3.25);
      key.position.set(4.8,5.8,7.6);
      key.castShadow=true;
      key.shadow.mapSize.set(512,512);
      key.shadow.camera.near=.5;
      key.shadow.camera.far=20;
      scene.add(key);

      const fill=new THREE.DirectionalLight(0x91a4b8,1.2);
      fill.position.set(-2.5,-1.0,5);
      scene.add(fill);

      const rim=new THREE.DirectionalLight(0x4ad7ff,3.7);
      rim.position.set(-5.2,2.4,4.5);
      scene.add(rim);

      const blueCore=new THREE.PointLight(0x35cfff,12,8,2);
      blueCore.position.set(0,.1,2.1);
      scene.add(blueCore);

      const resize=()=>{
        if(disposed||!renderer||!camera)return;
        const rect=mount.getBoundingClientRect();
        const width=Math.max(1,Math.floor(rect.width));
        const height=Math.max(1,Math.floor(rect.height));
        const mobile=window.matchMedia('(max-width: 720px)').matches;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.28:1.7));
        renderer.setSize(width,height,false);
        camera.aspect=width/height;
        camera.position.z=menuMode?(mobile?8.02:8.28):(mobile?8.85:8.45);
        camera.updateProjectionMatrix();
        renderer.render(scene,camera);
      };

      resizeObserver=new ResizeObserver(resize);
      resizeObserver.observe(mount);

      intersectionObserver=new IntersectionObserver(([entry])=>{
        visible=Boolean(entry?.isIntersecting);
        if(visible)start();else stop();
      },{threshold:.05});
      intersectionObserver.observe(mount);

      motionQuery.addEventListener?.('change',onMotionChange);
      document.addEventListener('visibilitychange',onVisibility);

      mount.dataset.state='ready';
      resize();
      start();
    })().catch(()=>{
      mount.dataset.state='fallback';
      stop();
    });

    return()=>{
      disposed=true;
      stop();
      motionQuery.removeEventListener?.('change',onMotionChange);
      document.removeEventListener('visibilitychange',onVisibility);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      delete mount.dataset.state;
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
  },[variant]);

  return <div ref={mountRef} className={`home-world-webgl-shell broken-circle-3d broken-circle-3d--${variant}`} aria-hidden="true"/>;
}
