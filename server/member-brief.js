/**
 * Small, allowlisted RSS summary. No proxy URL parameter and no publication claim
 * when upstream cannot be reached. Headlines always link to the publisher.
 */
const FEEDS=Object.freeze({
  fr:{url:'https://www.france24.com/fr/rss',source:'France 24',hosts:['www.france24.com','france24.com']},
  world:{url:'https://feeds.bbci.co.uk/news/world/rss.xml',source:'BBC News',hosts:['www.bbc.com','www.bbc.co.uk','bbc.com','bbc.co.uk']},
});
const decodeText=value=>String(value||'')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/<[^>]*>/g,'')
  .replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(_,name)=>{
    const map={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
    if(name.startsWith('#')) {
      const hex=name[1]?.toLowerCase()==='x';const value=parseInt(name.slice(hex?2:1),hex?16:10);
      return Number.isFinite(value)&&value>0&&value<=0x10ffff?String.fromCodePoint(value):'';
    }
    return map[name.toLowerCase()]||'';
  }).replace(/\s+/g,' ').trim();

function readTag(block,tag) {
  const pattern=new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i');
  return decodeText(pattern.exec(block)?.[1]||'');
}
function parseRss(xml,config) {
  const blocks=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
  const dedup=new Set(),titles=new Set();const now=Date.now();const result=[];
  for(const block of blocks) {
    const title=readTag(block,'title').slice(0,230);
    const rawLink=readTag(block,'link');
    const date=Date.parse(readTag(block,'pubDate')||readTag(block,'dc:date'));
    if(!title||!rawLink||!Number.isFinite(date)||date>now+3600000||now-date>7*86400000)continue;
    let link;try{
      const candidate=new URL(rawLink);
      if(candidate.protocol!=='https:'||!config.hosts.includes(candidate.hostname))continue;
      link=candidate.href;
    }catch{continue;}
    const titleKey=title.toLocaleLowerCase('fr').replace(/\s+/g,' ').trim();
    if(dedup.has(link)||titles.has(titleKey))continue;
    dedup.add(link);titles.add(titleKey);
    result.push({title,link,published:new Date(date).toISOString(),source:config.source});
    if(result.length>=8)break;
  }
  return result;
}

function reply(body,status=200,cache='no-store') {
  return new Response(JSON.stringify(body),{
    status,headers:{'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':cache}
  });
}
export async function fetchMemberBrief(request) {
  if(request.method!=='GET')return reply({error:'Méthode non autorisée'},405);
  const feed=new URL(request.url).searchParams.get('feed')||'world';
  if(!Object.hasOwn(FEEDS,feed))return reply({error:'Flux inconnu'},400);
  const config=FEEDS[feed];
  try{
    const upstream=await fetch(config.url,{
      headers:{'Accept':'application/rss+xml, application/xml, text/xml',
        'User-Agent':'3B-International/1.0 (https://3b-international.vercel.app)'},
      redirect:'error',signal:AbortSignal.timeout(6500),
    });
    if(!upstream.ok)throw new Error('RSS unavailable');
    const length=Number(upstream.headers.get('content-length')||0);
    if(length>1000000)throw new Error('RSS too large');
    const xml=await upstream.text();
    if(xml.length>1000000||!/<rss\b|<item\b/i.test(xml))throw new Error('Malformed RSS');
    return reply({source:config.source,items:parseRss(xml,config),retrieved_at:new Date().toISOString()},200,'public, s-maxage=600, stale-while-revalidate=1200');
  }catch{
    return reply({error:'Source indisponible, consulter le site éditeur'},503);
  }
}
