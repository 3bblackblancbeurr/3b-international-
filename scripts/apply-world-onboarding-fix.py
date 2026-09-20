from pathlib import Path

def replace(s,a,b):
 assert a in s,a[:90]
 return s.replace(a,b)
p=Path('src/world/WorldPage.jsx');s=p.read_text()
s=replace(s,"const [assetsLoading,setAssetsLoading]=useState(true)","const [worldRequested,setWorldRequested]=useState(false);\n const [assetsLoading,setAssetsLoading]=useState(true)")
s=replace(s,"const finishAvatarReveal=useCallback(({firstCreation=false}={})=>{\n  setPanel(null);", "const finishAvatarReveal=useCallback(({firstCreation=false}={})=>{\n  setWorldRequested(true);setPanel(null);")
s=replace(s,"if(storyCinematic||!cinematicQueue.length)return;", "if(storyCinematic||!cinematicQueue.length||assetsLoading||!scene.current)return;")
s=replace(s,"},[cinematicQueue,storyCinematic]);", "},[cinematicQueue,storyCinematic,assetsLoading,worldRequested]);")
s=replace(s,"function closePanel(){const e=", "function closePanel(){setWorldRequested(true);const e=")
s=replace(s,"setLoaded(true);if(result.data.adventure.encounter)", "setLoaded(true);setWorldRequested(!!result.data.adventure.avatar.created||!!result.data.adventure.encounter);if(result.data.adventure.encounter)")
s=replace(s,"  if(!loaded)return;\n  try{scene.current=createWorldScene", "  if(!loaded||!worldRequested)return;\n  try{scene.current=createWorldScene")
s=replace(s," },[loaded]);\n useEffect(()=>{if(panel!=='encounter')", " },[loaded,worldRequested]);\n useEffect(()=>{if(panel!=='encounter')")
s=replace(s,"},[panel,error,loaded,fieldCombat,storyCinematic]);", "},[panel,error,loaded,worldRequested,fieldCombat,storyCinematic]);")
p.write_text(s)
p=Path('src/arena/ArenaStage.jsx');s=p.read_text()
s=replace(s,"  const canvas=ref.current;let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});}", "  const canvas=ref.current;let lowPower=false;try{lowPower=localStorage.getItem('3b-world-quality')==='fluid';}catch{}\n  let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:!lowPower,alpha:true,powerPreference:lowPower?'low-power':'high-performance'});}")
s=replace(s,"Math.min(devicePixelRatio||1,1.5)", "Math.min(devicePixelRatio||1,lowPower?1:1.5)")
s=replace(s,"renderer.shadowMap.enabled=true", "renderer.shadowMap.enabled=!lowPower")
s=replace(s,"  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();", "  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();\n  let inView=true;const io=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);}):null;io?.observe(canvas);")
s=replace(s,"function tick(now){if(disposed)return;raf=requestAnimationFrame(tick);const rawDt=Math.min(.05,Math.max(0,(now-at)/1000));at=now;if(document.hidden)return;", "function tick(now){if(disposed)return;raf=requestAnimationFrame(tick);if(document.hidden||!inView){at=now;return;}if(lowPower&&now-at<1000/30)return;const rawDt=Math.min(.05,Math.max(0,(now-at)/1000));at=now;")
s=replace(s,"cancelAnimationFrame(raf);ro.disconnect();", "cancelAnimationFrame(raf);ro.disconnect();io?.disconnect();")
p.write_text(s)
p=Path('tests/world-onboarding-lifecycle.test.js');p.write_text('''import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const world=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
const stage=readFileSync(new URL('../src/arena/ArenaStage.jsx',import.meta.url),'utf8');
test('first creation does not compete with a full world renderer behind the editor',()=>{
 assert.match(world,/if\\(!loaded\\|\\|!worldRequested\\)return/);
 assert.match(world,/setWorldRequested\\(!!result\\.data\\.adventure\\.avatar\\.created\\|\\|!!result\\.data\\.adventure\\.encounter\\)/);
 assert.match(world,/setWorldRequested\\(true\\);setPanel\\(null\\)/);
 assert.match(world,/function closePanel\\(\\)\\{setWorldRequested\\(true\\)/);
});
test('queued opening waits for real world assets instead of playing over a loading canvas',()=>{
 assert.match(world,/if\\(storyCinematic\\|\\|!cinematicQueue\\.length\\|\\|assetsLoading\\|\\|!scene\\.current\\)return/);
 assert.match(world,/\\[cinematicQueue,storyCinematic,assetsLoading,worldRequested\\]/);
});
test('avatar preview obeys fluid mode and suspends its GPU work when offscreen',()=>{
 assert.match(stage,/localStorage\\.getItem\\('3b-world-quality'\\)==='fluid'/);
 assert.match(stage,/renderer\\.shadowMap\\.enabled=!lowPower/);
 assert.match(stage,/if\\(lowPower&&now-at<1000\\/30\\)return/);
 assert.match(stage,/document\\.hidden\\|\\|!inView/);
 assert.match(stage,/io\\?\\.disconnect\\(\\)/);
});
''')
