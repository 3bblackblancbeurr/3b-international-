import {H24_CHANNELS,SPORT_FINALS,mediaSources} from '../src/sport/media-catalog.js';

async function check(source){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),5000);
 try{
  const url='https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+source.videoId);
  const response=await fetch(url,{signal:controller.signal,headers:{'user-agent':'3B-International-Sport-Watch/1.0'}});
  if(response.ok)return{status:'available',source};
  if(response.status===401||response.status===404)return{status:'unavailable',source};
  return{status:'unknown',source,code:response.status};
 }catch(error){
  return{status:'unknown',source,error:error?.name||'network'};
 }finally{
  clearTimeout(timer);
 }
}

async function inspectGroup(kind,item){
 const results=await Promise.all(mediaSources(item).map(check));
 const available=results.filter(result=>result.status==='available').length;
 const unknown=results.filter(result=>result.status==='unknown').length;
 const unavailable=results.filter(result=>result.status==='unavailable').length;
 console.log(kind,item.id,{available,unknown,unavailable,total:results.length});
 if(!available&&!unknown){
  throw new Error(kind+' '+item.id+' has no available or uncertain source left.');
 }
}

for(const channel of H24_CHANNELS)await inspectGroup('H24',channel);
for(const final of SPORT_FINALS)await inspectGroup('FINAL',final);

console.log('Sport source watch: no hard outage detected.');