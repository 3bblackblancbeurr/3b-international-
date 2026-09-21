import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed,SPORTS,FEEDS} from '../supabase/functions/ecosystem/sports.js';

const NOW=Date.parse('2026-09-21T12:00:00.000Z');
const franceinfo={url:'https://www.franceinfo.fr/sports.rss',name:'Franceinfo',lang:'fr',host:'franceinfo.fr'};
const bbc={url:'https://feeds.bbci.co.uk/sport/rss.xml',name:'BBC Sport',lang:'en',host:'bbc.co.uk',hosts:['bbc.com']};

test('Sport 3B supports a broad multisport catalogue and French-first sources',()=>{
 assert.ok(SPORTS.includes('MotoGP'));
 assert.ok(SPORTS.includes('Sports US'));
 assert.ok(SPORTS.includes('Esport'));
 assert.ok(FEEDS.filter(feed=>feed.lang==='fr').length>=4);
 assert.ok(FEEDS.some(feed=>feed.name==='Franceinfo'&&feed.category==='Basket'));
 assert.ok(FEEDS.some(feed=>feed.name==='20 Minutes'&&feed.lang==='fr'));
 assert.ok(FEEDS.some(feed=>feed.name==='Ouest-France'&&feed.lang==='fr'));
 assert.ok(FEEDS.some(feed=>feed.name==='BBC Sport'&&feed.lang==='en'));
});

test('RSS items using dc:date are parsed and classified',()=>{
 const xml=`<rss><channel><item>
  <title><![CDATA[Le grand rendez-vous MotoGP du week-end]]></title>
  <link>https://www.franceinfo.fr/sports/auto-moto/motogp-course.html</link>
  <dc:date>2026-09-21T10:00:00Z</dc:date>
  <description>MotoGP et sports mécaniques</description>
 </item></channel></rss>`;
 const [article]=parseFeed(xml,franceinfo,NOW);
 assert.equal(article.language,'fr');
 assert.equal(article.source,'Franceinfo');
 assert.equal(article.category,'MotoGP');
 assert.match(article.url,/franceinfo\.fr/);
});

test('Atom entries with href and published date are accepted',()=>{
 const xml=`<feed><entry>
  <title>World basketball championship update</title>
  <link href="https://www.bbc.com/sport/basketball/articles/test"/>
  <published>2026-09-21T09:30:00Z</published>
  <category>Basketball</category>
 </entry></feed>`;
 const [article]=parseFeed(xml,bbc,NOW);
 assert.equal(article.language,'en');
 assert.equal(article.category,'Basket');
 assert.equal(article.url,'https://www.bbc.com/sport/basketball/articles/test');
});

test('specialized French feeds keep their intended discipline',()=>{
 const feed={...franceinfo,url:'https://www.franceinfo.fr/sports/tennis.rss',category:'Tennis'};
 const xml=`<rss><channel><item>
  <title>Une Française se qualifie pour la finale</title>
  <link>https://www.franceinfo.fr/sports/tennis/finale.html</link>
  <pubDate>Mon, 21 Sep 2026 08:00:00 GMT</pubDate>
 </item></channel></rss>`;
 const [article]=parseFeed(xml,feed,NOW);
 assert.equal(article.category,'Tennis');
});

test('untrusted hosts, stale entries and insecure links are rejected',()=>{
 const cases=[
  '<item><title>Football</title><link>https://evil.example/story</link><pubDate>Mon, 21 Sep 2026 08:00:00 GMT</pubDate></item>',
  '<item><title>Football</title><link>http://www.franceinfo.fr/sports/story</link><pubDate>Mon, 21 Sep 2026 08:00:00 GMT</pubDate></item>',
  '<item><title>Football</title><link>https://www.franceinfo.fr/sports/story</link><pubDate>Mon, 01 Sep 2026 08:00:00 GMT</pubDate></item>'
 ];
 for(const item of cases)assert.deepEqual(parseFeed('<rss><channel>'+item+'</channel></rss>',franceinfo,NOW),[]);
});
