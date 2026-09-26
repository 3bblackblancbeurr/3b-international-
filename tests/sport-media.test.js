import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 H24_CHANNELS,SPORT_FINALS,isTrustedSportEmbed,isTrustedSportPlayerOrigin,mediaSources
} from '../src/sport/media-catalog.js';

const page=fs.readFileSync(new URL('../src/sport/SportPage.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/sport/sport.css',import.meta.url),'utf8');
const vercel=fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8');

test('Sport keeps H24 and Finals as protected top-level sections',()=>{
 assert.match(page,/id:'h24'/);
 assert.match(page,/id:'finals'/);
 assert.match(page,/useState\('h24'\)/);
 assert.match(page,/SportMediaPlayer/);
});

test('every H24 channel has redundant official sources',()=>{
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
  }
 }
});

test('Finals keep full official matches and use official fallback where available',()=>{
 assert.ok(SPORT_FINALS.length>=6);
 for(const final of SPORT_FINALS){
  const sources=mediaSources(final);
  assert.ok(sources.length>=1);
  assert.equal(sources[0].mode,'full');
  for(const source of sources)assert.equal(isTrustedSportEmbed(source.embedUrl),true);
 }
 const resilient=SPORT_FINALS.filter(final=>mediaSources(final).some(source=>source.mode==='fallback'));
 assert.ok(resilient.length>=4,'football and rugby finals should have official fallback videos');
});

test('player automatically reacts to YouTube errors, slow loading, H24 end and network recovery',()=>{
 assert.match(page,/event==='onError'/);
 assert.match(page,/event==='onStateChange'/);
 assert.match(page,/state===0&&isH24/);
 assert.match(page,/SPORT_PLAYER_READY_TIMEOUT=18000/);
 assert.match(page,/Chargement trop long · secours automatique/);
 assert.match(page,/window\.addEventListener\('online'/);
 assert.match(page,/window\.addEventListener\('offline'/);
 assert.match(page,/Connexion retrouvée · reprise automatique/);
 assert.match(page,/3b-sport-good-source:/);
});

test('H24 and Finals cannot navigate or pop out of the 3B app',()=>{
 assert.match(page,/sandbox="allow-scripts allow-same-origin allow-presentation"/);
 assert.match(page,/allow="autoplay; encrypted-media"/);
 assert.doesNotMatch(page,/allow-popups/);
 assert.doesNotMatch(page,/allow-top-navigation/);
 assert.doesNotMatch(page,/picture-in-picture/);
 assert.doesNotMatch(page,/window\.open\(/);
});

test('only trusted YouTube player origins are accepted for player messages',()=>{
 assert.equal(isTrustedSportPlayerOrigin('https://www.youtube-nocookie.com'),true);
 assert.equal(isTrustedSportPlayerOrigin('https://www.youtube.com'),true);
 assert.equal(isTrustedSportPlayerOrigin('https://evil.example'),false);
 assert.match(page,/event\.source!==iframeRef\.current\?\.contentWindow/);
 assert.match(page,/isTrustedSportPlayerOrigin\(event\.origin\)/);
});

test('reliability UI exposes stable, fallback, offline and retry states',()=>{
 assert.match(css,/sport-media-health/);
 assert.match(css,/state-playing/);
 assert.match(css,/state-offline/);
 assert.match(css,/state-unavailable/);
 assert.match(page,/SECOURS OFFICIEL/);
 assert.match(page,/RÉESSAI AUTO/);
});

test('production CSP explicitly allows only privacy-enhanced YouTube frames for Sport',()=>{
 assert.match(vercel,/frame-src https:\/\/challenges\.cloudflare\.com https:\/\/www\.youtube-nocookie\.com;/);
});
