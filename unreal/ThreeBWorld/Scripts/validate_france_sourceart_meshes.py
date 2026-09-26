"""Validate Blender-generated France source meshes before Unreal import."""
from __future__ import annotations
import bpy, json, os

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
GEOMETRY=os.path.join(ROOT,"SourceArt","France","Geometry")
ARCHITECTURE=os.path.join(ROOT,"SourceArt","France","Architecture")
REPORT=os.path.join(ROOT,"Data","France","france-sourceart-report.json")
SOURCES={
 "SM_FR_Cliff_Master_A":GEOMETRY,"SM_FR_Cliff_Master_B":GEOMETRY,
 "SM_FR_Underside_Rib_A":GEOMETRY,"SM_FR_Underside_Rib_B":GEOMETRY,
 "SM_FR_Island_Rock_A":GEOMETRY,"SM_FR_Island_Rock_B":GEOMETRY,
 "SM_FR_Cave_Module_A":GEOMETRY,"SM_FR_Cave_Module_B":GEOMETRY,"SM_FR_Cave_Entrance_A":GEOMETRY,
 "SM_FR_Facade_Paris_A":ARCHITECTURE,"SM_FR_Facade_Worker_A":ARCHITECTURE,
 "SM_FR_JusticeTribunal":ARCHITECTURE,"SM_FR_StreetKit_A":ARCHITECTURE,
 "SM_FR_Tree_A":ARCHITECTURE,"SM_FR_Tree_B":ARCHITECTURE,"SM_FR_Shrub_A":ARCHITECTURE,
}

def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

def inspect(name):
    source=SOURCES[name]
    glb=os.path.join(source,name+".glb")
    fbx=os.path.join(source,name+".fbx")
    blend=os.path.join(source,name+".blend")
    missing=[p for p in (glb,fbx,blend) if not os.path.isfile(p)]
    if missing:return {"name":name,"status":"FAIL","missing":missing}
    clear();bpy.ops.import_scene.gltf(filepath=glb)
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    if not meshes:return {"name":name,"status":"FAIL","reason":"no_mesh"}
    vertices=sum(len(o.data.vertices) for o in meshes)
    faces=sum(len(o.data.polygons) for o in meshes)
    uv_layers=sum(len(o.data.uv_layers) for o in meshes)
    xs=[];ys=[];zs=[]
    for o in meshes:
        for c in o.bound_box:
            w=o.matrix_world @ __import__("mathutils").Vector(c)
            xs.append(w.x);ys.append(w.y);zs.append(w.z)
    dims=[max(xs)-min(xs),max(ys)-min(ys),max(zs)-min(zs)]
    errors=[]
    if vertices<200:errors.append("vertices<200")
    if faces<180:errors.append("faces<180")
    if uv_layers<1:errors.append("missing_uv")
    if min(dims)<=.5:errors.append("degenerate_bounds")
    return {
      "name":name,"status":"FAIL" if errors else "PASS",
      "vertices":vertices,"faces":faces,"uv_layers":uv_layers,
      "dimensions_m":[round(v,3) for v in dims],
      "files":{"blend":os.path.getsize(blend),"fbx":os.path.getsize(fbx),"glb":os.path.getsize(glb)},
      "errors":errors,
    }

def main():
    results=[inspect(name) for name in SOURCES]
    payload={"schema_version":"1.0.0","proof_type":"source_art_validation","gold_master_proof":False,
             "mesh_count":len(results),"pass_count":sum(r["status"]=="PASS" for r in results),"results":results}
    with open(REPORT,"w",encoding="utf-8") as f:json.dump(payload,f,indent=2,ensure_ascii=False)
    print("3B_SOURCEART_VALIDATION",payload["pass_count"],"/",payload["mesh_count"])
    for r in results:print(r)
    if payload["pass_count"]!=payload["mesh_count"]:raise SystemExit(2)

if __name__=="__main__":main()
