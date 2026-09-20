#!/usr/bin/env python3
"""Reproduce the reviewed World release. Never pushes or changes player accounts.
Native merges retain source history; unreviewed conflicts fail closed.
"""
from pathlib import Path
import subprocess,re

def run(*args): return subprocess.run(args,check=True)
def get(ref,path): return subprocess.check_output(['git','show',ref+':'+path],text=True)
def put(path,text): Path(path).write_text(text)
def replace(s,a,b):
 if a not in s: raise RuntimeError('Reviewed anchor missing: '+a[:100])
 return s.replace(a,b)
def conflicts(): return set(subprocess.check_output(['git','diff','--name-only','--diff-filter=U'],text=True).splitlines())
def pick(ref,expected,resolver):
 result=subprocess.run(['git','cherry-pick',ref])
 if result.returncode:
  actual=conflicts()
  if actual!=set(expected): raise RuntimeError('Unreviewed conflicts: '+str(actual))
  resolver()
  run('git','add','src','tests','supabase')
  run('git','-c','core.editor=true','cherry-pick','--continue')
pattern=r'^<<<<<<<[^\n]*\n(.*?)^=======\n(.*?)^>>>>>>>[^\n]*\n'

def city():
 s=Path('src/world/WorldPage.jsx').read_text()
 def imports(m):
  lines=[l for part in m.groups() for l in part.splitlines() if l.strip()]
  if any(not re.fullmatch(r'\s*import\s+.+;\s*',l) for l in lines): raise RuntimeError('Not independent imports')
  return ''.join(l+'\n' for l in dict.fromkeys(lines))
 put('src/world/WorldPage.jsx',re.sub(pattern,imports,s,flags=re.M|re.S))
result=subprocess.run(['git','merge','--no-ff','--no-edit','ba1f8d2ec7892d79738c21e6e4665142e863231e'])
if result.returncode:
 if conflicts()!={'src/world/WorldPage.jsx'}: raise RuntimeError('Unexpected City conflict')
 city();run('git','add','src/world/WorldPage.jsx');run('git','commit','--no-edit')

def passport():
 put('src/components/PassportNexus.jsx',"export { default } from './NexusCityGateway.jsx';\n")
 p='src/components/PassportVisual.jsx';s=get('d2eb47a1f47be4c514c1e68f7605a67d788084f1',p)
 s=s.replace('Ouvrir le Cercle et entrer dans le Nexus 3B','Ouvrir ma Ville 3B').replace('{active ? "ENTRER" : "ACTIVER"}','{active ? "MA VILLE" : "ACTIVER"}')
 s=s.replace('useEffect(() => { if (!identity) setPortalOpen(false); }, [identity?.userId]);','useEffect(() => { setPortalOpen(false); }, [identity?.userId]);')
 s=s.replace('<PassportNexus open={portalOpen} onClose={() => setPortalOpen(false)} />','<PassportNexus key={identity.userId} open={portalOpen} onClose={() => setPortalOpen(false)} goTo={goTo} reducedMotion={!motionAllowed} />')
 put(p,s)
pick('d2eb47a1f47be4c514c1e68f7605a67d788084f1',['src/components/PassportNexus.jsx','src/components/PassportVisual.jsx'],passport)

