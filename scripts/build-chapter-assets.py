"""Original reusable chapter architecture and eight articulated 3B guardians.
Blender 4.5 --background --python scripts/build-chapter-assets.py -- OUT SOURCE
"""
from pathlib import Path
import sys,math,random,json
import bpy
from mathutils import Vector
# Reuse modelling helpers without running the earlier world's build.
exec(Path(__file__).with_name('build-world-assets.py').read_text(encoding='utf-8').split('\nclean()')[0])
clean();random.seed(934);bpy.context.scene.render.fps=30
stone=mat('Kit limestone','d5c9aa');ivory=mat('Kit porcelain','e7e2cf');roof=mat('Kit terracotta','a06450');wood=mat('Kit walnut','6b5145');metal=mat('Kit bronze','b89957',.6,.38);glass=mat('Kit deep teal glass','285e6c',.3,.3);leaf=mat('Kit foliage','608771');flower=mat('Kit flowers','dca1a2');dark=mat('Kit shadow','1b2b36');skin=mat('Kit skin','ac8260')
def group(name,start):
    objects=[o for o in bpy.context.scene.objects if o not in start and o.type=='MESH']
    parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent)
    bymat={}
    for o in objects:bymat.setdefault(o.data.materials[0].name,[]).append(o)
    for key,parts in bymat.items():o=join_objects(parts,name+'_'+key.replace(' ','_'));o.parent=parent
    parent.name=name
    return parent
def begin():return set(bpy.context.scene.objects)
def arch(x,y,z,w,h,m):
    for side in [-1,1]:cube('Pier',(x+side*w/2,y,z+h*.35),(.55,.8,h*.7),m,.07)
    for i in range(13):
        a=i/12*math.pi;o=cube('Arch voussoir',(x+math.cos(a)*w/2,y,z+h*.7+math.sin(a)*w/2),(.62,.85,.62),m,.035);o.rotation_euler.y=math.pi/2-a
def planter(x,y,z):
    cube('Planter',(x,y,z+.3),(1.8,1,.6),stone,.12)
    for j in range(7):sphere('Leaves',(x+random.uniform(-.7,.7),y+random.uniform(-.3,.3),z+.8),(.34,.3,.36),leaf)
    for j in range(5):sphere('Flowers',(x+random.uniform(-.65,.65),y+random.uniform(-.25,.25),z+1),(.15,.15,.15),flower)

start=begin()
cube('Townhouse',(0,0,2.8),(5.8,4.8,5.6),stone,.16)
for z in [.3,3,5.5]:cube('Cornice',(0,0,z),(6.1,5.1,.18),ivory,.05)
cube('Roof',(0,0,6.05),(6.4,5.5,.75),roof,.16)
for x in [-1.9,0,1.9]:
    for z in [1.7,4.3]:
        cube('Window',(x,-2.43,z),(.95,.12,1.35),glass,.14)
        for side in [-1,1]:cube('Shutter',(x+side*.59,-2.52,z),(.21,.16,1.4),wood,.02)
        cube('Window sill',(x,-2.55,z-.76),(1.4,.4,.15),ivory,.03)
arch(0,-2.7,.1,1.3,1.4,ivory)
group('House',start)

start=begin();cube('Stall counter',(0,0,.7),(3.3,1.5,1.4),wood,.08)
for x in [-1.8,1.8]:cylinder('Canopy post',(x,0,1.6),.08,3.2,metal)
for i in range(7):cube('Canopy stripe',(-1.8+i*.6,0,3.3),(.6,2.5,.15),roof if i%2 else ivory,.035)
for i in range(5):sphere('Market goods',(-1.2+i*.6,-.1,1.6),(.3,.3,.3),flower if i%2 else leaf)
group('Market',start)
start=begin();planter(0,0,0);group('Planter',start)
start=begin();cube('Bench',(0,0,.6),(2.8,.8,.2),wood,.08);cube('Backrest',(0,.38,1.1),(2.8,.15,.9),wood,.07)
for x in [-1,1]:cube('Bench legs',(x,0,.3),(.15,.6,.6),metal,.03)
group('Bench',start)
start=begin();cylinder('Lantern post',(0,0,1.8),.095,3.6,metal);cube('Lantern',(0,0,3.7),(.55,.55,.8),ivory,.12);cube('Lantern cap',(0,0,4.2),(.7,.7,.12),metal,.035);group('Lantern',start)
start=begin();cylinder('Tree trunk',(0,0,2),.26,4,wood)
for i in range(9):a=i*2.4;sphere('Rounded canopy',(math.sin(a)*1.4,math.cos(a)*1.4,4.4+(i%3)*.7),(1.65,1.5,1.45),leaf)
group('Tree',start)
start=begin();cylinder('Pine trunk',(0,0,2),.2,4,wood)
for z,r in [(3,2.5),(4.4,2),(5.8,1.4)]:bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=r,radius2=.1,depth=3,location=(0,0,z));finish(bpy.context.object,'Pine branch',leaf)
group('Pine',start)
start=begin();cylinder('Palm trunk',(0,0,3),.22,6,wood)
for i in range(9):
 a=i/9*math.pi*2;o=sphere('Palm frond',(math.sin(a)*1.7,math.cos(a)*1.7,5.7),(.42,2.4,.13),leaf);o.rotation_euler.z=-a
