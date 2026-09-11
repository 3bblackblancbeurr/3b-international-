"""Original Paris / 3B district kit. Blender 4.5, metres in the game coordinate scale.
Run blender --background --python scripts/build-paris-district.py.
Editable source stays outside public; GLBs are grouped per material and LOD.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/world/paris';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT.parent/'3b-unreal/ArtSource/Paris';SOURCE.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.7):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
stone=mat('Paris limestone',(.78,.72,.59));cream=mat('Carved ivory',(.9,.84,.7));slate=mat('Zinc slate',(.16,.23,.25),.5,.45);gold=mat('Brushed champagne',(.61,.4,.16),.72,.33);iron=mat('Forged midnight',(.038,.075,.074),.65,.42);glass=mat('Window blue',(.07,.2,.23),.42,.2);wood=mat('Walnut',(.19,.085,.035));teal=mat('3B petrol',(.028,.17,.18));red=mat('Terracotta',(.46,.13,.08));linen=mat('Canvas ivory',(.83,.75,.55));light=mat('Warm light',(.95,.63,.24),0,.25);green=mat('Leaves',(.11,.24,.065));water=mat('Water',(.065,.28,.32),.4,.19)
p=light.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.57,.18,1);p.inputs['Emission Strength'].default_value=.65
parts=[]
def box(name,pos,size,m,bevel=0):
 x,y,z=pos;a,b,c=[n/2 for n in size];v=[(sx*a,sy*b,sz*c) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);mesh.materials.append(m);o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=pos;parts.append(o)
 if bevel:mod=o.modifiers.new('Dressed edges','BEVEL');mod.width=bevel;mod.segments=2
 return o
def rod(name,a,b,r,m,n=8):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(m);parts.append(o);return o
def cyl(name,x,y,z,r,h,m,n=32):return rod(name,(x,y,z-h/2),(x,y,z+h/2),r,m,n)
def text(label,x,y,z,size=.5,m=gold):
 curve=bpy.data.curves.new(label,'FONT');curve.body=label;curve.align_x='CENTER';curve.size=size;curve.extrude=.008;o=bpy.data.objects.new(label,curve);bpy.context.collection.objects.link(o);o.location=(x,y,z);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(m);parts.append(o);return o
def arch(x,y,z,w,h,m=cream):
 r=w/2;spring=h-r
 for side in [-1,1]:box('Arch jamb',(x+side*(r+.13),y,z+spring/2),(.3,.4,spring),m,.025)
 for i in range(20):
  a=i*math.pi/20;b=(i+1)*math.pi/20;rod('Arch voussoir',(x+math.cos(a)*(r+.13),y,z+spring+math.sin(a)*(r+.13)),(x+math.cos(b)*(r+.13),y,z+spring+math.sin(b)*(r+.13)),.2,m,6)
def turn_parts(start,angle):
 for o in parts[start:]:
  x,y=o.location.x,o.location.y;o.location.x=x*math.cos(angle)-y*math.sin(angle);o.location.y=x*math.sin(angle)+y*math.cos(angle);o.rotation_euler.rotate_axis('Z',angle)
def window(x,y,z,w=2.3,h=3.8,balcony=False):
 box('Recessed glass',(x,y+.12,z),(w,.1,h),glass)
 for side in [-1,1]:box('Window casing',(x+side*(w/2+.14),y-.08,z),(.27,.42,h+.45),cream,.018)
 for zz in [z-h/2-.15,z+h/2+.15]:box('Window lintel',(x,y-.12,zz),(w+.7,.5,.24),cream,.025)
 box('Mullion',(x,y-.16,z),(.08,.08,h),iron);box('Transom',(x,y-.16,z+.4),(w,.08,.08),iron)
 if balcony:
  box('Balcony stone',(x,y-.75,z-h/2-.1),(w+.9,1.55,.24),cream,.055)
  for zz in [z-h/2+.22,z-h/2+1.12]:rod('Balcony rail',(x-w/2-.38,y-1.45,zz),(x+w/2+.38,y-1.45,zz),.045,iron)
  for n in range(9):
   xx=x-w/2-.3+n*(w+.6)/8;rod('Baluster',(xx,y-1.45,z-h/2+.2),(xx,y-1.45,z-h/2+1.15),.027,iron)
def shell(name,w,d,floors,accent,interior=False):
 h=5.8+floors*4.8
 # Front has real ground-floor openings and the interior rooms have a 4.4-wide door.
 box('Floor',(0,0,.035),(w,d,.07),cream)
 box('Rear wall',(0,d/2,h/2),(w,.5,h),stone,.055)
 for side in [-1,1]:box('Side wall',(side*w/2,0,h/2),(.5,d,h),stone,.055)
 if interior:
  for side in [-1,1]:box('Entrance return',(side*(w+4.4)/4,-d/2,2.8),((w-4.4)/2,.5,5.6),stone,.04)
  box('Entrance lintel',(0,-d/2,5.3),(4.4,.5,.6),cream)
  for side in [-1,1]:
   window(side*6,-d/2-.55,2.6,2.5,3.5)
   arch(side*6,-d/2-.5,.7,2.9,4.1,cream)
   box('Door pilaster',(side*2.55,-d/2-.35,2.8),(.35,.65,5.6),cream,.06)
 else:
  for x in [-w/2+1,0,w/2-1]:box('Shop pier',(x,-d/2,2.7),(1.1,.6,5.4),cream,.05)
  for x in [-w/4,w/4]:window(x,-d/2+.12,2.6,w/2-1.5,4.8)
 for level in range(floors):
  z=6+level*4.8;box('Spandrel',(0,-d/2,z+.15),(w,.55,1.2),stone,.025)
  for i in range(6):box('Facade pier',(-w/2+i*w/5,-d/2,z+2.5),(.88,.55,4.2),stone,.02)
  for i in range(5):window(-w/2+(i+.5)*w/5,-d/2,z+2.45,w/5-1.1,3.35,level==0 or level==floors-1)
  # Every visible elevation is finished, including sides and backs.
  for side in [-1,1]:
   start=len(parts)
   for j in [-1,0,1]:window(j*d*.27,-w/2-.55,z+2.45,2.15,3.35,level==0)
   turn_parts(start,side*math.pi/2)
  start=len(parts)
  for i in range(5):window(-w/2+(i+.5)*w/5,-d/2-.55,z+2.45,w/5-1.1,3.35)
  turn_parts(start,math.pi)
 # Dressed stone corner chains and narrow rustication joints.
 for z in [1+i*.65 for i in range(int((h-1)/.65))]:
  for x in [-w/2,w/2]:
   for y in [-d/2,d/2]:box('Corner quoin',(x,y,z),(.9,.8,.48),cream,.025)
 for z in [1.1,2.1,3.1,4.1]:
  for side in [-1,1]:box('Rustication',(side*w/2+.02,0,z),(.04,d,.035),iron)
 for z in [.3,5.6,h]:
  if interior and z==.3:
   for side in [-1,1]:
    box('Wall skirting',(side*(w/2-.3),0,z),(.4,d,.3),cream,.025)
    box('Wall skirting',(0,side*(d/2-.3),z),(w,.4,.3),cream,.025)
  else:box('Cornice',(0,0,z),(w+.8,d+.65,.3),cream,.065)
 # Two pitched slate roof leaves with a ridge and dormers.
 for side in [-1,1]:
  o=box('Roof',(0,side*d*.245,h+1.55),(w+1,d*.58,.2),slate);o.rotation_euler.x=side*-.48
 box('Roof ridge',(0,0,h+3),(w+.8,.2,.23),iron)
 for x in [-w/3,0,w/3]:
  box('Dormer',(x,-d*.28,h+1.8),(2,1.7,2.6),stone,.035);window(x,-d*.28-.87,h+1.8,1.2,1.7)
  box('Dormer cap',(x,-d*.28,h+3.15),(2.35,2,.18),slate,.02)
 for x in [-w*.35,w*.35]:box('Chimney',(x,d*.24,h+3.3),(1.1,.95,3.3),stone,.04);cyl('Chimney pot',x,d*.24,h+5.05,.3,.6,red,12)
 box('Shop fascia',(0,-d/2-.35,5.12),(w-1,.35,.8),accent,.04);text(name,0,-d/2-.56,4.88,.65)
 for x in [-w*.4,w*.4]:
  rod('Lantern arm',(x,-d/2-.4,4.2),(x,-d/2-1,4.2),.045,iron);cyl('Lantern',x,-d/2-1,3.9,.25,.6,light,8);cyl('Lantern cap',x,-d/2-1,4.25,.33,.13,iron,8)
 # Brass signature at human scale; the monument itself carries no added branding.
 text('3B',0,-d/2-.58,5.94,.5)
 if interior:
  for j in range(24):box('Parquet',(0,-d/2+.35+j*(d-.7)/24,.081),(w-.7,(d-.7)/24-.035,.025),wood if j%3 else linen)
  for x in [-w/2+.65,w/2-.65]:
   for z in [.8,2.2,3.6]:box('Shelves',(x,1,z),(1.1,8,.15),wood,.025)
   for j in range(7):box('Stored supplies',(x,-2.5+j,2.6),(.8,.7,.62),accent if j%2 else linen,.045)
  box('Worktable',(0,4,1.8),(4.4,1.8,.2),wood,.06)
  for x in [-1.7,1.7]:box('Table leg',(x,4,.9),(.18,1.6,1.8),iron)
  for x in [-1.2,0,1.2]:box('Folded fabric',(x,4,2.04),(.85,1.15,.25),accent,.08)
  box('Rug',(0,0,.09),(6,5,.035),accent)
  for side in [-1,1]:
   box('Rug border',(side*2.85,0,.12),(.08,4.75,.02),gold)
   rod('Interior chandelier',(side*5,0,4.8),(side*5,0,3.8),.04,gold);cyl('Interior light',side*5,0,3.7,.5,.12,light,24)
  text('LES LIENS NOUS RECONSTRUISENT',0,d/2-.3,3.2,.36,teal)
def terrace():
 for x in [-6,0,6]:
  cyl('Bistro table',x,-10,1.45,1.05,.12,cream);cyl('Table foot',x,-10,.73,.09,1.45,iron)
  for side in [-1,1]:
   box('Bistro seat',(x+side*1.7,-10,.85),(.95,.95,.12),wood,.08);box('Chair back',(x+side*1.7,-10.4,1.35),(.95,.1,1.1),wood,.05)
   for dx in [-.35,.35]:rod('Chair leg',(x+side*1.7+dx,-10.3,.05),(x+side*1.7+dx,-10.3,.85),.04,iron)
  for yy in [-9.9,-10.2]:cyl('Coffee cup',x+.35,yy,1.65,.1,.22,linen,12)
 for i in range(16):box('Striped awning',(-9.3+i*1.24,-8.5,4.5),(1.24,3.5,.1),teal if i%2 else linen)
def finish(name):
 global parts
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH')
 converted=list(bpy.context.selected_objects)
 # Assign world-scale UVs after modifiers so texture density is consistent.
 for o in converted:
  mesh=o.data;uv=mesh.uv_layers.new(name='UVMap') if not mesh.uv_layers else mesh.uv_layers.active
  for poly in mesh.polygons:
   axis=max(range(3),key=lambda i:abs(poly.normal[i]));dims=[i for i in range(3) if i!=axis]
   for loop in poly.loop_indices:
    p=o.matrix_world@mesh.vertices[mesh.loops[loop].vertex_index].co;uv.data[loop].uv=(p[dims[0]]/3,p[dims[1]]/3)
 group=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(group)
 by={}
 for o in converted:by.setdefault(o.data.materials[0].name,[]).append(o)
 for key,objects in by.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=name+'_'+key;o.parent=group
 bpy.ops.object.select_all(action='DESELECT');group.select_set(True)
 for o in group.children:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
 high=sum(len(o.data.polygons) for o in group.children);low=[]
 for o in list(group.children):
  copy=o.copy();copy.data=o.data.copy();bpy.context.collection.objects.link(copy)
  if o.data.materials[0].name not in ['Window blue','3B petrol','Canvas ivory','Walnut','Terracotta','Warm light']:
   mod=copy.modifiers.new('Distance detail','DECIMATE');mod.ratio=.24
  low.append(copy)
 bpy.ops.object.select_all(action='DESELECT')
 for o in low:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'-lod.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
 for o in low:bpy.data.objects.remove(o,do_unlink=True)
 group.hide_set(True);parts=[];return {'name':name,'sourceFaces':high,'sourceBytes':(OUT/(name+'.glb')).stat().st_size}
manifest=[]
# Eiffel: curved, braced legs on all four faces, open arches and inhabited decks.
levels=[(0,9.5,1.65),(5,8.9,1.5),(10,7.2,1.25),(15,5.7,1.02),(27,3.05,.68),(41,1.75,.48),(53,.76,.3),(58,.4,.17)]
for sx in [-1,1]:
 for sy in [-1,1]:
  box('Eiffel foundation',(sx*9.5,sy*9.5,.35),(4,4,.7),stone,.1)
  for n in range(1,len(levels)):
   z0,r0,w0=levels[n-1];z1,r1,w1=levels[n]
   for u in [-1,1]:
    for v in [-1,1]:rod('Eiffel chord',(sx*r0+u*w0,sy*r0+v*w0,z0),(sx*r1+u*w1,sy*r1+v*w1,z1),.13,gold)
   for j in range(3):
    t=j/3;q=(j+1)/3;a=r0+(r1-r0)*t;b=r0+(r1-r0)*q;wa=w0+(w1-w0)*t;wb=w0+(w1-w0)*q;za=z0+(z1-z0)*t;zb=z0+(z1-z0)*q
    for face in [-1,1]:
     for sign in [-1,1]:
      rod('Eiffel diagonal',(sx*a+sign*wa,sy*a+face*wa,za),(sx*b-sign*wb,sy*b+face*wb,zb),.064,iron)
      rod('Eiffel transverse',(sx*a+face*wa,sy*a+sign*wa,za),(sx*b+face*wb,sy*b-sign*wb,zb),.064,iron)
for z,r in [(15,7.8),(27,4.65),(53,1.65)]:
 for side in [-1,1]:
  box('Observation deck',(0,side*(r-.65),z),(r*2,1.8,.6),iron);box('Observation deck',(side*(r-.65),0,z),(1.8,r*2,.6),iron)
  for zz in [z+.4,z+1.2]:rod('Eiffel rail',(-r,side*r,zz),(r,side*r,zz),.07,gold);rod('Eiffel rail',(side*r,-r,zz),(side*r,r,zz),.07,gold)
  for j in range(int(r*2)):
   x=-r+j;rod('Deck baluster',(x,side*r,z+.35),(x,side*r,z+1.25),.035,iron);rod('Deck baluster',(side*r,x,z+.35),(side*r,x,z+1.25),.035,iron)
for face in range(4):
 start=len(parts);arch(0,-9.5,0,15.8,11.8,iron);angle=face*math.pi/2
 for o in parts[start:]:
  x,y=o.location.x,o.location.y;o.location.x=x*math.cos(angle)-y*math.sin(angle);o.location.y=x*math.sin(angle)+y*math.cos(angle);o.rotation_euler.rotate_axis('Z',angle)
rod('Antenna',(0,0,55),(0,0,64),.13,gold)
manifest.append(finish('Eiffel'))
for name,label,w,d,floors,accent,inside in [('Cafe','CAFE DES LIENS',20,14,3,teal,False),('Maison','MAISON DES VOYAGEURS',18,14,4,iron,False),('Galerie','GALERIE DES MEMOIRES',23,13,2,red,False),('Residence','LES TERRASSES DU CERCLE',18,14,3,teal,False),('Atelier','ATELIER DES VERRIERES',20,17,0,teal,True),('Refuge','REFUGE DES LIENS',20,17,0,red,True)]:
 shell(label,w,d,floors,accent,inside)
 if name=='Cafe':terrace()
 if name=='Refuge':
  for x in [-6,6]:box('Bed base',(x,-1,.5),(2.8,5,1),wood,.06);box('Mattress',(x,-1,1.1),(2.7,4.8,.45),linen,.13);box('Blanket',(x,-1.8,1.35),(2.72,2.7,.08),teal)
 manifest.append(finish(name))
for r,z,h in [(3.5,.22,.44),(2.9,.6,.4),(1.2,1.1,.65),(.7,2.1,1.4),(1.4,2.75,.22)]:cyl('Fountain stone',0,0,z,r,h,cream,64)
cyl('Water mirror',0,0,.85,2.65,.05,water,64)
for i in range(8):
 a=i*math.tau/8;rod('Water stream',(math.cos(a)*1.1,math.sin(a)*1.1,2.8),(math.cos(a)*2.4,math.sin(a)*2.4,.9),.035,water)
manifest.append(finish('Fountain'))
cyl('Kiosk plinth',0,0,.15,2.2,.3,cream,8)
for i in range(8):
 a=i*math.tau/8;x,y=math.cos(a)*1.85,math.sin(a)*1.85;rod('Kiosk pillar',(x,y,.3),(x,y,4.5),.12,iron)
 if i%2:box('Notice panel',(x,y,2.2),(1.2,.18,2.1),teal,.04)
cyl('Kiosk cornice',0,0,4.5,2.25,.25,gold,8);bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=2.6,radius2=.15,depth=1.4,location=(0,0,5.25));o=bpy.context.object;o.data.materials.append(slate);parts.append(o);text('LE CERCLE',0,-1.96,3.2,.38);manifest.append(finish('Kiosk'))
for x in [-4,4]:
 for y in [-4,4]:rod('Pergola column',(x,y,0),(x,y,5),.14,cream)
for i in range(12):box('Pergola shade',(-4.5+i*.82,0,5),(.12,9.5,.2),wood)
for x in [-4.5,4.5]:box('Pergola beam',(x,0,4.8),(.22,9.5,.4),wood)
manifest.append(finish('Pergola'))
for obj in bpy.context.scene.objects:obj.hide_set(False)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'ParisReference.blend'))
(OUT/'manifest.json').write_text(json.dumps({'author':'3B original geometry','generator':'Blender 4.5','models':manifest},indent=2))
print('PARIS_EXPORT_COMPLETE',json.dumps(manifest))
