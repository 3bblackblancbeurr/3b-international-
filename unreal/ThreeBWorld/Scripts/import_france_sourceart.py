"""Import validated France FBX source meshes into their canonical Unreal paths.

This script imports source-art bases only. It never writes PASS evidence.
"""
from __future__ import annotations
import os
import unreal

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
GEO=os.path.join(ROOT,"SourceArt","France","Geometry")
ARCH=os.path.join(ROOT,"SourceArt","France","Architecture")
TARGETS={
 "SM_FR_Cliff_Master_A":(GEO,"/Game/3B/World/France/Environment/Geometry"),
 "SM_FR_Cliff_Master_B":(GEO,"/Game/3B/World/France/Environment/Geometry"),
 "SM_FR_Underside_Rib_A":(GEO,"/Game/3B/World/France/Environment/Geometry"),
 "SM_FR_Underside_Rib_B":(GEO,"/Game/3B/World/France/Environment/Geometry"),
 "SM_FR_Island_Rock_A":(GEO,"/Game/3B/World/France/Environment/Geometry"),
 "SM_FR_Island_Rock_B":(GEO,"/Game/3B/World/France/Environment/Geometry"),
 "SM_FR_Cave_Module_A":(GEO,"/Game/3B/World/France/Environment/Geometry"),
 "SM_FR_Cave_Module_B":(GEO,"/Game/3B/World/France/Environment/Geometry"),
 "SM_FR_Cave_Entrance_A":(GEO,"/Game/3B/World/France/Environment/Geometry"),
 "SM_FR_Facade_Paris_A":(ARCH,"/Game/3B/World/France/Environment/Architecture"),
 "SM_FR_Facade_Worker_A":(ARCH,"/Game/3B/World/France/Environment/Architecture"),
 "SM_FR_JusticeTribunal":(ARCH,"/Game/3B/World/France/Environment/Architecture"),
 "SM_FR_StreetKit_A":(ARCH,"/Game/3B/World/France/Environment/Architecture"),
 "SM_FR_Tree_A":(ARCH,"/Game/3B/World/France/Environment/Vegetation"),
 "SM_FR_Tree_B":(ARCH,"/Game/3B/World/France/Environment/Vegetation"),
 "SM_FR_Shrub_A":(ARCH,"/Game/3B/World/France/Environment/Vegetation"),
}

def make_task(name,source_dir,destination):
    source=os.path.join(source_dir,name+".fbx")
    if not os.path.isfile(source):
        raise RuntimeError(f"Source FBX missing: {source}")
    task=unreal.AssetImportTask()
    task.filename=source
    task.destination_path=destination
    task.destination_name=name
    task.automated=True
    task.replace_existing=True
    task.save=True
    task.options=unreal.FbxImportUI()
    task.options.import_mesh=True
    task.options.import_as_skeletal=False
    task.options.import_materials=False
    task.options.import_textures=False
    task.options.static_mesh_import_data.combine_meshes=True
    task.options.static_mesh_import_data.generate_lightmap_u_vs=True
    task.options.static_mesh_import_data.auto_generate_collision=True
    return task

def main():
    tools=unreal.AssetToolsHelpers.get_asset_tools()
    tasks=[make_task(name,source_dir,path) for name,(source_dir,path) in TARGETS.items()]
    tools.import_asset_tasks(tasks)
    missing=[]
    for name,(source_dir,path) in TARGETS.items():
        asset=f"{path}/{name}"
        if not unreal.EditorAssetLibrary.does_asset_exist(asset):
            missing.append(asset)
        else:
            unreal.log(f"[3B France] imported source-art base: {asset}")
    if missing:
        raise RuntimeError("France source-art import incomplete: "+", ".join(missing))
    unreal.log(f"[3B France] source-art import OK: {len(TARGETS)} meshes")

if __name__=="__main__":main()