def cinematic_v2():
 # Preserve seen-state persistence, audio V5, NPC dialogue, City panel and combat gates.
 p='src/world/WorldPage.jsx';s=get('HEAD',p)
 s=replace(s,"import {storyCinematicPresentation} from './story-cinematic.js';","import {storyCinematicPresentation} from './story-cinematic.js';\nimport {CinematicOverlay} from './CinematicOverlay.jsx';")
 s=replace(s,"setStoryCinematic(presentation);audio.current?.state", "setStoryCinematic(presentation);scene.current?.playCinematicShot?.(presentation.kind,presentation.context,presentation.duration);audio.current?.cinematic?.(presentation.kind);audio.current?.state")
 s=replace(s,"act({type:'cinematicSeen',key:current.key});", "scene.current?.skipCinematic();act({type:'cinematicSeen',key:current.key});")
 s=re.sub(r'^  \{storyCinematic&&<div className="world-story-cinematic".*$', '  {storyCinematic&&<CinematicOverlay key={storyCinematic.key} presentation={storyCinematic} onDone={finishStoryCinematic} onSkip={finishStoryCinematic}/>} ',s,flags=re.M)
 put(p,s)
 p='src/world/story-cinematic.js';s=get('HEAD',p)
 s=replace(s,"import {GUARDIAN_VALUES} from './guardian-values.js';","import {GUARDIAN_VALUES} from './guardian-values.js';\nimport {cinematicSpec} from './cinematic-director.js';")
 s=replace(s,"const base={key:event.key", "const base={...cinematicSpec(event.kind,region),context:event.context||{},countryName:country?.name||'3B',value:guardian.rule?.value||'Héritage',key:event.key")
 s=replace(s,"  case 'story-power':", "  case 'memory-fragment':return {...base,kicker:'FRAGMENT DE MÉMOIRE',title:'Un souvenir répond',detail:'Un fragment de mémoire est enregistré dans ta progression.'};\n  case 'story-power':")
 put(p,s)
 p='src/world/cinematic-events.js';s=get('HEAD',p)
 s=replace(s," /^bond:C\\d{3}$/", " new RegExp('^memory:'+REGION+':\\\\d+$'),\n /^bond:C\\d{3}$/")
 s=replace(s," if(action.type==='survey'){", " if(action.type==='beacon'&&action.id&&!(previous.beacons||[]).includes(action.id)&&(next.beacons||[]).includes(action.id)){\n  add('memory-fragment',`memory:${action.id}`,{region,id:action.id},30);\n }\n\n if(action.type==='survey'){")
 put(p,s)
 p='src/world/audio.js';s=get('HEAD',p);v2=get('cc95754',p)
 method=v2[v2.index(" cinematic(kind="):v2.index(" visibility(value)")]
 put(p,replace(s,'  event,speak,transport,','  event,speak,transport,\n'+method))
 p='src/world/AvatarCinematic.jsx';s=get('cc95754',p)
 put(p,replace(s,"root.current?.closest('dialog')?.scrollTo({top:0});", "root.current?.closest('dialog')?.scrollTo({top:0});root.current?.querySelector('button')?.focus({preventScroll:true});"))
 p='src/arena/ArenaStage.jsx';s=get('cc95754',p)
 s=s.replace('cardId,avatar,cinematic','cardId,avatar,focus,pose,angle,cinematic')
 s=s.replace('avatar,focus,pose,angle,cinematic})',"avatar,focus='body',pose='idle',angle=null,cinematic=null})",1)
 s=s.replace('alpha:false','alpha:true')
 s=replace(s,"scene.background=new THREE.Color('#07111d');", "const backdrop=new THREE.Color('#07111d');scene.background=avatar&&!cinematic?null:backdrop;")
 s=replace(s,"  const mesh=(g,m,parent=scene)=>", "  const stageProps=[];\n  const mesh=(g,m,parent=scene)=>")
 s=replace(s,"parent.add(o);return o;", "parent.add(o);if(parent===scene)stageProps.push(o);return o;")
 s=replace(s,"let lastFilm='',", "let assetEpoch=0,lastAngle=null;let lastFilm='',")
 s=replace(s,"   if(next.join('|')!==ids.join('|')){actors", "   scene.background=s.avatar&&!film?null:backdrop;for(const prop of stageProps)prop.visible=!s.avatar||!!film;\n   if(next.join('|')!==ids.join('|')){const epoch=++assetEpoch;actors")
 s=replace(s,"onError:setError", "onError:message=>{if(!disposed&&epoch===assetEpoch)setError(message);},onLoad:()=>{if(!disposed&&epoch===assetEpoch)setError('');}")
 s=replace(s,"   for(const [i,a] of actors.entries())", "   if(s.angle!==lastAngle){if(s.angle!==null)rot=s.angle;lastAngle=s.angle;}\n   for(const [i,a] of actors.entries())")
 s=replace(s,"a.update(reduced&&film?0:dt);", "a.update(reduced&&film?0:dt,0,1,solo&&s.pose==='walk'&&!film?dt*1.6:0);")
 s=replace(s,"zoom=solo?4.5:", "zoom=solo?(s.focus==='face'?1.35:3.4):")
 s=replace(s,"solo?2.1:2.15+intro*.7", "solo?(s.focus==='face'?1.68:1.8):2.15+intro*.7")
 s=replace(s,"target.set(0,.95,0);", "target.set(0,solo&&s.focus==='face'?1.57:.95,0);")
 s=replace(s,"1-Math.exp(-rawDt*4.5)", "1-Math.exp(-dt*4.5)")
 s=replace(s,"1-Math.exp(-rawDt*5)", "1-Math.exp(-dt*5)")
 s=replace(s,"   if(film){", "   if(!film){portal.visible=false;particles.visible=false;bluePulse.intensity=0;goldPulse.intensity=0;renderer.toneMappingExposure=1.32;camera.fov=38;camera.updateProjectionMatrix();}\n   if(film){")
 put(p,s)
