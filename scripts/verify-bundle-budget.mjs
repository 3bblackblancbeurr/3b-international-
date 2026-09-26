import {readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';

const assets='dist/assets';
const files=readdirSync(assets).filter(name=>name.endsWith('.js'));
const kb=bytes=>bytes/1024;
const size=name=>kb(statSync(join(assets,name)).size);
const find=prefix=>files.find(name=>name.startsWith(prefix));

const budgets=[
  {label:'application core',prefix:'index-',max:300},
  {label:'World 3B',prefix:'WorldPage-',max:450},
  {label:'Games Hub',prefix:'GamesHub-',max:275},
  {label:'Penalty Rush arena',prefix:'PenaltyRushArena3D-',max:650},
  {label:'Three.js vendor',prefix:'three.module-',max:700},
];

const problems=[];
const measured=[];
for(const budget of budgets){
  const file=find(budget.prefix);
  if(!file){
    problems.push(`${budget.label}: chunk missing (${budget.prefix})`);
    continue;
  }
  const current=size(file);
  measured.push({label:budget.label,file,kb:Number(current.toFixed(2)),maxKb:budget.max});
  if(current>budget.max)problems.push(`${budget.label}: ${current.toFixed(2)} kB > ${budget.max} kB`);
}

const largest=files
  .map(file=>({file,kb:size(file)}))
  .sort((a,b)=>b.kb-a.kb)[0];

if(largest?.kb>700)problems.push(`largest JS chunk: ${largest.kb.toFixed(2)} kB > 700 kB (${largest.file})`);

console.log(JSON.stringify({measured,largest:largest&&{file:largest.file,kb:Number(largest.kb.toFixed(2))}},null,2));
if(problems.length){
  console.error(JSON.stringify({ok:false,problems},null,2));
  process.exit(1);
}
console.log(JSON.stringify({ok:true},null,2));
