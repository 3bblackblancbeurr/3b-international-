from pathlib import Path
p=Path('src/world/WorldPage.jsx');s=p.read_text()
a="import {worldCinematicEvents} from './cinematic-events.js';"
assert a in s;s=s.replace(a,a+"\nimport {cinematicSeenCommand} from './cinematic-persistence.js';")
a="scene.current?.skipCinematic();if(current.kind!=='world-opening')act({type:'cinematicSeen',key:current.key});"
assert a in s;s=s.replace(a,"scene.current?.skipCinematic();const seenCommand=cinematicSeenCommand(current);if(seenCommand)act(seenCommand);")
p.write_text(s)
Path('src/world/cinematic-persistence.js').write_text('''import {isWorldCinematicKey} from './cinematic-events.js';

// Opening is presentation-only. A memory already has its durable server beacon;
// do not enqueue an unsupported memory:* cinematicSeen action against engine v21.
// The beacon transition itself prevents the memory presentation from replaying.
export function cinematicSeenCommand(event){
 if(!event||event.kind==='world-opening'||event.kind==='memory-fragment')return null;
 if(!isWorldCinematicKey(event.key)||event.key.startsWith('memory:'))return null;
 return {type:'cinematicSeen',key:event.key};
}
''')
Path('tests/cinematic-persistence.test.js').write_text('''import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cinematicSeenCommand} from '../src/world/cinematic-persistence.js';
import {worldCinematicEvents} from '../src/world/cinematic-events.js';

test('presentation-only opening and already persisted beacon memories never enqueue unsupported server commands',()=>{
 for(const event of [null,{}, {kind:'world-opening',key:'opening:v4'}, {kind:'memory-fragment',key:'memory:france:0'}, {kind:'other',key:'memory:france:0'}, {kind:'unknown',key:'invalid'}])assert.equal(cinematicSeenCommand(event),null);
 assert.deepEqual(cinematicSeenCommand({kind:'country-first-entry',key:'country:france'}),{type:'cinematicSeen',key:'country:france'});
 assert.deepEqual(cinematicSeenCommand({kind:'important-combat-result',key:'result:france:C001:victory'}),{type:'cinematicSeen',key:'result:france:C001:victory'});
});
test('a saved beacon prevents memory replay without cinematicSeen, and presentation does not mutate rewards',()=>{
 const previous={region:'france',beacons:[],adventure:{}},next={region:'france',beacons:['france:0'],adventure:{}},action={type:'beacon',id:'france:0'};
 const original=structuredClone(next);
 const events=worldCinematicEvents(previous,next,action);
 assert.equal(events[0].kind,'memory-fragment');
 assert.equal(cinematicSeenCommand(events[0]),null);
 assert.deepEqual(worldCinematicEvents(next,structuredClone(next),action),[]);
 assert.deepEqual(next,original);
});
test('the actual cinematic completion uses the server-compatible persistence selector',()=>{
 const source=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
 assert.match(source,/const seenCommand=cinematicSeenCommand\\(current\\);if\\(seenCommand\\)act\\(seenCommand\\);/);
});
''')
