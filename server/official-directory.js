/**
 * 3B administrative directory — free DILA public annuaire (OpenDataSoft).
 * Read-only and location-free: no user identity, coordinates or account data.
 * Sources: https://www.data.gouv.fr/dataservices/api-annuaire-de-ladministration-et-des-services-publics
 */
const ENDPOINT = 'https://api-lannuaire.service-public.gouv.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records';
const SUPPORTED = /^[\p{L}\p{M}0-9 '-]{2,50}$/u;
const clean = (text, max = 140) => typeof text === 'string' ? text.trim().replace(/\s+/g, ' ').slice(0, max) : '';
export const validLocality = input => typeof input === 'string' && SUPPORTED.test(input.trim()) && /[\p{L}0-9]/u.test(input);

function parseList(value) {
  if(Array.isArray(value)) return value;
  if(typeof value !== 'string' || value.length > 7000) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
export function cleanOfficialRecord(item) {
  const name = clean(item?.nom, 150);
  if(!name) return null;
  const entry = parseList(item.adresse).find(v => v && v.type_adresse === 'Adresse') || parseList(item.adresse)[0] || {};
  const address = [entry.numero_voie, [entry.code_postal, entry.nom_commune].filter(Boolean).join(' ')].map(v => clean(v, 130)).filter(Boolean).join(', ');
  const phone = parseList(item.telephone).map(v => clean(v?.valeur, 25)).find(v => /^[+0-9 ().-]{8,25}$/.test(v)) || '';
  let profile = '';
  try {
    const url = new URL(item.url_service_public || '');
    if(url.protocol === 'https:' && url.hostname === 'lannuaire.service-public.gouv.fr') profile = url.href;
  } catch {}
  if(!profile) return null;
  const lastUpdated = Date.parse(item.date_modification_datetime || '');
  return {name, address, phone, profile,
    updated: Number.isFinite(lastUpdated) ? new Date(lastUpdated).toISOString() : null};
}
function json(body, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(body),{status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'X-Content-Type-Options':'nosniff','Cache-Control':cache,
    'Referrer-Policy':'no-referrer',
  }});
}
export async function fetchOfficialDirectory(request) {
  if(request.method !== 'GET') return json({error:'Méthode non autorisée'},405);
  const locality = new URL(request.url).searchParams.get('ville') || '';
  if(!validLocality(locality)) return json({error:'Indique une ville de 2 à 50 caractères, sans caractères spéciaux.'},400);
  const url = new URL(ENDPOINT);
  url.searchParams.set('where', 'search(nom, "'+locality.trim()+'")');
  url.searchParams.set('select', 'nom,adresse,telephone,url_service_public,date_modification_datetime');
  url.searchParams.set('limit','12');
  try {
    const result = await fetch(url, {
      headers:{Accept:'application/json'},
      redirect:'error',signal:AbortSignal.timeout(8000),
    });
    if(!result.ok) throw new Error('directory unavailable');
    const size = Number(result.headers.get('content-length') || 0);
    if(size > 350000) throw new Error('directory too large');
    const payload = await result.json();
    if(!Array.isArray(payload.results)) throw new Error('directory malformed');
    const seen = new Set();
    const services = payload.results.map(cleanOfficialRecord).filter(Boolean).filter(item=>{
      if(seen.has(item.profile)) return false;
      seen.add(item.profile);
      return true;
    }).slice(0,10);
    return json({services, source:'DILA · Annuaire officiel des services publics',
      queried_at:new Date().toISOString(), city:locality.trim()},
      200,'public, s-maxage=1800, stale-while-revalidate=3600');
  } catch {
    return json({error:'Annuaire officiel temporairement inaccessible. Consulte Service-Public directement.'},503);
  }
}