group('Palm',start)
start=begin();arch(0,0,0,5,5,stone);planter(-4,0,0);planter(4,0,0);group('GardenArch',start)

colors={'france':'7bbdff','italie':'95e4b6','estonie':'b6ecff','turquie':'d3a4dd','algerie':'b8dda2','tunisie':'ffb3a4','maroc':'e9b879','espagne':'ee987b'}
cloth=mat('Resident cloth','526e7b');hair=mat('Resident hair','49352b');silver=mat('Resident silver hair','b7b9ab')
for kind in ['woman','artisan','elder','traveler']:
    start=begin();sphere('Resident torso',(0,0,1.12),(.25,.15,.35),cloth)
    sphere('Resident head',(0,-.02,1.64),(.13,.115,.17),skin)
    sphere('Resident hair',(0,.018,1.71),(.14,.12,.12),silver if kind=='elder' else hair)
    sphere('Resident nose',(0,-.135,1.62),(.022,.026,.028),skin)
    for side in [-1,1]:
        sphere('Eye',(side*.044,-.124,1.67),(.013,.006,.013),dark)
        tube('Trouser',(side*.12,0,.9),(side*.12,0,.18),.105,.06,wood,None)
        cube('Boot',(side*.12,-.035,.1),(.15,.26,.16),dark,.04)
        tube('Sleeve',(side*.22,0,1.35),(side*.31,-.02,.99),.1,.06,cloth,None)
        sphere('Hand',(side*.31,-.02,.92),(.052,.047,.08),skin)
    cube('Belt',(0,-.145,.92),(.43,.025,.07),metal,.02)
    if kind=='woman':
        sphere('Long hair',(0,.07,1.48),(.19,.14,.25),hair)
        bpy.ops.mesh.primitive_cone_add(vertices=20,radius1=.33,radius2=.2,depth=.65,location=(0,0,.78));finish(bpy.context.object,'Coat skirt',cloth)
        cube('Scarf',(0,-.16,1.37),(.31,.05,.15),ivory,.035)
    if kind=='artisan':
        cube('Apron',(0,-.17,1.02),(.32,.04,.45),ivory,.045);cube('Apron pocket',(0,-.2,1.03),(.18,.02,.12),wood,.01)
        sphere('Beard',(0,-.075,1.56),(.11,.09,.08),hair)
    if kind=='elder':
        sphere('Beard',(0,-.08,1.51),(.11,.09,.15),silver);cylinder('Walking staff',(.4,0,.8),.035,1.6,wood)
    if kind=='traveler':
        cube('Shoulder satchel',(.25,0,1.0),(.17,.22,.3),wood,.06);ring('Scarf',(0,0,1.43),.15,.06,ivory)
    group('Resident_'+kind,start)
