import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 canConfirmEventFinished,eventState,matchEventToTitle,sanitizeEvent,sourceIdForBroadcaster,
} from '../shared/sport-director.js';
import {
 handleSportDirectorRequest,loadLiveSources,loadOfficialVideos,resetSportDirectorForTests,
} from '../server/sport-director.js';

process.env.APP_URL='https://3b-international.vercel.app';

const rawEvent={
 idEvent:'900001',strTimestamp:'2026-09-25T20:00:00',strEvent:'France vs Espagne',
 strSport:'Soccer',strLeague:'UEFA Nations League',strCountry:'France',
 strHomeTeam:'France',strAwayTeam:'Espagne',strStatus:'NS',
 intHomeScore:null,intAwayScore:null,
};

function response(data,status=200){
 return new Response(JSON.stringify(data),{
  status,headers:{'content-type':'application/json','content-length':String(JSON.stringify(data).length)},
 });
}

function mockFetch(url){
 const target=String(url);
 if(target.includes('eventsday.php'))return Promise.resolve(response({events:[rawEvent]}));
 if(target.includes('eventstv.php'))return Promise.resolve(response({tvevents:[]}));
 if(target.includes('lookupevent.php'))return Promise.resolve(response({events:[{...rawEvent,strStatus:'FT',intHomeScore:'2',intAwayScore:'1'}]}));
 throw new Error('unexpected-upstream:'+target);
}

test.beforeEach(()=>resetSportDirectorForTests());
test('sports data is normalized, bounded and classified',()=>{
 const event=sanitizeEvent({...rawEvent,strEvent:'France\u0000   vs Espagne',strStatus:'FT'});
 assert.equal(event.name,'France vs Espagne');
 assert.equal(event.start,'2026-09-25T20:00:00.000Z');
 assert.equal(event.state,'final');
 assert.equal(eventState('HT'),'live');
 assert.equal(eventState('Postponed'),'postponed');
});

test('a player title matches both teams without trusting an estimated timer',()=>{
 const event=sanitizeEvent(rawEvent);
 const match=matchEventToTitle('DIRECT : France - Espagne | Nations League',[event],Date.parse('2026-09-25T20:30:00Z'));
 assert.equal(match?.event.id,'900001');
 assert.ok(match.confidence>=0.58);
 assert.equal(canConfirmEventFinished({...event,state:'scheduled'},Date.parse('2026-09-25T23:00:00Z')),false);
 assert.equal(canConfirmEventFinished({...event,state:'final'},Date.parse('2026-09-25T23:00:00Z')),true);
});

test('sport director returns a sanitized schedule and strict security headers',async()=>{
 const request=new Request('https://3b-international.vercel.app/api/sport-director',{
  headers:{origin:'https://3b-international.vercel.app','sec-fetch-site':'same-origin','x-forwarded-for':'198.51.100.8'},
 });
 const result=await handleSportDirectorRequest(request,{fetchImpl:mockFetch,now:Date.parse('2026-09-25T19:00:00Z')});
 assert.equal(result.status,200);
 assert.equal(result.headers.get('access-control-allow-origin'),'https://3b-international.vercel.app');
 assert.equal(result.headers.get('cross-origin-resource-policy'),'same-origin');
 assert.match(result.headers.get('content-security-policy'),/default-src 'none'/);
 const body=await result.json();
 assert.equal(body.events.length,1);
 assert.equal(body.events[0].id,'900001');
 assert.equal(body.liveSources.length,0);
 assert.deepEqual(body.discovery,{youtube:false,twitch:false});
});
test('cross-site, write methods and arbitrary query parameters are rejected',async()=>{
 const crossSite=await handleSportDirectorRequest(new Request('https://3b-international.vercel.app/api/sport-director',{
  headers:{origin:'https://evil.example','sec-fetch-site':'cross-site'},
 }),{fetchImpl:mockFetch});
 assert.equal(crossSite.status,403);
 const post=await handleSportDirectorRequest(new Request('https://3b-international.vercel.app/api/sport-director',{method:'POST'}),{fetchImpl:mockFetch});
 assert.equal(post.status,405);
 const arbitrary=await handleSportDirectorRequest(new Request('https://3b-international.vercel.app/api/sport-director?url=https://evil.example'),{fetchImpl:mockFetch});
 assert.equal(arbitrary.status,400);
});

