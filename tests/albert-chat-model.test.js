import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAlbertMessages,readAlbertReply,exportAlbertConversation} from '../src/components/albert-chat/albert-chat-model.js';

test('Albert preserves the latest five complete conversation pairs in alternating order',()=>{
 const turns=Array.from({length:12},(_,i)=>({question:'question '+i,answer:'réponse '+i}));
 const messages=prepareAlbertMessages(turns,'  nouvelle question  ');
 assert.equal(messages.length,11);assert.deepEqual(messages[0],{role:'user',content:'question 7'});
 assert.deepEqual(messages.at(-2),{role:'assistant',content:'réponse 11'});
 assert.deepEqual(messages.at(-1),{role:'user',content:'nouvelle question'});
 assert.deepEqual(messages.map(row=>row.role),['user','assistant','user','assistant','user','assistant','user','assistant','user','assistant','user']);
});
test('Albert bounds total context and retains whole recent pairs',()=>{
 const turns=Array.from({length:6},(_,i)=>({question:String(i).repeat(4000),answer:'r'.repeat(8000)}));
 const messages=prepareAlbertMessages(turns,'q'.repeat(4000));
 assert.equal(messages.length,5);assert.equal(messages[0].content,'4'.repeat(4000));
 assert.equal(messages.reduce((sum,row)=>sum+row.content.length,0),20000);
 assert.ok(messages.every(row=>row.content.length<=4000));
});
test('Albert rejects empty and oversized questions and strips control characters',()=>{
 for(const prompt of ['',null,'  ','q'.repeat(4001)])assert.throws(()=>prepareAlbertMessages([],prompt),/4 000/);
 assert.deepEqual(prepareAlbertMessages([{question:'',answer:'r'},{question:'q',answer:null}],'\u0000 Bonjour\nà toi\u0007'),[{role:'user',content:'Bonjour\nà toi'}]);
});
test('Albert refuses malformed answers without inventing contributors',()=>{
 for(const reply of [null,{}, {answer:''},{answer:'a'.repeat(20001)}])assert.throws(()=>readAlbertReply(reply),/réponse IA/);
 assert.deepEqual(readAlbertReply({answer:'  réponse\u0000  ',contributors:['gpt','claude','gpt','unknown'],partial:true,synthesized:true}),{answer:'réponse',contributors:['gpt','claude'],partial:true,synthesized:true});
 assert.deepEqual(readAlbertReply({answer:'réponse',contributors:'gpt'}).contributors,[]);
});
test('Conversation export contains only bounded user exchanges and provenance',()=>{
 const turns=Array.from({length:14},(_,i)=>({id:'private-'+i,question:'Question '+i,answer:'Réponse '+i,contributors:['gemini'],privateData:'excluded'}));
 const payload=JSON.parse(exportAlbertConversation(turns));assert.equal(payload.format,'3b-albert-conversation');assert.equal(payload.version,1);assert.equal(payload.turns.length,12);assert.equal(payload.turns[0].question,'Question 2');assert.deepEqual(Object.keys(payload.turns[0]),['question','answer','contributors']);assert.doesNotMatch(JSON.stringify(payload),/private/);
});
