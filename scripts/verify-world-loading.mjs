import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {build} from 'vite';

// Inspect the actual production output, including Vite's preload rewrites.
// No deployment files are written and no browser download timings are inferred.
const result=await build({logLevel:'warn',build:{write:false}});
const outputs=(Array.isArray(result)?result:[result]).flatMap(item=>item.output);
const chunks=outputs.filter(item=>item.type==='chunk');
const byFile=new Map(chunks.map(chunk=>[chunk.fileName,chunk]));
const hasModule=(chunk,suffix)=>chunk.moduleIds.some(id=>id.replaceAll('\\','/').endsWith(suffix));
const main=chunks.find(chunk=>chunk.isEntry&&hasModule(chunk,'/src/main.jsx'));
const world=chunks.find(chunk=>hasModule(chunk,'/src/world/WorldPage.jsx'));
const worldEntry=chunks.find(chunk=>hasModule(chunk,'/src/world/WorldEntry.jsx'));
assert.ok(main,'The main application entry must be present.');
assert.ok(world,'The world runtime must be present.');
assert.equal(worldEntry,world,'The world route must not create a second asynchronous import waterfall.');
assert.ok(main.dynamicImports.includes(world.fileName),'App must load the world through one asynchronous route boundary.');

function staticClosure(root){
 const seen=new Set();
 function visit(file){if(seen.has(file)||!byFile.has(file))return;seen.add(file);for(const dependency of byFile.get(file).imports)visit(dependency);}
 visit(root.fileName);return [...seen].map(file=>byFile.get(file));
}

const mainChunks=staticClosure(main),worldChunks=staticClosure(world);
assert.ok(!mainChunks.includes(world),'World code must stay outside the initial app download.');
assert.ok(!mainChunks.some(chunk=>chunk.moduleIds.some(id=>/\/node_modules\/three\//.test(id.replaceAll('\\','/')))),
 'The Three.js engine must stay outside the initial app download.');

// A vendor split that introduces a static cycle can fail at module evaluation.
const visited=new Set(),active=new Set();
function checkCycles(file,path=[]){
 if(!byFile.has(file)||visited.has(file))return;
 assert.ok(!active.has(file),'Static chunk cycle: '+[...path,file].join(' -> '));
 active.add(file);
 for(const dependency of byFile.get(file).imports)checkCycles(dependency,[...path,file]);
 active.delete(file);visited.add(file);
}
for(const chunk of chunks)checkCycles(chunk.fileName);

const size=items=>({chunks:items.length,bytes:items.reduce((sum,item)=>sum+Buffer.byteLength(item.code),0),gzipBytes:items.reduce((sum,item)=>sum+gzipSync(item.code).length,0)});
const report={
 checks:{worldAsyncBoundaries:1,worldInitiallyDownloaded:false,threeInitiallyDownloaded:false,staticChunkCycles:0},
 main: {file:main.fileName,...size(mainChunks)},
 worldRoute:{file:world.fileName,...size([world])},
 worldAdditionalDownload:size(worldChunks.filter(chunk=>!mainChunks.includes(chunk))),
 allJavaScript:size(chunks),
};
console.log(JSON.stringify(report,null,2));
const reportIndex=process.argv.indexOf('--report');
if(reportIndex!==-1){assert.ok(process.argv[reportIndex+1],'--report requires a file path.');writeFileSync(process.argv[reportIndex+1],JSON.stringify(report,null,2)+'\n');}
