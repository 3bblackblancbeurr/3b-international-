"""Export the locally authored Unreal traveller/creature sources to portable glTF.
Quaternius CC0 topology, original 3B adaptations; no Unreal-only content embedded.
Run with Blender 4.5 --background --python scripts/export-living-web.py.
"""
import bpy, json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT.parent/'3b-unreal/ArtSource'
OUT=ROOT/'public/world/living';OUT.mkdir(parents=True,exist_ok=True)
CLIPS={'Idle_Loop':'Idle','Walk_Loop':'Walk','Jog_Fwd_Loop':'Jog','Sprint_Loop':'Run','Jump_Loop':'Jump','Punch_Cross':'Attack','Hit_Chest':'Hit','Death01':'Death','Spell_Simple_Shoot':'Cast','Interact':'Interact','Fixing_Kneeling':'Work','Idle_Talking_Loop':'Talk'}
report=[]

def append_meshes(file,rig,prefix):
    with bpy.data.libraries.load(str(file),link=False) as (src,dst):dst.objects=src.objects
    loaded=[o for o in dst.objects if o]
    for o in loaded:
        if o.type!='MESH':continue
        matrix=o.matrix_world.copy();bpy.context.collection.objects.link(o)
        o.parent=rig;o.matrix_world=matrix;o.name=prefix
        for mod in o.modifiers:
            if mod.type=='ARMATURE':mod.object=rig
    for o in loaded:
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)

def export(file,name,body=None):
    bpy.ops.wm.open_mainfile(filepath=str(file))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    rig.name='Armature'
    if body is not None:
        for o in bpy.context.scene.objects:
            if o.type=='MESH':o.name='Body'
        for hair in range(1,7):append_meshes(ART/'Travellers'/f'Coiffure{hair}.blend',rig,f'Hair_{hair}')
        for shoe in range(3):append_meshes(ART/'Travellers'/f'Footwear{body*3+shoe}.blend',rig,f'Boots_{shoe}')
    # Keep all action slots explicitly attached as independent NLA clips.
    for a in list(bpy.data.actions):bpy.data.actions.remove(a)
    with bpy.data.libraries.load(str(ART/'Travellers/MotionLibrary.blend'),link=False) as (src,dst):dst.actions=list(CLIPS)
    rig.animation_data_create();rig.animation_data.action=None
    for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
    for old,label in CLIPS.items():
        action=bpy.data.actions[old];action.name=label
        track=rig.animation_data.nla_tracks.new();track.name=label
        strip=track.strips.new(label,int(action.frame_range.x),action)
        if len(action.slots):strip.action_slot=action.slots[0]
    # Web texture budgets: retain normal maps and material roles for recolouring.
    for im in bpy.data.images:
        if im.size[0]>512 or im.size[1]>512:
            scale=512/max(im.size);im.scale(max(1,int(im.size[0]*scale)),max(1,int(im.size[1]*scale)))
        if im.source=='FILE' and im.has_data:im.pack()
    for o in bpy.context.scene.objects:
        if o.type=='MESH':
            o.hide_set(False);o.hide_render=False
            for p in o.data.polygons:p.use_smooth=True
    bpy.context.scene.frame_set(1)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_image_format='JPEG',export_jpeg_quality=82,export_morph=True,export_extras=True)
    size=(OUT/(name+'.glb')).stat().st_size
    report.append({'asset':name,'bytes':size,'clips':list(CLIPS.values()),'bones':len(rig.data.bones)})
    print('3B_WEB_ASSET',name,size,flush=True)

for i in range(6):export(ART/'Travellers'/f'Traveller{i}.blend',f'traveller-{i}',i//3)
for i in range(8):export(ART/'Creatures'/f'Creature{i}.blend',f'creature-{i}')
(OUT/'manifest.json').write_text(json.dumps(report,indent=2))
print('3B_WEB_EXPORT_COMPLETE',len(report))
