export const SPORT_STREAMS=Object.freeze([
 {id:'sef-youtube',name:'Sport en France · YouTube',zone:'FRANCE',sport:'Multisports',kind:'youtube',channel:'UCYAzhARb2dwI3_R_72r8hbA',home:'https://www.youtube.com/@SportenFrance/live',weight:9},
 {id:'ftv-youtube',name:'France tv sport',zone:'FRANCE',sport:'Multisports',kind:'youtube',channel:'UCRm-DLbhzojKd10edotYxMg',home:'https://www.youtube.com/@ftvsport/live',weight:8},
 {id:'sef-twitch',name:'Sport en France',zone:'FRANCE',sport:'Multisports',kind:'twitch',channel:'sportenfrance',home:'https://www.sportenfrance.com/',weight:7},
 {id:'euroleague-youtube',name:'EuroLeague Basketball',zone:'EUROPE',sport:'Basketball',kind:'youtube',channel:'UCGr3nR_XH9r6E5b09ZJAT9w',home:'https://www.youtube.com/@euroleague/live',weight:5},
 {id:'rugby-world',name:'World Rugby',zone:'MONDE',sport:'Rugby',kind:'youtube',channel:'UCE28rwYoaV7jvU6GVzdu_GQ',home:'https://www.youtube.com/@WorldRugby/live',weight:3},
]);

export const SPORT_HUBS=Object.freeze([
 {label:'France.tv Sport',href:'https://www.france.tv/sport/'},
 {label:"L'Équipe Live",href:'https://www.lequipe.fr/Lachainelequipe/Live/'},
 {label:'European Athletics TV',href:'https://athletics.eurovisionsports.tv/'},
 {label:'Olympics',href:'https://www.olympics.com/fr/evenements-sportifs/'},
]);

export const SCHEDULE_SPORTS=Object.freeze([
 'Soccer','Basketball','Rugby','Tennis','Motorsport','Handball','Ice Hockey','Volleyball',
]);

const FINAL_STATUSES=new Set(['ft','aet','ap','finished','final','ended','complete','completed']);
const LIVE_STATUSES=new Set(['live','1h','2h','ht','ot','in progress','in-progress','playing']);
const POSTPONED_STATUSES=new Set(['pst','postponed','canc','cancelled','abandoned','suspended']);
const STOP_WORDS=new Set(['vs','v','the','de','des','du','la','le','les','and','et','fc','club','team','live','direct','tv','officiel','official']);
export function cleanText(value,max=180){
 const withoutControls=Array.from(String(value??''),char=>{
  const code=char.charCodeAt(0);
  return code<32||code===127?' ':char;
 }).join('');
 return withoutControls.replace(/\s+/g,' ').trim().slice(0,max);
}

export function normalizeText(value){
 return cleanText(value,500)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .toLowerCase()
  .replace(/&/g,' and ')
  .replace(/[^a-z0-9]+/g,' ')
  .replace(/\s+/g,' ')
  .trim();
}

export function textTokens(value){
 return new Set(normalizeText(value).split(' ').filter(token=>token.length>1&&!STOP_WORDS.has(token)));
}

export function parseEventTimestamp(value){
 const raw=cleanText(value,40);
 if(!raw)return null;
 const normalized=/z$|[+-]\d\d:\d\d$/i.test(raw)?raw:raw+'Z';
 const time=Date.parse(normalized);
 return Number.isFinite(time)?new Date(time).toISOString():null;
}

export function eventState(status){
 const normalized=normalizeText(status);
 if(FINAL_STATUSES.has(normalized))return 'final';
 if(LIVE_STATUSES.has(normalized))return 'live';
 if(POSTPONED_STATUSES.has(normalized))return 'postponed';
 return 'scheduled';
}
export function sanitizeEvent(raw){
 if(!raw||typeof raw!=='object')return null;
 const id=String(raw.idEvent??raw.id??'').replace(/\D/g,'').slice(0,16);
 const start=parseEventTimestamp(raw.strTimestamp||raw.startTime||raw.timestamp);
 const name=cleanText(raw.strEvent||raw.name,180);
 if(!id||!start||!name)return null;
 const sport=cleanText(raw.strSport||raw.sport,60);
 const state=eventState(raw.strStatus||raw.status);
 return {
  id,name,sport,
  league:cleanText(raw.strLeague||raw.league,100),
  country:cleanText(raw.strCountry||raw.country,70),
  home:cleanText(raw.strHomeTeam||raw.home,100),
  away:cleanText(raw.strAwayTeam||raw.away,100),
  homeScore:cleanText(raw.intHomeScore??raw.homeScore,8),
  awayScore:cleanText(raw.intAwayScore??raw.awayScore,8),
  status:cleanText(raw.strStatus||raw.status,30),
  state,start,
 };
}

