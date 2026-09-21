import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 DEFAULT_DESIGN,JERSEY_SPORTS,JERSEY_PRESETS,validateDesign,designReadiness,textilePrompt
} from '../shared/studio.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('jersey studio exposes real sport construction choices and premium presets',()=>{
 assert.deepEqual(JERSEY_SPORTS,['Football','Basketball','Rugby','Esport','Training']);
 assert.ok(Object.keys(JERSEY_PRESETS).length>=5);
 for(const preset of Object.values(JERSEY_PRESETS)){
  const design=validateDesign({...DEFAULT_DESIGN,...preset});
  assert.ok(design.jerseySport);
  assert.ok(design.collar);
  assert.ok(design.construction);
  assert.ok(design.secondary.startsWith('#'));
 }
});

test('jersey design validation rejects forged production fields',()=>{
 const valid=validateDesign(DEFAULT_DESIGN);
 assert.equal(valid.quantity,50);
 assert.equal(valid.logoPlacement,'3B officiel · droite visuelle');
 for(const patch of [
  {jerseySport:'Paintball inconnu'},
  {sleeve:'cape'},
  {collar:'script'},
  {secondary:'red'},
  {quantity:0},
  {quantity:100001},
  {teamName:'x'.repeat(65)}
 ])assert.throws(()=>validateDesign({...DEFAULT_DESIGN,...patch}));
});

test('production readiness and tech pack require structured jersey data',()=>{
 const ready=designReadiness({...DEFAULT_DESIGN,teamName:'3B INTERNATIONAL',playerNumber:'18'});
 assert.equal(ready.ready,true);
 assert.equal(ready.checks.length,4);
 const prompt=textilePrompt({...DEFAULT_DESIGN,teamName:'3B INTERNATIONAL',playerName:'ZAKARIA',playerNumber:'18'},'Compétition');
 assert.match(prompt,/BRIEF TECHNIQUE MAILLOT/);
 assert.match(prompt,/4 cm sous le col et 3,5 cm depuis l’épaule/);
 assert.match(prompt,/numéro « 18 »/);
 assert.match(prompt,/Compétition/);
 assert.match(prompt,/ne pas redessiner un emblème officiel/i);
});

test('IA Textile UI is a five-step jersey workspace with front/back and production output',()=>{
 const studio=read('src/ai/TextileStudio.jsx');
 for(const label of ['Base','Construction','Design','Identité','Production'])assert.match(studio,new RegExp("label:'"+label+"'"));
 assert.match(studio,/APERÇU PRODUIT/);
 assert.match(studio,/\['Face','Dos'\]/);
 assert.match(studio,/Générer un rendu IA/);
 assert.match(studio,/Exporter fiche technique/);
 assert.match(studio,/Mes créations/);
});

test('textile projects stay behind the authenticated private edge boundary',()=>{
 const edge=read('supabase/functions/ecosystem-private/index.ts');
 const publicEdge=read('supabase/functions/ecosystem-public/index.ts');
 for(const action of ['textile-list','textile-save','textile-delete']){
  assert.match(edge,new RegExp("action==='"+action+"'"));
  assert.doesNotMatch(publicEdge,new RegExp(action));
 }
 assert.match(edge,/validateDesign\(body\.design\)/);
 assert.match(edge,/studio_assets/);
});

test('textile project storage is service-only and tied to member profiles',()=>{
 const migration=read('supabase/migrations/20260921132943_textile_projects_v1.sql');
 assert.match(migration,/user_id uuid not null references public\.member_profiles\(user_id\) on delete cascade/);
 assert.match(migration,/alter table public\.textile_projects enable row level security/);
 assert.match(migration,/revoke all on public\.textile_projects from public,anon,authenticated/);
 assert.match(migration,/grant select,insert,update,delete on public\.textile_projects to service_role/);
});
