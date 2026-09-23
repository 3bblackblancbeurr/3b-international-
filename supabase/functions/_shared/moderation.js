const ACCENT=/[\u0300-\u036f]/g;
const LEET={ '@':'a','$':'s','0':'o','1':'i','!':'i','3':'e','4':'a','5':'s','7':'t' };

const LIGHT=new Set(['merde','putain','bordel','chier','chiant','chiants','chiante','chiantes']);
const ABUSE=new Set(['connard','connards','connasse','connasses','salope','salopes','encule','enculer','encules','batard','batards','abruti','abrutie','abrutis','debile','debiles','fdp','ntm']);
const SEVERE=new Set([
  'bougnoule','bougnoules','bicot','bicots','youpin','youpins','negre','negres','negro','negros',
  'salejuif','salesjuifs','salegaulois'
]);

const DIRECTED=/\b(tu|toi|ton|ta|tes|vous|votre|vos|lui|elle|eux)\b|@[a-z0-9_.-]{2,}/i;
const THREAT=[
  /\bje\s*(vais|v)\s*(te|vous)\s*(tuer|buter|frapper|casser|tabasser)\b/i,
  /\bon\s*(va|vas)\s*(te|vous)\s*(tuer|buter|frapper|casser|tabasser)\b/i,
  /\b(tu|vous)\s*(vas|allez)\s*(crever|mourir)\b/i,
  /\bje\s*(te|vous)\s*(tue|butte|frappe|casse|tabasse)\b/i,
];

export function moderationCanonical(value=''){
  const mapped=[...String(value).normalize('NFD').replace(ACCENT,'').toLowerCase()]
    .map(char=>LEET[char]||char).join('');
  return mapped.replace(/(.)\1{2,}/g,'$1$1');
}

function tokenKey(value){
  return moderationCanonical(value).replace(/[^a-z]/g,'');
}

function obfuscatedMatch(canonical,term){
  if(term.length<4)return false;
  const letters=[...term];
  const pattern=new RegExp('(^|[^a-z])('+letters.join('[^a-z]*')+')(?=$|[^a-z])','i');
  const match=canonical.match(pattern);
  return !!(match&&/[^a-z]/i.test(match[2]));
}

function contentForms(value){
  const canonical=moderationCanonical(value);
  const words=canonical.split(/\s+/).filter(Boolean);
  const tokenHits=[];
  for(const word of words){
    const key=tokenKey(word);
    if(!key)continue;
    if(SEVERE.has(key))tokenHits.push({term:key,level:'severe'});
    else if(ABUSE.has(key))tokenHits.push({term:key,level:'abuse'});
    else if(LIGHT.has(key))tokenHits.push({term:key,level:'light'});
  }
  const compactHits=[];
  for(const [level,set] of [['severe',SEVERE],['abuse',ABUSE],['light',LIGHT]]){
    for(const term of set){
      if(tokenHits.some(hit=>hit.term===term))continue;
      if(obfuscatedMatch(canonical,term))compactHits.push({term,level});
    }
  }
  return{canonical,words,tokenHits,compactHits};
}

function maskTokens(original,matches){
  if(!matches.length)return original;
  const blocked=new Set(matches.map(m=>m.term));
  return String(original).split(/(\s+)/).map(piece=>{
    if(/^\s+$/.test(piece))return piece;
    return blocked.has(tokenKey(piece))?'••••':piece;
  }).join('');
}

export function moderateCommunityText(value,{context='chat'}={}){
  const original=String(value??'');
  const forms=contentForms(original);
  const all=[...forms.tokenHits,...forms.compactHits];
  const levels=new Set(all.map(hit=>hit.level));
  const directed=DIRECTED.test(forms.canonical);
  const threat=THREAT.some(pattern=>pattern.test(forms.canonical));
  const evasive=forms.compactHits.length>0;
  const reasons=[];

  if(threat)reasons.push('threat');
  if(levels.has('severe'))reasons.push('hate_or_slur');
  if(levels.has('abuse'))reasons.push('abusive_language');
  if(levels.has('light'))reasons.push('vulgar_language');
  if(directed&&levels.has('abuse'))reasons.push('directed_insult');
  if(evasive)reasons.push('obfuscated_language');

  let action='allow',severity=0,message='';
  if(threat||levels.has('severe')){
    action='escalate';severity=4;
    message='Ce message ne peut pas être envoyé. Son contenu nécessite une vérification de modération.';
  }else if(directed&&levels.has('abuse')){
    action='block';severity=3;
    message='Ce message ne peut pas être envoyé car il contient une insulte dirigée contre une personne.';
  }else if(evasive&&(levels.has('abuse')||levels.has('light'))){
    action='block';severity=2;
    message='Ce message semble contourner le filtre de langage. Reformule-le avant de l’envoyer.';
  }else if(levels.has('abuse')){
    action='mask';severity=2;
    message='Certains termes ont été masqués automatiquement. Garde un échange respectueux.';
  }else if(levels.has('light')){
    action='mask';severity=1;
    message='Un terme vulgaire a été masqué automatiquement.';
  }

  const sanitized=action==='mask'?maskTokens(original,forms.tokenHits):original;
  return{
    action,severity,reasons:[...new Set(reasons)],message,
    text:sanitized,
    matches:all.map(({term,level})=>({term,level})),
    context
  };
}

export function moderationStrikeWeight(result){
  if(!result||result.action==='allow')return 0;
  if(result.severity>=4)return 5;
  if(result.severity===3)return 3;
  if(result.severity===2)return 2;
  return 1;
}

export function moderationRestriction(score,severity=0,now=Date.now()){
  if(severity>=4||score>=12)return new Date(now+7*86400000).toISOString();
  if(score>=8)return new Date(now+24*3600000).toISOString();
  if(score>=5)return new Date(now+15*60000).toISOString();
  return null;
}
