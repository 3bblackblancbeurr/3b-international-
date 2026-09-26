import fs from 'node:fs';
import {H24_CHANNELS,SPORT_FINALS,mediaSources} from '../src/sport/media-catalog.js';
import {nextHealthEntry} from '../src/sport/source-health.js';

const MANIFEST_URL=new URL('../public/sport-source-health.json',import.meta.url);
const previous=JSON.parse(fs.readFileSync(MANIFEST_URL,'utf8'));
const allItems=[...H24_CHANNELS,...SPORT_FINALS];
const uniqueSources=[...new Map(
 allItems.flatMap(item=>mediaSources(item)).filter(source=>source.videoId).map(source=>[source.videoId,source])
).values()];

async function check(source){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),5000);
 try{
  const url='https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+source.videoId);
  const response=await fetch(url,{signal:controller.signal,headers:{'user-agent':'3B-International-Sport-Watch/2.0'}});
  if(response.ok)return{status:'available',source};
  if(response.status===401||response.status===404)return{status:'unavailable',source};
  return{status:'unknown',source,code:response.status};
 }catch(error){
  return{status:'unknown',source,error:error?.name||'network'};
 }finally{
  clearTimeout(timer);
 }
}

const results=await Promise.all(uniqueSources.map(check));
const nextSources={};

for(const result of results){
 const videoId=result.source.videoId;
 nextSources[videoId]=nextHealthEntry(previous.sources?.[videoId],result.status);
 console.log(videoId,result.source.provider,result.status,nextSources[videoId]);
}

const before=JSON.stringify(previous.sources||{});
const after=JSON.stringify(nextSources);
if(before!==after){
 const next={version:1,updatedAt:new Date().toISOString(),sources:nextSources};
 fs.writeFileSync(MANIFEST_URL,JSON.stringify(next,null,2)+'\n');
 console.log('Sport source health manifest updated.');
}else{
 console.log('Sport source health manifest unchanged.');
}

let hardOutage=false;
for(const [kind,items] of [['H24',H24_CHANNELS],['FINAL',SPORT_FINALS]]){
 for(const item of items){
  const sources=mediaSources(item);
  const usable=sources.filter(source=>nextSources[source.videoId]?.disabled!==true);
  console.log(kind,item.id,{usable:usable.length,total:sources.length});
  if(!usable.length){
   hardOutage=true;
   console.error('HARD OUTAGE',kind,item.id);
  }
 }
}

if(hardOutage)process.exitCode=2;
