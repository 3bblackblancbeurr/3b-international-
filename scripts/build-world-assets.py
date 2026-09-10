"""Blender 4.5: reproducible original 3B models, rig and Nexus architecture.
blender --background --python scripts/build-world-assets.py -- MODELS_DIR SOURCE_DIR
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector

args=sys.argv[sys.argv.index('--')+1:]
OUT=Path(args[0]); SOURCE=Path(args[1]); OUT.mkdir(parents=True,exist_ok=True); SOURCE.mkdir(parents=True,exist_ok=True)
random.seed(832)

def clean():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,hex,metal=0,rough=.75):
    srgb=tuple(int(hex[i:i+2],16)/255 for i in (0,2,4))
    color=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in srgb)
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m
def finish(o,name,material,bone=None,smooth=True):
    o.name=name; o.data.materials.append(material)
    if smooth:
        for p in o.data.polygons:p.use_smooth=True
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bone:o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE')
    return o
def sphere(name,loc,scale,m,bone=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=loc);o=bpy.context.object;o.scale=scale
    return finish(o,name,m,bone)
def cube(name,loc,scale,m,bevel=.04,bone=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale;finish(o,name,m,bone,False)
    if bevel:
        mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def cylinder(name,loc,r,depth,m,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc);return finish(bpy.context.object,name,m)
def ring(name,loc,r,thickness,m,rotation=(0,0,0),scale=(1,1,1)):
    bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=6,location=loc,major_radius=r,minor_radius=thickness,rotation=rotation);o=bpy.context.object;o.scale=scale;return finish(o,name,m)
def tube(name,a,b,r1,r2,m,bone):
    delta=Vector(b)-Vector(a);mid=(Vector(a)+Vector(b))/2
    bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=r1,radius2=r2,depth=delta.length,location=mid);o=bpy.context.object;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return finish(o,name,m,bone)
def text(name,body,loc,size,m,rotation,bone=None):
    bpy.ops.object.text_add(location=loc,rotation=rotation);o=bpy.context.object;o.data.body=body;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.001;o.data.bevel_depth=.001
    bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,m,bone)
def join_objects(objects,name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;return o
def save_export(name):
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')),compress=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_materials='EXPORT',export_cameras=False,export_lights=False)

clean()
cloth=mat('Kaïs · black technical cotton','151d27',.03,.89);trim=mat('Kaïs · graphite panels','253342',.12,.65)
gold=mat('3B · brushed champagne','c6a266',.68,.35);skin=mat('Kaïs · warm skin','997053',0,.88);dark=mat('Hood inner shadow','080e17');ivory=mat('Sneaker ivory sole','d4d8d2')
# Bind pose is upright, arms down with a slight natural spread. Each articulated
# segment shares its bone and remains attached through overlapping cloth joints.
sphere('Hoodie torso',(0,0,1.18),(.255,.145,.32),cloth,'Spine')
cube('Ribbed waistband',(0,0,.955),(.42,.255,.1),trim,.035,'Hips')
sphere('Trouser hips',(0,0,.88),(.208,.129,.14),cloth,'Hips')
cube('Kangaroo pocket',(0,-.139,1.10),(.28,.033,.12),trim,.028,'Spine')
cube('Zip',(0,-.149,1.30),(.008,.012,.20),gold,.002,'Spine')
for side in [-1,1]:
    s='L' if side>0 else 'R';x=side*.115
    tube('Thigh '+s,(x,0,.88),(side*.12,-.008,.49),.097,.08,cloth,'Thigh.'+s)
    sphere('Knee '+s,(side*.12,-.008,.49),(.081,.085,.095),trim,'Shin.'+s)
    tube('Calf '+s,(side*.12,0,.49),(side*.12,.018,.13),.079,.049,cloth,'Shin.'+s)
    cube('Cargo pocket '+s,(side*.20,-.008,.70),(.058,.11,.16),trim,.022,'Thigh.'+s)
    cube('Pocket clasp '+s,(side*.235,-.055,.75),(.018,.022,.014),gold,.003,'Thigh.'+s)
    cube('Sole '+s,(side*.12,-.041,.045),(.123,.255,.045),ivory,.018,'Foot.'+s)
    sphere('Sneaker '+s,(side*.12,-.04,.10),(.063,.129,.07),cloth,'Foot.'+s)
    for j in range(3):cube('Lace '+s,(side*.12,-.065+j*.024,.159-j*.002),(.067,.008,.007),ivory,.001,'Foot.'+s)
    a=(side*.228,0,1.37);b=(side*.31,-.006,1.12);c=(side*.365,-.032,.905)
    sphere('Shoulder '+s,a,(.105,.11,.105),cloth,'Arm.'+s)
    tube('Sleeve '+s,a,b,.098,.073,cloth,'Arm.'+s)
    sphere('Elbow '+s,b,(.074,.076,.081),cloth,'Forearm.'+s)
    tube('Forearm '+s,b,c,.075,.046,cloth,'Forearm.'+s)
    sphere('Cuff '+s,c,(.05,.052,.032),gold,'Forearm.'+s)
    sphere('Glove '+s,(side*.374,-.04,.852),(.05,.048,.073),dark,'Hand.'+s)
    sphere('Thumb '+s,(side*.338,-.074,.852),(.022,.024,.038),trim,'Hand.'+s)
    tube('Hood drawstring '+s,(side*.065,-.143,1.45),(side*.068,-.156,1.32),.007,.006,gold,'Spine')
# Hood is an open shell, not a billboard. The face sits behind its front rim.
verts=[];faces=[];rings=[(1.43,.13,.125),(1.50,.19,.17),(1.62,.205,.185),(1.75,.174,.155),(1.84,.075,.09),(1.855,.015,.04)]
for z,rx,ry in rings:
    for i in range(19):
        a=-math.pi*.18+i/18*math.pi*1.36
        verts.append((math.cos(a)*rx,math.sin(a)*ry+.012,z))
for j in range(len(rings)-1):
    for i in range(18):a=j*19+i;faces.append((a,a+1,a+20,a+19))
me=bpy.data.meshes.new('Open tailored hood');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Hood',me);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;finish(o,'Tailored hood',cloth,'Head')
sphere('Face',(0,-.052,1.657),(.105,.089,.133),skin,'Head')
sphere('Short beard',(0,-.058,1.59),(.094,.083,.057),dark,'Head')
sphere('Nose',(0,-.142,1.652),(.021,.031,.032),skin,'Head')
for side in [-1,1]:
    sphere('Eye socket',(side*.039,-.132,1.686),(.024,.011,.013),dark,'Head')
    sphere('Eye',(side*.039,-.142,1.687),(.009,.004,.005),ivory,'Head')
    cube('Brow',(side*.04,-.134,1.706),(.048,.012,.012),dark,.004,'Head')
text('Chest monogram','3B',(.108,-.153,1.332),.075,gold,(math.pi/2,0,0),'Spine')
text('Back monogram','3B',(0,.147,1.29),.20,gold,(math.pi/2,0,math.pi),'Spine')
mesh=join_objects([o for o in bpy.context.scene.objects if o.type=='MESH'],'Kais_3B')
bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0));rig=bpy.context.object;rig.name='KaisRig';bones=rig.data.edit_bones;bones.remove(bones[0])
def bone(name,head,tail,parent=None):
    b=bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=bones[parent]
bone('Root',(0,0,0),(0,0,.15));bone('Hips',(0,0,.88),(0,0,1),'Root');bone('Spine',(0,0,1),(0,0,1.43),'Hips');bone('Head',(0,0,1.43),(0,0,1.83),'Spine')
for side in [-1,1]:
    s='L' if side>0 else 'R';bone('Thigh.'+s,(side*.115,0,.88),(side*.12,-.008,.49),'Hips');bone('Shin.'+s,(side*.12,-.008,.49),(side*.12,.018,.13),'Thigh.'+s);bone('Foot.'+s,(side*.12,.018,.13),(side*.12,-.14,.08),'Shin.'+s)
    bone('Arm.'+s,(side*.228,0,1.37),(side*.31,-.006,1.12),'Spine');bone('Forearm.'+s,(side*.31,-.006,1.12),(side*.365,-.032,.905),'Arm.'+s);bone('Hand.'+s,(side*.365,-.032,.905),(side*.374,-.04,.80),'Forearm.'+s)
bpy.ops.object.mode_set(mode='OBJECT');mesh.parent=rig;mod=mesh.modifiers.new('3B skeletal animation','ARMATURE');mod.object=rig
rig.animation_data_create();bpy.context.scene.render.fps=30
for name,frames,amplitude in [('Idle',60,0),('Walk',30,.42),('Run',22,.72)]:
    action=bpy.data.actions.new(name);rig.animation_data.action=action
    for f in range(1,frames+2):
        phase=(f-1)/frames*2*math.pi
        for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
        rig.pose.bones['Hips'].location.y=(.007*math.sin(phase) if not amplitude else abs(math.sin(phase))*(.023 if name=='Walk' else .045))
        rig.pose.bones['Spine'].rotation_euler.x=.016*math.sin(phase) if not amplitude else -.04 if name=='Walk' else -.10
        for side in [-1,1]:
            s='L' if side>0 else 'R';wave=math.sin(phase+(0 if side>0 else math.pi))
            rig.pose.bones['Thigh.'+s].rotation_euler.x=wave*amplitude
            rig.pose.bones['Shin.'+s].rotation_euler.x=-max(0,-wave)*amplitude*1.25
            rig.pose.bones['Foot.'+s].rotation_euler.x=-wave*amplitude*.30
            rig.pose.bones['Arm.'+s].rotation_euler.x=-wave*amplitude*.7
            rig.pose.bones['Forearm.'+s].rotation_euler.x=.15+(amplitude*.65 if amplitude else .015*math.sin(phase))
        for p in rig.pose.bones:p.keyframe_insert(data_path='rotation_euler',frame=f,group=p.name);p.keyframe_insert(data_path='location',frame=f,group=p.name)
    action.use_fake_user=True
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
save_export('kais-3d')

# The Nexus is a designed garden island with a compass plaza and eight distinct
# stone gates. Baked geometry is joined by material for few GPU draw calls.
clean()
stone=mat('Nexus · warm limestone','ccc3a5');edge=mat('Nexus · island strata','607c75');paving=mat('Nexus · pale travertine','e0d6b6');inlay=mat('Nexus · slate inlay','487c83');gold=mat('Nexus · brass','c4a369',.5,.4);grass=mat('Nexus · sage lawn','608778');wood=mat('Nexus · warm bark','6b6150');leaf=mat('Nexus · olive foliage','457768');leaf2=mat('Nexus · silver foliage','81a18c');water=mat('Nexus · turquoise water','399eaa',.4,.22)
gates=[('france',-22,-24,'7bbdff'),('italie',14,-40,'95e4b6'),('estonie',43,-24,'9ce8f4'),('turquie',42,13,'e9a4e8'),('algerie',24,42,'b8dda2'),('tunisie',-9,47,'ffb3a4'),('maroc',-42,25,'f7c77e'),('espagne',-48,-8,'ff9e86')]
def world(x,y,z):return (x,-z,y)
def wcube(name,x,y,z,scale,m,bevel=.08):return cube(name,world(x,y,z),(scale[0],scale[2],scale[1]),m,bevel)
def wcyl(name,x,y,z,r,h,m,v=64):return cylinder(name,world(x,y,z),r,h,m,v)
def wring(name,x,y,z,r,t,m):return ring(name,world(x,y,z),r,t,m)
wcyl('Island cliffs',0,-3,0,77,6,edge,96);wcyl('Lawn',0,-.18,0,76,.35,grass,96)
wcyl('Compass plaza',0,-.025,0,14,.07,paving,96)
for r in [5,11.7,13.6]:wring('Compass inlay',0,.025,0,r,.045,gold)
for i in range(16):
    a=i/16*math.pi*2;v=[world(math.sin(a)*4,.035,math.cos(a)*4),world(math.sin(a+.032)*10.8,.035,math.cos(a+.032)*10.8),world(math.sin(a)*12.8,.035,math.cos(a)*12.8),world(math.sin(a-.032)*10.8,.035,math.cos(a-.032)*10.8)]
    me=bpy.data.meshes.new('Compass ray');me.from_pydata(v,[],[(0,1,2,3)]);ob=bpy.data.objects.new('Compass ray',me);bpy.context.collection.objects.link(ob);ob.data.materials.append(inlay)
obstacles=[]
# The fountain is deliberately off the clear south-north player route.
wcyl('Fountain base',0,.32,-5,3.5,.62,stone);wcyl('Fountain water',0,.65,-5,3.15,.08,water);wring('Fountain brass lip',0,.77,-5,3.2,.12,gold);obstacles.append({'x':0,'z':-5,'r':3.45})
for i in range(3):
    ob=ring('Orrery orbit',world(0,4.3,-5),1.8+i*.2,.048,gold,(math.pi/2,.3+i*.65,i*.65))
sphere('Memory sphere',world(0,4.3,-5),(.75,.75,.75),water)
for n,(name,x,z,color) in enumerate(gates):
    m=mat('Gate · '+name,color,.18,.48)
    wcyl('Gate terrace '+name,x,-.01,z,7.5,.09,paving,48);wring('Gate seal '+name,x,.05,z,6.7,.075,m)
    length=math.hypot(x,z);a=math.atan2(x,z)
    path=wcube('Promenade '+name,x*.53,.015,z*.53,(4.8,.08,length*.76),paving,.02);path.rotation_euler.z=a
    # Tapered pillars, inset panel and continuous semicircular arch.
    for side in [-1,1]:
        px=x+side*4.25
        wcube('Gate footing',px,.32,z,(1.8,.65,1.9),stone)
        wcube('Gate pillar',px,2.65,z,(1.18,4.5,1.25),stone)
        wcube('Gate inset',px,2.7,z+.64,(.5,3.7,.06),m,.02)
        wcube('Capital',px,4.85,z,(1.75,.45,1.7),paving)
        obstacles.append({'x':px,'z':z,'r':.72})
    # Each wedge is real beveled stone. Extra crenels/domes differentiate gates.
    for j in range(15):
        angle=j/14*math.pi;xx=x+math.cos(angle)*4.25;yy=4.8+math.sin(angle)*4.25
        o=wcube('Arch voussoir '+name,xx,yy,z,(.94,1.12,1.42),stone if j%2 else paving,.055);o.rotation_euler.y=math.pi/2-angle
    text('Country '+name,name.upper(),world(x,9.8,z+.12),.55,gold,(math.pi/2,0,0))
    wcube('Crown',x,9.3,z,(1.3,.6,1.7),m)
    if n in [1,3,4]:sphere('Crown dome',world(x,10,z),(.74,.74,.58),m)
    elif n in [2,6]:
        bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=.65,radius2=0,depth=1.5,location=world(x,10.1,z));finish(bpy.context.object,'Crown crystal',m)
    # Paired raised gardens sit outside each travel corridor.
    for side in [-1,1]:
        tx=x+side*9.4;tz=z-2
        if math.hypot(tx,tz)>69:continue
        wcyl('Garden rim',tx,.30,tz,2.1,.6,stone,24);wcyl('Garden soil',tx,.59,tz,1.92,.10,grass,24)
        wcyl('Olive trunk',tx,2.2,tz,.28,3.8,wood,10)
        for j in range(5):
            a=j/5*math.pi*2;sphere('Olive canopy',world(tx+math.sin(a)*1.15,4.9+(j%2)*.6,tz+math.cos(a)*1.15),(1.7,1.6,1.6),leaf if j%2 else leaf2)
        obstacles.append({'x':tx,'z':tz,'r':2})
    # Monument benches beside the entrance.
    for side in [-1,1]:
        bx=x+side*5.9;bz=z+6
        wcube('Bench',bx,.8,bz,(3.1,.3,1.25),paving)
        for k in [-1,1]:wcube('Bench foot',bx+k,.35,bz,(.3,.7,.85),stone)
        obstacles.append({'x':bx,'z':bz,'r':1.4})
# Garden pockets occupy the spaces between promenades, leaving all routes open.
lavender=mat('Nexus · lavender blooms','9890b6');flowers=mat('Nexus · amber blooms','d7ad69')
def route_distance(x,z,gx,gz):
    t=max(0,min(1,(x*gx+z*gz)/(gx*gx+gz*gz)));return math.hypot(x-t*gx,z-t*gz)
for i in range(28):
    a=i/28*math.pi*2+.1;r=25+(i%3)*12;x=math.sin(a)*r;z=math.cos(a)*r
    if min(route_distance(x,z,gx,gz) for _,gx,gz,_ in gates)<7:continue
    if any(math.hypot(x-o['x'],z-o['z'])<o['r']+5 for o in obstacles):continue
    wcyl('Garden pocket',x,.16,z,3.3,.32,stone,24);wcyl('Garden bed',x,.34,z,3.1,.08,grass,24)
    for j in range(9):
        b=j/9*math.pi*2;xx=x+math.sin(b)*1.9;zz=z+math.cos(b)*1.9
        sphere('Flower shrub',world(xx,.7,zz),(.7,.65,.55),leaf if j%3 else leaf2)
        for k in range(3):
            sphere('Flower',world(xx+random.uniform(-.4,.4),1.14+random.random()*.16,zz+random.uniform(-.4,.4)),(.11,.11,.17),lavender if i%2 else flowers)
    obstacles.append({'x':x,'z':z,'r':3.3})
# Embedded tiles and fine brass borders give the promenades a readable scale.
for name,x,z,color in gates:
    length=math.hypot(x,z);a=math.atan2(x,z)
    for side in [-1,1]:
        px=x*.55+math.cos(a)*side*2.25;pz=z*.55-math.sin(a)*side*2.25
        o=wcube('Promenade inlay',px,.062,pz,(.075,.015,length*.62),gold,.005);o.rotation_euler.z=a
    for j in range(5,int(length/2.4)-2):
        t=j*2.4/length;o=wcube('Paving joint',x*t,.063,z*t,(4.2,.012,.035),inlay,.002);o.rotation_euler.z=a
# Low perimeter balustrade, keeping wide gaps by entry zones.
for i in range(64):
    a=i/64*math.pi*2;x=math.sin(a)*72;z=math.cos(a)*72
    o=wcube('Perimeter coping',x,1.0,z,(5.9,.28,.65),paving);o.rotation_euler.z=a
    wcyl('Balustrade pier',x,.48,z,.31,.96,stone,8)
# Join per material: architectural detail without hundreds of draw calls.
groups={}
for o in list(bpy.context.scene.objects):
    if o.type=='MESH':groups.setdefault(o.data.materials[0].name,[]).append(o)
for name,objects in groups.items():join_objects(objects,name)
save_export('nexus-garden')
(OUT/'nexus-collisions.json').write_text(json.dumps(obstacles,separators=(',',':')))
print('3B_ASSETS_COMPLETE',json.dumps({p.name:p.stat().st_size for p in OUT.iterdir() if p.is_file()}))
