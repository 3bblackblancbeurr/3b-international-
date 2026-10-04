import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {blankSave} from '../src/world/rules.js';
import {writeFileSync} from 'node:fs';
const scene=createHubPlatform(blankSave());
try {
 const footprints=scene.collisions.filter(o=>typeof o.surfaceDistance!=='function');
 writeFileSync(new URL('../src/world/hub/data/platform-obstacles.json',import.meta.url),JSON.stringify(footprints,null,2)+'\n');
 console.log(footprints.length+' shared physical footprints; regenerate the candidate engine package next.');
}finally{scene.dispose();}