pick('cc957540e847d1391850afda8bd39e50de3e437b',['src/arena/ArenaStage.jsx','src/world/AvatarCinematic.jsx','src/world/WorldPage.jsx','src/world/audio.js','src/world/cinematic-events.js','src/world/story-cinematic.js'],cinematic_v2)

def cinematic_v3():
 p='src/world/landscape.js';s=get('HEAD',p);theirs=get('0d8cf1d',p);method=theirs[theirs.index('cinematicFocus('):theirs.index('ground:terrain')];put(p,replace(s,'ground:terrain',method+'ground:terrain'))
 p='src/world/postprocessing.js';s=get('0d8cf1d',p);put(p,replace(s,'smoothstep(.86,.28,length(centered*vec2(1.08,.88)))','(1.-smoothstep(.28,.86,length(centered*vec2(1.08,.88))))'))
 p='src/world/scene.js';s=Path(p).read_text()
 def resolve(m):
  a,b=m.group(1,2)
  if 'let avatar,companion' in a:return replace(a,'effect,portalMaterials','effect,cinematicFx=null,portalMaterials')
  if 'partyActors?.dispose' in a:return replace(a,'shot=null;fieldRival','shot=null;post.setCinematic(null);cinematicBlue.intensity=cinematicGold.intensity=0;cinematicFx=null;fieldRival')
  if 'inspectLandmark()' in a:return b+a[a.index('  rideHubTransport'):]
  raise RuntimeError('Unreviewed scene conflict')
 put(p,re.sub(pattern,resolve,s,flags=re.M|re.S))
 s=Path('tests/world-premium-mobile.test.js').read_text();new=s[s.index("test('cinematic post-processing"):]
 put('tests/cinematic-post-budget.test.js',"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {cinematicPostBudget} from '../src/world/postprocessing.js';\n"+new)
 run('git','rm','tests/world-premium-mobile.test.js')
pick('0d8cf1d76f217fa6546dac5053561195e9cf6d60',['src/world/landscape.js','src/world/postprocessing.js','src/world/scene.js','tests/world-premium-mobile.test.js'],cinematic_v3)

