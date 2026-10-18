import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildReligionDiagram,diagramEdgePath,filterReligionFigures} from '../src/religion/diagram-model.js';
const corpus=JSON.parse(readFileSync(new URL('../src/religion/corpus.json',import.meta.url),'utf8'));

test('search shares accented names and aliases across the tree and diagram',()=>{
 assert.ok(filterReligionFigures(corpus,{query:'EVE'}).some(node=>node.id==='eve'));
 assert.ok(filterReligionFigures(corpus,{query:'MOÏSE'}).some(node=>node.id==='moise'));
 assert.equal(filterReligionFigures(corpus,{query:'invented-nonexistent-person'}).length,0);
 for(const node of filterReligionFigures(corpus,{branch:'quran'}))assert.ok(node.sources.some(source=>source.url.startsWith('https://quran.com/')));
});

test('the whole diagram preserves every original figure and relationship exactly',()=>{
 const graph=buildReligionDiagram(corpus,{scope:'all',includeLiterary:true});
 assert.equal(graph.nodes.length,corpus.nodes.length);
 assert.deepEqual(graph.edges,corpus.edges);
 assert.equal(new Set(graph.nodes.map(node=>node.id)).size,corpus.nodes.length);
 for(const node of graph.nodes){assert.ok([node.x,node.y,node.width,node.height].every(Number.isFinite));assert.ok(node.x>=0&&node.y>=0&&node.x+node.width<=graph.width&&node.y+node.height<=graph.height);}
 assert.deepEqual(graph,buildReligionDiagram(corpus,{scope:'all',includeLiterary:true}));
});

test('directed documentary relationships always read from left to right',()=>{
 const graph=buildReligionDiagram(corpus,{scope:'all',includeLiterary:true}),positions=new Map(graph.nodes.map(node=>[node.id,node]));
 for(const edge of graph.edges){
  assert.match(diagramEdgePath(edge,positions),/^M [\d.]+ [\d.]+ C /);
  if(['parent','lineage'].includes(edge.kind))assert.ok(positions.get(edge.source).x<positions.get(edge.target).x,edge.source+' → '+edge.target);
 }
 for(const left of graph.nodes)for(const right of graph.nodes){if(left.id!==right.id&&left.x===right.x)assert.ok(Math.abs(left.y-right.y)>=left.height);}
});

test('ascendance never turns an union or a literary link into biological parenthood',()=>{
 const graph=buildReligionDiagram(corpus,{focusId:'jesus',scope:'ancestors',includeLiterary:false});
 assert.ok(graph.nodes.some(node=>node.id==='marie'));
 assert.ok(!graph.nodes.some(node=>node.id==='joseph-marie'));
 assert.ok(graph.edges.every(edge=>edge.kind==='parent'));
 const isolated=buildReligionDiagram(corpus,{focusId:'muhammad',scope:'ancestors'});
 assert.deepEqual(isolated.nodes.map(node=>node.id),['muhammad']);assert.equal(isolated.edges.length,0);
});

test('literary successions are an explicit optional layer that retains its type and source',()=>{
 const included=buildReligionDiagram(corpus,{focusId:'joseph-marie',scope:'ancestors',includeLiterary:true});
 assert.ok(included.edges.some(edge=>edge.kind==='lineage'));
 for(const edge of included.edges)assert.ok(corpus.edges.some(original=>original===edge)&&edge.reference&&edge.tradition);
 const excluded=buildReligionDiagram(corpus,{scope:'all',includeLiterary:false});
 assert.ok(excluded.edges.every(edge=>edge.kind!=='lineage'));
 assert.equal(excluded.nodes.length,corpus.nodes.length,'Turning off a relation type does not delete figures');
});

test('descendance keeps the documented direction and respects the selected branch',()=>{
 const eligible=filterReligionFigures(corpus,{branch:'origins'}).map(node=>node.id);
 const graph=buildReligionDiagram(corpus,{eligibleIds:eligible,focusId:'adam',scope:'descendants'});
 assert.ok(graph.nodes.some(node=>node.id==='seth'));
 assert.ok(graph.nodes.every(node=>eligible.includes(node.id)));
 assert.ok(graph.edges.every(edge=>['parent','lineage'].includes(edge.kind)));
});

test('a filtered-out focus has a deterministic fallback and an empty branch stays empty',()=>{
 const eligible=['marie','jesus'];
 const graph=buildReligionDiagram(corpus,{eligibleIds:eligible,focusId:'adam'});
 assert.ok(eligible.includes(graph.focusId));assert.ok(graph.nodes.every(node=>eligible.includes(node.id)));
 const empty=buildReligionDiagram(corpus,{eligibleIds:[]});
 assert.equal(empty.focusId,null);assert.equal(empty.nodes.length,0);assert.equal(empty.edges.length,0);
});

test('a future invalid corpus fails visibly instead of drawing a fictional ancestry',()=>{
 const nodes=[{id:'a'},{id:'b'}],edges=[{source:'a',target:'b',kind:'parent'},{source:'b',target:'a',kind:'lineage'}];
 assert.throws(()=>buildReligionDiagram({nodes,edges},{scope:'all',includeLiterary:true}),/boucle/);
});
