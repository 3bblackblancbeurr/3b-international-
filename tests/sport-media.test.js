import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {H24_CHANNELS,SPORT_FINALS,isTrustedSportEmbed} from '../src/sport/media-catalog.js';

const page=fs.readFileSync(new URL('../src/sport/SportPage.jsx',import.meta.url),'utf8');
const vercel=fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8');

test('Sport keeps H24 and Finals as protected top-level sections',()=>{
 assert.match(page,/id:'h24'/);
 assert.match(page,/id:'finals'/);
 assert.match(page,/useState\('h24'\)/);
 assert.match(page,/SportMediaPlayer/);
});

test('Sport H24 has multiple continuous official channels',()=>{
 assert.ok(H24_CHANNELS.length>=4);
 assert.ok(H24_CHANNELS.some(item=>item.sport==='Football'));
 assert.ok(H24_CHANNELS.some(item=>item.sport==='Rugby'));
 assert.ok(H24_CHANNELS.some(item=>item.sport==='Basket'));
 for(const item of H24_CHANNELS)assert.equal(isTrustedSportEmbed(item.embedUrl),true);
});

test('Sport Finals keeps multiple complete official finals in-app',()=>{
 assert.ok(SPORT_FINALS.length>=6);
 assert.ok(SPORT_FINALS.some(item=>item.sport==='Football'));
 assert.ok(SPORT_FINALS.some(item=>item.sport==='Rugby'));
 assert.ok(SPORT_FINALS.some(item=>item.sport==='Basket'));
 for(const item of SPORT_FINALS)assert.equal(isTrustedSportEmbed(item.embedUrl),true);
});

test('H24 and Finals player cannot navigate the top-level app away',()=>{
 assert.match(page,/sandbox="allow-scripts allow-same-origin allow-presentation"/);
 assert.doesNotMatch(page,/window\.open\(/);
 assert.doesNotMatch(page,/allow-popups/);
 assert.doesNotMatch(page,/allow-top-navigation/);
});

test('production CSP explicitly allows the privacy-enhanced sport player',()=>{
 assert.match(vercel,/frame-src https:\/\/challenges\.cloudflare\.com https:\/\/www\.youtube-nocookie\.com;/);
});
