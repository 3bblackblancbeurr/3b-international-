"""Original open courtyard and irrigation kit, Blender 4.5. No third-party models.
Exports the same authored geometry to GLB (web), FBX (Unreal), and editable .blend.
blender --background --python scripts/build-living-places.py
"""
import bpy,math,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/world/places';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT.parent/'3b-unreal/ArtSource/LivingPlaces';SOURCE.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.76;p.inputs['Metallic'].default_value=metal;return m
plaster=mat('Limewashed ochre',(.67,.35,.22));sand=mat('Carved sandstone',(.81,.66,.44));cream=mat('Ivory plaster',(.87,.8,.64));teal=mat('Glazed teal zellij',(.04,.31,.3));blue=mat('Cobalt zellij',(.055,.15,.29));gold=mat('Hammered brass',(.64,.43,.16),.55);wood=mat('Carved cedar',(.23,.115,.065));red=mat('Woven saffron',(.69,.29,.12));green=mat('Living leaves',(.19,.37,.2));earth=mat('Cultivated soil',(.25,.19,.11));water=mat('Spring water',(.08,.43,.45),.2)
def box(name,pos,size,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Hand softened edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def cyl(name,pos,r,h,m,n=20):
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=h,location=pos);o=bpy.context.object;o.name=name;o.data.materials.append(m);return o
def sphere(name,pos,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=pos);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m)
 return o
def arch(x,y,z,w,h,m,rotation=0):
 # Continuous horseshoe band; individual keystones are joined at export.
 parts=[];r=w/2;spring=h-r
 for side in [-1,1]:parts.append(box('Pillar',(x+side*(r+.18),y,z+spring/2),(.36,.58,spring),m,.035))
 for i in range(24):
  a=(i+.5)/24*math.pi;o=box('Arch stone',(x+math.cos(a)*(r+.16),y,z+spring+math.sin(a)*(r+.16)),(.29,.62,.36),m,.018);o.rotation_euler.y=math.pi/2-a;parts.append(o)
 if rotation:
  for o in parts:
   dx,dy=o.location.x-x,o.location.y-y;o.location.x=x+dx*math.cos(rotation)-dy*math.sin(rotation);o.location.y=y+dx*math.sin(rotation)+dy*math.cos(rotation);o.rotation_euler.z+=rotation
def mosaic(x,y,z,w,h):
 box('Tile backing',(x,y,z),(w,.12,h),teal)
 for row in range(int(h/.32)):
  for col in range(int(w/.32)):
   o=box('Zellij star',(x-w/2+.16+col*.32,y-.072,z-h/2+.16+row*.32),(.18,.035,.18),cream if (row+col)%3 else blue);o.rotation_euler.y=math.pi/4
def lamp(x,y,z):
 cyl('Lantern chain',(x,y,z+.5),.025,1,gold,8);o=cyl('Lantern cage',(x,y,z),.24,.55,gold,6);sphere('Amber glass',(x,y,z),(.15,.15,.25),cream)
def start():return set(bpy.context.scene.objects)
def finish(name,before):
 parts=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH'];parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent)
 by={}
 for o in parts:by.setdefault(o.data.materials[0].name,[]).append(o)
 for key,group in by.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object;o.name=name+'_'+key.replace(' ','_');o.parent=parent
  bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
 return parent

b=start()
# Walkable riad: open central court, entrances on every side, no camera-blocking roof.
box('Court pavement',(0,0,.035),(19,19,.07),cream)
for side in [-1,1]:
 for j in [-1,0,1]:
  arch(j*4.7,side*7.4,0,3.75,4.8,sand)
  arch(side*7.4,j*4.7,0,3.75,4.8,sand,math.pi/2)
 box('Cedar arcade beam',(0,side*7.4,5.05),(17,.7,.32),wood,.04)
 box('Cedar arcade beam',(side*7.4,0,5.05),(.7,17,.32),wood,.04)
 for j in [-1,1]:
  box('Ochre return',(side*8.4,j*5.6,2.8),(1.15,3.7,5.6),plaster,.08)
  mosaic(j*5.5,side*8.8,1.1,3.4,1.75)
 for x in [-4.7,4.7]:lamp(x,side*7.2,3.8)
for r,h in [(1.65,.28),(1.25,.48),(.3,1.15)]:cyl('Fountain carved basin',(0,0,h/2),r,h,sand,48)
cyl('Fountain mirror',(0,0,.49),1.15,.025,water,48)
for a in range(8):
 t=a/8*math.tau;box('Fountain rim',(math.cos(t)*1.55,math.sin(t)*1.55,.38),(.7,.4,.2),teal,.05).rotation_euler.z=t+math.pi/2
