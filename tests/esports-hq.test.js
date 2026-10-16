import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAMES,CURRENT_MEMBERS,EVENTS,CIRCUITS,CLUB,filterEvents,formatEventDate,buildICS,safeVideoUrl} from '../src/esports/esports-data.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/esports/EsportsPage.jsx');
const api=read('src/esports/esports-api.js');
const css=read('src/esports/esports.css');
const sql=read('docs/esports/secure-setup.sql');
test('16-18 is multi-game, preserves the existing team, and does not imply participation',()=>{
 assert.equal(CLUB.rna,'W744007777');
 assert.ok(GAMES.length>=12);
 for(const id of ['warzone','cod','fortnite','rocketleague','valorant','cs2','lol','fc','r6','apex','overwatch','fighting'])assert.ok(GAMES.some(g=>g.id===id),id);
 assert.equal(CURRENT_MEMBERS.length,5);
 for(const pseudo of ['Zakaria 16‑18','DZ Vatos','Dazak','Paolo','Yahia'])assert.ok(CURRENT_MEMBERS.some(p=>p.pseudo===pseudo));
 assert.ok(CIRCUITS.length>=6);
 assert.match(page,/Inscription de 16‑18 : non confirmée/);
});
test('CDL and RLCS dates are announced, with distinct event vs registration state',()=>{
 assert.equal(EVENTS[0].start,'2026-11-14');
 assert.equal(EVENTS.find(e=>e.id==='major2').start,'2027-04-02');
 assert.equal(EVENTS.find(e=>e.id==='champ').end,'2027-07-11');
 assert.equal(EVENTS.find(e=>e.id==='rl-kickoff').start,'2026-12-09');
 assert.ok(EVENTS.every(e=>e.sourceUrl.startsWith('https://')&&e.registration==='non annoncée'));
 assert.ok(filterEvents({game:'rocketleague'}).every(e=>e.game==='rocketleague'));
 assert.equal(formatEventDate(EVENTS[0]).includes('2026'),true);
 const ics=buildICS(EVENTS);
 assert.match(ics,/BEGIN:VCALENDAR/);
 assert.match(ics,/DTSTART;VALUE=DATE:20261114/);
 assert.match(ics,/DTEND;VALUE=DATE:20270712/);
 assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,EVENTS.length);
});
test('video URLs are whitelisted and private uploads have moderation guards',()=>{
 assert.equal(safeVideoUrl('javascript:alert(1)'),null);
 assert.equal(safeVideoUrl('https://evil.example/malicious'),null);
 assert.equal(safeVideoUrl('https://youtube.com.evil.example/watch?v=1'),null);
 assert.ok(safeVideoUrl('https://www.youtube.com/watch?v=abcdef'));
 assert.ok(safeVideoUrl('https://clips.twitch.tv/abc'));
 assert.match(api,/MAX_VIDEO_BYTES=30\*1024\*1024/);
 assert.match(api,/upload\(path,file/);
 assert.match(api,/status:'pending'/);
 assert.match(page,/Aucune sélection automatique|Aucune qualification inventée/);
 assert.match(page,/snapshot\.staff/);
});
test('table and storage roles are staff controlled and default private',()=>{
 for(const table of ['esports_staff','esports_applications','esports_media'])
  assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
 assert.match(sql,/grant update\(status\)/);
 assert.match(sql,/public\.esports_staff s where s\.user_id=/);
 assert.match(sql,/status='published'/);
 assert.match(sql,/storage\.buckets\(id,name,public/);
 assert.match(sql,/esports-videos','esports-videos',false/);
 assert.doesNotMatch(sql,/grant insert on public\.esports_staff/i);
 assert.doesNotMatch(sql,/service_role.*(?:NEXT_PUBLIC_|VITE_)/i);
});
test('mobile touch, accessible navigation and motion safety are implemented',()=>{
 assert.match(page,/aria-label="Rubriques du club 16-18"/);
 assert.match(page,/type="file"/);
 assert.match(page,/aria-pressed/);
 assert.match(page,/type="checkbox" required checked=\{consent\}/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(css,/overflow-x:auto/);
 assert.match(page,/scrollBehavior/);
 assert.doesNotMatch(page,/behavior:'instant'/);
 assert.match(read('src/App.jsx'),/Club gaming multijeux/);
 assert.match(read('public/esports/16-18-arena.svg'),/<svg/);
});
