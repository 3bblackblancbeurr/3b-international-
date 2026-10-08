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
    ? [0xd5c6a5,0x7f7c73,0xa99a7d,0x4b5150]
    : [0xc5c2b7,0xaaa9a2,0x8d918e,0xb5b0a4];
  return tones.map((color,index)=>new THREE.MeshPhysicalMaterial({
    color,
    map:texture,
    bumpMap:texture,
    bumpScale:menu ? .070 : .045,
    roughness:menu ? (index===0 ? .70 : .84) : .94,
    metalness:menu ? (index===0 ? .10 : .035) : .015,
    clearcoat:menu ? .075 : .025,
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
        // One persistent 3D scene: the Broken Circle stays the hero, while a
        // real miniature city, floor and lighting live behind it. Everything
        // is batched so the phone gets depth without turning the home screen
        // into a second game renderer.
        const cityRig=new THREE.Group();
        cityRig.name='Cité des Huit Héritages · maquette 3D';
        cityRig.position.set(0,0,-2.65);
        scene.add(cityRig);

        const groundMaterial=new THREE.MeshStandardMaterial({
          color:0x071016,
          roughness:.96,
          metalness:.02,
        });
        const ground=new THREE.Mesh(new THREE.PlaneGeometry(12.5,8.5),groundMaterial);
        ground.rotation.x=-Math.PI/2;
        ground.position.set(0,-2.62,-1.15);
        ground.receiveShadow=true;
        cityRig.add(ground);

        const districtGeometry=new THREE.BoxGeometry(1,1,1);
        const districtMaterial=new THREE.MeshStandardMaterial({
          color:0x8c877a,
          roughness:.86,
          metalness:.035,
          vertexColors:true,
        });
        const districtCount=44;
        const skyline=new THREE.InstancedMesh(districtGeometry,districtMaterial,districtCount);
        skyline.name='Quartiers de la Cité · volume architectural';
        skyline.castShadow=false;
        skyline.receiveShadow=true;
        const tower=new THREE.Object3D();
        const palette=[
          0x8d887a,0x777d79,0xa1957f,0x586a70,0x9a8d76,0x66747b,
        ].map(color=>new THREE.Color(color));
        const cityBuildings=[];
        for(let i=0;i<districtCount;i+=1){
          const row=Math.floor(i/11);
          const col=i%11;
          let x=(col-5)*.73+(row%2?.18:-.18);
          if(Math.abs(x)<1.35&&row<2)x+=(x<0?-1:1)*1.18;
          const width=.34+((i*5)%5)*.085;
          const height=.58+((i*7+row*3)%10)*.19+(row===3?.35:0);
          const depth=.48+((i*3)%5)*.12;
          const z=-.52-row*.87-((col%3)*.07);
          tower.position.set(x,-2.62+height/2,z);
          tower.scale.set(width,height,depth);
          tower.rotation.set(0,((col+row)%5-2)*.014,0);
          tower.updateMatrix();
          skyline.setMatrixAt(i,tower.matrix);
          skyline.setColorAt(i,palette[(i+row)%palette.length]);
          cityBuildings.push({x,y:-2.62+height/2,z,width,height,depth});
        }
        skyline.instanceMatrix.needsUpdate=true;
        skyline.instanceColor.needsUpdate=true;
        skyline.computeBoundingSphere();
        cityRig.add(skyline);

        const crownGeometry=new THREE.CylinderGeometry(.5,.62,1,6,1,false);
        const crownMaterial=new THREE.MeshStandardMaterial({
          color:0xa49473,
          roughness:.78,
          metalness:.07,
          vertexColors:true,
        });
        const crownCount=8;
        const crowns=new THREE.InstancedMesh(crownGeometry,crownMaterial,crownCount);
        crowns.name='Huit tours-signatures';
        const crownPalette=[0x87969d,0x8aa181,0xb29d75,0xb27f6f,0xb17878,0x8f92aa,0xa49b76,0x7fa0a0].map(color=>new THREE.Color(color));
        for(let i=0;i<crownCount;i+=1){
          const side=i<4?-1:1;
          const lane=i%4;
          const height=1.25+lane*.28+(i%2)*.18;
          const x=side*(2.05+lane*.72);
          const z=-1.6-(lane%2)*.72-(i%3)*.14;
          tower.position.set(x,-2.62+height/2,z);
          tower.scale.set(.52+lane*.035,height,.52+lane*.035);
          tower.rotation.set(0,(side*.08)+(lane-.5)*.025,0);
          tower.updateMatrix();
          crowns.setMatrixAt(i,tower.matrix);
          crowns.setColorAt(i,crownPalette[i]);
        }
        crowns.instanceMatrix.needsUpdate=true;
        crowns.instanceColor.needsUpdate=true;
        crowns.computeBoundingSphere();
        cityRig.add(crowns);

        const roadPositions=[];
        const roadColors=[];
        const gold=new THREE.Color(0xe5bd6f);
        const cyan=new THREE.Color(0x55d9f5);
        const pushRoad=(a,b,color)=>{
          roadPositions.push(...a,...b);
          roadColors.push(color.r,color.g,color.b,color.r,color.g,color.b);
        };
        [-2.8,-1.4,0,1.4,2.8].forEach((x,index)=>{
          const farX=x*.22;
          pushRoad([x,-2.605,.9],[farX,-2.605,-6.6],index===2?gold:cyan);
        });
        [-.5,-1.7,-3.1,-4.7,-6.0].forEach((z,index)=>{
          const width=3.6-Math.min(2.1,index*.38);
          pushRoad([-width,-2.604,z],[width,-2.604,z],index%2?gold:cyan);
        });
        const roadGeometry=new THREE.BufferGeometry();
        roadGeometry.setAttribute('position',new THREE.Float32BufferAttribute(roadPositions,3));
        roadGeometry.setAttribute('color',new THREE.Float32BufferAttribute(roadColors,3));
        const roads=new THREE.LineSegments(
          roadGeometry,
          new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.34,blending:THREE.AdditiveBlending})
        );
        roads.name='Avenues lumineuses de la Cité';
        cityRig.add(roads);

        const lightPositions=[];
        const lightColors=[];
        cityBuildings.forEach((building,index)=>{
          const rows=Math.max(1,Math.min(4,Math.floor(building.height/.45)));
          for(let row=0;row<rows;row+=1){
            const side=index%2===0?-1:1;
            const y=building.y-building.height*.34+(row/(Math.max(1,rows-1)))*building.height*.62;
            const x=building.x+side*building.width*.23;
            lightPositions.push(x,y,building.z+building.depth*.52+.018);
            const c=(index+row)%3===0?gold:cyan;
            lightColors.push(c.r,c.g,c.b);
          }
        });
        const cityLightGeometry=new THREE.BufferGeometry();
        cityLightGeometry.setAttribute('position',new THREE.Float32BufferAttribute(lightPositions,3));
        cityLightGeometry.setAttribute('color',new THREE.Float32BufferAttribute(lightColors,3));
        const cityLights=new THREE.Points(
          cityLightGeometry,
          new THREE.PointsMaterial({
            size:.045,
            sizeAttenuation:true,
            vertexColors:true,
            transparent:true,
            opacity:.72,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
          })
        );
        cityLights.name='Fenêtres habitées · batch lumineux';
        cityRig.add(cityLights);

        const plazaMaterial=new THREE.MeshBasicMaterial({
          color:0x2b8eb7,
          transparent:true,
          opacity:.10,
          blending:THREE.AdditiveBlending,
          depthWrite:false,
        });
        const plaza=new THREE.Mesh(new THREE.RingGeometry(2.75,3.15,64),plazaMaterial);
        plaza.rotation.x=-Math.PI/2;
        plaza.position.set(0,-2.585,-.55);
        cityRig.add(plaza);

        ambientRig=new THREE.Group();
        ambientRig.position.z=-.42;
        scene.add(ambientRig);

        const goldOrbit=new THREE.Mesh(
          new THREE.TorusGeometry(2.93,.013,6,144),
          new THREE.MeshBasicMaterial({
            color:0xe8b84d,
            transparent:true,
            opacity:.30,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
          })
        );
        goldOrbit.rotation.x=1.08;
        goldOrbit.rotation.y=.34;
        goldOrbit.userData.orbit=true;
        ambientRig.add(goldOrbit);

        const cyanOrbit=new THREE.Mesh(
          new THREE.TorusGeometry(3.13,.010,6,144),
          new THREE.MeshBasicMaterial({
            color:0x51ddff,
            transparent:true,
            opacity:.24,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
          })
        );
        cyanOrbit.rotation.x=.72;
        cyanOrbit.rotation.y=-.44;
        cyanOrbit.userData.orbit=true;
        ambientRig.add(cyanOrbit);

        const count=72;
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
            size:.03,
            sizeAttenuation:true,
            transparent:true,
            opacity:.48,
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
        camera.position.z=menuMode?(mobile?11.45:11.70):(mobile?8.85:8.45);
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
