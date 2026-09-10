"""Build 368 local, stylized 3B card adaptations, keeping source identity metadata.
Characters share Quaternius CC0 topology, with authored clothing, faces and accessories.
Spirits and objects are original parametric sculptures, not image-to-mesh reproductions.
"""
import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];ART=ROOT.parent/'3b-unreal/ArtSource';OUT=ROOT/'public/world/card-models';OUT.mkdir(parents=True,exist_ok=True)
DESIGNS=json.loads((ROOT.parent/'card-designs.json').read_text(encoding='utf8'))
CLIPS={'Idle_Loop':'Idle','Walk_Loop':'Walk','Sprint_Loop':'Run','Punch_Cross':'Attack','Hit_Chest':'Hit','Death01':'Death','Spell_Simple_Shoot':'Cast'}
report=[]

def rgba(h):
    raw=[int(h[i:i+2],16)/255 for i in [1,3,5]]
    return tuple(((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in raw)+(1,)
def mat(name,color,metal=0,rough=.65,glow=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=rgba(color);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=rgba(color);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if glow:p.inputs['Emission Color'].default_value=rgba(color);p.inputs['Emission Strength'].default_value=glow
    return m
def mesh_finish(o,name,scale,material,group=None):
    o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    if group is not None:o.parent=group
    return o
def sphere(name,p,s,m,group=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=p);return mesh_finish(bpy.context.object,name,s,m,group)
def cube(name,p,s,m,bevel=.035,group=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=mesh_finish(bpy.context.object,name,s,m,group)
    if bevel:mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=bevel;mod.segments=2
    return o
def cyl(name,p,r,h,m,vertices=20,group=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=p);return mesh_finish(bpy.context.object,name,(1,1,1),m,group)
def cone(name,p,r,h,m,r2=0,group=None):
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r,radius2=r2,depth=h,location=p);return mesh_finish(bpy.context.object,name,(1,1,1),m,group)
def ring(name,p,r,m,thickness=.025,rotation=(0,0,0),group=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=6,location=p,major_radius=r,minor_radius=thickness,rotation=rotation);return mesh_finish(bpy.context.object,name,(1,1,1),m,group)
def beam(name,a,b,r,m,group=None):
    middle=(Vector(a)+Vector(b))/2;v=Vector(b)-Vector(a);o=cyl(name,middle,r,v.length,m,8,group);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def bone_bind(o,rig,bone):
    matrix=o.matrix_world.copy();o.parent=rig;o.matrix_world=matrix;o.vertex_groups.clear();o.vertex_groups.new(name=bone).add(list(range(len(o.data.vertices))),1,'REPLACE')
    for mod in list(o.modifiers):
        if mod.type=='ARMATURE':o.modifiers.remove(mod)
    mod=o.modifiers.new('3B skin','ARMATURE');mod.object=rig
def append_part(file,rig,label):
    with bpy.data.libraries.load(str(file),link=False) as (a,b):b.objects=a.objects
    for o in b.objects:
        if o.type=='MESH':
            bpy.context.collection.objects.link(o);matrix=o.matrix_world.copy();o.parent=rig;o.matrix_world=matrix;o.name=label
            for mod in o.modifiers:
                if mod.type=='ARMATURE':mod.object=rig
        else:bpy.data.objects.remove(o,do_unlink=True)
def actions_for(rig):
    for a in list(bpy.data.actions):bpy.data.actions.remove(a)
    with bpy.data.libraries.load(str(ART/'Travellers/MotionLibrary.blend'),link=False) as (a,b):b.actions=list(CLIPS)
    rig.animation_data_create();rig.animation_data.action=None
    for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
    for old,label in CLIPS.items():
        action=bpy.data.actions[old];action.name=label;track=rig.animation_data.nla_tracks.new();track.name=label;strip=track.strips.new(label,int(action.frame_range.x),action)
        if action.slots:strip.action_slot=action.slots[0]

def human(d):
    bpy.ops.wm.open_mainfile(filepath=str(ART/'Travellers'/f"Traveller{d['body']*3+d['style']}.blend"))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');rig.name='Armature'
    if d['hair']:append_part(ART/'Travellers'/f"Coiffure{d['hair']}.blend",rig,'Hair')
    append_part(ART/'Travellers'/f"Footwear{d['body']*3+d['boots']}.blend",rig,'Footwear')
    skin=mat('Skin',d['skin'],0,.8);hair=mat('Hair',d['hairColor'],0,.8);cloth=mat('Cloth',d['cloth']);trim=mat('Embroidery',d['trim'],.6,.38);boot=mat('Boots','#252c30',0,.66)
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':continue
        # Keep UV colour/normal maps: facial features and textile detail live in them.
        # Per-card tints are applied by the shared runtime from card-designs.js.
        for i,m in enumerate(o.data.materials):o.data.materials[i]=m.copy()
        if o.data.shape_keys:
            keys=o.data.shape_keys.key_blocks
            for name,value in [('FaceWide',max(0,d['face'])),('FaceNarrow',max(0,-d['face'])),('JawStrong',max(0,d['jaw'])),('JawSoft',max(0,-d['jaw'])),('NoseLarge',max(0,d['nose'])),('NoseSmall',max(0,-d['nose']))]:
                if name in keys:keys[name].value=value
            bpy.context.view_layer.objects.active=o;bpy.ops.object.shape_key_remove(all=True,apply_mix=True)
    # Fine metallic fastenings, layered shoulder piece and a country seal move with the chest.
    for z in [1.02,1.11,1.20,1.29]:bone_bind(sphere('Gold fastening',(.02,-.157,z),(.014,.009,.014),trim),rig,'spine_02')
    for side in [-1,1]:
        o=sphere('Layered shoulder',(.205*side,.0,1.45),(.13,.12,.055),trim if d['ornament']%3==0 else cloth);bone_bind(o,rig,'upperarm_l' if side>0 else 'upperarm_r')
    seal=cyl('Country medallion',(.105,-.186,1.33),.045,.013,trim,16);seal.rotation_euler.x=math.pi/2;bone_bind(seal,rig,'spine_03')
    if d['ornament'] in [1,4,7]:
        for side in [-1,1]:
            o=cube('Tailored lapel',(.12*side,-.14,1.26),(.045,.025,.28),trim,.012);o.rotation_euler.y=side*.27;bone_bind(o,rig,'spine_02')
    if d['ornament'] in [2,5]:
        o=ring('Chain',(.0,-.04,1.43),.14,trim,.012,(.26,0,0));bone_bind(o,rig,'spine_03')
    if d['ornament'] in [3,6]:
        o=cube('Belt satchel',(.20,.0,.91),(.14,.12,.17),cloth);bone_bind(o,rig,'pelvis')
    width=1.075 if d['shape']=='solide' else .945 if d['shape']=='elance' else 1
    rig.scale=(width,width,d['height']);actions_for(rig)
    return rig

def spirit(d):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    fur=mat('Spirit coat',d['cloth'],0,.82);light=mat('Soft muzzle',d['trim'],0,.74);accent=mat('Living eyes',d['accent'],.1,.3,1.3);dark=mat('Nose','#162328');gold=mat('Seal',d['trim'],.5,.45)
    # Jointed quadruped with sculpted tapered silhouette, cheek ruffs and articulated paws.
    root=bpy.data.objects.new('Spirit',None);bpy.context.collection.objects.link(root)
    torso=bpy.data.objects.new('Torso',None);bpy.context.collection.objects.link(torso);torso.parent=root
    sphere('Body',(0,.12,.86),(.30,.66,.35),fur,torso);sphere('Chest',(0,-.29,.99),(.33,.34,.46),fur,torso)
    head=bpy.data.objects.new('Head',None);bpy.context.collection.objects.link(head);head.parent=torso
    sphere('Head',(0,-.55,1.36),(.255,.29,.28),fur,head);sphere('Muzzle',(0,-.78,1.25),(.17,.26,.13),light,head);sphere('Nose',(0,-1.0,1.28),(.09,.05,.06),dark,head)
    long_ears='fennec' in d['name'].lower();lion='lion' in d['name'].lower();bear='ours' in d['name'].lower()
    for side in [-1,1]:
        cone('Ear',(side*.19,-.46,1.63),.1,.34 if long_ears else .22,fur,group=head)
        sphere('Eye',(side*.17,-.775,1.43),(.043,.027,.035),accent,head)
        for j in range(4 if lion else 2):
            o=cone('Carved ruff',(side*(.23+j*.025),-.41+j*.08,1.26-j*.04),.11,.30,light if j%2 else fur,group=head);o.rotation_euler.y=side*-.7
    if bear:
        for o in [torso,head]:o.scale.x=1.3
    limbs=[]
    for front in [True,False]:
        for side in [-1,1]:
            pivot=bpy.data.objects.new(('Fore' if front else 'Hind')+str(side),None);bpy.context.collection.objects.link(pivot);pivot.parent=root;pivot.location=(side*.25,-.31 if front else .54,.82)
            sphere('Upper leg',(side*.25,pivot.location.y,.58),(.115,.15,.33),fur,pivot);sphere('Lower leg',(side*.25,pivot.location.y-.035,.26),(.078,.1,.22),light,pivot);sphere('Paw',(side*.25,pivot.location.y-.09,.09),(.13,.20,.09),fur,pivot)
            # Children were authored in world coordinates; make joint transforms relative.
            for child in pivot.children:child.location-=pivot.location
            limbs.append(pivot)
    tail=bpy.data.objects.new('Tail',None);bpy.context.collection.objects.link(tail);tail.parent=root;tail.location=(0,.66,.95)
    sphere('Tail plume',(0,.25,.1),(.13,.40,.14),fur,tail)
    ring('Collar',(0,-.34,1.13),.28,gold,.025,(math.pi/2,0,0),torso)
    parts=[root,torso,head,tail]+limbs
    for clip in ['Idle','Walk','Run','Attack','Hit','Death','Cast']:
        for o in parts:
            o.animation_data_create();o.animation_data.action=None;o.rotation_euler=(0,0,0)
        frames=[1,9,17,25,33]
        for frame in frames:
            phase=(frame-1)/32*math.tau
            for i,o in enumerate(limbs):
                o.rotation_euler.x=math.sin(phase+(0 if i in [0,3] else math.pi))*(.42 if clip in ['Walk','Run'] else .0);o.keyframe_insert(data_path='rotation_euler',frame=frame,group=o.name)
            head.rotation_euler.x=math.sin(phase)*(.24 if clip in ['Attack','Cast'] else .025)
            torso.rotation_euler.z=(math.sin(phase)*.16 if clip=='Hit' else (min(1,(frame-1)/24)*1.5 if clip=='Death' else 0))
            tail.rotation_euler.z=math.sin(phase)*.22
            for o in [head,torso,tail]:o.keyframe_insert(data_path='rotation_euler',frame=frame,group=o.name)
        for o in parts:
            if not o.animation_data or not o.animation_data.action:continue
            action=o.animation_data.action;action.name=clip+'_'+o.name;o.animation_data.action=None
            track=o.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,action)
            if action.slots:strip.action_slot=action.slots[0]
    return root

def prop(d):
    bpy.ops.wm.read_factory_settings(use_empty=True);kind=d['kind'];n=d['seed'];country=d['country']
    stone=mat('Sculpted stone',d['cloth'],0,.77);metal=mat('Fine brass',d['trim'],.68,.35);glow=mat('Country light',d['accent'],.12,.36,.4);pale=mat('Ivory','#e5d9b5',0,.84)
    root=bpy.data.objects.new(d['id'],None);bpy.context.collection.objects.link(root)
    cyl('Hexagonal plinth',(0,0,.08),.76,.16,stone,8,root);ring('Inlaid rim',(0,0,.17),.62,metal,.017,group=root)
    if kind=='landscape':
        if country=='france':
            for side in [-1,1]:
                for back in [-1,1]:beam('Eiffel iron leg',(side*.42,back*.42,.15),(side*.08,back*.08,1.55),.044,metal,root)
            for z,r in [(.55,.30),(.95,.19),(1.4,.09)]:cube('Eiffel platform',(0,0,z),(r*2,r*2,.045),stone,.009,root)
            cone('Eiffel pinnacle',(0,0,1.65),.05,.3,metal,group=root)
        elif country=='italie':
            for level in range(3):
                z=.26+level*.30;ring('Colosseum tier',(0,0,z+.2),.51,stone,.065,group=root)
                for i in range(16):a=i/16*math.tau;cyl('Arcade pier',(math.cos(a)*.51,math.sin(a)*.51,z+.07),.047,.29,pale,10,root)
        elif country=='estonie':
            for x,y,h in [(-.27,0,.9),(.28,.1,1.1),(0,-.22,.72)]:cyl('Tallinn tower',(x,y,h/2+.15),.16,h,stone,16,root);cone('Gothic roof',(x,y,h+.31),.22,.35,metal,group=root)
            cube('Medieval curtain',(0,.08,.37),(.8,.12,.44),pale,.025,root)
        elif country=='turquie':
            cube('Hagia Sophia volume',(0,0,.4),(.65,.65,.5),pale,.035,root);sphere('Central dome',(0,0,.68),(.37,.37,.29),metal,root)
            for x in [-.47,.47]:
                for y in [-.4,.4]:cyl('Minaret',(x,y,.65),.047,1,stone,12,root);cone('Minaret crown',(x,y,1.24),.067,.19,metal,group=root)
        elif country=='algerie':
            for i in range(3):
                a=i/3*math.tau;beam('Martyrs Memorial petal',(math.cos(a)*.43,math.sin(a)*.43,.2),(math.cos(a+.45)*.07,math.sin(a+.45)*.07,1.24),.10,pale,root)
            cone('Memory crown',(0,0,1.38),.09,.35,metal,group=root)
        elif country=='tunisie':
            for x in [-.42,-.14,.14,.42]:cyl('Carthage column',(x,.05,.62),.065,.84,pale,12,root);cube('Capital',(x,.05,1.06),(.2,.2,.065),metal,.01,root)
            cube('Ancient entablature',(0,.05,1.16),(1.1,.27,.12),pale,.015,root)
        elif country=='maroc':
            cube('Koutoubia minaret',(0,0,.67),(.38,.38,1.05),pale,.028,root);cube('Upper chamber',(0,0,1.28),(.2,.2,.27),stone,.015,root)
            for z in [1.49,1.61,1.70]:sphere('Copper finial',(0,0,z),(.045,.045,.045),metal,root)
            for x in [-.12,.12]:cube('Zellij panel',(x,-.2,.7),(.06,.018,.45),glow,.01,root)
        else:
            for x,h in [(-.38,.85),(-.13,1.25),(.13,1.4),(.38,.95)]:cone('Sagrada spire',(x,0,h/2+.15),.115,h,pale,r2=.035,group=root);sphere('Mosaic crown',(x,0,h+.19),(.075,.075,.10),glow,root)
        # Three separate landscape cards include distinct garden, archive or ruin surroundings.
        for i in range(d['mark']):a=i/max(1,d['mark'])*math.tau;sphere('Garden inlay',(math.cos(a)*.65,math.sin(a)*.65,.22),(.055,.055,.07),glow,root)
    elif kind in ['gate','aura']:
        for x in [-.46,.46]:cube('Gate pillar',(x,0,.71),(.18,.23,1.08),stone,.035,root);cone('Pillar crown',(x,0,1.36),.14,.22,metal,group=root)
        ring('Arched lintel',(0,0,1.07),.47,metal,.058,(math.pi/2,0,0),root)
        sphere('Portal heart',(0,0,.80),(.31,.07,.55),glow,root)
        if kind=='aura':
            for i in range(3):ring('Resonance halo',(0,0,.87),.28+i*.15,glow,.015,(i*.7,.8,i*.4),root)
    elif kind in ['fragment','stone','energy']:
        cone('Lower crystal',(0,0,.56),.29,.70,glow,group=root);o=cone('Upper crystal',(0,0,1.1),.29,.42,glow,group=root);o.rotation_euler.z=(n%8)*.3
        for i in range(3 if kind=='fragment' else 6):a=i/6*math.tau;beam('Brass setting',(math.cos(a)*.43,math.sin(a)*.43,.19),(math.cos(a)*.19,math.sin(a)*.19,.8),.025,metal,root)
        if kind=='energy':ring('Orbit',(0,0,.88),.47,metal,.021,(.5,.4,0),root)
    elif kind=='trap':
        ring('Trap frame',(0,0,.31),.49,metal,.055,group=root)
        for i in range(10):a=i/10*math.tau;o=cone('Runic tooth',(math.cos(a)*.42,math.sin(a)*.42,.52),.065,.34,metal,group=root);o.rotation_euler.y=math.cos(a)*-.5;o.rotation_euler.x=math.sin(a)*.5
        sphere('Snare charge',(0,0,.39),(.20,.20,.10),glow,root)
    elif kind in ['passport','scroll','strategy']:
        o=cube('Leather cover' if kind=='passport' else 'Parchment',(0,0,.4),(.69,.09,.94),stone if kind=='passport' else pale,.035,root);o.rotation_euler.x=-.35
        for z in [.15,.65]:
            o=cyl('Rolled parchment edge' if kind=='scroll' else 'Binding',(0,-.10,z),.065,.79,metal,16,root);o.rotation_euler.y=math.pi/2
        seal=cyl('3B embossed seal',(0,-.13,.47),.13,.015,glow,24,root);seal.rotation_euler.x=math.pi/2
        for i in range(3):cube('Embossed line',(0,-.13,.34-i*.06),(.32-.04*i,.016,.012),metal,.004,root)
        if kind=='strategy':
            for x in [-.34,.34]:cyl('Tactical token',(x,-.20,.32),.09,.24,metal,12,root);sphere('Tactical head',(x,-.20,.49),(.07,.07,.07),glow,root)
    else:
        sphere('Relic vessel',(0,0,.62),(.28,.28,.40),glow,root);cyl('Neck',(0,0,1.0),.12,.20,metal,16,root);cone('Stopper',(0,0,1.18),.16,.18,stone,r2=.08,group=root)
        for side in [-1,1]:ring('Relic handle',(side*.23,0,.73),.16,metal,.025,(math.pi/2,0,0),root)
    root.rotation_euler.z=(n%3-1)*.12
    return root

for d in DESIGNS:
    if '--only' in sys.argv and d['id']!=sys.argv[sys.argv.index('--only')+1]:continue
    if '--shard' in sys.argv:
        shard=int(sys.argv[sys.argv.index('--shard')+1])
        if (d['seed']-1)%4!=shard:continue
    if d['kind']=='person':root=human(d)
    elif d['kind']=='guardian':
        index=['france','italie','estonie','turquie','algerie','tunisie','maroc','espagne'].index(d['country']);bpy.ops.wm.open_mainfile(filepath=str(ART/'Creatures'/f'Creature{index}.blend'));root=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');root.name='Armature';actions_for(root)
    elif d['kind']=='spirit':root=spirit(d)
    else:root=prop(d)
    root['cardId']=d['id'];root['cardName']=d['name'];root['country']=d['country'];root['adaptation']='3B local stylized edition';root['kind']=d['kind']
    for im in bpy.data.images:
        if im.size[0]>256 or im.size[1]>256:scale=256/max(im.size);im.scale(max(1,int(im.size[0]*scale)),max(1,int(im.size[1]*scale)))
    bpy.context.scene.frame_set(1)
    target=OUT/(d['id']+'.glb');bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_extras=True,export_apply=True)
    report.append({'id':d['id'],'kind':d['kind'],'bytes':target.stat().st_size});print('3B_CARD_EXPORTED',d['id'],target.stat().st_size,flush=True)
if '--shard' in sys.argv:(ROOT.parent/f'card-models-shard-{shard}.json').write_text(json.dumps(report))
elif len(report)==368:(OUT/'manifest.json').write_text(json.dumps({'edition':'3b-local-1','cards':report},indent=2))
print('3B_CARDS_COMPLETE',len(report))
