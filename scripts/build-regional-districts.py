"""Original regional building kit, Blender 4.5. Three storey counts per country.
Uses the same door/storey scale as walking collisions. No downloaded models.
"""
from pathlib import Path
helper=Path(__file__).with_name('build-paris-district.py')
exec(compile(helper.read_text(encoding='utf-8').split('manifest=[]')[0],str(helper),'exec'))
OUT=ROOT/'public/world/districts';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT.parent/'3b-unreal/ArtSource/RegionalDistricts';SOURCE.mkdir(parents=True,exist_ok=True)
profiles={
 'italie':((.74,.48,.28),(.92,.8,.6),(.15,.29,.19),(.42,.17,.085),'pitched'),
 'estonie':((.62,.72,.66),(.92,.84,.64),(.18,.25,.25),(.38,.13,.07),'steep'),
 'turquie':((.78,.7,.52),(.88,.79,.59),(.23,.115,.055),(.35,.14,.075),'timber'),
 'algerie':((.89,.87,.75),(.96,.91,.73),(.10,.32,.28),(.77,.67,.45),'terrace'),
 'tunisie':((.91,.91,.85),(.82,.86,.78),(.035,.25,.51),(.15,.36,.53),'blue'),
 'maroc':((.63,.31,.18),(.84,.64,.41),(.11,.28,.22),(.16,.31,.22),'riad'),
 'espagne':((.80,.65,.39),(.94,.83,.6),(.16,.29,.25),(.47,.20,.10),'patio'),
}
manifest=[]
for region,(wall_color,trim_color,accent_color,roof_color,style) in profiles.items():
 stone=mat('Masonry plaster',wall_color);cream=mat('Dressed stone',trim_color);teal=mat('Regional painted wood',accent_color);slate=mat('Regional roof',roof_color,0,.82)
 for floors in [1,2,3]:
  h=floors*5.6;w=12;d=10
  box('Foundation',(0,0,.18),(w+.3,d+.3,.36),cream,.07)
  box('Inhabited volume',(0,0,h/2),(w,d,h),stone,.08)
  for z in [.45,5.55]+[5.6*i for i in range(2,floors+1)]:
   box('Carved cornice',(0,0,z),(w+.65,d+.65,.3),cream,.055)
  # Properly proportioned doorway and deep, layered entrance.
  box('Entrance shadow',(0,-5.055,2.45),(2.8,.08,4.7),iron)
  box('Timber door',(0,-5.14,2.38),(2.35,.16,4.5),teal,.055)
  for x in [-1.42,1.42]:box('Door pilaster',(x,-5.3,2.55),(.28,.52,5.1),cream,.04)
  arch(0,-5.25,0,2.65,5.0,cream)
  for x in [-.92,.92]:
   for z in [1.2,3.05]:box('Door panel',(x/2,-5.26,z),(.8,.1,1.4),wood,.035)
  cyl('Door knob',.7,-5.4,2.15,.09,.13,gold,10)
  # All elevations have finishes, with a deliberate local treatment.
  for level in range(floors):
   z=2.7+level*5.6
   for face in range(4):
    start=len(parts);width=12 if face%2==0 else 10;front=-5 if face%2==0 else -6
    xs=[-3.95,3.95] if level==0 and face==0 else [-width*.31,0,width*.31]
    for x in xs:
     window(x,front-.6,z,2.0,3.1,level>0 and style not in ['terrace','blue','riad'] and face%2==0)
     if style in ['pitched','patio','blue']:
      for side in [-1,1]:box('Louvered shutter',(x+side*1.22,front-.76,z),(.34,.18,3.2),teal,.015)
     if style in ['terrace','blue','riad','patio']:
      arch(x,front-.86,z-1.6,2.3,3.45,teal if style=='blue' else cream)
     if style=='riad':
      for n in range(6):rod('Mashrabiya lattice',(x-.85+n*.34,front-.8,z-1.4),(x-.85+n*.34,front-.8,z+1.4),.025,teal,6)
      for zz in [z-1,z-.4,z+.2,z+.8]:rod('Lattice crosspiece',(x-.95,front-.8,zz),(x+.95,front-.8,zz),.025,teal,6)
    turn_parts(start,face*math.pi/2)
  # Corner stones catch the low sun and break flat silhouettes.
  for z in [1+i*.8 for i in range(int((h-.5)/.8))]:
   for x in [-6,6]:
    for y in [-5,5]:box('Dressed corner',(x,y,z),(.65,.65,.5),cream,.035)
  if style in ['pitched','steep','timber','patio']:
   angle=.79 if style=='steep' else .40
   for side in [-1,1]:
    o=box('Pitched roof',(0,side*2.55,h+math.tan(angle)*2.6),(13.2,5.7/math.cos(angle),.18),slate);o.rotation_euler.x=-side*angle
    # Spaced tile ridges cast fine highlights without a flat painted roof.
    for x in [-6.4+i*.65 for i in range(21)]:rod('Roof tile seam',(x,side*5.35,h+.08),(x,0,h+math.tan(angle)*5.35),.045,slate,6)
   rod('Ridge cap',(-6.6,0,h+math.tan(angle)*5.4),(6.6,0,h+math.tan(angle)*5.4),.15,cream,8)
   if style=='steep':
    # Tallinn's stepped gable, narrow windows and steep roof profile.
    for n in range(7):box('Gable step',(0,-5.1,h+n*.68),(max(.8,9.5-n*1.35),.5,.75),cream,.025)
   if style=='timber':
    for side in [-1,1]:
     for x in [-5.7,-2.8,2.8,5.7]:box('Timber frame',(x,side*5.15,h/2),(.18,.3,h),wood,.015)
     for z in [5.55,11.1,h]:box('Timber belt',(0,side*5.15,z),(12.2,.3,.22),wood,.02)
    if floors>1:
     box('Projecting oriel',(0,-5.9,8.45),(4.8,1.9,4.3),teal,.04)
     for x in [-1.55,0,1.55]:window(x,-6.95,8.55,1.05,3.0)
     for x in [-1.8,1.8]:rod('Oriel corbel',(x,-5.1,5.4),(x,-6.6,6.4),.14,wood,8)
  else:
   box('Roof terrace',(0,0,h+.17),(12.5,10.5,.3),cream,.035)
   for x in [-6,6]:box('Terrace parapet',(x,0,h+.65),(.3,10.4,1.15),teal if style=='blue' else stone,.04)
   for y in [-5,5]:box('Terrace parapet',(0,y,h+.65),(12.4,.3,1.15),teal if style=='blue' else stone,.04)
   for x in [-4,4]:
    for y in [-3,3]:rod('Terrace pergola',(x,y,h+.3),(x,y,h+3),.1,wood)
   for n in range(13):box('Woven roof shade',(-4.4+n*.72,0,h+3),(.16,7,.14),wood,.01)
   if style=='riad':
    for n in range(16):box('Moroccan merlon',(-5.8+n*.78,-5,h+1.35),(.38,.42,.35),cream,.035)
  for x in [-4.9,4.9]:
   rod('Lantern arm',(x,-5.15,4.2),(x,-5.9,4.2),.05,iron);cyl('Courtyard lantern',x,-5.9,3.85,.22,.6,light,8)
  box('3B artisan sign',(0,-5.42,5.2),(3.6,.2,.55),teal,.04);text('3B  ·  LES LIENS',0,-5.56,5.03,.27,gold)
  entry=finish(region+'-'+str(floors));entry.update({'country':region,'floors':floors,'width':12,'depth':10,'doorHeight':4.8});manifest.append(entry)
for obj in bpy.context.scene.objects:obj.hide_set(False)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'RegionalDistricts.blend'))
(OUT/'manifest.json').write_text(json.dumps({'author':'3B original geometry','generator':'Blender 4.5','models':manifest},indent=2))
print('REGIONAL_DISTRICTS_COMPLETE',len(manifest))