export function estimatedDurationMinutes(sport){
 const key=normalizeText(sport);
 if(key.includes('basketball'))return 150;
 if(key.includes('rugby'))return 135;
 if(key.includes('tennis'))return 210;
 if(key.includes('motorsport'))return 210;
 if(key.includes('hockey'))return 150;
 if(key.includes('handball'))return 120;
 if(key.includes('volleyball'))return 150;
 if(key.includes('american football'))return 210;
 return 135;
}

export function estimatedEventEnd(event){
 const start=Date.parse(event?.start||'');
 if(!Number.isFinite(start))return null;
 return new Date(start+estimatedDurationMinutes(event.sport)*60000).toISOString();
}
function overlapScore(titleTokens,eventTokens){
 if(!titleTokens.size||!eventTokens.size)return 0;
 let shared=0;
 for(const token of eventTokens)if(titleTokens.has(token))shared+=1;
 return shared/Math.max(2,Math.min(eventTokens.size,8));
}

function eventTimeScore(event,now){
 const start=Date.parse(event.start);
 if(!Number.isFinite(start))return 0;
 const end=Date.parse(estimatedEventEnd(event)||'');
 if(event.state==='live')return 0.3;
 if(now>=start-90*60000&&now<=end+150*60000)return 0.24;
 if(now>=start-6*3600000&&now<=end+6*3600000)return 0.08;
 return -0.18;
}

export function matchEventToTitle(title,events,now=Date.now()){
 const normalizedTitle=normalizeText(title);
 const titleTokens=textTokens(title);
 if(normalizedTitle.length<4||!Array.isArray(events))return null;
 let best=null;
 for(const event of events){
  if(!event?.id||event.state==='postponed')continue;
  const teams=[normalizeText(event.home),normalizeText(event.away)].filter(value=>value.length>2);
  const bothTeams=teams.length===2&&teams.every(team=>normalizedTitle.includes(team));
  const eventTokens=textTokens([event.name,event.home,event.away,event.league].join(' '));
  const tokenScore=overlapScore(titleTokens,eventTokens);
  const score=Math.min(1,(bothTeams?0.62:0)+tokenScore*0.58+eventTimeScore(event,now));
  const candidate={event,confidence:Number(score.toFixed(3)),bothTeams};
  if(!best||candidate.confidence>best.confidence)best=candidate;
 }
 if(!best||best.confidence<(best.bothTeams?0.55:0.42))return null;
 return best;
}
export function isEventCurrent(event,now=Date.now()){
 const start=Date.parse(event?.start||'');
 const end=Date.parse(estimatedEventEnd(event)||'');
 if(!Number.isFinite(start)||event?.state==='postponed'||event?.state==='final')return false;
 if(event?.state==='live')return true;
 return now>=start-20*60000&&now<=end+45*60000;
}

export function canConfirmEventFinished(event,now=Date.now()){
 if(event?.state!=='final')return false;
 const start=Date.parse(event.start||'');
 if(!Number.isFinite(start))return false;
 const minimum=Math.min(90,Math.round(estimatedDurationMinutes(event.sport)*0.55));
 return now>=start+minimum*60000;
}

export function summarizeSchedule(events,now=Date.now(),limit=10){
 const safe=(Array.isArray(events)?events:[])
  .filter(event=>event?.id&&Number.isFinite(Date.parse(event.start)))
  .sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
 const current=safe.filter(event=>isEventCurrent(event,now)).slice(0,3);
 const upcoming=safe.filter(event=>event.state==='scheduled'&&Date.parse(event.start)>now-20*60000).slice(0,limit);
 return {current,upcoming};
}

export function safeSourceId(value){
 const id=cleanText(value,80);
 return SPORT_STREAMS.some(source=>source.id===id)?id:'';
}

export function sourceById(value){
 const id=safeSourceId(value);
 return SPORT_STREAMS.find(source=>source.id===id)||null;
}