def cinematic_v4():
 for p in ['src/world/AvatarPanel.jsx','src/world/WorldPage.jsx','src/world/scene.js','src/world/story-cinematic.js']:
  s=Path(p).read_text()
  def resolve(m):
   a,b=m.group(1,2)
   if p.endswith('AvatarPanel.jsx'):return b
   if p.endswith('WorldPage.jsx'):return b[b.index(' const finishAvatarReveal'):b.index(' const act=')].replace("context:{region:saveRef.current.region||'hub'}", "context:{region:saveRef.current.region||'hub'},priority:110")+a
   if p.endswith('scene.js'):return b+a[a.index('  rideHubTransport'):]
   if p.endswith('story-cinematic.js'):return b.splitlines(True)[0]+a
   raise RuntimeError('Unreviewed V4 conflict')
  put(p,re.sub(pattern,resolve,s,flags=re.M|re.S))
 p='src/world/WorldPage.jsx';s=Path(p).read_text();put(p,replace(s,"scene.current?.skipCinematic();act({type:'cinematicSeen',key:current.key});", "scene.current?.skipCinematic();if(current.kind!=='world-opening')act({type:'cinematicSeen',key:current.key});"))
pick('264b2a0dd8433a9148edef27b71274229432e80d',['src/world/AvatarPanel.jsx','src/world/WorldPage.jsx','src/world/scene.js','src/world/story-cinematic.js'],cinematic_v4)