test('event status lookup accepts only a numeric public event id',async()=>{
 const invalid=await handleSportDirectorRequest(new Request('https://3b-international.vercel.app/api/sport-director?event=../../secret'),{fetchImpl:mockFetch});
 assert.equal(invalid.status,400);
 const valid=await handleSportDirectorRequest(new Request('https://3b-international.vercel.app/api/sport-director?event=900001'),{fetchImpl:mockFetch});
 assert.equal(valid.status,200);
 const body=await valid.json();
 assert.equal(body.event.state,'final');
 assert.equal(body.event.homeScore,'2');
 assert.equal(body.event.awayScore,'1');
});

test('the server source contains only fixed upstream origins',()=>{
 const source=new URL('../server/sport-director.js',import.meta.url);
 assert.equal(source.protocol,'file:');
 assert.doesNotThrow(()=>new URL('https://www.thesportsdb.com'));
});
test('optional YouTube discovery uses recent channel ids and returns a matched live video',async()=>{
 process.env.YOUTUBE_DATA_API_KEY='A'.repeat(39);
 resetSportDirectorForTests();
 const fetchImpl=url=>{
  const target=String(url);
  if(target.includes('/feeds/videos.xml')){
   const xml=target.includes('UCYAzhARb2dwI3_R_72r8hbA')?'<feed><yt:videoId>live1234567</yt:videoId></feed>':'<feed></feed>';
   return Promise.resolve(new Response(xml,{status:200,headers:{'content-length':String(xml.length)}}));
  }
  if(target.includes('/youtube/v3/videos'))return Promise.resolve(response({items:[{
   id:'live1234567',snippet:{title:'France vs Espagne en direct',liveBroadcastContent:'live'},
   liveStreamingDetails:{actualStartTime:'2026-09-25T20:00:00Z'},
  }]}));
  throw new Error('unexpected-upstream:'+target);
 };
 const event=sanitizeEvent(rawEvent);
 const result=await loadLiveSources({fetchImpl,events:[event]});
 assert.equal(result.items[0].sourceId,'sef-youtube');
 assert.equal(result.items[0].videoId,'live1234567');
 assert.equal(result.items[0].match.eventId,'900001');
 assert.equal(result.recommendedSourceId,'sef-youtube');
 delete process.env.YOUTUBE_DATA_API_KEY;
});

test('same-origin preview deployments and native app origins are accepted safely',async()=>{
 const preview='https://sport-director-preview.vercel.app';
 const sameOrigin=await handleSportDirectorRequest(new Request(preview+'/api/sport-director',{
  headers:{origin:preview,'sec-fetch-site':'same-origin'},
 }),{fetchImpl:mockFetch,now:Date.parse('2026-09-25T19:00:00Z')});
 assert.equal(sameOrigin.status,200);
 resetSportDirectorForTests();
 const native=await handleSportDirectorRequest(new Request('https://3b-international.vercel.app/api/sport-director',{
  headers:{origin:'https://localhost','sec-fetch-site':'cross-site'},
 }),{fetchImpl:mockFetch,now:Date.parse('2026-09-25T19:00:00Z')});
 assert.equal(native.status,200);
 assert.equal(native.headers.get('access-control-allow-origin'),'https://localhost');
});


test('official broadcaster names map to a fixed allowlisted source',()=>{
 assert.equal(sourceIdForBroadcaster('Sport en France'),'sef-youtube');
 assert.equal(sourceIdForBroadcaster('France 2'),'ftv-youtube');
 assert.equal(sourceIdForBroadcaster('unknown pirate channel'),'');
});

