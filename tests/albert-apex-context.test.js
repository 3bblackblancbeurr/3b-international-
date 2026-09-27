import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync('src/control/AlbertApexContext.jsx','utf8');

test('APEX provider persists explicit intent continuity fields',()=>{
 for(const marker of ['currentIntent','previousIntent','intentConfidence','currentTaskId','taskState','lastTool','lastResult']){
  assert.ok(source.includes(marker),marker);
 }
});

test('new APEX sessions clear foreground intent and tool state',()=>{
 for(const marker of [
  "currentTaskId:null",
  "currentIntent:''",
  "previousIntent:''",
  "intentConfidence:0",
  "taskState:'idle'",
  "lastTool:''",
  "lastResult:''"
 ])assert.ok(source.includes(marker),marker);
});

test('APEX exposes tool result tracing and intent-change events',()=>{
 assert.ok(source.includes('recordToolResult'));
 assert.ok(source.includes("createAlbertEvent('intent.changed'"));
 assert.ok(source.includes("createAlbertEvent(ok?'tool.completed':'tool.failed'"));
});
