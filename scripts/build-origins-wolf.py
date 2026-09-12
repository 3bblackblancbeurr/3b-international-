"""Original articulated wolf for 3B Origins; metres, Blender 4.5 glTF.
Provisional interpretation: no official wolf model was accessible at production time.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/world/origins'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,c,r=.85):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=r;return m
silver=mat('Silver guard hairs',(.42,.45,.46));cream=mat('Warm undercoat',(.76,.73,.65));dark=mat('Charcoal saddle',(.16,.19,.21));black=mat('Nose and pupils',(.018,.022,.027),.35);gold=mat('Amber eyes',(.75,.40,.08),.3)
def group(name,pos,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=pos;o.parent=parent;return o
root=group('Wolf',(0,0,0));body=group('Body',(0,0,.72),root)
def ell(name,pos,size,m,parent=body):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=pos;o.scale=size;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o
ell('Ribcage',(0,0,.02),(.24,.45,.29),silver);ell('Haunches',(0,.36,-.04),(.22,.26,.24),dark)
ell('Breast',(0,-.34,.05),(.24,.24,.34),cream);ell('Saddle',(0,.06,.21),(.21,.42,.12),dark)
head=group('Head',(0,-.43,.27),body);head.scale=(.82,.95,.9);ell('Neck',(0,.10,-.13),(.23,.22,.27),silver,head);ell('Skull',(0,-.04,.03),(.175,.24,.20),silver,head)
ell('Cheek_L',(-.13,-.13,-.06),(.11,.15,.12),cream,head);ell('Cheek_R',(.13,-.13,-.06),(.11,.15,.12),cream,head)
ell('Muzzle',(0,-.29,-.07),(.108,.19,.10),cream,head);ell('Nose',(0,-.448,-.055),(.09,.045,.058),black,head);ell('Jaw',(0,-.26,-.135),(.087,.16,.036),dark,head)
for side in [-1,1]:
 ell('Eye rim',(side*.141,-.19,.066),(.033,.034,.030),dark,head);ell('Amber iris',(side*.153,-.212,.072),(.017,.018,.018),gold,head);ell('Pupil',(side*.161,-.225,.076),(.008,.009,.015),black,head)
 vertices=[(-.078,.065,0),(.078,.065,0),(0,-.07,0),(side*.018,0,.22)];mesh=bpy.data.meshes.new('Ear');mesh.from_pydata(vertices,[],[(0,1,3),(1,2,3),(2,0,3),(0,2,1)]);mesh.materials.append(dark);o=bpy.data.objects.new('Ear',mesh);bpy.context.collection.objects.link(o);o.parent=head;o.location=(side*.133,.025,.18)
legs=[]
for n,(x,y) in enumerate([(-.17,-.29),(.17,-.29),(-.16,.34),(.16,.34)]):
 leg=group('Leg_'+str(n),(x,y,-.07),body);legs.append(leg)
 ell('Upper leg',(0,0,-.15),(.078,.095,.23),silver,leg);ell('Hock',(0,.025,-.34),(.052,.060,.16),cream,leg);ell('Paw',(0,-.045,-.57),(.077,.125,.055),cream,leg)
 for offset in [-.038,0,.038]:ell('Toe',(offset,-.12,-.568),(.022,.03,.024),dark,leg)
tail=group('Tail',(0,.51,0),body)
for j in range(5):ell('Tail plume',(0,j*.115,-j*.066),(.12-j*.017,.16-j*.014,.13-j*.015),silver if j<3 else dark,tail)
# Weld anatomical masses into smooth volumes, retaining the articulated groups.
fur=mat('Original wolf coat',(.8,.8,.8));nodes=fur.node_tree.nodes;links=fur.node_tree.links;attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='FurTint';links.new(attr.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
for parent in [body,head,tail,*legs]:
 pieces=[o for o in list(parent.children) if o.type=='MESH' and not any(s in o.name for s in ['Eye','iris','Pupil','Nose','Ear','Toe'])]
 if len(pieces)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in pieces:o.select_set(True)
 bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();o=bpy.context.object;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=o.modifiers.new('Continuous anatomy','REMESH');mod.mode='VOXEL';mod.voxel_size=.027;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 smooth=o.modifiers.new('Soft coat volumes','SMOOTH');smooth.factor=.55;smooth.iterations=3;bpy.ops.object.modifier_apply(modifier=smooth.name)
 colors=o.data.color_attributes.new(name='FurTint',type='FLOAT_COLOR',domain='POINT');o.data.materials.clear();o.data.materials.append(fur)
 for vertex in o.data.vertices:
  p=vertex.co+o.location;upper=max(0,min(1,(p.z+.08)*2.5));grain=(math.sin(p.x*315+p.z*191)*math.sin(p.y*238+p.x*130)+1)*.035
  grey=.64-upper*.34+grain
  colors.data[vertex.index].color=(grey,grey*.99,grey*.94,1)
 for poly in o.data.polygons:poly.use_smooth=True
# Separate clips use the same articulated hierarchy, with planted neutral paws.
for name,frames,amp in [('Idle',72,.018),('Walk',32,.35),('Run',22,.56),('Sniff',65,.05),('Wait',72,0)]:
 for o in [body,head,tail,*legs]:
  if o.animation_data:o.animation_data.action=None
 for frame in range(0,frames+1,4):
  t=frame/frames*math.tau
  body.location.z=.72+(math.cos(t*2)*.017 if name in ['Walk','Run'] else math.sin(t)*.007);body.keyframe_insert('location',frame=frame)
  for n,leg in enumerate(legs):leg.rotation_euler.x=math.sin(t+(0 if n in [0,3] else math.pi))*amp;leg.keyframe_insert('rotation_euler',frame=frame)
  head.rotation_euler.x=.65+math.sin(t)*.1 if name=='Sniff' else math.sin(t)*.026;head.rotation_euler.z=math.sin(t)*.04;head.keyframe_insert('rotation_euler',frame=frame)
  tail.rotation_euler.z=math.sin(t)*(.16 if name=='Idle' else .07);tail.keyframe_insert('rotation_euler',frame=frame)
 for o in [body,head,tail,*legs]:
  if o.animation_data and o.animation_data.action:
   action=o.animation_data.action;action.name=name+'_'+o.name
   track=o.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,0,action);o.animation_data.action=None
for o in [body,head,tail,*legs]:o.rotation_euler=(0,0,0)
body.location.z=.72
bpy.context.scene.render.fps=30
source=ROOT.parent/'3b-unreal/ArtSource/Origins';source.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(source/'Wolf.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'wolf.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_yup=True)
print('WOLF_EXPORTED',OUT/'wolf.glb')
