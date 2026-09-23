const URL='https://api.typesafe.ai/v1/systemone';
const MODEL='jev-latest';
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const prob=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1;
export const jevConfigured=e=>e.AI_ENABLED==='true'&&e.JEV_ENABLED==='true'&&!!e.TYPESAFE_API_KEY?.trim();

export function moderationRequest(content,surface='chat',model=MODEL){
 const value=String(content||'').trim();
 if(!value||value.length>5000||!['chat','post','profile'].includes(surface))throw Error('Entrée Jev invalide.');
 return{model,state:{surface,content:value,language:'fr'},questions:{
  'community.action':{type:'choice',instructions:'Choisis l’action minimale nécessaire. Une citation ou critique non insultante reste autorisée.',criteria:{
   allow:'Respectueux ou critique sans insulte dirigée, menace, haine ni harcèlement.',
   warn:'Vulgarité légère ou grossièreté non dirigée : demander une reformulation.',
   block:'Insulte dirigée, harcèlement ou attaque personnelle grave : refuser la publication.',
   escalate:'Menace crédible, haine visant un groupe protégé, violence ou harcèlement grave : refuser et envoyer en revue humaine.'
  }},
  'community.obfuscation':{type:'noul',instructions:'Le texte tente-t-il de contourner un filtre avec espaces, chiffres, symboles ou répétitions ?'}
 }};
}
export function interpretModeration(r){
 const a=obj(r?.answers)?r.answers['community.action']:null;
 if(!obj(a)||!['allow','warn','block','escalate'].includes(a.choice))return null;
 const confidence=prob(a.confidence)?a.confidence:0,o=r.answers['community.obfuscation'];
 let action=a.choice;const obfuscated=obj(o)&&prob(o.noul)&&o.noul>=.82;
 const initial=action;
 if(initial==='escalate'&&confidence<.78)action='block';
 else if(initial==='block'&&confidence<.72)action='warn';
 else if(initial==='warn'&&confidence<.60)action='allow';
 if(action==='allow'&&obfuscated)action='warn';
 return{action,confidence,obfuscated};
}
export function assistantPlanRequest(messages,model=MODEL){
 if(!Array.isArray(messages)||!messages.length)throw Error('Conversation manquante.');
 const state=messages.slice(-6).map(m=>`${m.role==='assistant'?'ASSISTANT':'UTILISATEUR'}: ${String(m.content||'').slice(0,4000)}`).join('\n');
 return{model,state,questions:{
  'assistant.domain':{type:'choice',instructions:'Classe la dernière demande.',criteria:{general:'Question générale.',creative:'Création ou design.',technical:'Code, bug ou intégration.',threeb:'Écosystème, application ou Monde du 3B.'}},
  'assistant.depth':{type:'choice',instructions:'Choisis la profondeur utile.',criteria:{concise:'Court et actionnable.',standard:'Explication normale.',deep:'Approfondi ou technique.'}}
 }};
}
export function interpretAssistantPlan(r){
 const a=obj(r?.answers)?r.answers:{},d=a['assistant.domain'],p=a['assistant.depth'];
 const domain=obj(d)&&['general','creative','technical','threeb'].includes(d.choice)?d.choice:null;
 const depth=obj(p)&&['concise','standard','deep'].includes(p.choice)?p.choice:null;
 return domain||depth?{domain,depth,confidence:{domain:prob(d?.confidence)?d.confidence:null,depth:prob(p?.confidence)?p.confidence:null}}:null;
}
export async function systemOne({apiKey,model=MODEL,state,questions,fetcher=fetch,timeout=6000}){
 if(!apiKey?.trim()||!obj(questions))throw Error('Jev non configuré.');
 const response=await fetcher(URL,{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({model,state,questions}),signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw Error('Jev indisponible.');
 const data=await response.json();if(!obj(data?.answers))throw Error('Réponse Jev invalide.');return data;
}
export async function moderateWithJev({env,content,surface,fetcher=fetch}){
 if(!jevConfigured(env))return null;
 try{return interpretModeration(await systemOne({apiKey:env.TYPESAFE_API_KEY,fetcher,...moderationRequest(content,surface,env.TYPESAFE_MODEL||MODEL)}));}catch{return null;}
}
export async function planWithJev({env,messages,fetcher=fetch}){
 if(!jevConfigured(env))return null;
 try{return interpretAssistantPlan(await systemOne({apiKey:env.TYPESAFE_API_KEY,fetcher,...assistantPlanRequest(messages,env.TYPESAFE_MODEL||MODEL)}));}catch{return null;}
}
