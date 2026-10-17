import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLABORATION_SPACES,COLLABORATION_STATUSES,addCollaborationNote,collaborationDue,collaborationMail,collaborationReadiness,collaborationStorageKey,collaborationText,createCollaborationDraft,deleteCollaborationDraft,emptyCollaborationState,filterCollaborationDrafts,mergeCollaborationBackup,normalizeCollaborationDraft,parseCollaborationBackup,readCollaborationState,saveCollaborationDraft,saveCollaborationState,setCollaborationStatus} from '../src/member/collaboration/collaboration-model.js';

const start='2026-10-18T08:00:00.000Z',later='2026-10-18T09:00:00.000Z';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
function complete(space='partners',id='complete'){return {...createCollaborationDraft(space,'',{id,now:start}),title:'Construire une rencontre',objective:'Faire découvrir des récits culturels.',proposal:'Préparer ensemble un premier atelier.',contribution:'Animation et création visuelle.',timing:'À discuter en novembre.',contactName:'Camille',contactEmail:'camille@example.org',checks:Object.fromEntries(COLLABORATION_SPACES[space].checks.map(item=>[item.id,true]))};}
function seeded(draft=complete()){return saveCollaborationDraft(emptyCollaborationState(start),draft,start);}

test('three distinct workshops share a model and start without fabricated projects or agreements',()=>{
 assert.deepEqual(Object.keys(COLLABORATION_SPACES),['association','partners','join']);
 assert.equal(emptyCollaborationState(start).items.length,0);
 for(const [space,config] of Object.entries(COLLABORATION_SPACES)){
  assert.equal(config.templates.length,3);assert.equal(config.checks.length,4);
  const draft=createCollaborationDraft(space,config.templates[0].id,{id:'draft-'+space,now:start});
  assert.equal(draft.status,'draft');assert.equal(draft.contactName,'');assert.equal(draft.activity.length,0);assert.equal(collaborationReadiness(draft).ready,false);
 }
 assert.notEqual(COLLABORATION_SPACES.join.contribution,COLLABORATION_SPACES.partners.contribution);
 assert.throws(()=>createCollaborationDraft('__proto__'),/inconnu/);
});
test('brief fields and checklist define readiness without claiming any outside validation',()=>{
 const draft=complete();assert.deepEqual(collaborationReadiness(draft),{ready:true,completed:11,total:11,missing:[],unchecked:[]});
 assert.equal(collaborationReadiness({...draft,contactEmail:'broken@'}).ready,false);
 assert.equal(collaborationReadiness({...draft,contactEmail:'camille@example.org\r\nbcc:someone@example.org'}).ready,false);
 assert.equal(collaborationReadiness({...draft,checks:{...draft.checks,review:false}}).ready,false);
 let state=seeded(draft);state=setCollaborationStatus(state,draft.id,'ready',later);
 assert.equal(state.items[0].status,'ready');assert.match(state.items[0].activity[0].text,/déclaré/);
 assert.throws(()=>setCollaborationStatus(seeded({...draft,proposal:''}),draft.id,'ready'),/Complète/);
});
test('edits save without losing spaces being typed and preserve unrelated drafts',()=>{
 const one=complete('association','one'),two=complete('join','two');let state=saveCollaborationDraft(seeded(one),two,start);
 state=saveCollaborationDraft(state,{...one,nextAction:'relire le ',proposal:'Une phrase en cours '},later);
 assert.equal(state.items.find(item=>item.id==='one').nextAction,'relire le ');
 assert.equal(state.items.find(item=>item.id==='one').proposal,'Une phrase en cours ');
 assert.equal(state.items.find(item=>item.id==='two').updatedAt,start);
 assert.equal(state.items.find(item=>item.id==='one').createdAt,start);
 assert.throws(()=>saveCollaborationDraft(state,{...one,space:'partners'}),/rubrique/);
});
test('incomplete edits and imported incomplete ready states return to draft',()=>{
 let state=setCollaborationStatus(seeded(),'complete','ready',later);
 state=saveCollaborationDraft(state,{...state.items[0],objective:'   '},later);
 assert.equal(state.items[0].status,'draft');
 assert.equal(normalizeCollaborationDraft({...complete(),status:'ready',contribution:''}).status,'draft');
});
test('persistence reloads all workshops and isolates browser storage by account',()=>{
 const target=storage(),state=saveCollaborationDraft(seeded(complete('association','one')),complete('join','two'),later);
 assert.equal(saveCollaborationState(state,'member-a',target).ok,true);
 assert.deepEqual(readCollaborationState('member-a',target).state,state);
 assert.equal(readCollaborationState('member-b',target).state.items.length,0);
 assert.notEqual(collaborationStorageKey('member-a'),collaborationStorageKey('member-b'));
 assert.notEqual(collaborationStorageKey(''),collaborationStorageKey('member-a'));
});
test('storage errors are reported and corrupt previous JSON is retained for recovery',()=>{
 const target=storage(),key=collaborationStorageKey('owner');target.setItem(key,'{bad');
 const loaded=readCollaborationState('owner',target);assert.match(loaded.notice,/illisible/);assert.equal(target.getItem(key),'{bad');
 assert.equal(saveCollaborationState(loaded.state,'owner',target).ok,true);assert.equal(target.getItem(key+':recovery'),'{bad');
 const broken={getItem(){throw Error();},setItem(){throw Error();}};
 assert.equal(saveCollaborationState(seeded(),'owner',broken).ok,false);assert.match(readCollaborationState('owner',broken).notice,/session/);
});
test('text export is structured and private follow-up notes are excluded from the mail',()=>{
 const draft={...complete('join'),nextAction:'Note privée : négocier le cadre',followUpDate:'2026-10-20',activity:[{id:'note-1',at:start,text:'Note interne réservée au suivi.'}]};
 const text=collaborationText(draft);assert.match(text,/candidatures/i);assert.match(text,/compétences/i);assert.match(text,/AUCUNE TRANSMISSION AUTOMATIQUE/);assert.doesNotMatch(text,/Note privée|Note interne/);
 const dossier=collaborationText(draft,{includeActivity:true});assert.match(dossier,/Note privée/);assert.match(dossier,/Note interne/);
});
test('mail preparation only builds an encoded URL and never changes the local state',()=>{
 const draft=complete('partners'),snapshot=structuredClone(draft),prepared=collaborationMail(draft,'team@example.org');
 assert.match(prepared.href,/^mailto:team@example\.org\?subject=/);assert.match(prepared.subject,/Proposition de collaboration/);
 const params=new URLSearchParams(prepared.href.split('?')[1]);assert.equal(params.get('body'),collaborationText(draft));assert.deepEqual(draft,snapshot);assert.equal(draft.status,'draft');
 assert.match(collaborationMail({...draft,title:'Projet\r\nbcc:test@example.org'},'team@example.org').subject,/Projet bcc/);
 assert.throws(()=>collaborationMail(draft,'bad\nbcc:test@example.org'),/destinataire/);
 const long=collaborationMail({...draft,objective:'x'.repeat(1800),proposal:'y'.repeat(1800)},'team@example.org');assert.equal(long.tooLong,true);assert.ok(long.shortHref.length<long.href.length);assert.equal(long.body.includes('x'.repeat(1800)),true);
});
test('follow-up status and notes are explicit user declarations and bounded',()=>{
 let state=seeded();state=setCollaborationStatus(state,'complete','contacted',later);
 assert.equal(state.items[0].status,'contacted');assert.equal(state.items[0].activity.length,1);
 state=addCollaborationNote(state,'complete','Une réponse à relire',{noteId:'note-1',now:later});assert.equal(state.items[0].activity.at(-1).text,'Une réponse à relire');
 assert.throws(()=>addCollaborationNote(state,'complete','  '),/note/);
 for(let index=0;index<35;index++)state=addCollaborationNote(state,'complete','Étape '+index,{noteId:'note-'+index,now:later});
 assert.equal(state.items[0].activity.length,30);
 assert.equal(Object.values(COLLABORATION_STATUSES).some(value=>/embauché|partenaire confirmé|envoi confirmé/i.test(value)),false);
});
test('date-based follow-up is local and ignores paused or archived drafts',()=>{
 const draft={...complete(),followUpDate:'2026-10-18'};
 assert.equal(collaborationDue(draft,'2026-10-18'),true);assert.equal(collaborationDue(draft,'2026-10-17'),false);assert.equal(collaborationDue({...draft,status:'paused'},'2026-10-20'),false);assert.equal(collaborationDue({...draft,status:'archived'},'2026-10-20'),false);
 assert.throws(()=>normalizeCollaborationDraft({...draft,followUpDate:'2026-02-31'}),/date/);
});
test('search ignores accents, combines words and respects workshop and status',()=>{
 const one={...complete('association','one'),title:'Échanges à Lyon',identity:'Collectif Élodie'},two=complete('join','two'),state=saveCollaborationDraft(seeded(one),two,start);
 assert.equal(filterCollaborationDrafts(state,{space:'association',query:'elodie echanges'}).length,1);
 assert.equal(filterCollaborationDrafts(state,{space:'join',query:'elodie'}).length,0);
 assert.equal(filterCollaborationDrafts(state,{space:'association',status:'ready'}).length,0);
});
test('JSON export/import retains newer local changes and never drops absent drafts',()=>{
 const local=seeded(complete('association','local')),remote=setCollaborationStatus(seeded(complete('join','remote')),'remote','contacted',later);
 const restored=mergeCollaborationBackup(local,JSON.stringify(remote),later);assert.equal(restored.added,1);assert.equal(restored.state.items.length,2);
 const newer=saveCollaborationDraft(restored.state,{...restored.state.items.find(item=>item.id==='remote'),objective:'Version locale plus récente'},'2026-10-18T10:00:00.000Z');
 const older=mergeCollaborationBackup(newer,JSON.stringify(remote));assert.equal(older.updated,0);assert.equal(older.state.items.find(item=>item.id==='remote').objective,'Version locale plus récente');
 assert.deepEqual(parseCollaborationBackup(JSON.stringify(newer)),newer);
});
test('malformed and oversized backups fail while extra fields are discarded',()=>{
 const state=seeded();assert.throws(()=>parseCollaborationBackup('{'),/illisible/);assert.throws(()=>parseCollaborationBackup({...state,version:4}),/version 1/);assert.throws(()=>parseCollaborationBackup({...state,items:[state.items[0],state.items[0]]}),/double/);
 assert.throws(()=>parseCollaborationBackup({...state,items:Array.from({length:61},(_,index)=>({...state.items[0],id:'draft-'+index}))}),/60/);
 assert.throws(()=>mergeCollaborationBackup(state,{...state,items:[{...state.items[0],space:'join'}]}),/autre rubrique/);
 const parsed=parseCollaborationBackup({...state,token:'ignored',items:[{...state.items[0],sent:true,checks:{...state.items[0].checks,unauthorized:true}}]});assert.equal(parsed.token,undefined);assert.equal(parsed.items[0].sent,undefined);assert.equal(parsed.items[0].checks.unauthorized,undefined);
});
test('a valid large Unicode backup produced by the workshop can be imported again',()=>{
 const state=emptyCollaborationState(start);state.items=Array.from({length:60},(_,index)=>normalizeCollaborationDraft({...complete('association','unicode-'+index),objective:'文'.repeat(1800),proposal:'文'.repeat(1800),activity:Array.from({length:30},(_,note)=>({id:'note-'+note,at:start,text:'文'.repeat(700)}))},start));
 const source=JSON.stringify(state);assert.ok(Buffer.byteLength(source)>3000000);assert.ok(Buffer.byteLength(source)<8000000);assert.deepEqual(parseCollaborationBackup(source),state);
});
test('deleting a local draft cannot remove another workshop or mutate a backup snapshot',()=>{
 const previous=saveCollaborationDraft(seeded(complete('association','one')),complete('partners','two'),later),deleted=deleteCollaborationDraft(previous,'one',later);
 assert.equal(previous.items.length,2);assert.equal(deleted.items.length,1);assert.equal(deleted.items[0].space,'partners');assert.throws(()=>deleteCollaborationDraft(previous,'absent'),/introuvable/);
});
test('the UI uses shared buttons and has no automatic transmission or false sender state',()=>{
 const source=readFileSync(new URL('../src/member/collaboration/CollaborationStudio.jsx',import.meta.url),'utf8');
 assert.ok(source.includes('ownerId'));assert.ok(source.includes('COLLABORATION_SPACES'));assert.ok(source.includes('<Button as="a"'));assert.ok(!source.includes('<button'));
 assert.ok(!/\bfetch\s*\(|ecosystem\(|sendMail\(/.test(source));assert.match(source,/Le suivi ne change pas automatiquement/);
 assert.match(source,/storageOkay\?/);assert.match(source,/mergeCollaborationBackup\(current\.current,importPreview\.source\)/);
});
