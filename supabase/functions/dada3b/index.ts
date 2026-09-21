import {
  STABLE,
  countryFor,
  createMatch,
  movePiece,
  normalizeRules,
  readMatchSnapshot,
  resolveTimeout,
  rollTurn,
  secureRoll,
  selectBotMove,
} from './engine.js';

const BASE=Deno.env.get('SUPABASE_URL')!;
const ADMIN=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS=new Set([
  'https://3b-international.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const CODE=/^[A-HJ-NP-Z2-9]{6}$/;
const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACTIONS=new Set(['status','create','join','spectate','ready','start','queue','roll','move','tick','leave','reconnect','leaderboard','cosmetics','equip','claim']);
const ONLINE_MODES=new Set(['private','quick','ranked','team2v2']);
const COSMETIC_SLOTS=new Set(['totem_skin','trail','dice_skin','board_skin','capture_fx','intro_fx']);
const STARTER_COSMETICS=['DADA_TOTEM_CORE','DADA_TRAIL_MATRIX','DADA_DICE_CORE','DADA_BOARD_NEXUS','DADA_CAPTURE_FRACTURE','DADA_INTRO_EIGHT_DOORS'];
const DEFAULT_LOADOUT={
  totem_skin:'DADA_TOTEM_CORE',
  trail:'DADA_TRAIL_MATRIX',
  dice_skin:'DADA_DICE_CORE',
  board_skin:'DADA_BOARD_NEXUS',
  capture_fx:'DADA_CAPTURE_FRACTURE',
  intro_fx:'DADA_INTRO_EIGHT_DOORS',
};

class Failure extends Error {
  constructor(public status:number,message:string){super(message);}
}

type Room=Record<string,any>;
type Player=Record<string,any>;

function nowIso(){return new Date().toISOString();}
function plusMs(ms:number){return new Date(Date.now()+ms).toISOString();}

async function admin(path:string,options:Record<string,any>={}){
  const method=options.method||'GET';
  const headers:Record<string,string>={
    apikey:ADMIN,
    Authorization:'Bearer '+ADMIN,
    'Content-Type':'application/json',
    ...(options.prefer?{Prefer:options.prefer}:{}),
  };
  const response=await fetch(BASE+path,{
    method,
    headers,
    ...(options.body===undefined?{}:{body:JSON.stringify(options.body)}),
    signal:AbortSignal.timeout(12000),
  });
  const text=await response.text();
  let data:any=null;
  if(text)try{data=JSON.parse(text);}catch{data=text;}
  if(!response.ok){
    const message=typeof data==='object'?(data?.message||data?.error||data?.hint):null;
    throw new Failure(response.status>=500?503:400,message||'Service DADA 3B momentanément indisponible.');
  }
  return data;
}
const rpc=(name:string,body:unknown)=>admin('/rest/v1/rpc/'+name,{method:'POST',body});

async function userFor(req:Request){
  const auth=req.headers.get('authorization')||'';
  if(!auth.startsWith('Bearer '))throw new Failure(401,'Connecte-toi au compte 3B pour jouer en ligne.');
  const response=await fetch(BASE+'/auth/v1/user',{
    headers:{apikey:PUBLIC,Authorization:auth},
    signal:AbortSignal.timeout(10000),
  });
  const user=await response.json().catch(()=>null);
  if(!response.ok||!user?.id||user.is_anonymous)throw new Failure(401,'Compte 3B connecté requis.');

  let sessionId:string|null=null;
  try{
    const segment=auth.slice(7).split('.')[1]||'';
    const normalized=segment.replace(/-/g,'+').replace(/_/g,'/');
    const padded=normalized+'='.repeat((4-(normalized.length%4))%4);
    const payload=JSON.parse(atob(padded));
    sessionId=payload?.session_id||null;
  }catch{}
  if(!sessionId||!await rpc('loyalty_session_valid',{p_user:user.id,p_session:sessionId})){
    throw new Failure(401,'Ta session a expiré. Reconnecte-toi au compte 3B.');
  }
  return String(user.id);
}

async function ensureStarterCosmetics(uid:string){
  const filter='('+STARTER_COSMETICS.join(',')+')';
  const rows=await admin('/rest/v1/item_instances?owner_id=eq.'+encodeURIComponent(uid)+'&item_code=in.'+encodeURIComponent(filter)+'&select=item_code');
  const owned=new Set((Array.isArray(rows)?rows:[]).map((row:any)=>row.item_code));
  for(const itemCode of STARTER_COSMETICS){
    if(owned.has(itemCode))continue;
    await rpc('market_mint_item',{
      p_user:uid,
      p_item_code:itemCode,
      p_origin:'game_reward',
      p_origin_ref:'dada:starter:'+itemCode,
      p_metadata:{game:'dada3b',starter:true},
    }).catch(()=>null);
  }
}

async function loadoutFor(uid:string){
  await ensureStarterCosmetics(uid);
  const rows=await admin('/rest/v1/dada_cosmetic_loadouts?user_id=eq.'+encodeURIComponent(uid)+'&select=user_id,totem_skin,trail,dice_skin,board_skin,capture_fx,intro_fx&limit=1');
  if(Array.isArray(rows)&&rows[0])return Object.fromEntries(Object.keys(DEFAULT_LOADOUT).map(key=>[key,rows[0][key]||DEFAULT_LOADOUT[key]]));
  await admin('/rest/v1/dada_cosmetic_loadouts?on_conflict=user_id',{
    method:'POST',body:{user_id:uid,...DEFAULT_LOADOUT},prefer:'resolution=merge-duplicates,return=minimal',
  });
  return {...DEFAULT_LOADOUT};
}

async function cosmeticState(uid:string){
  const [loadout,catalog,legacyOwned,instances,rules,claims]=await Promise.all([
    loadoutFor(uid),
    admin('/rest/v1/inventory_items?active=eq.true&select=code,name,rarity,description,metadata&order=code.asc'),
    admin('/rest/v1/inventory?user_id=eq.'+encodeURIComponent(uid)+'&select=item_code,quantity'),
    admin('/rest/v1/item_instances?owner_id=eq.'+encodeURIComponent(uid)+'&select=item_code'),
    admin('/rest/v1/collectible_reward_rules?active=eq.true&code=like.dada_%25&select=code,item_code,label,xp_required'),
    admin('/rest/v1/collectible_reward_claims?user_id=eq.'+encodeURIComponent(uid)+'&rule_code=like.dada_%25&select=rule_code'),
  ]);
  const items=(Array.isArray(catalog)?catalog:[]).filter((item:any)=>item?.metadata?.game==='dada3b'&&COSMETIC_SLOTS.has(item?.metadata?.slot));
  const ownedCodes=new Set([
    ...(Array.isArray(legacyOwned)?legacyOwned:[]).filter((row:any)=>Number(row.quantity)>0).map((row:any)=>row.item_code),
    ...(Array.isArray(instances)?instances:[]).map((row:any)=>row.item_code),
  ]);
  const ruleByItem=new Map((Array.isArray(rules)?rules:[]).map((row:any)=>[row.item_code,row]));
  const claimed=new Set((Array.isArray(claims)?claims:[]).map((row:any)=>row.rule_code));
  return {
    loadout,
    catalog:items.map((item:any)=>{
      const rule=ruleByItem.get(item.code);
      return {
        code:item.code,name:item.name,rarity:item.rarity,description:item.description,
        slot:item.metadata.slot,collection:item.metadata.collection||'core',
        country:item.metadata.country||null,value:item.metadata.value||null,
        owned:ownedCodes.has(item.code),payToWin:false,
        ruleCode:rule?.code||null,xpRequired:Number(rule?.xp_required||0),
        claimed:rule?claimed.has(rule.code):ownedCodes.has(item.code),
      };
    }),
  };
}

async function equipCosmetic(uid:string,body:any){
  const slot=String(body.slot||''),itemCode=String(body.itemCode||'');
  if(!COSMETIC_SLOTS.has(slot)||!/^[A-Z0-9_]{5,80}$/.test(itemCode))throw new Failure(400,'Cosmétique invalide.');
  const items=await admin('/rest/v1/inventory_items?code=eq.'+encodeURIComponent(itemCode)+'&active=eq.true&select=code,metadata&limit=1');
  const item=Array.isArray(items)?items[0]:null;
  if(!item||item.metadata?.game!=='dada3b'||item.metadata?.slot!==slot||item.metadata?.pay_to_win!==false)throw new Failure(400,'Ce cosmétique ne peut pas être équipé ici.');
  const [legacyOwned,instances]=await Promise.all([
    admin('/rest/v1/inventory?user_id=eq.'+encodeURIComponent(uid)+'&item_code=eq.'+encodeURIComponent(itemCode)+'&select=quantity&limit=1'),
    admin('/rest/v1/item_instances?owner_id=eq.'+encodeURIComponent(uid)+'&item_code=eq.'+encodeURIComponent(itemCode)+'&select=id&limit=1'),
  ]);
  const owns=(Array.isArray(legacyOwned)&&legacyOwned[0]&&Number(legacyOwned[0].quantity)>0)||(Array.isArray(instances)&&Boolean(instances[0]));
  if(!owns)throw new Failure(403,'Ce cosmétique n’est pas encore débloqué.');
  const current=await loadoutFor(uid);
  const next={...current,[slot]:itemCode};
  await admin('/rest/v1/dada_cosmetic_loadouts?on_conflict=user_id',{
    method:'POST',body:{user_id:uid,...next,updated_at:nowIso()},prefer:'resolution=merge-duplicates,return=minimal',
  });
  return await cosmeticState(uid);
}

async function claimCosmetic(uid:string,body:any){
  const rule=String(body.ruleCode||'');
  if(!/^dada_[a-z0-9_]{4,80}$/.test(rule))throw new Failure(400,'Récompense DADA invalide.');
  try{await rpc('market_claim_reward',{p_user:uid,p_rule:rule});}
  catch(error){
    const message=error instanceof Error?error.message:String(error);
    if(!/déjà récupérée|already/i.test(message))throw new Failure(400,/XP insuffisante/i.test(message)?'XP insuffisante pour cette récompense.':'Récompense momentanément indisponible.');
  }
  return await cosmeticState(uid);
}

async function profileFor(uid:string){
  const rows=await admin('/rest/v1/member_profiles?user_id=eq.'+encodeURIComponent(uid)+'&select=user_id,handle&limit=1');
  if(!Array.isArray(rows)||!rows[0])throw new Failure(403,'Active ton profil 3B avant de jouer en ligne.');
  return {handle:String(rows[0].handle||'Joueur 3B').slice(0,24),cosmetics:await loadoutFor(uid)};
}

function assertCountry(value:unknown){
  if(typeof value!=='string'||!countryFor(value))throw new Failure(400,'Choisis un pays 3B valide.');
  return value;
}

function onlineRules(input:unknown){
  const rules=normalizeRules(input);
  // Online games always keep an anti-stall turn timer.
  rules.timerSeconds=[20,30,45].includes(rules.timerSeconds)?rules.timerSeconds:30;
  return rules;
}

function playerEntry(uid:string,handle:string,countryId:string,ready=false,team:string|null=null,cosmetics:any=null):Player{
  return {
    uid,
    name:handle,
    countryId,
    type:'human',
    ready,
    botTakeover:false,
    joinedAt:nowIso(),
    lastSeen:nowIso(),
    team:['A','B'].includes(team||'')?team:null,
    cosmetics:cosmetics&&typeof cosmetics==='object'?cosmetics:{...DEFAULT_LOADOUT},
  };
}

function spectatorEntry(uid:string,handle:string){
  return {uid,name:handle,joinedAt:nowIso(),lastSeen:nowIso()};
}

function roomMembers(players:Player[],spectators:Player[]){
  return [...new Set([...players,...spectators].map((entry)=>entry.uid).filter((uid)=>UUID.test(uid)))];
}

function randomCode(){
  const bytes=crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes,(value)=>CODE_ALPHABET[value%CODE_ALPHABET.length]).join('');
}

async function fetchRoom(id:string):Promise<Room|null>{
  if(!UUID.test(id))return null;
  const rows=await admin('/rest/v1/dada_rooms?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');
  return Array.isArray(rows)?rows[0]||null:null;
}

async function fetchRoomByCode(code:string):Promise<Room|null>{
  if(!CODE.test(code))return null;
  const rows=await admin('/rest/v1/dada_rooms?code=eq.'+encodeURIComponent(code)+'&select=*&limit=1');
  return Array.isArray(rows)?rows[0]||null:null;
}

async function cleanupExpiredWaiting(){
  await admin('/rest/v1/dada_rooms?status=eq.waiting&expires_at=lt.'+encodeURIComponent(nowIso()),{
    method:'PATCH',
    body:{status:'cancelled',updated_at:nowIso()},
    prefer:'return=minimal',
  }).catch(()=>null);
}

async function insertRoom(uid:string,handle:string,countryId:string,mode:string,maxPlayers:number,rules:any,team:string|null=null,cosmetics:any=null){
  for(let attempt=0;attempt<6;attempt++){
    const code=randomCode();
    try{
      const body={
        code,
        mode,
        host_user_id:uid,
        status:'waiting',
        max_players:maxPlayers,
        rules,
        players:[playerEntry(uid,handle,countryId,true,team,cosmetics)],
        spectators:[],
        member_ids:[uid],
        expires_at:plusMs(mode==='private'?30*60_000:8*60_000),
      };
      const rows=await admin('/rest/v1/dada_rooms?select=*',{
        method:'POST',
        body,
        prefer:'return=representation',
      });
      if(Array.isArray(rows)&&rows[0])return rows[0];
    }catch(error){
      if(!(error instanceof Failure)||!/duplicate|unique/i.test(error.message))throw error;
    }
  }
  throw new Failure(503,'Impossible de générer un code de salon. Réessaie.');
}

function assertMember(room:Room,uid:string){
  if(!Array.isArray(room.member_ids)||!room.member_ids.includes(uid))throw new Failure(403,'Tu ne fais pas partie de ce salon.');
}

function roomPlayer(room:Room,uid:string){
  return Array.isArray(room.players)?room.players.find((player:any)=>player?.uid===uid)||null:null;
}

function stateFor(room:Room){
  try{
    const state=readMatchSnapshot(room.state);
    if(!state)throw new Error('missing');
    return state;
  }catch{
    throw new Failure(503,'État de partie DADA 3B invalide. Le salon a été protégé.');
  }
}

function deadlineFor(state:any){
  if(!state||state.status!=='playing')return null;
  const seconds=[20,30,45].includes(state.rules?.timerSeconds)?state.rules.timerSeconds:30;
  return plusMs(seconds*1000);
}

function winnerUid(room:Room,state:any){
  if(state?.winnerTeam)return null;
  if(!state?.winner)return null;
  return room.players?.find((player:any)=>player.countryId===state.winner)?.uid||null;
}

async function commitRoom(
  room:Room,
  patch:Record<string,any>,
  actor:string|null,
  kind:string,
  payload:Record<string,any>={}
){
  const players=patch.players??room.players??[];
  const spectators=patch.spectators??room.spectators??[];
  const members=patch.member_ids??roomMembers(players,spectators);
  const revision=await rpc('dada3b_commit_room',{
    p_room:room.id,
    p_revision:room.revision,
    p_players:players,
    p_spectators:spectators,
    p_member_ids:members,
    p_state:patch.state===undefined?room.state:patch.state,
    p_status:patch.status??room.status,
    p_turn_deadline:patch.turn_deadline===undefined?room.turn_deadline:patch.turn_deadline,
    p_winner:patch.winner_user_id===undefined?room.winner_user_id:patch.winner_user_id,
    p_event_kind:kind,
    p_event_payload:payload,
    p_actor:actor,
    p_started_at:patch.started_at??null,
    p_finished_at:patch.finished_at??null,
    p_expires_at:patch.expires_at??null,
  });
  if(revision===null||revision===undefined)throw new Failure(409,'Le salon a changé sur un autre appareil. Synchronisation nécessaire.');
  const fresh=await fetchRoom(room.id);
  if(!fresh)throw new Failure(404,'Salon introuvable.');
  return fresh;
}

async function settleIfFinished(room:Room){
  if(room.status!=='finished'||room.settled_at)return room;
  const state=stateFor(room);
  const humanPlayers=(room.players||[]).filter((player:any)=>player?.type==='human'&&UUID.test(player.uid||''));
  const totalRolls=(state.players||[]).reduce((sum:number,player:any)=>sum+Number(player.stats?.rolls||0),0);
  const duration=room.started_at?Date.now()-Date.parse(room.started_at):0;
  const eligible=duration>=60_000&&totalRolls>=Math.max(6,humanPlayers.length*3);
  const rewards:any[]=[];

  if(eligible){
    for(const player of humanPlayers){
      rewards.push({
        userId:player.uid,
        rewardCode:'dada_match',
        eventId:`dada:${room.id}:match:${player.uid}`,
      });
      const statePlayer=state.players.find((candidate:any)=>candidate.countryId===player.countryId);
      const finished=Math.min(4,Math.max(0,Number(statePlayer?.stats?.finished||0)));
      for(let index=0;index<finished;index++){
        rewards.push({
          userId:player.uid,
          rewardCode:'dada_nexus',
          eventId:`dada:${room.id}:nexus:${player.uid}:${index}`,
        });
      }
    }
    if(state.winnerTeam){
      for(const player of humanPlayers.filter((entry:any)=>entry.team===state.winnerTeam)){
        rewards.push({
          userId:player.uid,
          rewardCode:'dada_win',
          eventId:`dada:${room.id}:team-win:${state.winnerTeam}:${player.uid}`,
        });
      }
    }else if(room.winner_user_id){
      rewards.push({
        userId:room.winner_user_id,
        rewardCode:'dada_win',
        eventId:`dada:${room.id}:win:${room.winner_user_id}`,
      });
    }
  }

  await rpc('dada3b_settle_room',{p_room:room.id,p_rewards:rewards});
  for(const player of humanPlayers){
    await rpc('threeb_process_reward_outbox_server',{p_user:player.uid,p_limit:24}).catch(()=>null);
  }
  return await fetchRoom(room.id)||room;
}

async function resolveDeadline(room:Room){
  if(room.status!=='active'||!room.turn_deadline||Date.parse(room.turn_deadline)>Date.now())return room;
  const state=stateFor(room);
  const result=resolveTimeout(state,secureRoll());
  const finished=result.match.status==='finished';
  const next=await commitRoom(room,{
    state:result.match,
    status:finished?'finished':'active',
    turn_deadline:finished?null:deadlineFor(result.match),
    winner_user_id:finished?winnerUid(room,result.match):null,
    finished_at:finished?nowIso():null,
  },null,'timeout',{
    event:result.match.lastEvent,
    serverResolved:true,
  });
  return finished?await settleIfFinished(next):next;
}

async function resolveBotTakeovers(room:Room){
  if(room.status!=='active')return room;
  let state=stateFor(room);
  const startRevision=room.revision;
  const events:any[]=[];

  for(let guard=0;guard<18&&state.status==='playing';guard++){
    const current=state.players[state.turn];
    const owner=room.players?.find((player:any)=>player.countryId===current.countryId);
    if(!owner?.botTakeover)break;

    if(state.pendingRoll===null){
      const rolled=rollTurn(state,secureRoll());
      state=rolled.match;
      events.push(state.lastEvent);
      if(state.pendingRoll===null)continue;
    }

    const piece=selectBotMove(state,state.pendingRoll,state.turn,'gardien');
    if(piece===null){
      const resolved=resolveTimeout(state,secureRoll());
      state=resolved.match;
      events.push(state.lastEvent);
      continue;
    }
    const moved=movePiece(state,piece);
    state=moved.match;
    events.push(moved.event);
  }

  if(!events.length)return room;
  const finished=state.status==='finished';
  const next=await commitRoom(room,{
    state,
    status:finished?'finished':'active',
    turn_deadline:finished?null:deadlineFor(state),
    winner_user_id:finished?winnerUid(room,state):null,
    finished_at:finished?nowIso():null,
  },null,'bot_turn',{
    fromRevision:startRevision,
    events:events.slice(-18),
  });
  return finished?await settleIfFinished(next):next;
}

async function refreshRoom(room:Room){
  let next=await resolveDeadline(room);
  next=await resolveBotTakeovers(next);
  return next;
}

function publicRoom(room:Room,uid:string){
  const players=(room.players||[]).map((player:any)=>({
    name:player.name,
    countryId:player.countryId,
    type:player.type,
    ready:Boolean(player.ready),
    botTakeover:Boolean(player.botTakeover),
    isSelf:player.uid===uid,
    lastSeen:player.lastSeen,
    team:player.team??null,
    cosmetics:player.cosmetics&&typeof player.cosmetics==='object'?player.cosmetics:{...DEFAULT_LOADOUT},
  }));
  const spectators=(room.spectators||[]).map((entry:any)=>({
    name:entry.name,
    isSelf:entry.uid===uid,
  }));
  return {
    id:room.id,
    code:room.code,
    mode:room.mode,
    status:room.status,
    maxPlayers:room.max_players,
    rules:room.rules,
    players,
    spectators,
    state:room.state,
    revision:room.revision,
    turnDeadline:room.turn_deadline,
    isHost:room.host_user_id===uid,
    winnerCountryId:room.state?.winner||null,
    winnerTeam:room.state?.winnerTeam||null,
    createdAt:room.created_at,
    startedAt:room.started_at,
    finishedAt:room.finished_at,
    settled:Boolean(room.settled_at),
  };
}

async function startRoom(room:Room,actor:string){
  if(room.status!=='waiting')throw new Failure(409,'Cette partie a déjà commencé.');
  if((room.players||[]).length<2)throw new Failure(400,'Il faut au moins deux joueurs.');
  if((room.players||[]).some((player:any)=>!player.ready))throw new Failure(409,'Tous les joueurs doivent être prêts.');
  const countries=(room.players||[]).map((player:any)=>player.countryId);
  if(new Set(countries).size!==countries.length)throw new Failure(409,'Deux joueurs ne peuvent pas représenter le même pays.');

  const rules=onlineRules(room.rules);
  if(rules.teamMode){
    if((room.players||[]).length!==4)throw new Failure(409,'Le 2v2 demande exactement quatre joueurs.');
    if(room.players.filter((player:any)=>player.team==='A').length!==2||room.players.filter((player:any)=>player.team==='B').length!==2)throw new Failure(409,'Le 2v2 demande deux joueurs dans chaque équipe.');
  }
  const state=createMatch((room.players||[]).map((player:any)=>({
    countryId:player.countryId,
    type:'human',
    name:player.name,
    aiLevel:'gardien',
    team:player.team??null,
  })),rules);
  const started=nowIso();
  const horizon=rules.maxDurationMinutes>0
    ? (rules.maxDurationMinutes+30)*60_000
    : 4*60*60_000;

  return await commitRoom(room,{
    state,
    status:'active',
    turn_deadline:deadlineFor(state),
    winner_user_id:null,
    started_at:started,
    expires_at:plusMs(horizon),
  },actor,'start',{
    players:room.players.length,
    mode:room.mode,
  });
}

async function createPrivate(uid:string,body:any){
  const profile=await profileFor(uid);
  const countryId=assertCountry(body.countryId);
  const rules=onlineRules(body.rules);
  const maxPlayers=rules.teamMode?4:(Number.isInteger(body.maxPlayers)?Math.max(2,Math.min(8,body.maxPlayers)):4);
  return await insertRoom(uid,profile.handle,countryId,'private',maxPlayers,rules,rules.teamMode?'A':null,profile.cosmetics);
}

async function joinPrivate(uid:string,body:any){
  const profile=await profileFor(uid);
  const code=String(body.code||'').trim().toUpperCase();
  if(!CODE.test(code))throw new Failure(400,'Le code privé comporte 6 caractères.');
  const countryId=assertCountry(body.countryId);
  let room=await fetchRoomByCode(code);
  if(!room||room.status!=='waiting'||Date.parse(room.expires_at)<=Date.now())throw new Failure(404,'Ce salon est introuvable, expiré ou déjà lancé.');
  if(roomPlayer(room,uid))return room;
  if((room.players||[]).length>=room.max_players)throw new Failure(409,'Ce salon est complet.');
  if((room.players||[]).some((player:any)=>player.countryId===countryId))throw new Failure(409,'Ce pays est déjà représenté dans ce salon.');

  let team:string|null=null;
  if(room.rules?.teamMode){
    const a=(room.players||[]).filter((player:any)=>player.team==='A').length;
    const b=(room.players||[]).filter((player:any)=>player.team==='B').length;
    team=a<=b?'A':'B';
  }
  const players=[...(room.players||[]),playerEntry(uid,profile.handle,countryId,false,team,profile.cosmetics)];
  room=await commitRoom(room,{
    players,
    member_ids:roomMembers(players,room.spectators||[]),
    expires_at:plusMs(30*60_000),
  },uid,'join',{countryId});
  return room;
}

async function joinSpectator(uid:string,body:any){
  const profile=await profileFor(uid);
  const code=String(body.code||'').trim().toUpperCase();
  if(!CODE.test(code))throw new Failure(400,'Le code spectateur comporte 6 caractères.');
  let room=await fetchRoomByCode(code);
  if(!room||!['waiting','active'].includes(room.status))throw new Failure(404,'Cette partie n’est pas disponible.');
  if(roomPlayer(room,uid))return room;
  if((room.spectators||[]).some((entry:any)=>entry.uid===uid))return room;
  if((room.spectators||[]).length>=8)throw new Failure(409,'Le mode spectateur est complet.');

  const spectators=[...(room.spectators||[]),spectatorEntry(uid,profile.handle)];
  room=await commitRoom(room,{
    spectators,
    member_ids:roomMembers(room.players||[],spectators),
  },uid,'spectate',{});
  return room;
}

async function queueRoom(uid:string,body:any){
  const mode=String(body.mode||'');
  if(!['quick','ranked','team2v2'].includes(mode))throw new Failure(400,'File de jeu inconnue.');
  const profile=await profileFor(uid);
  const countryId=assertCountry(body.countryId);
  const teamMode=mode==='team2v2';
  const targetPlayers=teamMode?4:2;
  const rules=onlineRules({
    ...(body.rules||{}),
    piecesPerPlayer:4,
    teamMode,
    timerSeconds:mode==='ranked'?20:30,
    captureRequired:mode==='ranked'?true:Boolean(body.rules?.captureRequired),
  });

  const candidates=await admin(
    '/rest/v1/dada_rooms?mode=eq.'+mode+
    '&status=eq.waiting&expires_at=gt.'+encodeURIComponent(nowIso())+
    '&order=created_at.asc&limit=12&select=*'
  );

  let room=(Array.isArray(candidates)?candidates:[]).find((candidate:any)=>
    (candidate.players||[]).length<targetPlayers
    && !(candidate.member_ids||[]).includes(uid)
    && !(candidate.players||[]).some((player:any)=>player.countryId===countryId)
  );

  if(!room){
    return await insertRoom(uid,profile.handle,countryId,mode,targetPlayers,rules,teamMode?'A':null,profile.cosmetics);
  }

  let team:string|null=null;
  if(teamMode){
    const a=(room.players||[]).filter((player:any)=>player.team==='A').length;
    const b=(room.players||[]).filter((player:any)=>player.team==='B').length;
    team=a<=b?'A':'B';
  }
  const players=[
    ...(room.players||[]).map((player:any)=>({...player,ready:true})),
    playerEntry(uid,profile.handle,countryId,true,team,profile.cosmetics),
  ];
  room=await commitRoom(room,{
    players,
    member_ids:roomMembers(players,room.spectators||[]),
    expires_at:plusMs(8*60_000),
  },uid,'matchmaking_join',{mode,countryId,team});
  return players.length===targetPlayers?await startRoom(room,uid):room;
}

async function readyRoom(uid:string,body:any){
  const room=await requireRoom(uid,body.room);
  if(room.status!=='waiting'||room.mode!=='private')throw new Failure(409,'Le statut prêt ne peut plus être modifié.');
  const player=roomPlayer(room,uid);
  if(!player)throw new Failure(403,'Les spectateurs ne peuvent pas devenir prêts.');
  const players=room.players.map((entry:any)=>entry.uid===uid?{...entry,ready:body.ready!==false,lastSeen:nowIso()}:entry);
  return await commitRoom(room,{players},uid,'ready',{ready:body.ready!==false});
}

async function requireRoom(uid:string,id:unknown){
  if(typeof id!=='string'||!UUID.test(id))throw new Failure(400,'Identifiant de salon invalide.');
  const room=await fetchRoom(id);
  if(!room)throw new Failure(404,'Salon introuvable.');
  assertMember(room,uid);
  return room;
}

function assertRevision(room:Room,value:unknown){
  if(!Number.isInteger(value)||value!==room.revision)throw new Failure(409,'Ton écran n’est plus à jour. Synchronisation nécessaire.');
}

async function rollRoom(uid:string,body:any){
  let room=await requireRoom(uid,body.room);
  room=await refreshRoom(room);
  if(room.status!=='active')return room;
  assertRevision(room,body.revision);
  const player=roomPlayer(room,uid);
  if(!player||player.botTakeover)throw new Failure(403,'Reprends ta place avant de jouer.');

  const state=stateFor(room);
  const current=state.players[state.turn];
  if(!current||current.countryId!==player.countryId)throw new Failure(409,'Ce n’est pas ton tour.');
  if(state.pendingRoll!==null)throw new Failure(409,'Choisis d’abord le Totem à déplacer.');

  const rolled=rollTurn(state,secureRoll());
  let nextState=rolled.match;
  let autoPiece:number|null=null;

  if(nextState.pendingRoll!==null){
    const moves=nextState.pendingMoves||[];
    const active=nextState.players[nextState.turn];
    const allStable=nextState.pendingRoll===6&&moves.length>0&&moves.every((index:number)=>active.pieces[index].steps===STABLE);
    if(moves.length===1||allStable)autoPiece=moves[0];
  }

  if(autoPiece!==null){
    nextState=movePiece(nextState,autoPiece).match;
  }

  const finished=nextState.status==='finished';
  room=await commitRoom(room,{
    state:nextState,
    status:finished?'finished':'active',
    turn_deadline:finished?null:deadlineFor(nextState),
    winner_user_id:finished?winnerUid(room,nextState):null,
    finished_at:finished?nowIso():null,
  },uid,autoPiece===null?'roll':'roll_auto_move',{
    roll:rolled.roll,
    autoPiece,
    event:nextState.lastEvent,
  });
  return finished?await settleIfFinished(room):room;
}

async function moveRoom(uid:string,body:any){
  let room=await requireRoom(uid,body.room);
  room=await refreshRoom(room);
  if(room.status!=='active')return room;
  assertRevision(room,body.revision);
  const player=roomPlayer(room,uid);
  if(!player||player.botTakeover)throw new Failure(403,'Reprends ta place avant de jouer.');
  const state=stateFor(room);
  const current=state.players[state.turn];
  if(!current||current.countryId!==player.countryId)throw new Failure(409,'Ce n’est pas ton tour.');
  if(!Number.isInteger(body.piece)||body.piece<0||body.piece>3)throw new Failure(400,'Totem invalide.');

  let result;
  try{result=movePiece(state,body.piece);}
  catch(error){throw new Failure(400,error instanceof Error?error.message:'Déplacement impossible.');}

  const finished=result.match.status==='finished';
  room=await commitRoom(room,{
    state:result.match,
    status:finished?'finished':'active',
    turn_deadline:finished?null:deadlineFor(result.match),
    winner_user_id:finished?winnerUid(room,result.match):null,
    finished_at:finished?nowIso():null,
  },uid,'move',{
    piece:body.piece,
    event:result.event,
  });
  return finished?await settleIfFinished(room):room;
}

async function leaveRoom(uid:string,body:any){
  let room=await requireRoom(uid,body.room);
  const spectatorIndex=(room.spectators||[]).findIndex((entry:any)=>entry.uid===uid);
  if(spectatorIndex>=0){
    const spectators=room.spectators.filter((_:any,index:number)=>index!==spectatorIndex);
    return await commitRoom(room,{
      spectators,
      member_ids:roomMembers(room.players||[],spectators),
    },uid,'spectator_leave',{});
  }

  const player=roomPlayer(room,uid);
  if(!player)return room;

  if(room.status==='waiting'){
    if(room.host_user_id===uid){
      return await commitRoom(room,{status:'cancelled',turn_deadline:null},uid,'cancel',{reason:'host_left'});
    }
    const players=room.players.filter((entry:any)=>entry.uid!==uid);
    return await commitRoom(room,{
      players,
      member_ids:roomMembers(players,room.spectators||[]),
    },uid,'leave',{countryId:player.countryId});
  }

  if(room.status==='active'){
    const players=room.players.map((entry:any)=>entry.uid===uid?{...entry,botTakeover:true,lastSeen:nowIso()}:entry);
    const state=stateFor(room);
    const statePlayer=state.players.find((entry:any)=>entry.countryId===player.countryId);
    if(statePlayer){statePlayer.type='bot';statePlayer.aiLevel='gardien';}
    room=await commitRoom(room,{players,state},uid,'bot_takeover',{countryId:player.countryId});
    return await resolveBotTakeovers(room);
  }

  return room;
}

async function reconnectRoom(uid:string,body:any){
  let room=await requireRoom(uid,body.room);
  if(room.status!=='active')return room;
  const player=roomPlayer(room,uid);
  if(!player)throw new Failure(403,'Tu n’es pas joueur dans cette partie.');
  if(!player.botTakeover)return room;
  const players=room.players.map((entry:any)=>entry.uid===uid?{...entry,botTakeover:false,lastSeen:nowIso()}:entry);
  const state=stateFor(room);
  const statePlayer=state.players.find((entry:any)=>entry.countryId===player.countryId);
  if(statePlayer)statePlayer.type='human';
  return await commitRoom(room,{players,state},uid,'reconnect',{countryId:player.countryId});
}

async function leaderboard(){
  const ratings=await admin('/rest/v1/dada_ratings?select=user_id,rating,games,wins,losses,streak&order=rating.desc,wins.desc&limit=20');
  const ids=(Array.isArray(ratings)?ratings:[]).map((row:any)=>row.user_id).filter((id:string)=>UUID.test(id));
  let handles=new Map<string,string>();
  if(ids.length){
    const filter='('+ids.join(',')+')';
    const profiles=await admin('/rest/v1/member_profiles?user_id=in.'+encodeURIComponent(filter)+'&select=user_id,handle');
    handles=new Map((Array.isArray(profiles)?profiles:[]).map((row:any)=>[row.user_id,String(row.handle||'Joueur 3B').slice(0,24)]));
  }
  return (Array.isArray(ratings)?ratings:[]).map((row:any,index:number)=>({
    rank:index+1,
    handle:handles.get(row.user_id)||'Joueur 3B',
    rating:row.rating,
    games:row.games,
    wins:row.wins,
    losses:row.losses,
    streak:row.streak,
  }));
}

async function readBody(req:Request){
  const type=req.headers.get('content-type')||'';
  if(!type.startsWith('application/json'))throw new Failure(415,'Format JSON requis.');
  const reader=req.body?.getReader();
  if(!reader)return {};
  let bytes=0;
  let text='';
  const decoder=new TextDecoder();
  try{
    while(true){
      const chunk=await reader.read();
      if(chunk.done)break;
      bytes+=chunk.value.byteLength;
      if(bytes>12_000){await reader.cancel();throw new Failure(413,'Demande trop volumineuse.');}
      text+=decoder.decode(chunk.value,{stream:true});
    }
    text+=decoder.decode();
  }finally{reader.releaseLock();}
  try{return text?JSON.parse(text):{};}
  catch{throw new Failure(400,'JSON invalide.');}
}

Deno.serve(async(req)=>{
  const origin=req.headers.get('origin')||'';
  const headers={
    ...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
    'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods':'POST,OPTIONS',
    'Vary':'Origin',
    'Cache-Control':'no-store',
  };
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({error:'Méthode non autorisée.'},405);
  if(origin&&!ORIGINS.has(origin))return reply({error:'Origine non autorisée.'},403);

  try{
    const body=await readBody(req);
    if(!body||typeof body.action!=='string'||!ACTIONS.has(body.action))throw new Failure(400,'Action DADA 3B inconnue.');
    const uid=await userFor(req);
    if(!await rpc('loyalty_rate',{p_key:uid+':dada3b',p_limit:120,p_window:60}))throw new Failure(429,'Trop d’actions. Patiente quelques secondes.');
    await cleanupExpiredWaiting();

    if(body.action==='leaderboard'){
      return reply({leaderboard:await leaderboard(),serverTime:nowIso()});
    }
    if(body.action==='cosmetics'){
      return reply({...await cosmeticState(uid),serverTime:nowIso()});
    }
    if(body.action==='equip'){
      return reply({...await equipCosmetic(uid,body),serverTime:nowIso()});
    }
    if(body.action==='claim'){
      return reply({...await claimCosmetic(uid,body),serverTime:nowIso()});
    }

    let room:Room|null=null;

    if(body.action==='create'){
      if(String(body.mode||'private')!=='private')throw new Failure(400,'Utilise la file rapide ou classée pour ce mode.');
      room=await createPrivate(uid,body);
    }else if(body.action==='join'){
      room=await joinPrivate(uid,body);
    }else if(body.action==='spectate'){
      room=await joinSpectator(uid,body);
    }else if(body.action==='queue'){
      room=await queueRoom(uid,body);
    }else if(body.action==='ready'){
      room=await readyRoom(uid,body);
    }else if(body.action==='start'){
      room=await requireRoom(uid,body.room);
      if(room.host_user_id!==uid)throw new Failure(403,'Seul l’hôte peut ouvrir le Cercle.');
      room=await startRoom(room,uid);
    }else if(body.action==='roll'){
      room=await rollRoom(uid,body);
    }else if(body.action==='move'){
      room=await moveRoom(uid,body);
    }else if(body.action==='tick'){
      room=await requireRoom(uid,body.room);
      room=await refreshRoom(room);
    }else if(body.action==='leave'){
      room=await leaveRoom(uid,body);
    }else if(body.action==='reconnect'){
      room=await reconnectRoom(uid,body);
    }else if(body.action==='status'){
      room=await requireRoom(uid,body.room);
      room=await refreshRoom(room);
    }

    if(!room)throw new Failure(404,'Salon introuvable.');
    return reply({
      room:publicRoom(room,uid),
      serverTime:nowIso(),
    });
  }catch(error){
    const status=error instanceof Failure?error.status:503;
    const message=error instanceof Failure?error.message:'Le serveur DADA 3B est momentanément indisponible.';
    return reply({error:message},status);
  }
});
