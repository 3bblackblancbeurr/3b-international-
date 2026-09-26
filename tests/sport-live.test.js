import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const live=readFileSync('src/sport/SportLive.jsx','utf8');
const directorClient=readFileSync('src/sport/useSportDirector.js','utf8');
const shared=readFileSync('shared/sport-director.js','utf8');
const server=readFileSync('server/sport-director.js','utf8');
const vercel=JSON.parse(readFileSync('vercel.json','utf8'));
const mainHeaders=vercel.headers.find(rule=>rule.source==='/:path((?!religion(?:/|$)).*)').headers;
const csp=mainHeaders.find(header=>header.key==='Content-Security-Policy').value;
const directives=new Map(csp.split(';').map(value=>value.trim().split(/\s+/)).filter(parts=>parts[0]).map(([name,...values])=>[name,values]));

test('sport live keeps a stream until an actual player failure or end event',()=>{
 assert.doesNotMatch(live,/setInterval\s*\(\s*(?:next|moveNext)/);
 assert.doesNotMatch(live,/12\s*minutes/i);
 assert.match(live,/PlayerState\.ENDED/);
 assert.match(live,/Twitch\.Player\.OFFLINE/);
 assert.match(live,/Twitch\.Player\.ENDED/);
});

test('sport live has bounded failure recovery instead of an endless fast loop',()=>{
 assert.match(live,/ALL_SOURCES_RETRY_DELAY=60000/);
 assert.match(live,/failureCountRef/);
 assert.match(live,/status[^\n]*waiting|setStatus\('waiting'\)/);
 assert.match(live,/failedUntilRef/);
});
test('deployment CSP permits only the required official player origins',()=>{
 assert.ok(directives.get('script-src').includes('https://www.youtube.com'));
 assert.ok(directives.get('script-src').includes('https://player.twitch.tv'));
 assert.ok(directives.get('frame-src').includes('https://www.youtube-nocookie.com'));
 assert.ok(directives.get('frame-src').includes('https://player.twitch.tv'));
 assert.ok(!directives.get('script-src').includes('*'));
 assert.ok(!directives.get('frame-src').includes('*'));
 assert.deepEqual(directives.get('object-src'),["'none'"]);
});

test('external players are cleaned up and their failed loaders can retry',()=>{
 assert.match(live,/player\?\.destroy\?\.\(\)/);
 assert.match(live,/youtubeApiPromise=null/);
 assert.match(live,/twitchApiPromise=null/);
 assert.match(live,/script\?\.remove\(\)/);
});

test('screen wake lock is optional and only requested during playback',()=>{
 assert.match(live,/const\[keepAwake,setKeepAwake\]=useState\(true\)/);
 assert.match(live,/status!==['"]playing['"]/);
 assert.match(live,/aria-pressed=\{keepAwake\}/);
});
test('Twitch is skipped when its documented minimum viewport cannot fit',()=>{
 assert.match(live,/function sourceFitsViewport/);
 assert.match(live,/window\.innerWidth>=400&&window\.innerHeight>=300/);
 assert.match(live,/findIndex\(sourceFitsViewport\)/);
});

test('player identity and outbound links are hardened',()=>{
 assert.match(live,/VITE_PUBLIC_APP_ORIGIN/);
 assert.match(live,/www\.youtube-nocookie\.com\/embed\/\$\{target\}/);
 assert.match(live,/rel="noopener noreferrer"/);
 assert.doesNotMatch(live,/dangerouslySetInnerHTML/);
});
test('third-party players wait for explicit, revocable media activation',()=>{
 assert.match(live,/MEDIA_CONSENT_KEY/);
 assert.match(live,/!mediaConsent\?<div className="sport-live-consent"/);
 assert.match(live,/localStorage\.setItem\(MEDIA_CONSENT_KEY,'accepted'\)/);
 assert.match(live,/localStorage\.removeItem\(MEDIA_CONSENT_KEY\)/);
 assert.match(live,/Désactiver les lecteurs/);
});

test('the weighted catalog contains France, Europe and world fallbacks',()=>{
 assert.match(shared,/zone:'FRANCE'/);
 assert.match(shared,/zone:'EUROPE'/);
 assert.match(shared,/zone:'MONDE'/);
});
test('media activation links to the updated privacy disclosure',()=>{
 const privacy=readFileSync('public/privacy-policy.html','utf8');
 assert.match(live,/href="\/privacy-policy\.html"/);
 assert.match(privacy,/Lecteurs et programme sportifs externes/);
 assert.match(privacy,/ne sont pas chargés avant votre activation explicite/);
});
test('background suspension cannot falsely rotate away from a match',()=>{
 assert.match(live,/document\.visibilityState==='visible'\)unavailable\('stalled'\)/);
 assert.match(live,/visibilitychange/);
 assert.match(live,/clearTimeout\(visibilityTimerRef\.current\)/);
});
test('the bundled mobile shell keeps a local CSP when Vercel headers are absent',()=>{
 const index=readFileSync('index.html','utf8');
 assert.match(index,/http-equiv="Content-Security-Policy"/);
 assert.match(index,/frame-src[^\"]*https:\/\/www\.youtube-nocookie\.com[^\"]*https:\/\/player\.twitch\.tv/);
 assert.match(index,/object-src 'none'/);
 assert.match(index,/connect-src[^\"]*https:\/\/ttvhcezucsbbmnafrotq\.supabase\.co/);
});
test('rotating to an undersized Twitch viewport moves to a compatible source',()=>{
 assert.match(live,/!sourceFitsViewport\(stream\)/);
 assert.match(live,/window\.screen\?\.orientation\?\.addEventListener/);
 assert.match(live,/setStatus\('switching'\)/);
});
test('the mobile shell can reach the secured production director API',()=>{
 const index=readFileSync('index.html','utf8');
 assert.match(index,/connect-src[^\"]*https:\/\/3b-international\.vercel\.app/);
 assert.match(server,/capacitor:\/\/localhost/);
 assert.match(server,/access-control-allow-origin/);
});

test('match completion needs server status and two confirmations',()=>{
 assert.match(directorClient,/canConfirmEventFinished/);
 assert.match(directorClient,/finalCountRef\.current>=2/);
 assert.match(directorClient,/matchEventToTitle/);
 assert.doesNotMatch(directorClient,/estimatedEventEnd[^\n]*onConfirmedFinished/);
});

test('sport director never accepts an arbitrary upstream URL',()=>{
 assert.match(server,/upstreamAllowed/);
 assert.match(server,/Paramètre non autorisé/);
 assert.match(server,/redirect:'error'/);
 assert.doesNotMatch(server,/searchParams\.get\(['"]url['"]\)/);
});

test('sport live falls back to official replay content instead of an empty screen',()=>{
 assert.match(live,/playbackVideoId/); assert.match(live,/REPLAY OFFICIEL/);
 assert.match(live,/advanceFallback/); assert.match(live,/Du sport sans écran vide/);
});