# Bind the actual City screens, preserve old saves, and update regression assertions.
p=Path('src/city/City3BPanel.jsx');s=p.read_text().replace('useMemo,useState','useMemo,useRef,useState');s=s.replace("import '../styles/city-3b.css';","import '../styles/city-3b.css';\nimport {useLoyalty} from '../loyalty/LoyaltyContext.jsx';")
s=s.replace(" const[name,setName]=useState('Ma Ville 3B'),[country,setCountry]=useState('France');", " const account=useLoyalty(),country=account.passport?.userId===uid?account.passport.country:'';\n const scope=useRef(uid);scope.current=uid;const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);\n const[name,setName]=useState('Ma Ville 3B');")
s=s.replace("setData(await city3bRequest('snapshot',{},uid));", "const next=await city3bRequest('snapshot',{},uid);if(mounted.current&&scope.current===uid)setData(next);")
s=s.replace("setData(next);onNotice", "if(!mounted.current||scope.current!==uid)return;setData(next);onNotice")
s=s.replace("setError(e.message);", "if(mounted.current&&scope.current===uid)setError(e.message);")
s=s.replace("finally{setLoading(false);}", "finally{if(mounted.current&&scope.current===uid)setLoading(false);}").replace("finally{setBusy('');}", "finally{if(mounted.current&&scope.current===uid)setBusy('');}")
s=s.replace("useEffect(()=>{refresh();},[refresh]);", "useEffect(()=>{setData(null);setBusy('');refresh();},[refresh]);")
s=s.replace('<label>Origine<select value={country} onChange={e=>setCountry(e.target.value)}>{CITY_COUNTRIES.map(value=><option key={value}>{value}</option>)}</select></label>', '<label>Pays d’origine · lié au Passeport 3B<input value={country} readOnly aria-label="Pays du Passeport 3B" placeholder="Complète ton Passeport"/></label>')
s=s.replace('disabled={!!busy||!name.trim()}', 'disabled={!!busy||name.trim().length<2||!country}')
p.write_text(s)
p=Path('src/components/City3BPortal.jsx');s=p.read_text()
s=s.replace('export default function PassportNexus({open,onClose}){', "export default function City3BPortal(props){\n const account=useLoyalty();\n return <City3BPortalSession key={account.user?.id||'guest'} {...props} account={account}/>;\n}\nfunction City3BPortalSession({open,onClose,account}){")
s=s.replace(' const account=useLoyalty(),uid=account.user?.id,dialog=useRef(null);', " const uid=account.user?.id,dialog=useRef(null),mounted=useRef(true);\n useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);\n const country=account.passport?.userId===uid?account.passport.country:'';")
s=s.replace(",[country,setCountry]=useState('France')", '')
s=s.replace('setData(v);return v', 'if(!mounted.current)return null;setData(v);return v').replace('catch(e){setError(e.message)', 'catch(e){if(mounted.current)setError(e.message)').replace('finally{setBusy(false)}', 'finally{if(mounted.current)setBusy(false)}')
s=s.replace('setCountry={setCountry} ', '').replace('country,setCountry,busy','country,busy')
s=s.replace('{profile.points||0} Coins', '{Number(data?.wallet?.coins||0)} Coins')
s=s.replace('<select aria-label="Pays d’origine" value={country} onChange={e=>setCountry(e.target.value)}>{CITY_COUNTRIES.map(c=><option key={c}>{c}</option>)}</select>', '<label>Pays d’origine · lié au Passeport 3B<input aria-label="Pays d’origine" value={country} readOnly placeholder="Complète ton Passeport"/></label>')
s=s.replace('disabled={busy||name.trim().length<2}', 'disabled={busy||name.trim().length<2||!country}')
p.write_text(s)
p=Path('tests/passport-identity.test.js');s=p.read_text();a=s.index("test('city origin");b=s.index("\n\n\ntest('legacy",a)
s=s[:a]+'''test('both real City screens use the owned Passport country, without a France fallback',()=>{
 for(const path of ['../src/components/City3BPortal.jsx','../src/city/City3BPanel.jsx']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.match(source,/lié au Passeport 3B/);
  assert.match(source,/readOnly/);
  assert.match(source,/passport\\?\\.userId===uid/);
  assert.match(source,/'create',\\{name:name\\.trim\\(\\),country\\}/);
  assert.doesNotMatch(source,/setCountry/);
 }
 const gateway=readFileSync(new URL('../src/components/PassportNexus.jsx',import.meta.url),'utf8');
 assert.match(gateway,/NexusCityGateway/);
});'''+s[b:];p.write_text(s)
p=Path('src/world/WorldEntry.jsx');p.write_text('''import React,{Suspense,lazy,useState} from 'react';
const CurrentWorld=lazy(()=>import('./WorldPage.jsx'));
const Origins=lazy(()=>import('./origins/OriginsPage.jsx'));
// The two engines keep their own account-scoped saves. Never reset or silently migrate them.
export default function WorldEntry({goTo}){
 const [legacy,setLegacy]=useState(false);
 const navigate=id=>{if(id==='world-origins'){setLegacy(true);return;}if(id==='monde-3b'){setLegacy(false);return;}goTo(id);};
 return <Suspense fallback={<div className="world-loading">Ouverture du Monde 3B…</div>}>
  {legacy?<Origins goTo={navigate} onPrevious={()=>setLegacy(false)}/>:<CurrentWorld goTo={navigate}/>}
 </Suspense>;
}
''')
p=Path('src/world/WorldPage.jsx');s=p.read_text();s=s.replace('<button onClick={()=>goTo(\'home\')}><ArrowLeft size={19}/> Quitter le monde</button>', '<button onClick={()=>goTo(\'home\')}><ArrowLeft size={19}/> Quitter le monde</button><button onClick={()=>goTo(\'world-origins\')}>Retrouver ma partie Origins · sauvegarde séparée</button>');p.write_text(s)
p=Path('src/world/CinematicOverlay.jsx');s=p.read_text().replace('aria-label={presentation.title} onKeyDown=', 'role="dialog" aria-modal="true" aria-label={presentation.title} onKeyDownCapture=');s=s.replace("event.preventDefault();complete(true);", "event.preventDefault();event.stopPropagation();complete(true);");p.write_text(s)
if conflicts(): raise RuntimeError('Unresolved merge conflicts')
if subprocess.run(['git','grep','-nE','^<<<<<<< |^>>>>>>> |^=======$','--','src','tests']).returncode==0:
 raise RuntimeError('Unresolved conflict marker')
run('git','add','src','tests')
run('git','commit','-m','fix(world): wire current runtime and isolate Passport City identities')