test('a scheduled official broadcaster can recommend a source without exposing an arbitrary URL',async()=>{
 const fetchImpl=url=>{
  const target=String(url);
  if(target.includes('eventsday.php'))return Promise.resolve(response({events:[rawEvent]}));
  if(target.includes('eventstv.php'))return Promise.resolve(response({tvevents:[{idEvent:'900001',strChannel:'Sport en France'}]}));
  throw new Error('unexpected-upstream:'+target);
 };
 resetSportDirectorForTests();
 const result=await handleSportDirectorRequest(new Request('https://3b-international.vercel.app/api/sport-director',{
  headers:{origin:'https://3b-international.vercel.app','sec-fetch-site':'same-origin','x-forwarded-for':'198.51.100.44'},
 }),{fetchImpl,now:Date.parse('2026-09-25T19:50:00Z')});
 const body=await result.json();
 assert.equal(body.recommendedSourceId,'sef-youtube');
 assert.equal(body.events[0].sourceId,'sef-youtube');
 assert.ok(!JSON.stringify(body).includes('http://evil'));
});


test('Twitch client secret is sent in the POST body and never in the URL',async()=>{
 process.env.TWITCH_CLIENT_ID='client_identifier_12345';
 process.env.TWITCH_CLIENT_SECRET='S'.repeat(40);
 resetSportDirectorForTests();
 let tokenChecked=false;
 const fetchImpl=(url,options={})=>{
  const target=String(url);
  if(target.includes('id.twitch.tv')){
   assert.ok(!target.includes('client_secret'));
   const body=String(options.body||'');
   assert.match(body,/client_secret=/);
   assert.ok(body.includes(encodeURIComponent(process.env.TWITCH_CLIENT_SECRET)));
   tokenChecked=true;
   return Promise.resolve(response({access_token:'T'.repeat(40),expires_in:3600}));
  }
  if(target.includes('api.twitch.tv'))return Promise.resolve(response({data:[]}));
  throw new Error('unexpected-upstream:'+target);
 };
 await loadLiveSources({fetchImpl,events:[]});
 assert.equal(tokenChecked,true);
 delete process.env.TWITCH_CLIENT_ID;
 delete process.env.TWITCH_CLIENT_SECRET;
});

test('server cache is explicitly bounded against untrusted event-id churn',()=>{
 const source=readFileSync('server/sport-director.js','utf8');
 assert.match(source,/MAX_CACHE_ENTRIES=300/);
 assert.match(source,/function pruneCache/);
 assert.match(source,/pruneCache\(now\)/);
});

test('official YouTube feeds provide a replay fallback without API credentials',async()=>{
 delete process.env.YOUTUBE_DATA_API_KEY; resetSportDirectorForTests();
 const xml='<feed><entry><yt:videoId>sport123456</yt:videoId><title>France - Espagne : résumé officiel</title><published>2026-09-25T20:00:00Z</published></entry></feed>';
 const fetchImpl=url=>String(url).includes('/feeds/videos.xml')?Promise.resolve(new Response(xml,{status:200,headers:{'content-length':String(xml.length)}})):Promise.reject(new Error('unexpected-upstream'));
 const result=await loadOfficialVideos({fetchImpl});
 assert.ok(result.items.length>=1);
 assert.equal(result.items[0].videoId,'sport123456');
 assert.equal(result.items[0].sourceId,'sef-youtube');
});

test('main director response remains useful with official replay media when no live exists',async()=>{
 delete process.env.YOUTUBE_DATA_API_KEY; resetSportDirectorForTests();
 const xml='<feed><entry><yt:videoId>sport987654</yt:videoId><title>Temps forts officiels</title><published>2026-09-25T21:00:00Z</published></entry></feed>';
 const fetchImpl=url=>{const target=String(url); if(target.includes('/feeds/videos.xml'))return Promise.resolve(new Response(xml,{status:200,headers:{'content-length':String(xml.length)}})); if(target.includes('eventsday.php'))return Promise.resolve(response({events:[]})); if(target.includes('eventstv.php'))return Promise.resolve(response({tvevents:[]})); throw new Error('unexpected-upstream:'+target);};
 const result=await handleSportDirectorRequest(new Request('https://3b-international.vercel.app/api/sport-director',{headers:{origin:'https://3b-international.vercel.app','sec-fetch-site':'same-origin','x-forwarded-for':'198.51.100.91'}}),{fetchImpl,now:Date.parse('2026-09-25T22:00:00Z')});
 const body=await result.json();
 assert.equal(result.status,200); assert.equal(body.playbackMode,'replay');
 assert.ok(body.fallbackVideos.length>=1); assert.equal(body.recommendedSourceId,'sef-youtube');
});
