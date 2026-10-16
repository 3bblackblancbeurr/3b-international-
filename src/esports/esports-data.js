// 16_18 ESPORT · public data, independently sourced. Never imply team registration.
export const DATA_CHECKED_AT = '2026-10-16';
export const CLUB = Object.freeze({
 name: '16_18 ESPORT',
 publicName: '16‑18 ESPORT',
 rna: 'W744007777',
 location: 'France · Haute-Savoie',
 declaredAt: '2026-10-13',
 status: 'Association déclarée',
 warning: 'Association indépendante. Aucune affiliation ni qualification à un circuit officiel n’est annoncée.'
});
export const GAMES = Object.freeze([
 {id:'warzone',name:'Warzone',short:'WZ',category:'Battle royale',team:'Équipe existante',format:'Selon règlement',link:'https://callofduty.worldseriesofwarzone.com/resurgence'},
 {id:'cod',name:'Call of Duty compétitif',short:'CDL',category:'FPS 4v4',team:'À constituer',format:'4v4',link:'https://www.callofdutyleague.com/en-us/challengers/how-to-compete'},
 {id:'fortnite',name:'Fortnite',short:'FN',category:'Battle royale',team:'Recrutement',format:'Selon événement',link:'https://www.fortnite.com/competitive'},
 {id:'rocketleague',name:'Rocket League',short:'RL',category:'Football automobile',team:'Recrutement',format:'3v3',link:'https://www.rocketleague.com/competitive/schedule?lang=fr'},
 {id:'valorant',name:'VALORANT',short:'VL',category:'FPS tactique',team:'Recrutement',format:'5v5',link:'https://valorantesports.com/'},
 {id:'cs2',name:'Counter‑Strike 2',short:'CS',category:'FPS tactique',team:'Recrutement',format:'5v5',link:'https://www.faceit.com/fr/game/cs2'},
 {id:'lol',name:'League of Legends',short:'LOL',category:'MOBA',team:'Recrutement',format:'5v5',link:'https://lolesports.com/'},
 {id:'fc',name:'EA SPORTS FC',short:'FC',category:'Football',team:'Recrutement',format:'1v1',link:'https://www.ea.com/games/ea-sports-fc/fc-pro'},
 {id:'r6',name:'Rainbow Six Siege',short:'R6',category:'FPS tactique',team:'Recrutement',format:'5v5',link:'https://www.ubisoft.com/en-us/esports/rainbow-six/siege'},
 {id:'apex',name:'Apex Legends',short:'APX',category:'Battle royale',team:'Recrutement',format:'3v3',link:'https://www.ea.com/games/apex-legends/compete'},
 {id:'overwatch',name:'Overwatch 2',short:'OW',category:'FPS héroïque',team:'Recrutement',format:'5v5',link:'https://esports.overwatch.com/'},
 {id:'fighting',name:'Jeux de combat / FGC',short:'FGC',category:'Versus fighting',team:'Recrutement',format:'1v1',link:'https://www.start.gg/'},
 {id:'tft',name:'Teamfight Tactics',short:'TFT',category:'Auto battler',team:'Recrutement',format:'Solo',link:'https://www.faceit.com/fr'},
 {id:'other',name:'Autre jeu compétitif',short:'+',category:'Multijeux',team:'Candidatures ouvertes',format:'Variable',link:'https://www.start.gg/'}
]);
export const CURRENT_MEMBERS = Object.freeze([
 {pseudo:'Zakaria 16‑18',role:'Président-fondateur · capitaine',group:'Direction / Warzone',initials:'16',lead:true},
 {pseudo:'DZ Vatos',role:'Joueur titulaire',group:'Warzone',initials:'DZ'},
 {pseudo:'Dazak',role:'Joueur titulaire',group:'Warzone',initials:'DK'},
 {pseudo:'Paolo',role:'Joueur · rotation',group:'Warzone',initials:'PA'},
 {pseudo:'Yahia',role:'Joueur · rotation',group:'Warzone',initials:'YA'}
]);
export const RECRUITMENT_ROLES = Object.freeze(['Joueur / joueuse','Capitaine d’équipe','Coach / analyste','Créateur / créatrice vidéo','Caster / commentateur','Encadrant / bénévole']);
export const PLATFORMS = Object.freeze(['PC','PlayStation','Xbox','Switch','Mobile','Multiplateforme']);
export const AVAILABILITIES = Object.freeze(['Soirs de semaine','Week-end','Soirs et week-ends','Horaires flexibles']);
export const CIRCUITS = Object.freeze([
 {id:'faceit',name:'FACEIT',subtitle:'Tournois ouverts sur plusieurs jeux · filtres par région',url:'https://www.faceit.com/fr',games:['cs2','valorant','overwatch','rocketleague','warzone']},
 {id:'startgg',name:'start.gg',subtitle:'Tournois de communauté, jeux de combat et compétitions locales',url:'https://www.start.gg/',games:['fighting','rocketleague','other']},
 {id:'rocket',name:'RLCS',subtitle:'Calendrier officiel Rocket League',url:'https://www.rocketleague.com/competitive/schedule?lang=fr',games:['rocketleague']},
 {id:'challengers',name:'CoD Challengers',subtitle:'Voie compétitive Call of Duty · EMEA à vérifier',url:'https://www.callofdutyleague.com/en-us/challengers/how-to-compete',games:['cod']},
 {id:'fortnite',name:'Fortnite Compétitif',subtitle:'Formats et tournois officiels à retrouver en jeu',url:'https://www.fortnite.com/competitive',games:['fortnite']},
 {id:'warzone',name:'Warzone Esports',subtitle:'Circuit officiel et prochains règlements à surveiller',url:'https://callofduty.worldseriesofwarzone.com/resurgence',games:['warzone']},
 {id:'arcacup',name:'ArcaCup',subtitle:'Compétition interclubs 2026–2027 · accès à confirmer',url:'https://arcacup.fr/',games:['lol','tft','rocketleague']}
]);
const CDL_SOURCE='https://www.callofdutyleague.com/en-us/news/2027-season-announcement';
const RL_SOURCE='https://www.rocketleague.com/competitive/schedule?lang=fr';
function event(id,title,start,end,game,category,region,sourceUrl,note=''){
 return {id,title,start,end,game,category,region,sourceUrl,note,registration:'non annoncée'};
}
export const EVENTS = Object.freeze([
 event('ch-cup1','Challengers Cup #1','2026-11-14','2026-11-14','cod','Challengers','Régions selon règles',CDL_SOURCE,'Saison 2027 : ouverture du circuit Challengers, modalités EMEA à confirmer.'),
 event('cdl-kickoff','CDL Kickoff Classic · Pro-Am','2026-12-04','2026-12-13','cod','CDL / Pro-Am','En ligne',CDL_SOURCE,'Invitations Challengers issues de NA pour ce format.'),
 event('rl-kickoff','RLCS Club Championship Kick-Off','2026-12-09','2026-12-13','rocketleague','RLCS','Londres',RL_SOURCE,'Événement officiel ; ne vaut pas inscription du club.'),
 event('minor1','CDL Minor I · Pro-Am','2027-01-08','2027-01-10','cod','CDL','En ligne',CDL_SOURCE,'Accès Challengers NA annoncé pour les Minors.'),
 event('qual1','Qualifications en ligne du Major I','2027-01-15','2027-02-07','cod','CDL','En ligne',CDL_SOURCE,'Qualifications CDL, pas une ouverture générale garantie.'),
 event('major1','CDL Major I','2027-02-12','2027-02-14','cod','CDL','Europe',CDL_SOURCE),
 event('minor2','CDL Minor II · Pro-Am','2027-02-26','2027-02-28','cod','CDL','En ligne',CDL_SOURCE),
 event('qual2','Qualifications en ligne du Major II','2027-03-05','2027-03-28','cod','CDL','En ligne',CDL_SOURCE),
 event('major2','CDL Major II · Pro-Am','2027-04-02','2027-04-04','cod','CDL / Pro-Am','Birmingham, Royaume-Uni',CDL_SOURCE,'Voie Challengers via Opens et Elite EMEA.'),
 event('minor3','CDL Minor III · Pro-Am','2027-04-16','2027-04-18','cod','CDL','En ligne',CDL_SOURCE),
 event('qual3','Qualifications en ligne du Major III','2027-04-23','2027-05-16','cod','CDL','En ligne',CDL_SOURCE),
 event('major3','CDL Major III','2027-05-20','2027-05-23','cod','CDL','Toronto, Canada',CDL_SOURCE),
 event('qual4','Qualifications en ligne du Major IV','2027-05-28','2027-06-13','cod','CDL','En ligne',CDL_SOURCE),
 event('major4','CDL Major IV · Pro-Am','2027-06-18','2027-06-20','cod','CDL / Pro-Am','Ouest des États-Unis',CDL_SOURCE,'Voie Challengers via Opens et Elite EMEA.'),
 event('champ','CDL Championship Weekend','2027-07-08','2027-07-11','cod','CDL','Lieu à annoncer',CDL_SOURCE)
]);
export const ADMIN_STEPS = Object.freeze([
 {id:'rna',title:'Déclaration RNA',state:'done',detail:'Association 16_18 ESPORT créée le 13 octobre 2026. Numéro W744007777.',url:'https://www.service-public.gouv.fr/'},
 {id:'receipt',title:'Récépissé officiel',state:'todo',detail:'Document déjà signalé comme disponible dans votre Compte Association. À télécharger et conserver en privé.',url:'https://www.service-public.gouv.fr/'},
 {id:'joafe',title:'Publication JOAFE',state:'todo',detail:'Chercher le RNA et télécharger le témoin de parution une fois publié.',url:'https://www.journal-officiel.gouv.fr/pages/associations-recherche/'},
 {id:'statutes',title:'Statuts, bureau, procès-verbaux',state:'todo',detail:'Conserver les documents originaux, vérifier dirigeants, adresse de siège et règles internes.',url:'https://www.service-public.fr/associations'},
 {id:'siret',title:'SIRET si nécessaire',state:'conditional',detail:'À demander notamment pour subventions, emploi ou activité imposable ; non exigé pour un premier tournoi amateur.',url:'https://lecompteasso.associations.gouv.fr/'},
 {id:'roster',title:'Effectifs vérifiés par jeu',state:'todo',detail:'Chaque joueur donne son accord et vérifie personnellement ses comptes, son âge et sa région selon les règles du tournoi.',url:'https://www.faceit.com/fr'},
 {id:'accounts',title:'Comptes de compétition',state:'todo',detail:'FACEIT et comptes éditeurs personnels, 2FA, aucun mot de passe confié au club.',url:'https://support.faceit.com/'}
]);
const toDate = value => new Date(value+'T12:00:00Z');
export function formatEventDate(event){
 const start=toDate(event.start),end=toDate(event.end);
 const fmt=(date,withMonth=true)=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',...(withMonth?{month:'short'}:{}),year:'numeric',timeZone:'UTC'}).format(date);
 if(event.start===event.end)return fmt(start);
 if(event.start.slice(0,7)===event.end.slice(0,7))return new Intl.DateTimeFormat('fr-FR',{day:'numeric',timeZone:'UTC'}).format(start)+'–'+fmt(end);
 return fmt(start)+' → '+fmt(end);
}
export function filterEvents({game='all',search='',onlyFuture=false,now=new Date()}={}){
 const q=String(search).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const lower=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return EVENTS.filter(e=>(game==='all'||e.game===game)&&(!onlyFuture||e.end>=now.toISOString().slice(0,10))&&lower(e.title+' '+e.region+' '+e.category).includes(q)).sort((a,b)=>a.start.localeCompare(b.start));
}
function icalEscape(value){return String(value||'').replace(/\\/g,'\\\\').replace(/[\r\n]+/g,' ').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function nextDay(d){const date=new Date(d+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10).replaceAll('-','');}
export function buildICS(events=EVENTS){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//16-18 ESPORT//Calendrier officiel//FR','CALSCALE:GREGORIAN','X-WR-CALNAME:16-18 ESPORT - veille compet'];
 for(const e of events)lines.push('BEGIN:VEVENT','UID:'+e.id+'@16-18-esport','DTSTAMP:20261016T000000Z','DTSTART;VALUE=DATE:'+e.start.replaceAll('-',''),'DTEND;VALUE=DATE:'+nextDay(e.end),'SUMMARY:'+icalEscape(e.title),'DESCRIPTION:'+icalEscape('Événement annoncé, sans inscription de 16-18. '+e.note+' Source : '+e.sourceUrl),'URL:'+e.sourceUrl,'END:VEVENT');
 return lines.concat('END:VCALENDAR','').join('\r\n');
}
export function safeVideoUrl(raw){
 try {const url=new URL(String(raw||'').trim());if(url.protocol!=='https:')return null;
 const host=url.hostname.toLowerCase();if(!['youtube.com','www.youtube.com','youtu.be','www.youtu.be','twitch.tv','www.twitch.tv','clips.twitch.tv','www.tiktok.com','tiktok.com'].includes(host))return null;
 return url.href;
 }catch{return null;}
}
