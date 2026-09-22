import {
  ENERGY_MAX,
  ballTouchDistance,
  createPenaltyMatch,
  energyAfterAction,
  expirePossession,
  flowAfterAction,
  keeperPowerState,
  recoverEnergy,
  resolveShot,
  settlePossession,
} from './engine.js';

const BASE = Deno.env.get('SUPABASE_URL')!;
const ADMIN = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC = Deno.env.get('SUPABASE_ANON_KEY')!;

const ORIGINS = new Set([
  'https://3b-international.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'capacitor://localhost',
  'https://localhost',
]);

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACTIONS = new Set([
  'status', 'profile.save', 'create', 'join', 'queue', 'room', 'ready', 'start',
  'input', 'tick', 'leave', 'leaderboard', 'club.create', 'club.join', 'club.leave', 'club.disband', 'international.respond',
]);
const MODES = new Set(['private', 'quick', 'ranked']);
const COUNTRY_IDS = new Set(['fr', 'dz', 'ma', 'tn', 'tr', 'it', 'es', 'ee']);
const COUNTRY_FROM_NAME: Record<string,string> = {
  France: 'fr', 'Algérie': 'dz', Maroc: 'ma', Tunisie: 'tn', Turquie: 'tr',
  Italie: 'it', Espagne: 'es', Estonie: 'ee',
};
const STYLES = new Set(['technicien', 'explosif', 'finisseur', 'imprevisible', 'maestro']);
const SELECTION_ROLES = ['technicien', 'explosif', 'finisseur', 'imprevisible', 'maestro', 'pression'];
const POWERS = new Set(['impulse', 'read', 'phantom', 'anchor']);
const BOOTS = new Set(['classic', 'speed', 'control', 'future', 'retro']);
const STYLE_TUNING:Record<string,{control:number,burst:number,shot:number,flow:number}> = {
  technicien:{control:1.06,burst:.96,shot:1,flow:1.08},
  explosif:{control:.98,burst:1.07,shot:1,flow:.96},
  finisseur:{control:.98,burst:.99,shot:1.07,flow:.96},
  imprevisible:{control:1,burst:1.02,shot:.98,flow:1},
  maestro:{control:1.03,burst:1.03,shot:.98,flow:.96},
};
const PHASE_LABEL: Record<string,string> = {
  'first-half': '1ère période',
  'second-half': '2e période',
  'golden-duel': 'Duel d’Or',
};
const HEX = /^#[0-9a-f]{6}$/i;

class Failure extends Error {
  status: number;
  constructor(status:number, message:string) {
    super(message);
    this.status = status;
  }
}

type Room = Record<string, any>;
type Player = Record<string, any>;

const nowIso = () => new Date().toISOString();
const nowMs = () => Date.now();
const plusMs = (ms:number) => new Date(Date.now() + ms).toISOString();
const clamp = (value:number, min:number, max:number) => Math.max(min, Math.min(max, value));
const number = (value:unknown, fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function originAllowed(origin:string) {
  if (ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:'
      && url.hostname.endsWith('.vercel.app')
      && url.hostname.startsWith('3b-international');
  } catch {
    return false;
  }
}

function cors(req:Request) {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': originAllowed(origin) ? origin : 'https://3b-international.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(req:Request, status:number, data:unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function admin(path:string, options:Record<string,any>={}) {
  const method = options.method || 'GET';
  const headers:Record<string,string> = {
    apikey: ADMIN,
    Authorization: 'Bearer ' + ADMIN,
    'Content-Type': 'application/json',
    ...(options.prefer ? { Prefer: options.prefer } : {}),
  };
  const response = await fetch(BASE + path, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: AbortSignal.timeout(12000),
  });
  const raw = await response.text();
  let data:any = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = raw; }
  }
  if (!response.ok) {
    const message = typeof data === 'object' ? data?.message || data?.error || data?.hint : null;
    throw new Failure(response.status >= 500 ? 503 : 400, message || 'Service Penalty Rush momentanément indisponible.');
  }
  return data;
}

const rpc = (name:string, body:unknown) => admin('/rest/v1/rpc/' + name, { method:'POST', body });

