"""Import the shared Three.js monument into Blender, preserving metre-scale coordinates.
Run export-eiffel-geometry.mjs first. Original geometry; no external mesh used.
"""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
variants=json.loads((ROOT/'artifacts/mobile-mission/eiffel-geometry.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for variant in variants:
 bpy.ops.object.select_all(action='DESELECT')
 for i,source in enumerate(variant['meshes']):
  p=source['positions'];vertices=[(p[j],-p[j+2],p[j+1]) for j in range(0,len(p),3)];ix=source['indices'];faces=[ix[j:j+3] for j in range(0,len(ix),3)]
  mesh=bpy.data.meshes.new('Painted lattice');mesh.from_pydata(vertices,[],faces);mesh.update()
  obj=bpy.data.objects.new(('Eiffel' if variant['detail'] else 'Eiffel-lod')+'-'+str(i),mesh);bpy.context.collection.objects.link(obj)
  mat=bpy.data.materials.new(['Painted iron','Platform iron','Stone footing'][i]);mat.diffuse_color=(*source['color'],1);mat.use_nodes=True
  bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=mat.diffuse_color;bsdf.inputs['Roughness'].default_value=source['roughness'];bsdf.inputs['Metallic'].default_value=source['metalness'];mesh.materials.append(mat);obj.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/world/paris'/('Eiffel.glb' if variant['detail'] else 'Eiffel-lod.glb')),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
source=ROOT.parent/'3b-unreal/ArtSource/Paris/EiffelReference.blend';bpy.ops.wm.save_as_mainfile(filepath=str(source))
print('EIFFEL_EXPORTED',source)
