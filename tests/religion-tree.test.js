import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const corpus=JSON.parse(readFileSync(new URL('../src/religion/corpus.json',import.meta.url),'utf8'));
const ids=new Set(corpus.nodes.map(n=>n.id));
test('religion corpus has unique figures, resolvable relationships and primary sources',()=>{
 assert.equal(ids.size,corpus.nodes.length);
 assert.ok(ids.size>=100);
 for(const n of corpus.nodes){assert.ok(n.bio.length>30,n.id);assert.ok(n.sources.length,n.id);for(const s of n.sources)assert.ok(['www.aelf.org','quran.com','www.sefaria.org'].includes(new URL(s.url).hostname));}
 for(const e of corpus.edges){assert.ok(ids.has(e.source)&&ids.has(e.target));assert.notEqual(e.source,e.target);assert.ok(e.reference&&e.tradition);}
 const visit=(id,path=new Set())=>{assert.ok(!path.has(id),`Cycle at ${id}`);for(const e of corpus.edges.filter(e=>e.source===id&&['parent','lineage'].includes(e.kind)))visit(e.target,new Set([...path,id]));};
 for(const id of ids)visit(id);
});
test('source distinctions prevent fabricated biological or interfaith filiations',()=>{
 assert.ok(!corpus.edges.some(e=>e.target==='muhammad'));
 assert.ok(!corpus.edges.some(e=>e.source==='joseph-marie'&&e.target==='jesus'));
 assert.ok(!corpus.edges.some(e=>e.source==='henok'&&e.target==='idris'));
 assert.ok(corpus.edges.filter(e=>e.tradition==='Matthieu'&&e.source!=='rahab'&&e.target!=='marie'&&e.target!=='jesus').every(e=>e.kind==='lineage'));
 assert.ok(corpus.edges.some(e=>e.source==='marie'&&e.target==='jesus'&&e.kind==='parent'));
});
