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
  const dedup=new Set();const now=Date.now();const result=[];
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
    if(dedup.has(link))continue;
    dedup.add(link);result.push({title,link,published:new Date(date).toISOString(),source:config.source});
    if(result.length>=8)break;
  }
  return result;
}
export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return res.status(405).json({error:'Méthode non autorisée'});
  const feed=typeof req.query?.feed==='string'?req.query.feed:'world';
  if(!Object.hasOwn(FEEDS,feed))return res.status(400).json({error:'Flux inconnu'});
  const config=FEEDS[feed];
  try{
    const upstream=await fetch(config.url,{
      headers:{'Accept':'application/rss+xml, application/xml, text/xml','User-Agent':'3B-International/1.0 (https://3b-international.vercel.app)'},
      redirect:'error',signal:AbortSignal.timeout(6500),
    });
    if(!upstream.ok)throw new Error('RSS unavailable');
    const length=Number(upstream.headers.get('content-length')||0);
    if(length>1000000)throw new Error('RSS too large');
    const xml=await upstream.text();
    if(xml.length>1000000||!/<rss\b|<item\b/i.test(xml))throw new Error('Malformed RSS');
    res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({source:config.source,items:parseRss(xml,config),retrieved_at:new Date().toISOString()});
  }catch{
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'Source indisponible, consulter le site éditeur'});
  }
}
