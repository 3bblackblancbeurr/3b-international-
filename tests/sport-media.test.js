import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 H24_CHANNELS,SPORT_FINALS,SPORT_PLAYER_SHELL_URL,isTrustedSportEmbed,
 isTrustedSportShellOrigin,mediaSources,sportPlayerShellUrl
} from '../src/sport/media-catalog.js';

const page=fs.readFileSync(new URL('../src/sport/SportPage.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/sport/sport.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../public/sport-player-shell.html',import.meta.url),'utf8');
const shellJs=fs.readFileSync(new URL('../public/sport-player-shell.js',import.meta.url),'utf8');
const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

test('Sport keeps H24 and Finals as protected top-level sections',()=>{
 assert.match(page,/id:'h24'/);
 assert.match(page,/id:'finals'/);
 assert.match(page,/useState\('h24'\)/);
 assert.match(page,/SportMediaPlayer/);
});

test('every H24 channel has redundant official full-match sources',()=>{
 assert.ok(H24_CHANNELS.length>=4);
 for(const channel of H24_CHANNELS){
  const sources=mediaSources(channel);
  assert.ok(sources.length>=2,channel.id+' must have at least two independent sources');
  for(const source of sources){
   assert.equal(source.mode,'full');
   assert.equal(isTrustedSportEmbed(source.embedUrl),true);
   const url=new URL(source.embedUrl);
   assert.equal(url.searchParams.get('enablejsapi'),'1');
   assert.equal(url.searchParams.get('autoplay'),'1');
   assert.equal(url.searchParams.get('mute'),'1');
   assert.equal(url.searchParams.get('fs'),'0');
   assert.equal(url.searchParams.get('controls'),'1');
   assert.equal(url.searchParams.has('modestbranding'),false);
  }
 }
});

test('Finals keep full official matches and official fallback where available',()=>{
 assert.ok(SPORT_FINALS.length>=6);
 for(const final of SPORT_FINALS){
  const sources=mediaSources(final);
  assert.ok(sources.length>=1);
  assert.equal(sources[0].mode,'full');
  for(const source of sources)assert.equal(isTrustedSportEmbed(source.embedUrl),true);
 }
 const resilient=SPORT_FINALS.filter(final=>mediaSources(final).some(source=>source.mode==='fallback'));
 assert.ok(resilient.length>=4);
});

test('playback is routed through the HTTPS 3B shell instead of direct YouTube in the app',()=>{
 assert.equal(SPORT_PLAYER_SHELL_URL,'https://3b-international.vercel.app/sport-player-shell.html');
 assert.equal(isTrustedSportShellOrigin('https://3b-international.vercel.app'),true);
 assert.equal(isTrustedSportShellOrigin('https://evil.example'),false);
 const sample=mediaSources(H24_CHANNELS[0])[0];
 const url=new URL(sportPlayerShellUrl(sample,{autoplay:true,muted:true,start:123,token:'abcdefgh1234'}));
 assert.equal(url.origin,'https://3b-international.vercel.app');
 assert.equal(url.pathname,'/sport-player-shell.html');
 assert.equal(url.searchParams.get('video'),sample.videoId);
 assert.equal(url.searchParams.get('start'),'123');
 assert.match(page,/sportPlayerShellUrl\(source/);
 assert.doesNotMatch(page,/src=\{source\.embedUrl\}/);
});

test('player adapts to weak networks, background state and resumes position',()=>{
 assert.match(page,/navigator\.connection/);
 assert.match(page,/effectiveType==='3g'/);
 assert.match(page,/connection\.saveData/);
 assert.match(page,/visibilitychange/);
 assert.match(page,/3b-sport-resume:/);
 assert.match(page,/sessionStorage\.setItem\(resumeKey/);
 assert.match(page,/Connexion retrouvée · reprise automatique/);
 assert.match(page,/Buffer trop long · réparation automatique/);
});

test('player classifies YouTube failures and avoids repeated dead sources',()=>{
 assert.match(page,/\[2,100,101,150\]/);
 assert.match(page,/code===5\|\|code===153/);
 assert.match(page,/3b-sport-block:/);
 assert.match(page,/SPORT_PERMANENT_COOLDOWN/);
 assert.match(page,/Chargement trop long · secours automatique/);
});

test('the bridge shell is isolated, tokenized and cannot pop out of 3B',()=>{
 assert.match(shell,/sport-player-shell\.js/);
 assert.match(shell,/sandbox="allow-scripts allow-same-origin allow-presentation"/);
 assert.match(shell,/allow="autoplay; encrypted-media"/);
 assert.doesNotMatch(shell,/allow-popups/);
 assert.doesNotMatch(shell,/allow-top-navigation/);
 assert.doesNotMatch(shell,/picture-in-picture/);
 assert.match(shellJs,/VIDEO_RE/);
 assert.match(shellJs,/TOKEN_RE/);
 assert.match(shellJs,/www\.youtube-nocookie\.com\/embed/);
 assert.match(shellJs,/url\.searchParams\.set\('origin',location\.origin\)/);
 assert.match(shellJs,/url\.searchParams\.set\('fs','0'\)/);
 assert.match(shellJs,/parent\.postMessage/);
 assert.doesNotMatch(shellJs,/window\.open/);
});

test('messages from the bridge require the trusted 3B origin and per-player token',()=>{
 assert.match(page,/event\.source!==iframeRef\.current\?\.contentWindow/);
 assert.match(page,/isTrustedSportShellOrigin\(event\.origin\)/);
 assert.match(page,/data\.token!==playerToken/);
 assert.match(shellJs,/data\.token!==token/);
});

test('health status stays outside the third-party video surface',()=>{
 assert.match(css,/sport-media-details/);
 assert.match(css,/sport-media-health\{position:static/);
 assert.match(page,/sport-media-details/);
});

test('Vercel sends YouTube-compatible referrer identity and isolates direct framing',()=>{
 const generic=vercel.headers.find(entry=>entry.source.includes('sport-player-shell'));
 const shellHeaders=vercel.headers.find(entry=>entry.source==='/sport-player-shell.html');
 assert.ok(generic);
 assert.ok(shellHeaders);
 const genericMap=Object.fromEntries(generic.headers.map(h=>[h.key,h.value]));
 const shellMap=Object.fromEntries(shellHeaders.headers.map(h=>[h.key,h.value]));
 assert.equal(genericMap['Referrer-Policy'],'strict-origin-when-cross-origin');
 assert.match(genericMap['Content-Security-Policy'],/frame-src 'self' https:\/\/challenges\.cloudflare\.com;/);
 assert.doesNotMatch(genericMap['Content-Security-Policy'],/youtube-nocookie/);
 assert.equal(shellMap['Referrer-Policy'],'strict-origin-when-cross-origin');
 assert.match(shellMap['Content-Security-Policy'],/frame-src https:\/\/www\.youtube-nocookie\.com;/);
 assert.match(shellMap['Content-Security-Policy'],/frame-ancestors 'self' https:\/\/localhost capacitor:/);
});
