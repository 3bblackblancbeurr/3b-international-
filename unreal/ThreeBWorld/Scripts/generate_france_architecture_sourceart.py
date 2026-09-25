"""Generate France architecture and vegetation source-art bases with Blender."""
from __future__ import annotations
import bpy, math, os, random

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
OUT=os.path.join(ROOT,"SourceArt","France","Architecture")
os.makedirs(OUT,exist_ok=True)

def clear():
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)

def mat(name,color,rough=.72):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color=(*color,1);m.roughness=rough
    return m

STONE=mat("M_Source_Limestone",(0.48,.45,.38),.82)
DARK=mat("M_Source_DarkMetal",(.06,.07,.08),.42)
GOLD=mat("M_Source_Champagne",(.55,.42,.20),.28)
GREEN=mat("M_Source_Green",(.10,.22,.11),.88)
WOOD=mat("M_Source_Wood",(.20,.10,.055),.78)

def cube(name,loc,scale,material,bevel=.08):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new("Bevel","BEVEL");mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(material)
    return o

def cyl(name,loc,radius,depth,material,vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=bpy.context.object;o.name=name;o.data.materials.append(material)
    return o

def join(name,objects):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    return obj
def smart_uv(obj):
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT");bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60),island_margin=.02)
    bpy.ops.object.mode_set(mode="OBJECT")

def facade(name,worker=False):
    parts=[]
    width=14 if not worker else 12;height=18 if not worker else 13;depth=2.2
    parts.append(cube(name+"_body",(0,0,height/2),(width/2,depth/2,height/2),STONE,.12))
    floors=5 if not worker else 4
    cols=5 if not worker else 4
    for floor in range(floors):
        z=2.2+floor*(height-3)/max(1,floors-1)
        for col in range(cols):
            x=-width*.36+col*(width*.72/max(1,cols-1))
            parts.append(cube("window",(x,-depth/2-.06,z),(0.65,.08,.95),DARK,.025))
            if not worker:
                parts.append(cube("lintel",(x,-depth/2-.16,z+1.15),(.82,.16,.10),GOLD,.02))
    if not worker:
        parts.append(cube("cornice",(0,-.1,height+.45),(width*.54,depth*.68,.34),STONE,.12))
        for x in [-4.6,0,4.6]:
            parts.append(cube("balcony",(x,-depth*.72,7.4),(1.55,.55,.12),DARK,.03))
    else:
        parts.append(cube("shopband",(0,-depth*.64,1.55),(width*.43,.24,.16),GOLD,.03))
    obj=join(name,parts);smart_uv(obj);return obj
def tribunal(name):
    p=[]
    p.append(cube("base",(0,0,1),(11,7,1),STONE,.18))
    p.append(cube("hall",(0,1,7),(9,5.5,6),STONE,.18))
    for x in [-6,-3,0,3,6]:
        p.append(cyl("column",(x,-5.2,6.4),.48,9.2,STONE,20))
    p.append(cube("lintel",(0,-5.15,11.1),(8.1,.72,.55),GOLD,.08))
    p.append(cube("steps",(0,-7.5,.45),(9.6,2.0,.45),STONE,.05))
    p.append(cube("justice_line",(0,-5.92,8.0),(5.8,.10,.13),GOLD,.02))
    obj=join(name,p);smart_uv(obj);return obj

def streetkit(name):
    p=[]
    p.append(cube("bench_seat",(-2,0,.55),(1.8,.45,.18),WOOD,.08))
    p.append(cube("bench_back",(-2,.35,1.2),(1.8,.14,.65),WOOD,.08))
    p.append(cyl("lamp",(1.0,0,2.2),.12,4.4,DARK,12))
    p.append(cube("lamp_head",(1.0,0,4.45),(.42,.42,.18),GOLD,.06))
    p.append(cyl("bollard",(3.0,0,.55),.22,1.1,DARK,12))
    p.append(cube("sign",(4.5,0,1.6),(.75,.12,.55),DARK,.06))
    obj=join(name,p);smart_uv(obj);return obj
def tree(name,seed,height=9):
    rng=random.Random(seed);p=[]
    p.append(cyl("trunk",(0,0,height*.42),.45,height*.84,WOOD,14))
    for i in range(7):
        a=i*math.tau/7+rng.random()*.35
        r=1.0+rng.random()*1.6
        z=height*.68+rng.random()*height*.27
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1.0,location=(math.cos(a)*r,math.sin(a)*r,z))
        o=bpy.context.object;o.scale=(1.7+rng.random()*.7,1.5+rng.random()*.7,1.6+rng.random()*.8)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(GREEN);p.append(o)
    obj=join(name,p);smart_uv(obj);return obj

def shrub(name,seed):
    rng=random.Random(seed);p=[]
    for i in range(5):
        a=i*math.tau/5
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(math.cos(a)*.8,math.sin(a)*.7,.65+rng.random()*.35))
        o=bpy.context.object;o.scale=(1.2,.95,.8);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(GREEN);p.append(o)
    obj=join(name,p);smart_uv(obj);return obj
def export(obj,name):
    bpy.ops.object.select_all(action="DESELECT");obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,name+".blend"),copy=True)
    bpy.ops.export_scene.fbx(filepath=os.path.join(OUT,name+".fbx"),use_selection=True,apply_unit_scale=True,add_leaf_bones=False,mesh_smooth_type="FACE")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+".glb"),use_selection=True,export_format="GLB",export_apply=True)

def main():
    jobs=[
      ("SM_FR_Facade_Paris_A",lambda:facade("SM_FR_Facade_Paris_A",False)),
      ("SM_FR_Facade_Worker_A",lambda:facade("SM_FR_Facade_Worker_A",True)),
      ("SM_FR_JusticeTribunal",lambda:tribunal("SM_FR_JusticeTribunal")),
      ("SM_FR_StreetKit_A",lambda:streetkit("SM_FR_StreetKit_A")),
      ("SM_FR_Tree_A",lambda:tree("SM_FR_Tree_A",101,10)),
      ("SM_FR_Tree_B",lambda:tree("SM_FR_Tree_B",211,8.5)),
      ("SM_FR_Shrub_A",lambda:shrub("SM_FR_Shrub_A",307)),
    ]
    for name,fn in jobs:
        clear();obj=fn();export(obj,name)
    print("3B_FRANCE_ARCH_SOURCEART_OK",len(jobs))

if __name__=="__main__":main()