async function userFor(req:Request) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) throw new Failure(401, 'Connecte-toi à ton compte 3B.');
  const response = await fetch(BASE + '/auth/v1/user', {
    headers: { apikey: PUBLIC, Authorization: auth },
    signal: AbortSignal.timeout(10000),
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || !user?.id || user.is_anonymous) throw new Failure(401, 'Compte 3B connecté requis.');

  let sessionId:string|null = null;
  try {
    const payload = JSON.parse(atob(auth.slice(7).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    sessionId = payload?.session_id || null;
  } catch {}
  if (sessionId) {
    const valid = await rpc('loyalty_session_valid', { p_user:user.id, p_session:sessionId }).catch(() => true);
    if (valid === false) throw new Failure(401, 'Ta session a expiré. Reconnecte-toi.');
  }
  return String(user.id);
}

async function memberProfile(uid:string) {
  const rows = await admin('/rest/v1/member_profiles?user_id=eq.' + encodeURIComponent(uid) + '&select=user_id,handle,name,country&limit=1');
  if (!Array.isArray(rows) || !rows[0]) throw new Failure(403, 'Active ton profil 3B avant de jouer.');
  return rows[0];
}

function sanitizeColor(value:unknown, fallback:string) {
  return typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : fallback;
}

function sanitizePowers(value:unknown) {
  const raw = Array.isArray(value) ? value.map(String).filter((id) => POWERS.has(id)) : [];
  const unique = [...new Set(raw)].slice(0, 2);
  return unique.length === 2 ? unique : ['read', 'anchor'];
}

function sanitizeKit(value:any={}) {
  return {
    shirtPrimary: sanitizeColor(value?.shirtPrimary, '#08090b'),
    shirtSecondary: sanitizeColor(value?.shirtSecondary, '#d8b35e'),
    shorts: sanitizeColor(value?.shorts, '#08090b'),
    socks: sanitizeColor(value?.socks, '#08090b'),
    trim: sanitizeColor(value?.trim, '#d8b35e'),
    pattern: ['clean','stripe','split','gradient','matrix'].includes(value?.pattern) ? value.pattern : 'clean',
    sleeves: ['short','long','three-quarter'].includes(value?.sleeves) ? value.sleeves : 'short',
    collar: ['crew','v','retro','future'].includes(value?.collar) ? value.collar : 'v',
    shortsCut: ['classic','slim','loose'].includes(value?.shortsCut) ? value.shortsCut : 'classic',
    socksStyle: ['high','mid','low'].includes(value?.socksStyle) ? value.socksStyle : 'high',
  };
}

function sanitizeBoots(value:any={}) {
  const signature = String(value?.signature || '').trim().toUpperCase().replace(/[^A-Z0-9À-ÖØ-Ý -]/g, '').slice(0, 8);
  return {
    preset: BOOTS.has(String(value?.preset)) ? String(value.preset) : 'control',
    upper: sanitizeColor(value?.upper, '#08090b'),
    sole: sanitizeColor(value?.sole, '#d8b35e'),
    laces: sanitizeColor(value?.laces, '#d8b35e'),
    material: ['leather','knit','synthetic','carbon'].includes(value?.material) ? value.material : 'synthetic',
    studs: ['firm','soft','mixed','blade'].includes(value?.studs) ? value.studs : 'mixed',
    signature,
  };
}

function publicProfile(row:any, clubName='') {
  return {
    displayName: row.display_name,
    shirtName: row.shirt_name,
    shirtNumber: row.shirt_number,
    countryId: row.country_id,
    styleId: row.style_id,
    keeperPowers: row.keeper_powers,
    clubName,
    kit: row.kit,
    boots: row.boots,
    celebration: row.celebration,
  };
}

async function ensureProfile(uid:string) {
  let rows = await admin('/rest/v1/penalty_profiles?user_id=eq.' + encodeURIComponent(uid) + '&select=*&limit=1');
  if (Array.isArray(rows) && rows[0]) return rows[0];

  const member = await memberProfile(uid);
  const displayName = String(member.name || member.handle || 'Joueur 3B').trim().slice(0, 24) || 'Joueur 3B';
  const countryId = COUNTRY_FROM_NAME[String(member.country)] || 'fr';
  const body = {
    user_id: uid,
    display_name: displayName,
    shirt_name: displayName.toUpperCase().slice(0, 14),
    shirt_number: 10,
    country_id: countryId,
    style_id: 'technicien',
    keeper_powers: ['read','anchor'],
    kit: sanitizeKit(),
    boots: sanitizeBoots(),
    celebration: 'calme',
  };
  rows = await admin('/rest/v1/penalty_profiles?select=*', { method:'POST', body, prefer:'return=representation' });
  if (!Array.isArray(rows) || !rows[0]) throw new Failure(503, 'Profil Penalty Rush indisponible.');
  return rows[0];
}

async function saveProfile(uid:string, input:any) {
  const current = await ensureProfile(uid);
  const displayName = String(input?.displayName || current.display_name).trim().slice(0, 24);
  if (displayName.length < 2) throw new Failure(400, 'Le prénom ou pseudo doit contenir au moins 2 caractères.');
  const countryId = COUNTRY_IDS.has(String(input?.countryId)) ? String(input.countryId) : current.country_id;
  if (countryId !== current.country_id) {
    const ratingRows = await admin('/rest/v1/penalty_ratings?user_id=eq.' + encodeURIComponent(uid) + '&select=games&limit=1');
    const games = Array.isArray(ratingRows) && ratingRows[0] ? number(ratingRows[0].games) : 0;
    if (games > 0 || number(current.international_caps) > 0) {
      throw new Failure(409, 'Ton pays de carrière est verrouillé après ton premier duel officiel.');
    }
  }
  const styleId = STYLES.has(String(input?.styleId)) ? String(input.styleId) : current.style_id;
  const shirtName = String(input?.shirtName || current.shirt_name).trim().toUpperCase().slice(0, 14);
  const shirtNumber = clamp(Math.trunc(number(input?.shirtNumber, current.shirt_number)), 1, 99);
  const powers = sanitizePowers(input?.keeperPowers);
  const patch = {
    display_name: displayName,
    shirt_name: shirtName || '3B',
    shirt_number: shirtNumber,
    country_id: countryId,
    style_id: styleId,
    keeper_powers: powers,
    kit: sanitizeKit(input?.kit),
    boots: sanitizeBoots(input?.boots),
    celebration: String(input?.celebration || current.celebration || 'calme').slice(0, 24),
    updated_at: nowIso(),
  };
  const rows = await admin('/rest/v1/penalty_profiles?user_id=eq.' + encodeURIComponent(uid) + '&select=*', {
    method:'PATCH', body:patch, prefer:'return=representation',
  });
  if (!Array.isArray(rows) || !rows[0]) throw new Failure(409, 'Le profil a changé. Réessaie.');
  return rows[0];
}

async function ensureRating(uid:string, countryId:string) {
  const rows = await admin('/rest/v1/penalty_ratings?user_id=eq.' + encodeURIComponent(uid) + '&select=*&limit=1');
  if (Array.isArray(rows) && rows[0]) {
    if (rows[0].country_id !== countryId) {
      const updated = await admin('/rest/v1/penalty_ratings?user_id=eq.' + encodeURIComponent(uid) + '&select=*', {
        method:'PATCH', body:{country_id:countryId,updated_at:nowIso()}, prefer:'return=representation',
      });
      return updated?.[0] || rows[0];
    }
    return rows[0];
  }
  const created = await admin('/rest/v1/penalty_ratings?select=*', {
    method:'POST', body:{user_id:uid,country_id:countryId}, prefer:'return=representation',
  });
  return created[0];
}

async function clubFor(uid:string) {
  const memberships = await admin('/rest/v1/penalty_club_members?user_id=eq.' + encodeURIComponent(uid) + '&select=club_id,role,joined_at&limit=1');
  const membership = Array.isArray(memberships) ? memberships[0] : null;
  if (!membership) return null;
  const clubs = await admin('/rest/v1/penalty_clubs?id=eq.' + encodeURIComponent(membership.club_id) + '&select=id,code,name,colors,created_at&limit=1');
  const club = Array.isArray(clubs) ? clubs[0] : null;
  if (!club) return null;
  const members = await admin('/rest/v1/penalty_club_members?club_id=eq.' + encodeURIComponent(club.id) + '&select=user_id');
  return { ...club, role:membership.role, members:Array.isArray(members) ? members.length : 1 };
}

async function nationalRank(profile:any, rating:any) {
  const stronger = await admin(
    '/rest/v1/penalty_ratings?country_id=eq.' + encodeURIComponent(profile.country_id) +
    '&rating=gt.' + encodeURIComponent(String(rating.rating)) +
    '&select=user_id&limit=5000'
  );
  return (Array.isArray(stronger) ? stronger.length : 0) + 1;
}

function scoutingBand(rank:number, matches:number, reputation:number, pressure:number) {
  if (matches < 10) return 'non-classe';
  if (rank <= 12 && reputation >= 700) return pressure >= .65 ? 'selection' : 'preselection';
  if (rank <= 30 && reputation >= 420) return 'observe';
  if (rank <= 75) return 'radar';
  return 'club';
}

async function activeInternationalWindow() {
  const at = nowIso();
  const rows = await admin(
    '/rest/v1/penalty_international_windows?status=eq.selection' +
    '&starts_at=lte.' + encodeURIComponent(at) +
    '&ends_at=gte.' + encodeURIComponent(at) +
    '&order=starts_at.asc&limit=1&select=*'
  ).catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function selectionForWindow(uid:string, windowId:string) {
  const rows = await admin(
    '/rest/v1/penalty_international_selections?window_id=eq.' + encodeURIComponent(windowId) +
    '&user_id=eq.' + encodeURIComponent(uid) +
    '&select=*&limit=1'
  ).catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function countryNeededRole(windowId:string, countryId:string) {
  const rows = await admin(
    '/rest/v1/penalty_international_selections?window_id=eq.' + encodeURIComponent(windowId) +
    '&country_id=eq.' + encodeURIComponent(countryId) +
    '&status=in.(preselected,selected)&select=role_profile&limit=200'
  ).catch(() => []);
  const counts = Object.fromEntries(SELECTION_ROLES.map((role) => [role, 0]));
  for (const row of Array.isArray(rows) ? rows : []) {
    const role = String(row?.role_profile || '');
    if (Object.hasOwn(counts, role)) counts[role] += 1;
  }
  const countrySeed = [...String(countryId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rotated = (role:string) => {
    const length = SELECTION_ROLES.length;
    return ((SELECTION_ROLES.indexOf(role) - countrySeed) % length + length) % length;
  };
  return [...SELECTION_ROLES]
    .sort((a, b) => counts[a] - counts[b] || rotated(a) - rotated(b))[0];
}

async function refreshInternationalSelection(uid:string, profile:any, rating:any, rank:number, pressure:number) {
  const matches = number(rating.games);
  const reputation = number(profile.reputation);
  const baseScouting = scoutingBand(rank, matches, reputation, pressure);
  const window = await activeInternationalWindow();
  if (!window) return { scouting:baseScouting, selection:null, window:null, neededRole:null, needMatched:false };

  const neededRole = await countryNeededRole(window.id, profile.country_id);
  const playerStyle = STYLES.has(String(profile.style_id)) ? String(profile.style_id) : 'technicien';
  const needMatched = neededRole === playerStyle || (neededRole === 'pression' && pressure >= .65);
  const needQualified = matches >= 10 && rank <= 30 && reputation >= 420 && needMatched;

  let selection = await selectionForWindow(uid, window.id);
  if (!selection && (baseScouting === 'selection' || baseScouting === 'preselection' || needQualified)) {
    const roleProfile = needMatched ? neededRole : pressure >= .65 ? 'pression' : playerStyle;
    const created = await admin('/rest/v1/penalty_international_selections?select=*', {
      method:'POST',
      body:{
        window_id:window.id,
        user_id:uid,
        country_id:profile.country_id,
        status:'preselected',
        role_profile:roleProfile,
      },
      prefer:'return=representation',
    }).catch(() => []);
    selection = Array.isArray(created) ? created[0] || null : null;
  }

  const visibleScouting =
    selection?.status === 'selected' ? 'selection'
      : selection?.status === 'preselected' ? 'preselection'
        : selection?.status === 'declined' ? 'declined'
          : baseScouting;
  return { scouting:visibleScouting, selection, window, neededRole, needMatched };
}

async function respondInternationalSelection(uid:string, selectionId:unknown, decision:unknown) {
  const id = String(selectionId || '');
  const answer = String(decision || '');
  if (!UUID.test(id)) throw new Failure(400, 'Convocation invalide.');
  if (!['accept','decline'].includes(answer)) throw new Failure(400, 'Réponse de convocation invalide.');

  const rows = await admin(
    '/rest/v1/penalty_international_selections?id=eq.' + encodeURIComponent(id) +
    '&user_id=eq.' + encodeURIComponent(uid) +
    '&select=*&limit=1'
  );
  const selection = Array.isArray(rows) ? rows[0] : null;
  if (!selection) throw new Failure(404, 'Convocation introuvable.');

  const expectedStatus = answer === 'accept' ? 'selected' : 'declined';
  if (selection.status === expectedStatus) return selection;
  if (selection.status !== 'preselected') throw new Failure(409, 'Cette convocation a déjà été traitée.');

  const windows = await admin(
    '/rest/v1/penalty_international_windows?id=eq.' + encodeURIComponent(selection.window_id) +
    '&select=*&limit=1'
  );
  const window = Array.isArray(windows) ? windows[0] : null;
  const at = Date.now();
  if (!window || window.status !== 'selection' || Date.parse(window.starts_at) > at || Date.parse(window.ends_at) < at) {
    throw new Failure(409, 'La fenêtre de sélection est terminée.');
  }

  const updated = await admin(
    '/rest/v1/penalty_international_selections?id=eq.' + encodeURIComponent(id) +
    '&user_id=eq.' + encodeURIComponent(uid) +
    '&status=eq.preselected&select=*',
    {
      method:'PATCH',
      body:{status:expectedStatus,updated_at:nowIso()},
      prefer:'return=representation',
    },
  );
  if (!Array.isArray(updated) || !updated[0]) throw new Failure(409, 'La convocation a changé. Synchronise ton profil.');
  return updated[0];
}

async function snapshotFor(uid:string, profile:any) {
  const club = await clubFor(uid);
  const rating = await ensureRating(uid, profile.country_id);
  const rank = await nationalRank(profile, rating);
  const pressure = rating.games ? clamp(number(rating.duel_gold_wins) / Math.max(1, number(rating.duel_gold_played)), 0, 1) : 0;
  const internationalState = await refreshInternationalSelection(uid, profile, rating, rank, pressure);
  const selection = internationalState.selection;
  const window = internationalState.window;
  const history = await admin(
    '/rest/v1/penalty_match_history?or=(player_a.eq.' + encodeURIComponent(uid) + ',player_b.eq.' + encodeURIComponent(uid) + ')' +
    '&select=id,mode,player_a,player_b,winner_user_id,score_a,score_b,created_at&order=created_at.desc&limit=12'
  );
  await rpc('threeb_process_reward_outbox_server', { p_user:uid, p_limit:8 }).catch(() => null);
  const wallet = await rpc('threeb_wallet_snapshot_server', { p_user:uid }).catch(() => null);
  return {
    wallet,
    rating,
    club,
    career: {
      reputation: number(profile.reputation),
      goals: number(rating.goals_for),
      saves: number(rating.saves),
      duelGoldWins: number(rating.duel_gold_wins),
    },
    international: {
      nationalRank: rank,
      scouting: internationalState.scouting,
      caps: number(profile.international_caps),
      goals: number(profile.international_goals),
      pressureScore: pressure,
      neededRole: internationalState.neededRole || null,
      needMatched: Boolean(internationalState.needMatched),
      selectionId: selection?.id || null,
      selectionStatus: selection?.status || null,
      roleProfile: selection?.role_profile || null,
      windowId: window?.id || null,
      windowName: window?.name || null,
      competition: window?.competition || null,
      windowStartsAt: window?.starts_at || null,
      windowEndsAt: window?.ends_at || null,
      windowLabel: window ? window.name : 'Hors fenêtre internationale',
    },
    history: Array.isArray(history) ? history.map((item:any) => ({
      id:item.id,
      result:item.winner_user_id === uid ? 'Victoire' : item.winner_user_id ? 'Défaite' : 'Égalité',
      label:`${item.mode === 'ranked' ? 'Classé' : item.mode === 'quick' ? 'Rapide' : 'Privé'} · ${item.score_a}–${item.score_b}`,
      createdAt:item.created_at,
    })) : [],
  };
}

async function leaderboardFor(countryInput:unknown) {
  const requested = String(countryInput || '').trim().toLowerCase();
  const countryId = COUNTRY_IDS.has(requested) ? requested : null;
  const countryFilter = countryId ? 'country_id=eq.' + encodeURIComponent(countryId) + '&' : '';
  const ratings = await admin(
    '/rest/v1/penalty_ratings?' + countryFilter +
    'select=user_id,country_id,rating,games,wins,losses,goals_for,goals_against,saves,duel_gold_wins,duel_gold_played' +
    '&order=rating.desc,games.desc,wins.desc&limit=100'
  );
  const rows = Array.isArray(ratings) ? ratings : [];
  if (!rows.length) return { scope:countryId || 'global', entries:[] };

  const ids = rows.map((row:any) => String(row.user_id || '')).filter((id:string) => UUID.test(id));
  const profiles = ids.length
    ? await admin(
        '/rest/v1/penalty_profiles?user_id=in.(' + ids.map(encodeURIComponent).join(',') + ')' +
        '&select=user_id,display_name,shirt_name,shirt_number,country_id,style_id,reputation'
      ).catch(() => [])
    : [];
  const byId = new Map((Array.isArray(profiles) ? profiles : []).map((profile:any) => [profile.user_id, profile]));

  return {
    scope:countryId || 'global',
    entries:rows.map((row:any,index:number) => {
      const profile:any = byId.get(row.user_id) || {};
      return {
        rank:index + 1,
        displayName:String(profile.display_name || 'Joueur 3B').slice(0,24),
        shirtName:String(profile.shirt_name || '3B').slice(0,14),
        shirtNumber:clamp(Math.trunc(number(profile.shirt_number,10)),1,99),
        countryId:String(row.country_id || profile.country_id || 'fr'),
        styleId:String(profile.style_id || 'technicien'),
        rating:number(row.rating,1000),
        games:number(row.games),
        wins:number(row.wins),
        losses:number(row.losses),
        goalsFor:number(row.goals_for),
        goalsAgainst:number(row.goals_against),
        saves:number(row.saves),
        duelGoldWins:number(row.duel_gold_wins),
        duelGoldPlayed:number(row.duel_gold_played),
        reputation:number(profile.reputation),
      };
    }),
  };
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('');
}

function playerEntry(uid:string, profile:any, ready=true):Player {
  return {
    uid,
    name: profile.display_name,
    countryId: profile.country_id,
    styleId: profile.style_id,
    keeperPowers: profile.keeper_powers,
    ready,
    joinedAt: nowIso(),
    lastSeen: nowIso(),
  };
}

async function fetchRoom(id:string):Promise<Room|null> {
  if (!UUID.test(id)) return null;
  const rows = await admin('/rest/v1/penalty_rooms?id=eq.' + encodeURIComponent(id) + '&select=*&limit=1');
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function fetchRoomByCode(code:string):Promise<Room|null> {
  if (!CODE.test(code)) return null;
  const rows = await admin('/rest/v1/penalty_rooms?code=eq.' + encodeURIComponent(code) + '&select=*&limit=1');
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function openRoomFor(uid:string):Promise<Room|null> {
  const rows = await admin(
    '/rest/v1/penalty_rooms?member_ids=cs.%7B' + encodeURIComponent(uid) +
    '%7D&status=in.(waiting,active)&expires_at=gt.' + encodeURIComponent(nowIso()) +
    '&order=created_at.desc&limit=1&select=*'
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

function roomPlayer(room:Room, uid:string) {
  return Array.isArray(room.players) ? room.players.find((player:any) => player?.uid === uid) || null : null;
}

function assertMember(room:Room, uid:string) {
  if (!Array.isArray(room.member_ids) || !room.member_ids.includes(uid)) throw new Failure(403, 'Tu ne fais pas partie de ce duel.');
}

function publicRoom(room:Room, uid:string) {
  const players = (room.players || []).map((player:any) => ({
    name:player.name,
    countryId:player.countryId,
    styleId:player.styleId,
    keeperPowers:player.keeperPowers,
    ready:Boolean(player.ready),
    isSelf:player.uid === uid,
  }));
  return {
    id:room.id,
    code:room.code,
    mode:room.mode,
    status:room.status,
    players,
    state:room.state,
    revision:room.revision,
    isHost:room.host_user_id === uid,
    startedAt:room.started_at,
    finishedAt:room.finished_at,
    settled:Boolean(room.settled_at),
    realtimeTopic:'penalty:' + room.id,
    apiVersion:2,
    serverNow:nowMs(),
  };
}

async function addEvent(roomId:string, revision:number, uid:string|null, kind:string, payload:any) {
  await admin('/rest/v1/penalty_room_events', {
    method:'POST',
    body:{
      room_id:roomId,
      revision,
      actor_user_id:uid,
      kind,
      payload:payload && typeof payload === 'object' ? payload : {},
    },
    prefer:'return=minimal',
  }).catch(() => null);
}

async function commitRoom(room:Room, patch:Record<string,any>, actor:string|null, kind:string, payload:any={}) {
  const revision = Number(room.revision || 0) + 1;
  const body = { ...patch, revision, updated_at:nowIso() };
  const rows = await admin(
    '/rest/v1/penalty_rooms?id=eq.' + encodeURIComponent(room.id) +
    '&revision=eq.' + encodeURIComponent(String(room.revision || 0)) +
    '&select=*',
    { method:'PATCH', body, prefer:'return=representation' },
  );
  if (!Array.isArray(rows) || !rows[0]) throw new Failure(409, 'Le duel a changé sur un autre appareil. Synchronisation en cours.');
  await addEvent(room.id, revision, actor, kind, payload);
  return rows[0];
}

async function insertRoom(uid:string, profile:any, mode:string) {
  for (let attempt=0; attempt<6; attempt++) {
    const code = randomCode();
    try {
      const rows = await admin('/rest/v1/penalty_rooms?select=*', {
        method:'POST',
        body:{
          code,
          mode,
          host_user_id:uid,
          status:'waiting',
          players:[playerEntry(uid, profile, true)],
          member_ids:[uid],
          expires_at:plusMs(mode === 'private' ? 30*60_000 : 6*60_000),
        },
        prefer:'return=representation',
      });
      if (Array.isArray(rows) && rows[0]) return rows[0];
    } catch (error) {
      if (!(error instanceof Failure) || !/duplicate|unique/i.test(error.message)) throw error;
    }
  }
  throw new Failure(503, 'Impossible de créer le duel. Réessaie.');
}

function resetPossession(state:any, at:number) {
  if (!state || state.status !== 'playing') return state;
  state.positions = { attacker:{x:0,y:0}, keeper:{y:0} };
  state.keeperIntent = { type:'hold', direction:0, intensity:0, at };
  state.keeperEffect = null;
  state.sprintUntil = 0;
  state.lastMoveAt = at;
  state.previousAction = state.previousAction || [null,null];
  state.keeperEnergy = Array.isArray(state.keeperEnergy) ? state.keeperEnergy : [100,100];
  state.keeperEnergy[state.keeper] = clamp(number(state.keeperEnergy[state.keeper], 100) + 25, 0, 100);
  state.energy[state.attacker] = ENERGY_MAX;
  return state;
}

function createServerMatch(players:Player[]) {
  const at = nowMs();
  const state:any = createPenaltyMatch(players.map((player) => ({ id:player.uid, name:player.name })), at);
  state.positions = { attacker:{x:0,y:0}, keeper:{y:0} };
  state.keeperIntent = { type:'hold', direction:0, intensity:0, at };
  state.keeperEffect = null;
  state.keeperEnergy = [100,100];
  state.previousAction = [null,null];
  state.sprintUntil = 0;
  state.lastMoveAt = at;
  state.matchStats = [
    { shots:0, goals:0, saves:0, flowTotal:0, flowSamples:0, goldenGoals:0 },
    { shots:0, goals:0, saves:0, flowTotal:0, flowSamples:0, goldenGoals:0 },
  ];
  state.lastEvent = { type:'kickoff', text:'Le duel commence. Lis ton adversaire.' };
  return state;
}

async function settleIfFinished(room:Room) {
  if (room.status !== 'finished' || room.settled_at) return room;
  const state = room.state || {};
  const winnerUid = Number.isInteger(state.winner) ? room.players?.[state.winner]?.uid || null : room.winner_user_id || null;
  await rpc('penalty_settle_match', {
    p_room: room.id,
    p_winner: winnerUid,
    p_score_a: Number(state.score?.[0] || 0),
    p_score_b: Number(state.score?.[1] || 0),
    p_stats: state.matchStats || [],
  });

  // Credit the global 3B economy from server-trusted settlement intents only.
  for (const player of room.players || []) {
    const playerUid = String(player?.uid || '');
    if (UUID.test(playerUid)) {
      await rpc('threeb_process_reward_outbox_server', {
        p_user: playerUid,
        p_limit: 16,
      }).catch(() => null);
    }
  }

  return await fetchRoom(room.id) || room;
}

async function startRoom(room:Room, actor:string) {
  if (room.status !== 'waiting') throw new Failure(409, 'Ce duel a déjà commencé.');
  if ((room.players || []).length !== 2) throw new Failure(400, 'Deux joueurs sont nécessaires.');
  if ((room.players || []).some((player:any) => !player.ready)) throw new Failure(409, 'Les deux joueurs doivent être prêts.');
  const state = createServerMatch(room.players);
  const started = nowIso();
  return await commitRoom(room, {
    state,
    status:'active',
    started_at:started,
    finished_at:null,
    winner_user_id:null,
    expires_at:plusMs(12*60_000),
  }, actor, 'start', { mode:room.mode });
}

async function queueRoom(uid:string, profile:any, mode:string) {
  if (!['quick','ranked'].includes(mode)) throw new Failure(400, 'File de jeu inconnue.');
  const candidates = await admin(
    '/rest/v1/penalty_rooms?mode=eq.' + encodeURIComponent(mode) +
    '&status=eq.waiting&expires_at=gt.' + encodeURIComponent(nowIso()) +
    '&order=created_at.asc&limit=16&select=*'
  );
  let room = (Array.isArray(candidates) ? candidates : []).find((candidate:any) =>
    (candidate.players || []).length === 1 && !(candidate.member_ids || []).includes(uid)
  );
  if (!room) return await insertRoom(uid, profile, mode);

  const players = [...room.players.map((player:any) => ({...player,ready:true})), playerEntry(uid, profile, true)];
  try {
    room = await commitRoom(room, {
      players,
      member_ids:players.map((player:any) => player.uid),
      expires_at:plusMs(8*60_000),
    }, uid, 'matchmaking_join', { mode });
  } catch (error) {
    if (error instanceof Failure && error.status === 409) return await insertRoom(uid, profile, mode);
    throw error;
  }
  return await startRoom(room, uid);
}

async function joinPrivate(uid:string, profile:any, codeInput:unknown) {
  const code = String(codeInput || '').trim().toUpperCase();
  if (!CODE.test(code)) throw new Failure(400, 'Le code privé comporte 6 caractères.');
  let room = await fetchRoomByCode(code);
  if (!room || room.status !== 'waiting' || Date.parse(room.expires_at) <= Date.now()) {
    throw new Failure(404, 'Ce salon est introuvable, expiré ou déjà lancé.');
  }
  if (roomPlayer(room, uid)) return room;
  if ((room.players || []).length >= 2) throw new Failure(409, 'Ce duel est complet.');
  const players = [...room.players, playerEntry(uid, profile, false)];
  room = await commitRoom(room, {
    players,
    member_ids:players.map((player:any) => player.uid),
    expires_at:plusMs(30*60_000),
  }, uid, 'join', {});
  return room;
}

function activeKeeperEffect(state:any, at:number) {
  return state?.keeperEffect && number(state.keeperEffect.until) > at ? state.keeperEffect : null;
}

function safeDirection(value:unknown) {
  return clamp(number(value), -1, 1);
}

function safeIntensity(value:unknown) {
  return clamp(number(value), 0, 1);
}

function normalizedShot(input:any, progress:number, styleId:string) {
  const raw = input?.shot || {};
  const distanceFactor = clamp(.62 + progress * .38, .62, 1);
  const tuning = STYLE_TUNING[styleId] || STYLE_TUNING.technicien;
  return {
    type:['shot','curved-shot','panenka'].includes(input?.type) ? input.type : 'shot',
    power:clamp(number(raw.power,.5) * (.72 + progress * .28) * tuning.shot, .08, 1),
    precision:clamp(number(raw.precision,.78) * distanceFactor * Math.min(1.035,tuning.shot), .45, 1),
    curve:clamp(number(raw.curve), -.7, .7),
    targetX:clamp(number(raw.targetX), -1, 1),
    targetY:clamp(number(raw.targetY,.45), .04, 1),
  };
}

function updateFlowState(state:any, index:number, type:string, success=true, styleId='technicien') {
  const before = number(state.flow[index]);
  const base = flowAfterAction(before, type, state.previousAction?.[index], success);
  const tuning = STYLE_TUNING[styleId] || STYLE_TUNING.technicien;
  state.flow[index] = clamp(before + (base-before)*tuning.flow, 0, 100);
  state.energy[index] = energyAfterAction(number(state.energy[index],100), type);
  state.previousAction[index] = type;
  const stats = state.matchStats?.[index];
  if (stats) {
    stats.flowTotal = number(stats.flowTotal) + number(state.flow[index]);
    stats.flowSamples = number(stats.flowSamples) + 1;
  }
}

async function processInput(room:Room, uid:string, input:any) {
  if (room.status !== 'active' || room.state?.status !== 'playing') throw new Failure(409, 'Le duel n’est pas actif.');
  const playerIndex = room.players.findIndex((player:any) => player.uid === uid);
  if (playerIndex < 0) throw new Failure(403, 'Tu ne fais pas partie de ce duel.');
  const at = nowMs();
  let state:any = structuredClone(room.state);

  if (at >= number(state.possessionDeadline, Infinity)) {
    state = expirePossession(state, at);
    state.lastEvent = { type:'timeout', text:'15 secondes écoulées · occasion perdue.' };
    resetPossession(state, at);
    const finished = state.status === 'finished';
    let next = await commitRoom(room, {
      state,
      status:finished ? 'finished' : 'active',
      finished_at:finished ? nowIso() : null,
      winner_user_id:finished && Number.isInteger(state.winner) ? room.players[state.winner]?.uid || null : null,
    }, null, 'timeout', {});
    return finished ? await settleIfFinished(next) : next;
  }

  const type = String(input?.type || '');
  if (type === 'move') {
    if (playerIndex !== state.attacker) throw new Failure(403, 'Seul l’attaquant contrôle la course.');
    const dt = clamp((at - number(state.lastMoveAt, at)) / 1000, 0, .25);
    const ix = safeDirection(input?.x);
    const iy = safeDirection(input?.y);
    const intensity = safeIntensity(input?.intensity);
    const sprinting = at < number(state.sprintUntil);
    const style = STYLE_TUNING[room.players[playerIndex]?.styleId] || STYLE_TUNING.technicien;
    const forward = clamp(-iy, 0, 1);
    const speed = (.12 + intensity * .13) * (sprinting ? 1.34 : 1) * style.burst;
    state.positions.attacker.x = clamp(number(state.positions.attacker.x) + forward * speed * dt, 0, 1);
    state.positions.attacker.y = clamp(number(state.positions.attacker.y) + ix * (.16 + intensity*.12) * dt, -.92, .92);
    state.ballLead = ballTouchDistance(intensity * (sprinting ? 1 : .78), style.control);
    if (!sprinting && intensity < .42) {
      state.energy[playerIndex] = recoverEnergy(number(state.energy[playerIndex],100), dt, false);
    }
    state.lastMoveAt = at;
    state.lastEvent = { type:'move', text:sprinting ? 'Accélération contrôlée.' : intensity < .42 ? 'Tempo · énergie récupérée.' : 'Lecture et placement.' };
    return await commitRoom(room, {state}, uid, 'move', {x:state.positions.attacker.x,y:state.positions.attacker.y});
  }

  if (['dive','high-claim','close-angle','hold'].includes(type)) {
    if (playerIndex !== state.keeper) throw new Failure(403, 'Seul le gardien peut déclencher ce geste.');
    state.keeperIntent = {
      type,
      direction:safeDirection(input?.direction),
      intensity:safeIntensity(input?.intensity),
      at,
    };
    state.positions.keeper.y = clamp(
      number(state.positions.keeper.y) + safeDirection(input?.direction) * (.12 + safeIntensity(input?.intensity)*.18),
      -.95, .95,
    );
    state.lastEvent = { type:'keeper', text:type === 'dive' ? 'Le gardien engage son plongeon.' : type === 'high-claim' ? 'Sortie haute.' : type === 'close-angle' ? 'Angle fermé.' : 'Gardien en attente.' };
    return await commitRoom(room, {state}, uid, 'keeper', {type});
  }

  if (type === 'power') {
    if (playerIndex !== state.keeper) throw new Failure(403, 'Pouvoir gardien uniquement.');
    const powerId = String(input?.powerId || '');
    if (!room.players[playerIndex]?.keeperPowers?.includes(powerId)) throw new Failure(400, 'Ce pouvoir n’est pas équipé.');
    if (activeKeeperEffect(state, at)) throw new Failure(409, 'Un pouvoir gardien est déjà actif.');
    const use = keeperPowerState(powerId, number(state.keeperEnergy?.[playerIndex], 100), at);
    if (!use.ok) throw new Failure(409, 'Énergie gardien insuffisante.');
    state.keeperEnergy[playerIndex] = use.energy;
    state.keeperEffect = use.effect;
    state.lastEvent = { type:'power', text:`Pouvoir gardien · ${powerId}.` };
    return await commitRoom(room, {state}, uid, 'power', {powerId});
  }

  if (['accelerate','feint','cut','rhythm'].includes(type)) {
    if (playerIndex !== state.attacker) throw new Failure(403, 'Action attaquant uniquement.');
    if (number(state.energy[playerIndex],100) <= 2) throw new Failure(409, 'Ralentis : ton énergie est trop basse.');
    updateFlowState(state, playerIndex, type, true, room.players[playerIndex]?.styleId);
    if (type === 'accelerate') state.sprintUntil = at + 850;
    if (type === 'feint' || type === 'cut') {
      const direction = safeDirection(input?.direction?.x);
      state.positions.attacker.y = clamp(number(state.positions.attacker.y) + direction * (type === 'cut' ? .12 : .07), -.95, .95);
    }
    state.lastEvent = { type, text:type === 'accelerate' ? 'Changement de rythme.' : type === 'feint' ? 'Feinte.' : type === 'cut' ? 'Crochet.' : 'Tempo.' };
    return await commitRoom(room, {state}, uid, type, {});
  }

  if (['shot','curved-shot','panenka'].includes(type)) {
    if (playerIndex !== state.attacker) throw new Failure(403, 'Seul l’attaquant peut frapper.');
    const progress = clamp(number(state.positions?.attacker?.x), 0, 1);
    const shot = normalizedShot(input, progress, room.players[playerIndex]?.styleId);
    const flowBeforeShot = number(state.flow[playerIndex]);

    const intent = state.keeperIntent && at - number(state.keeperIntent.at) <= 950
      ? state.keeperIntent
      : { type:'hold', direction:0, intensity:0 };
    const keeperEffect = activeKeeperEffect(state, at);
    const result = resolveShot({
      shot,
      keeperX:number(state.positions?.keeper?.y),
      keeperGesture:intent,
      keeperEffect,
      attackerFlow:flowBeforeShot,
    });
    updateFlowState(state, playerIndex, type, result.goal, room.players[playerIndex]?.styleId);
    const keeperIndex = state.keeper;
    const statsA = state.matchStats[playerIndex];
    const statsK = state.matchStats[keeperIndex];
    if (statsA) {
      statsA.shots = number(statsA.shots) + 1;
      if (result.goal) {
        statsA.goals = number(statsA.goals) + 1;
        if (state.phase === 'golden-duel') statsA.goldenGoals = number(statsA.goldenGoals) + 1;
      }
    }
    if (statsK && result.saved) statsK.saves = number(statsK.saves) + 1;

    state = settlePossession(state, result.goal ? 'goal' : 'save', at);
    state.lastEvent = {
      type:result.goal ? 'goal' : result.frame ? 'frame' : 'save',
      text:result.goal ? 'BUT · lecture parfaite.' : result.frame ? 'Le cadre repousse la frappe.' : 'ARRÊT · le gardien avait lu le duel.',
      result,
    };
    if (state.status === 'playing') resetPossession(state, at);
    const finished = state.status === 'finished';
    let next = await commitRoom(room, {
      state,
      status:finished ? 'finished' : 'active',
      finished_at:finished ? nowIso() : null,
      winner_user_id:finished && Number.isInteger(state.winner) ? room.players[state.winner]?.uid || null : null,
    }, uid, 'shot', { result:result.reason, phase:state.phase, score:state.score });
    return finished ? await settleIfFinished(next) : next;
  }

  throw new Failure(400, 'Geste inconnu.');
}

async function tickRoom(room:Room) {
  if (room.status === 'waiting' && Date.parse(room.expires_at) <= Date.now()) {
    return await commitRoom(room, {status:'cancelled'}, null, 'expired', {});
  }
  if (room.status !== 'active') return room;
  const at = nowMs();
  if (at < number(room.state?.possessionDeadline, Infinity)) return room;
  let state:any = expirePossession(structuredClone(room.state), at);
  state.lastEvent = { type:'timeout', text:'15 secondes écoulées · occasion perdue.' };
  if (state.status === 'playing') resetPossession(state, at);
  const finished = state.status === 'finished';
  let next = await commitRoom(room, {
    state,
    status:finished ? 'finished' : 'active',
    finished_at:finished ? nowIso() : null,
    winner_user_id:finished && Number.isInteger(state.winner) ? room.players[state.winner]?.uid || null : null,
  }, null, 'timeout', {});
  return finished ? await settleIfFinished(next) : next;
}

async function createClub(uid:string, nameInput:unknown, colorsInput:any={}) {
  const existing = await clubFor(uid);
  if (existing) throw new Failure(409, 'Tu appartiens déjà à un club.');
  const name = String(nameInput || '').trim().slice(0, 40);
  if (name.length < 3) throw new Failure(400, 'Le nom du club doit contenir au moins 3 caractères.');
  const colors = {
    primary:sanitizeColor(colorsInput?.primary, '#08090b'),
    secondary:sanitizeColor(colorsInput?.secondary, '#d8b35e'),
  };
  if (colors.primary === colors.secondary) throw new Failure(400, 'Choisis deux couleurs de club différentes.');
  for (let attempt=0; attempt<6; attempt++) {
    const code = randomCode();
    try {
      const rows = await admin('/rest/v1/penalty_clubs?select=*', {
        method:'POST',
        body:{code,name,owner_user_id:uid,colors:{primary:'#08090b',secondary:'#d8b35e'}},
        prefer:'return=representation',
      });
      const club = rows?.[0];
      if (!club) continue;
      try {
        await admin('/rest/v1/penalty_club_members', {
          method:'POST', body:{club_id:club.id,user_id:uid,role:'owner'}, prefer:'return=minimal',
        });
        return club;
      } catch (error) {
        await admin('/rest/v1/penalty_clubs?id=eq.' + encodeURIComponent(club.id), {method:'DELETE'}).catch(() => null);
        throw error;
      }
    } catch (error) {
      if (!(error instanceof Failure) || !/duplicate|unique/i.test(error.message)) throw error;
    }
  }
  throw new Failure(503, 'Impossible de créer le club.');
}

async function joinClub(uid:string, codeInput:unknown) {
  if (await clubFor(uid)) throw new Failure(409, 'Quitte ton club actuel avant d’en rejoindre un autre.');
  const code = String(codeInput || '').trim().toUpperCase();
  if (!CODE.test(code)) throw new Failure(400, 'Code club invalide.');
  const clubs = await admin('/rest/v1/penalty_clubs?code=eq.' + encodeURIComponent(code) + '&select=*&limit=1');
  const club = Array.isArray(clubs) ? clubs[0] : null;
  if (!club) throw new Failure(404, 'Club introuvable.');
  await admin('/rest/v1/penalty_club_members', {
    method:'POST', body:{club_id:club.id,user_id:uid,role:'member'}, prefer:'return=minimal',
  });
  return club;
}

async function leaveClub(uid:string) {
  const club = await clubFor(uid);
  if (!club) throw new Failure(404, 'Tu n’appartiens à aucun club.');
  if (club.role === 'owner') {
    if (number(club.members, 1) > 1) {
      throw new Failure(409, 'Le fondateur ne peut pas quitter un club avec d’autres membres. Dissous le club ou transfère sa direction plus tard.');
    }
    await admin('/rest/v1/penalty_clubs?id=eq.' + encodeURIComponent(club.id), {
      method:'DELETE', prefer:'return=minimal',
    });
    return { disbanded:true, name:club.name };
  }
  await admin(
    '/rest/v1/penalty_club_members?club_id=eq.' + encodeURIComponent(club.id) +
    '&user_id=eq.' + encodeURIComponent(uid),
    { method:'DELETE', prefer:'return=minimal' },
  );
  return { disbanded:false, name:club.name };
}

async function disbandClub(uid:string) {
  const club = await clubFor(uid);
  if (!club) throw new Failure(404, 'Tu n’appartiens à aucun club.');
  if (club.role !== 'owner') throw new Failure(403, 'Seul le fondateur peut dissoudre le club.');
  await admin('/rest/v1/penalty_clubs?id=eq.' + encodeURIComponent(club.id), {
    method:'DELETE', prefer:'return=minimal',
  });
  return { name:club.name };
}

async function route(req:Request) {
  const uid = await userFor(req);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || '');
  if (!ACTIONS.has(action)) throw new Failure(400, 'Action Penalty Rush inconnue.');

  const rate = action === 'input'
    ? { limit:60, window:2 }
    : ['status','room','tick'].includes(action)
      ? { limit:30, window:10 }
      : { limit:20, window:60 };
  const rateAllowed = await rpc('loyalty_rate', {
    p_key:'penalty:' + uid + ':' + action,
    p_limit:rate.limit,
    p_window:rate.window,
  }).catch(() => true);
  if (rateAllowed === false) throw new Failure(429, 'Trop d’actions en peu de temps. Réessaie dans un instant.');

  let profile = await ensureProfile(uid);

  if (action === 'profile.save') {
    profile = await saveProfile(uid, body.profile);
    const club = await clubFor(uid);
    return { profile:publicProfile(profile, club?.name || ''), snapshot:await snapshotFor(uid, profile), message:'Joueur enregistré.' };
  }

  if (action === 'status') {
    const club = await clubFor(uid);
    let room = body.room && UUID.test(String(body.room)) ? await fetchRoom(String(body.room)) : null;
    if (!room) room = await openRoomFor(uid);
    let ownedRoom = room && room.member_ids?.includes(uid) && ['waiting','active','finished'].includes(room.status)
      ? await tickRoom(room)
      : null;
    if (ownedRoom?.status === 'finished' && !ownedRoom.settled_at) ownedRoom = await settleIfFinished(ownedRoom);
    return {
      profile:publicProfile(profile, club?.name || ''),
      snapshot:await snapshotFor(uid, profile),
      room:ownedRoom ? publicRoom(ownedRoom, uid) : null,
    };
  }

  if (action === 'create') {
    const existing = await openRoomFor(uid);
    if (existing) return { room:publicRoom(existing, uid), message:existing.status === 'active' ? 'Duel en cours retrouvé.' : 'Salon en attente retrouvé.' };
    const room = await insertRoom(uid, profile, 'private');
    return { room:publicRoom(room, uid), message:'Salon privé créé.' };
  }

  if (action === 'join') {
    const room = await joinPrivate(uid, profile, body.code);
    return { room:publicRoom(room, uid), message:'Salon rejoint.' };
  }

  if (action === 'queue') {
    const mode = String(body.mode || '');
    if (!MODES.has(mode) || mode === 'private') throw new Failure(400, 'Mode de matchmaking invalide.');
    const existing = await openRoomFor(uid);
    if (existing) return { room:publicRoom(existing, uid), message:existing.status === 'active' ? 'Duel en cours retrouvé.' : 'Recherche déjà active…' };
    const room = await queueRoom(uid, profile, mode);
    return { room:publicRoom(room, uid), message:room.status === 'active' ? 'Adversaire trouvé.' : 'Recherche d’un adversaire…' };
  }

  if (action === 'leaderboard') {
    const board = await leaderboardFor(body.countryId);
    return { leaderboard:board.entries, scope:board.scope };
  }

  if (action === 'club.create') {
    await createClub(uid, body.name, body.colors);
    const fresh = await ensureProfile(uid);
    const club = await clubFor(uid);
    return { profile:publicProfile(fresh, club?.name || ''), snapshot:await snapshotFor(uid, fresh), message:'Club créé.' };
  }

  if (action === 'club.join') {
    await joinClub(uid, body.code);
    const fresh = await ensureProfile(uid);
    const club = await clubFor(uid);
    return { profile:publicProfile(fresh, club?.name || ''), snapshot:await snapshotFor(uid, fresh), message:'Club rejoint.' };
  }

  if (action === 'club.leave') {
    const result = await leaveClub(uid);
    const fresh = await ensureProfile(uid);
    return {
      profile:publicProfile(fresh, ''),
      snapshot:await snapshotFor(uid, fresh),
      message:result.disbanded ? 'Club fermé.' : 'Tu as quitté le club.',
    };
  }

  if (action === 'club.disband') {
    await disbandClub(uid);
    const fresh = await ensureProfile(uid);
    return { profile:publicProfile(fresh, ''), snapshot:await snapshotFor(uid, fresh), message:'Club dissous.' };
  }

  if (action === 'international.respond') {
    const selection = await respondInternationalSelection(uid, body.selectionId, body.decision);
    const fresh = await ensureProfile(uid);
    const club = await clubFor(uid);
    return {
      profile:publicProfile(fresh, club?.name || ''),
      snapshot:await snapshotFor(uid, fresh),
      message:selection.status === 'selected'
        ? 'Convocation acceptée · tu représenteras ton pays.'
        : 'Convocation déclinée.',
    };
  }

  const roomId = String(body.room || '');
  let room = await fetchRoom(roomId);
  if (!room) throw new Failure(404, 'Duel introuvable.');
  assertMember(room, uid);
  room = await tickRoom(room);

  if (action === 'room' || action === 'tick') {
    if (room.status === 'finished' && !room.settled_at) room = await settleIfFinished(room);
    return { room:publicRoom(room, uid) };
  }

  if (action === 'ready') {
    if (room.status !== 'waiting' || room.mode !== 'private') throw new Failure(409, 'Le statut prêt ne peut plus être modifié.');
    const players = room.players.map((player:any) => player.uid === uid
      ? {...player,ready:body.ready !== false,lastSeen:nowIso()}
      : player
    );
    room = await commitRoom(room, {players}, uid, 'ready', {ready:body.ready !== false});
    return { room:publicRoom(room, uid) };
  }

  if (action === 'start') {
    if (room.host_user_id !== uid) throw new Failure(403, 'Seul l’hôte peut lancer le duel.');
    room = await startRoom(room, uid);
    return { room:publicRoom(room, uid), message:'Duel lancé.' };
  }

  if (action === 'input') {
    room = await processInput(room, uid, body.input);
    return { room:publicRoom(room, uid) };
  }

  if (action === 'leave') {
    if (room.status === 'waiting') {
      const players = room.players.filter((player:any) => player.uid !== uid);
      if (!players.length || room.host_user_id === uid) {
        room = await commitRoom(room, {status:'cancelled',players,member_ids:players.map((p:any)=>p.uid)}, uid, 'leave', {});
      } else {
        room = await commitRoom(room, {players,member_ids:players.map((p:any)=>p.uid)}, uid, 'leave', {});
      }
      return { room:null, message:'Salon quitté.' };
    }
    if (room.status === 'active') {
      const selfIndex = room.players.findIndex((player:any) => player.uid === uid);
      const winner = selfIndex === 0 ? 1 : 0;
      const state = structuredClone(room.state);
      state.status = 'finished';
      state.phase = 'finished';
      state.winner = winner;
      state.possessionDeadline = null;
      state.lastEvent = {type:'forfeit',text:'Abandon · victoire attribuée à l’adversaire.'};
      room = await commitRoom(room, {
        state,
        status:'finished',
        finished_at:nowIso(),
        winner_user_id:room.players[winner]?.uid || null,
      }, uid, 'forfeit', {});
      await settleIfFinished(room);
    }
    return { room:null, message:'Duel quitté.' };
  }

  throw new Failure(400, 'Action non gérée.');
}

Deno.serve(async (req:Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers:cors(req)});
  if (req.method !== 'POST') return json(req, 405, {error:'Méthode non autorisée.'});
  try {
    const data = await route(req);
    return json(req, 200, data);
  } catch (error) {
    const status = error instanceof Failure ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Erreur Penalty Rush.';
    if (status >= 500) console.error('penalty-rush', error);
    return json(req, status, {error:message});
  }
});
