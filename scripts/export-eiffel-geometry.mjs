import fs from 'node:fs';
import {createEiffelTower} from '../src/world/eiffel-tower.js';
const variants=[true,false].map(detail=>{const tower=createEiffelTower({height:60,detail});return {detail,meshes:tower.children.map(m=>({positions:Array.from(m.geometry.attributes.position.array),indices:Array.from(m.geometry.index.array),color:m.material.color.toArray(),roughness:m.material.roughness,metalness:m.material.metalness}))};});fs.writeFileSync('artifacts/mobile-mission/eiffel-geometry.json',JSON.stringify(variants));