for index,(country,color) in enumerate(colors.items()):
    accent=mat(country+' enamel',color,.35,.4);start=begin()
    cube('Plinth',(0,0,.15),(12,10,.3),stone,.15)
    if country=='france':
        cube('Library',(0,1,4.3),(10,5,8),stone,.16)
        for x in [-4,-2,0,2,4]:
            cylinder('Library column',(x,-2,3.2),.3,6.4,ivory);cube('Window',(x,-1.53,5),(.8,.1,2.5),glass,.1)
        for z in [6.8,8.3]:cube('Library cornice',(0,.5,z),(11,6,.3),ivory,.05)
        cube('Blue roof',(0,1,8.8),(10.8,5.8,.8),accent,.2);ring('Library clock',(0,-1.75,7.4),.6,.08,metal,(math.pi/2,0,0))
    elif country=='italie':
        for level in range(3):
            cube('Terrace',(0,level*2,level*1.9+.6),(11-level*2,6,1.2),stone,.12)
            for side in [-1,1]:planter(side*(4-level),level*2,level*1.9+1.2)
        arch(0,4,4,4,3,ivory)
        for x in [-4,-2,0,2,4]:cylinder('Pergola column',(x,-1,2),.14,4,wood)
        for i in range(5):cube('Pergola roof',(0,-2+i*.7,4.1),(10,.15,.15),wood,.02)
    elif country=='estonie':
        for i in range(7):
            a=i/7*math.pi*2;h=3+i%3*2;bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=.8,radius2=.12,depth=h,location=(math.sin(a)*3.6,math.cos(a)*3.6,h/2));finish(bpy.context.object,'Aurora crystal',accent)
        cylinder('Rune well',(0,0,1),2.2,2,stone);ring('Rune halo',(0,0,4.5),3.7,.1,metal)
    elif country=='turquie':
        cylinder('Observatory',(0,0,2.5),4.5,5,stone)
        sphere('Dome',(0,0,5),(4.8,4.8,3.5),accent)
        for i in range(12):a=i/12*math.pi*2;cylinder('Arcade column',(math.sin(a)*5.2,math.cos(a)*5.2,2.5),.18,5,ivory)
        for rot in [(0,0,0),(.7,0,0),(0,.7,0)]:ring('Astrolabe',(0,0,9),1.7,.065,metal,rot)
    elif country=='algerie':
        for r,z in [(4,.3),(3,.6),(2,1)]:cylinder('Oasis basin',(0,0,z),r,.3,stone)
        cylinder('Pool',(0,0,1.18),1.8,.05,glass)
        for x in [-4,4]:arch(x,2,0,2.8,5,stone)
        for i in range(5):cube('Water channel',(0,-3-i,0.2),(1,.8,.2),glass,.04)
    elif country=='tunisie':
        for x in [-4,-2,0,2,4]:
            cylinder('Carthage column',(x,1,3.7),.35,7.4,ivory);cube('Capital',(x,1,7.5),(.9,.9,.35),stone,.07)
        cube('Architrave',(0,1,7.9),(10,.9,.5),stone,.09)
        for i in range(4):cube('Harbor step',(0,-3+i*.7,.1+i*.15),(10-i,1,.2),ivory,.06)
        ring('Crescent monument',(0,-1,5),1.4,.23,accent,(math.pi/2,0,0))
    elif country=='maroc':
        for x in [-3.8,3.8]:cube('Atlas tower',(x,0,4),(2.5,3,8),roof,.13)
        arch(0,-.2,0,5,5,stone);cube('High cornice',(0,0,8.3),(11,3.4,.6),accent,.1)
        for x in range(-5,6):cube('Crenellation',(x,0,8.9),(.45,3.3,.7),stone,.05)
        for x in [-2,0,2]:ring('Wind bell',(x,-2,5.8),.4,.06,metal,(math.pi/2,0,0))
    else:
        cylinder('Phare',(0,0,4),2.7,8,ivory)
        bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=3.4,radius2=.1,depth=2.4,location=(0,0,9));finish(bpy.context.object,'Phare roof',roof)
        cube('Mill window',(0,-2.65,5.8),(1.2,.12,2),glass,.1)
        for i in range(4):
            a=i/4*math.pi*2;o=cube('Sail',(math.sin(a)*2,-3,6.6+math.cos(a)*2),(.75,.12,5),wood,.04);o.rotation_euler.y=a
        sphere('Mill hub',(0,-3.2,6.6),(.4,.3,.4),metal)
    group('Landmark_'+country,start)

