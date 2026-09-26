"""Generate deterministic France final-art base meshes in Blender headless.

These meshes are production bases, not Gold Master proof. They are exported
as FBX + GLB for import into Unreal and remain replaceable by artist sculpts.
"""
from __future__ import annotations
import bpy, math, os, random
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "SourceArt", "France", "Geometry")
os.makedirs(OUT, exist_ok=True)

def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

def material(name, color):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*color,1)
    mat.roughness=.82
    mat.metallic=.02
    return mat
def roughen(obj, seed, strength=.22, vertical_bias=.0):
    rng=random.Random(seed)
    for v in obj.data.vertices:
        co=v.co
        n=co.normalized() if co.length else Vector((0,0,1))
        wave=(math.sin(co.x*1.71+seed)+math.sin(co.y*2.13-seed*.7)+math.cos(co.z*1.37+seed*.4))/3
        jitter=(rng.random()-.5)*.7
        factor=1+strength*(wave*.72+jitter*.28)+vertical_bias*n.z
        v.co=co*factor
    for p in obj.data.polygons: p.use_smooth=True
    obj.data.update()

def smart_uv(obj):
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(58), island_margin=.025)
    bpy.ops.object.mode_set(mode="OBJECT")

def add_rock(name, dims, seed, subdivisions=4, strength=.2, z=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=(0,0,z))
    obj=bpy.context.object; obj.name=name
    obj.scale=(dims[0]/2,dims[1]/2,dims[2]/2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    roughen(obj,seed,strength)
    smart_uv(obj)
    return obj
def add_island(name, dims, seed):
    parts=[]
    specs=[
      ((0,0,0),(1,.95,.38)),
      ((dims[0]*.05,-dims[1]*.04,-dims[2]*.24),(.82,.76,.34)),
      ((-dims[0]*.07,dims[1]*.06,-dims[2]*.47),(.58,.52,.28)),
    ]
    for i,(loc,scale) in enumerate(specs):
        p=add_rock(name+"_part"+str(i), (dims[0]*scale[0],dims[1]*scale[1],dims[2]*scale[2]),seed+i*17,3,.28,loc[2])
        p.location.x,p.location.y=loc[0],loc[1]
        parts.append(p)
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:p.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    smart_uv(obj)
    return obj

def add_cave(name,length,radius,seed,rings=16,segments=24):
    verts=[];faces=[];rng=random.Random(seed)
    for i in range(rings):
        t=i/(rings-1);y=(t-.5)*length
        center_x=math.sin(t*math.pi*2+seed*.1)*radius*.18
        center_z=math.sin(t*math.pi*1.35+seed*.2)*radius*.12
        rr=radius*(.82+.15*math.sin(t*math.pi*3+seed)+.05*(rng.random()-.5))
        for j in range(segments):
            a=j/segments*math.pi*2
            squash=.86+.08*math.sin(a*2+seed)
            verts.append((center_x+math.cos(a)*rr, y, center_z+math.sin(a)*rr*squash))
    for i in range(rings-1):
        for j in range(segments):
            a=i*segments+j;b=i*segments+(j+1)%segments;c=(i+1)*segments+(j+1)%segments;d=(i+1)*segments+j
            faces.append((a,d,c,b))
    mesh=bpy.data.meshes.new(name+"Mesh");mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    for p in mesh.polygons:p.use_smooth=True
    smart_uv(obj)
    return obj
def export_one(obj, name):
    bpy.ops.object.select_all(action="DESELECT");obj.select_set(True);bpy.context.view_layer.objects.active=obj
    blend=os.path.join(OUT,name+".blend")
    fbx=os.path.join(OUT,name+".fbx")
    glb=os.path.join(OUT,name+".glb")
    bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
    bpy.ops.export_scene.fbx(filepath=fbx,use_selection=True,apply_unit_scale=True,add_leaf_bones=False,mesh_smooth_type="FACE")
    bpy.ops.export_scene.gltf(filepath=glb,use_selection=True,export_format="GLB",export_apply=True)
    return [blend,fbx,glb]

def main():
    clear()
    rock=material("M_Source_Rock",(0.16,0.17,0.18))
    specs=[
      ("SM_FR_Cliff_Master_A","rock",(26,14,34),101),
      ("SM_FR_Cliff_Master_B","rock",(22,18,30),203),
      ("SM_FR_Underside_Rib_A","rock",(10,9,28),307),
      ("SM_FR_Underside_Rib_B","rock",(8,12,24),409),
      ("SM_FR_Island_Rock_A","island",(30,24,18),503),
      ("SM_FR_Island_Rock_B","island",(24,30,20),607),
      ("SM_FR_Cave_Module_A","cave",(24,6,0),709),
      ("SM_FR_Cave_Module_B","cave",(20,7,0),811),
      ("SM_FR_Cave_Entrance_A","cave",(12,9,0),907),
    ]
    outputs=[]
    for name,kind,dims,seed in specs:
        clear()
        if kind=="rock":
            obj=add_rock(name,dims,seed,4,.24)
        elif kind=="island":
            obj=add_island(name,dims,seed)
        else:
            obj=add_cave(name,dims[0],dims[1],seed)
        obj.data.materials.append(rock)
        bpy.context.view_layer.objects.active=obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        outputs.extend(export_one(obj,name))
    print("3B_FRANCE_MESH_EXPORT_OK",len(specs),len(outputs))
    for p in outputs: print(p)

if __name__=="__main__":
    main()
