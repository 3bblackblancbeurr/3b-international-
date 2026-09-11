"""Local animated reinterpretation of the blue-and-gold Coq Supreme (C165).
Run with Blender in background mode. No paid generation service or remote asset.
"""
from pathlib import Path
import bpy, math
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]/'public/world/card-models'
def rgba(color):
    values=[int(color[i:i+2],16)/255 for i in [1,3,5]]
    return tuple(((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in values)+(1,)
def mat(name,color,metal=0,rough=.65,glow=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=rgba(color);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if glow:p.inputs['Emission Color'].default_value=rgba(color);p.inputs['Emission Strength'].default_value=glow
    return m
def finish(name,scale,material,parent):
    o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);o.parent=parent
    for polygon in o.data.polygons:polygon.use_smooth=True
    return o
def sphere(name,p,s,m,group=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=p);return finish(name,s,m,group)
def cyl(name,p,r,h,m,vertices=20,group=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=p);return finish(name,(1,1,1),m,group)
def cone(name,p,r,h,m,group=None):
    bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r,radius2=0,depth=h,location=p);return finish(name,(1,1,1),m,group)
def beam(name,a,b,r,m,group=None):
    v=Vector(b)-Vector(a);o=cyl(name,(Vector(a)+Vector(b))/2,r,v.length,m,8,group);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
bpy.ops.wm.read_factory_settings(use_empty=True)
blue=mat('Midnight blue feathers','#163c64',.12,.57)
azure=mat('Azure feather edges','#438bac',.2,.48)
gold=mat('Golden hackles','#dab367',.58,.38)
ivory=mat('Ivory beak','#efe0b3',.15,.5)
dark=mat('Obsidian eyes','#10161c',.1,.3)
eye=mat('Eyes of memory','#91dfff',.1,.3,.6)
def joint(name,position=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=position;o.parent=parent;return o
root=joint('CoqSupreme');body=joint('Breath',parent=root)
sphere('Full breast',(0,-.1,1.05),(.37,.50,.52),blue,body)
sphere('Back',(0,.25,1.18),(.31,.42,.33),azure,body)
sphere('Upright neck',(0,-.39,1.46),(.24,.24,.44),gold,body)
head=joint('Head',parent=body)
sphere('Proud head',(0,-.48,1.88),(.19,.22,.24),gold,head)
beak=cone('Beak',(0,-.77,1.85),.1,.3,ivory,group=head);beak.rotation_euler.x=math.pi/2
for side in [-1,1]:
    sphere('Eye socket',(side*.152,-.61,1.94),(.051,.058,.053),dark,head)
    sphere('Luminous iris',(side*.17,-.638,1.947),(.024,.032,.03),eye,head)
    for j in range(5):
        o=sphere('Neck hackle',(side*(.18+j*.015),-.33+j*.06,1.51-j*.08),(.065,.085,.27),gold if j%2 else ivory,body);o.rotation_euler.y=side*-.22
for i in range(5):
    o=cone('Sovereign crest',(0,-.63+i*.10,2.1+math.sin(i/4*math.pi)*.085),.074,.21+math.sin(i/4*math.pi)*.16,gold,group=head);o.scale.x=.65
sphere('Golden wattle',(0,-.66,1.68),(.065,.072,.15),gold,head)
legs=[];wings=[]
for side in [-1,1]:
    wing=joint('Wing'+str(side),(side*.29,.05,1.24),body);wings.append(wing)
    sphere('Shoulder',(side*.09,0,0),(.15,.31,.25),blue,wing)
    for j in range(7):
        o=sphere('Flight feather',(side*(.11+j*.009),.12+j*.045,-.12-j*.032),(.067,.34-j*.018,.13),azure if j%3 else gold,wing);o.rotation_euler.x=-.2-j*.055;o.rotation_euler.z=side*.13
    leg=joint('Leg'+str(side),(side*.18,-.08,.68),root);legs.append(leg)
    sphere('Feathered thigh',(0,0,-.06),(.12,.16,.24),blue,leg)
    beam('Shank',(0,0,-.14),(0,-.05,-.50),.044,gold,leg)
    for toe in [-1,0,1]:
        beam('Toe',(0,-.05,-.51),(toe*.09,-.28,-.56),.026,gold,leg)
        claw=cone('Claw',(toe*.09,-.315,-.558),.026,.1,ivory,group=leg);claw.rotation_euler.x=math.pi/2
tail=joint('Tail fan',(0,.44,1.19),body)
for side in [-1,1]:
    for j in range(6):
        # Long tapered sickle feathers give the bird its recognizable silhouette.
        x=side*(.06+j*.056);o=sphere('Sickle feather',(x,.35+j*.028,.34+j*.067),(.065,.20,.52-j*.018),gold if j%2 else blue,tail);o.rotation_euler.x=-.75+j*.035;o.rotation_euler.y=side*(.12+j*.07)
        beam('Feather spine',(x,.18,.11),(x+side*.07,.70,.76+j*.01),.009,azure,tail)
seal=cyl('Broken Circle medallion',(0,-.53,1.36),.075,.02,gold,24,body);seal.rotation_euler.x=math.pi/2
# Join rigid feathers by joint and material: animation pivots remain independent.
groups={}
for o in list(bpy.context.scene.objects):
    if o.type=='MESH':groups.setdefault((o.parent,o.active_material),[]).append(o)
for objects in groups.values():
    if len(objects)<2:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
parts=[body,head,tail]+legs+wings
for clip in ['Idle','Walk','Run','Attack','Hit','Death','Cast']:
    for o in parts:o.animation_data_create();o.animation_data.action=None;o.rotation_euler=(0,0,0)
    for frame in [1,9,17,25,33]:
        phase=(frame-1)/32*math.tau;moving=clip in ['Walk','Run'];beat=math.sin(phase)
        body.rotation_euler.x=beat*(.035 if clip=='Idle' else .09 if moving else .05)
        if clip=='Attack':body.rotation_euler.x=-max(0,beat)*.38;head.rotation_euler.x=-max(0,beat)*.25
        elif clip=='Hit':body.rotation_euler.x=max(0,beat)*.2
        elif clip=='Death':body.rotation_euler.y=min(1,(frame-1)/24)*1.2
        else:head.rotation_euler.z=beat*.07
        tail.rotation_euler.y=beat*.055
        for i,o in enumerate(legs):o.rotation_euler.x=math.sin(phase+i*math.pi)*(.48 if clip=='Run' else .3) if moving else 0
        for i,o in enumerate(wings):o.rotation_euler.y=(-1 if i else 1)*((.7+beat*.45) if clip=='Cast' else max(0,beat)*.35 if clip=='Attack' else .04+beat*.025)
        for o in parts:o.keyframe_insert(data_path='rotation_euler',frame=frame,group=o.name)
    for o in parts:
        action=o.animation_data.action;action.name=clip+'_'+o.name;o.animation_data.action=None
        track=o.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,action)
        if action.slots:strip.action_slot=action.slots[0]
root['cardId']='C165';root['cardName']='Coq Suprême — France';root['country']='france';root['kind']='guardian';root['adaptation']='Local 3B blue-and-gold avian sculpture, September 2026'
bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(OUT/'C165-v2.glb'),export_format='GLB',export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_extras=True,export_apply=True)
print('COQ_3B_EXPORTED',flush=True)