# Eight full three-dimensional guardians, each with its own silhouette and six-part rig.
for index,(country,color) in enumerate(colors.items()):
    start=begin();fur=mat(country+' fur',{'france':'405d8d','italie':'687b76','estonie':'cedcd8','turquie':'665668','algerie':'c8a879','tunisie':'d3bba0','maroc':'bc854e','espagne':'533d42'}[country]);accent=bpy.data.materials[country+' enamel'];eyes=mat(country+' eyes','e6efe3',.1,.22)
    bird=country in ['france','tunisie'];bodyScale=(.57,.58,.8) if bird else (.65,1.05,.55);headY=-.6 if bird else -1
    sphere('Guardian body',(0,0,1.25),bodyScale,fur,'Body');sphere('Breast armor',(0,-.4,1.35),(.5,.3,.56),accent,'Body')
    sphere('Guardian head',(0,headY,2.15 if bird else 1.7),(.44,.48,.5),fur,'Head')
    hz=2.15 if bird else 1.7
    if bird:
        tube('Beak',(0,headY-.35,hz),(0,headY-.86,hz-.12),.22,0,metal,'Head')
        for side in [-1,1]:
            for j in range(5):o=sphere('Wing feather',(side*(.55+j*.1),.05+j*.12,1.25),(.14,.55,.45-j*.04),accent if j%2 else fur,'Wing.'+str(side));o.rotation_euler.y=side*.2
        for j in range(5):o=sphere('Crest',((j-2)*.12,headY+.08,hz+.47),(.11,.15,.3+abs(j-2)*.1),accent,'Head')
        for j in range(5):o=sphere('Tail plume',((j-2)*.14,.68,1.6+j*.1),(.13,.3,.65),accent if j%2 else fur,'Tail');o.rotation_euler.x=-.5
    else:
        sphere('Muzzle',(0,headY-.42,hz-.12),(.30,.44,.22),ivory,'Head');sphere('Nose',(0,headY-.78,hz-.04),(.17,.13,.1),dark,'Head')
        for side in [-1,1]:
            if country=='espagne':
                tube('Horn root',(side*.35,headY,hz+.2),(side*.75,headY,hz+.65),.15,.1,ivory,'Head');tube('Horn tip',(side*.75,headY,hz+.65),(side*.65,headY-.2,hz+.95),.1,0,metal,'Head')
            elif country=='turquie':sphere('Bear ear',(side*.4,headY+.03,hz+.35),(.22,.13,.23),fur,'Head')
            else:
                tube('Pointed ear',(side*.31,headY+.1,hz+.23),(side*(.53 if country=='algerie' else .4),headY+.08,hz+(.95 if country=='algerie' else .65)),.21,0,fur,'Head')
            if country=='maroc':
                for j in range(4):a=(j/4*math.pi+side*math.pi/2);sphere('Lion mane',(math.cos(a)*.55,headY+.18,hz+math.sin(a)*.55),(.3,.3,.38),metal,'Head')
        tube('Tail',(0,.75,1.35),(.2,1.5,1.1),.22,.06,fur,'Tail')
    for side in [-1,1]:
        sphere('Eye socket',(side*.32,headY-.37,hz+.12),(.105,.07,.13),dark,'Head');sphere('Luminous eye',(side*.32,headY-.426,hz+.13),(.045,.025,.065),eyes,'Head')
        for y in ([-.2] if bird else [-.65,.65]):
            boneName=('Front' if y<0 else 'Back')+str(side);tube('Leg',(side*.4,y,.95),(side*.4,y,.22),.14,.09,fur,boneName);sphere('Paw',(side*.4,y-.12,.15),(.2,.3,.15),metal,boneName)
    ringObj=ring('Collar',(0,-.45,1.8 if bird else 1.4),.48,.08,metal,(math.pi/2,0,0));ringObj.vertex_groups.new(name='Body').add(list(range(len(ringObj.data.vertices))),1,'REPLACE')
    objects=[o for o in bpy.context.scene.objects if o not in start and o.type=='MESH'];model=join_objects(objects,'Guardian_'+country)
    bpy.ops.object.armature_add(enter_editmode=True);rig=bpy.context.object;rig.name='Creature_'+country;bones=rig.data.edit_bones;bones.remove(bones[0])
    def addbone(name,head,tail,parent=None):
        b=bones.new(name);b.head=head;b.tail=tail
        if parent:b.parent=bones[parent]
    addbone('Root',(0,0,0),(0,0,.2));addbone('Body',(0,0,.9),(0,0,1.5),'Root');addbone('Head',(0,headY,hz-.4),(0,headY,hz+.4),'Body');addbone('Tail',(0,.6,1.2),(0,1.3,1.5),'Body')
    for side in [-1,1]:
        for y in ([-.2] if bird else [-.65,.65]):addbone(('Front' if y<0 else 'Back')+str(side),(side*.4,y,.95),(side*.4,y,.15),'Body')
        if bird:addbone('Wing.'+str(side),(side*.4,0,1.5),(side*1,0,1.1),'Body')
    bpy.ops.object.mode_set(mode='OBJECT');model.parent=rig;mod=model.modifiers.new('Articulated guardian','ARMATURE');mod.object=rig;rig.animation_data_create()
    for clip in ['Idle','Walk']:
        action=bpy.data.actions.new(country+'_'+clip);rig.animation_data.action=action
        for frame in range(1,62):
            t=(frame-1)/60*math.pi*2
            for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
            rig.pose.bones['Body'].location.z=math.sin(t)*.025;rig.pose.bones['Head'].rotation_euler.z=math.sin(t*.5)*.06;rig.pose.bones['Tail'].rotation_euler.y=math.sin(t)*.16
            for side in [-1,1]:
                if bird:rig.pose.bones['Wing.'+str(side)].rotation_euler.y=side*(.05+math.sin(t)*.08)
                if clip=='Walk':
                    for y in ([-.2] if bird else [-.65,.65]):rig.pose.bones[('Front' if y<0 else 'Back')+str(side)].rotation_euler.x=math.sin(t+(0 if side>0 else math.pi)+(0 if y<0 else math.pi))*.42
            for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_euler',frame=frame);b.keyframe_insert(data_path='location',frame=frame)
        action.use_fake_user=True
        track=rig.animation_data.nla_tracks.new();track.name=country+'_'+clip
        track.strips.new(country+'_'+clip,1,action);track.mute=True
    rig.animation_data.action=None
    for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
bpy.context.scene.frame_set(1);save_export('chapter-kit')
print('3B chapter kit built:',len(bpy.data.objects),'objects')
