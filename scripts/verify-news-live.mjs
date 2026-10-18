// Real RSS collection through the server adapter, without saving article copy.
// This verifies publisher access locally, not a deployed Supabase endpoint.
import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';
import {createNewsService,NEWS_FEEDS} from '../supabase/functions/ecosystem-public/news.js';
const out=path.resolve(process.env.NEWS_LIVE_OUT||'artifacts/application-ui/news-live');await mkdir(out,{recursive:true});
const requests=[],service=createNewsService({fetcher:async(url,options)=>{requests.push(url);return fetch(url,options);}}),countries=[];
try{
 for(const country of ['FR','MA','DZ','JP','WORLD']){const result=await service.get({country}),dates=result.articles.map(article=>article.publishedAt).sort();countries.push({country,articles:result.articles.length,authorizedExcerpts:result.articles.filter(article=>article.summary).length,retrievedAt:result.retrievedAt,stale:result.stale,partial:result.partial,oldestPublication:dates[0]||null,newestPublication:dates.at(-1)||null,sources:result.sources.map(source=>({id:source.id,available:source.available,count:source.count}))});}
 const report={passed:countries[0].articles>0,kind:'real-publisher-rss-local-server-adapter',deployedEndpointTested:false,checkedAt:new Date().toISOString(),publisherRequests:requests.length,allowlistedRequestsOnly:requests.every(url=>NEWS_FEEDS.some(feed=>feed.url===url)),articleCopySaved:false,countries,sources:NEWS_FEEDS.map(feed=>({id:feed.id,name:feed.name,feedUrl:feed.url,sourceUrl:feed.home,excerptPolicy:feed.excerpt,rightsUrl:feed.rights||null}))};
 await writeFile(path.join(out,'live-proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,publisherRequests:requests.length,countries:countries.map(country=>({country:country.country,articles:country.articles,authorizedExcerpts:country.authorizedExcerpts})),out}));if(!report.passed)process.exitCode=1;
}catch(error){await writeFile(path.join(out,'live-proof.json'),JSON.stringify({passed:false,kind:'real-publisher-rss-local-server-adapter',checkedAt:new Date().toISOString(),publisherRequests:requests.length,error:error.message},null,2));throw error;}