for x,y in [(-4,-4),(4,-4),(-4,4),(4,4)]:
 cyl('Orange planter',(x,y,.4),.85,.8,sand);cyl('Orange trunk',(x,y,1.5),.08,2.2,wood)
 sphere('Orange foliage',(x,y,2.6),(1.1,1.1,.95),green)
 for j in range(5):a=j*2.4;sphere('Orange fruit',(x+math.cos(a)*.85,y+math.sin(a)*.85,2.4+j*.1),(.09,.09,.09),red)
for x in [-3,3]:box('Cedar bench',(x,5.3,.58),(2.2,.7,.16),wood,.04)
for x in [-7,-6.3,-5.6]:
 for y in [6.5,7.2,7.9]:box('Lattice shade',(x,y,5.5),(.08,3,.08),wood)
# Small roof pavilion provides a recognisable silhouette.
box('Corner tower',(-8,8,6.3),(2.6,2.6,12.6),plaster,.05)
for z in [6,9.5,12.6]:box('Tower belt',(-8,8,z),(2.85,2.85,.2),sand,.025)
for x in [-8.8,-8,-7.2]:box('Tower crenel', (x,6.8,13.05),(.42,.42,.7),sand,.025)
arch(-8,6.66,8,1.1,2.3,cream);box('Tower inset',(-8,6.65,9.1),(.95,.08,1.9),teal)
finish('Riad',b)

b=start()
for i in range(4):arch(-7.5+i*5,0,0,4,4.1,sand)
box('Water channel', (0,0,4.6),(20,1.4,.3),sand,.07)
for y in [-.68,.68]:box('Channel curb',(0,y,4.95),(20,.18,.5),sand,.03)
box('Flowing water',(0,0,4.82),(19.8,1.1,.03),water)
for x in [-7.5,7.5]:
 cyl('Wheel axle',(x,-1,2),.15,1,wood)
 for i in range(8):
  o=box('Waterwheel spoke',(x,-1.1,2),(.12,.14,3.5),wood,.015);o.rotation_euler.y=i*math.pi/4
  a=i*math.pi/4;o=box('Wheel paddle',(x+math.sin(a)*1.6,-1.1,2+math.cos(a)*1.6),(.7,.5,.18),wood,.025);o.rotation_euler.y=a
finish('Aqueduct',b)

b=start()
for i in range(3):
 y=i*3.5;z=i*.45
 box('Terrace stone',(0,y,z-.3),(17,3.25,.6),sand,.05);box('Irrigated earth',(0,y,z+.025),(16.5,2.9,.06),earth)
 for x in range(-7,8):
  for yy in [-.8,0,.8]:sphere('Crop',(x,y+yy,z+.28),(.25,.25,.35),green)
 box('Irrigation ribbon',(0,y+1.42,z+.065),(16.5,.12,.05),water)
finish('Terraces',b)

b=start()
for i in range(8):
 a=i*math.tau/8;x,y=math.cos(a)*6,math.sin(a)*6;cyl('Union pillar',(x,y,2.6),.27,5.2,cream);cyl('Union capital',(x,y,5.1),.48,.25,gold)
 for j in [-1,1]:sphere('Carved leaf',(x+j*.2,y,4.8),(.12,.22,.4),sand)
box('Workshop table',(0,0,1.05),(3.5,1.4,.22),wood,.08)
for x in [-1.4,1.4]:box('Table trestle',(x,0,.5),(.18,1.2,1),wood)
for i in range(10):box('Folded fabric',(-1.2+(i%5)*.6,0,1.25+(i//5)*.1),(.5,.8,.12),[red,teal,cream,blue,green][i%5],.025)
finish('UnionWorkshop',b)

# Keep kit roots co-located in the library; each game places only the desired root.
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'LivingPlaces.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'living-places.glb'),export_format='GLB',export_yup=True,export_animations=False,export_materials='EXPORT')
manifest={}
for name in ['Riad','Aqueduct','Terraces','UnionWorkshop']:
 parent=bpy.data.objects[name];bpy.ops.object.select_all(action='DESELECT');parent.select_set(True)
 for child in parent.children:child.select_set(True)
 bpy.context.view_layer.objects.active=parent
 bpy.ops.export_scene.fbx(filepath=str(SOURCE/(name+'.fbx')),use_selection=True,object_types={'MESH','EMPTY'},apply_unit_scale=True,global_scale=1,axis_forward='-Y',axis_up='Z',bake_anim=False)
 manifest[name]={'meshes':len(parent.children),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in parent.children)}
(OUT/'manifest.json').write_text(json.dumps({'generator':'Blender 4.5 local','style':'Original stylised architecture inspired by Moroccan courtyards, not a surveyed replica','assets':manifest},indent=2))
print(json.dumps(manifest))
