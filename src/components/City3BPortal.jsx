import CityMapPicker from '../city/CityMapPicker.jsx';
import CityMunicipalExchange from '../city/CityMunicipalExchange.jsx';
import {Button} from '../design-system/index.jsx';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CarFront,Coins,Eye,Globe2,Package,Shirt,Smartphone,Sparkles,X} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {CITY_VALUES,city3bRequest} from '../city/city3b-client.js';
import {createCityRequestGate} from '../city/city3b-request-gate.js';
import City3BBuilder,{City3BPrivatePreview} from '../city/City3BBuilder.jsx';
import DigitalStorePanel from '../store/DigitalStorePanel.jsx';
import {loadDigitalStore} from '../store/digital-store-client.js';
import {ownedPremiumCodes} from '../store/premium-effects.js';
import City3BCampaign from '../city/City3BCampaign.jsx';
import City3BLife from '../city/City3BLife.jsx';
import {enterCityFullscreen,leaveCityFullscreen} from '../city/city3b-fullscreen.js';
import '../styles/city-3b.css';
import '../city/city3b-game.css';

export default function City3BPortal(props){
 const account=useLoyalty();
 return <City3BPortalSession key={account.user?.id||'guest'} {...props} account={account}/>;
}
export function City3BPortalSession({open,onClose,account,requestCity=city3bRequest,readStore=loadDigitalStore}){
 const uid=account.user?.id,dialog=useRef(null),mounted=useRef(true),requests=useRef(createCityRequestGate()),fullscreenOwned=useRef(false);
 const [map,setMap]=useState('plains');
 const [data,setData]=useState(null),[panel,setPanel]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState('Ma ville 3B'),[premiumCodes,setPremiumCodes]=useState(()=>new Set()),[builderFocus,setBuilderFocus]=useState(null),[notice,setNotice]=useState('');
 const country=account.passport?.userId===uid?account.passport.country:'';
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(!open)return;const element=dialog.current,previous=document.activeElement;if(element&&!element.open)element.showModal();return()=>{element?.close();if(fullscreenOwned.current){leaveCityFullscreen(document.documentElement);fullscreenOwned.current=false;}if(previous?.isConnected)previous.focus?.();};},[open]);
 const fullscreen=async()=>{const wasFullscreen=Boolean(document.fullscreenElement);const entered=await enterCityFullscreen(document.documentElement);if(entered&&!wasFullscreen)fullscreenOwned.current=true;};
 const followAction=action=>{
  if(action?.tab==='build'){setBuilderFocus({...action,requestedAt:Date.now()});setPanel('');}
  else setPanel(['districts','collection','settings','life'].includes(action?.tab)?action.tab:'missions');
 };
 const call=async(action,body={})=>{
  const passive=action==='life';
  try{return await requests.current.run(action,async()=>{
   if(!passive){setBusy(true);setError('');setNotice('');}
   try{return await requestCity(action,body,uid);}finally{if(!passive&&mounted.current)setBusy(false);}
  },v=>{
   if(!mounted.current)return;
   if(passive)setData(previous=>previous?{...previous,...v}:previous);else setData(v);
   if(v.reward)setNotice(v.reward.alreadyClaimed?'Cette récompense a déjà été reçue.':`${v.reward.construction?'Bâtiment inauguré':v.reward.income?'Recettes de la ville':v.reward.event?'Rendez-vous accompli':'Objectif accompli'} · +${v.reward.coins} Coins et +${v.reward.cityXp} XP ville.`);
   if(['construction_claim','mission_claim','life_action','budget_claim','create','place'].includes(action))account.refresh?.();
  });}catch(e){if(mounted.current&&!passive)setError(e.message);return null;}
 };
 useEffect(()=>{if(open&&uid){setPanel('');call('snapshot');readStore('city').then(store=>{if(mounted.current)setPremiumCodes(ownedPremiumCodes(store));}).catch(()=>{if(mounted.current)setPremiumCodes(new Set());});}else if(open&&!account.loading){setData(null);setPremiumCodes(new Set());setError('');}},[open,uid,account.loading]);
 useEffect(()=>{if(!open||!uid||!data?.city)return;const refresh=()=>{if(!document.hidden&&!requests.current.busy)call('life');};const timer=setInterval(refresh,15000);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};},[open,uid,!!data?.city]);
 useEffect(()=>{
  if(!open||!data?.placements)return;
  const serverNow=Date.parse(data.serverTime)||Date.now();
  const pending=data.placements.map(p=>Date.parse(p.construction_ready_at)-serverNow).filter(ms=>ms>0);
  if(!pending.length)return;
  const timer=setTimeout(()=>{if(!document.hidden&&!requests.current.busy)call('life');},Math.min(...pending)+500);
  return()=>clearTimeout(timer);
 },[open,data?.placements,data?.serverTime]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer);},[notice]);
 if(!open)return null;
 const city=data?.city,needsLogin=!account.loading&&!uid;
 const titles={missions:'Objectifs',life:'Ma ville',districts:'Quartiers',premium:'Boutique de la ville',collection:'Décorations',visit:'Visiter une ville',exchange:'Ateliers & échanges',settings:'Réglages'};
 return createPortal(<dialog ref={dialog} className="city3b-dialog" aria-modal="true" aria-label="Crée ta ville 3B" onCancel={event=>{event.preventDefault();panel?setPanel(''):onClose();}}>
  <div className="city3b-shell" data-playing={!!city}>
   {city?<main className="city3b-main city3b-game-main"><City3BBuilder data={data} busy={busy} call={call} premiumCodes={premiumCodes} focus={builderFocus} onOpenPanel={setPanel} onClose={onClose} onFullscreen={fullscreen} panelOpen={!!panel}/></main>:<main className="city-game-entry"><Button variant="ghost" aria-label="Fermer" onClick={onClose}><X size={20}/></Button>{account.loading?<div className="city3b-loading">Vérification du Passeport…</div>:needsLogin?<LoginRequired/>:!data&&!error?<div className="city3b-loading">Ouverture de ta ville…</div>:<CreateCity name={name} setName={setName} country={country} busy={busy} map={map} setMap={setMap} create={()=>call('create',{name:name.trim(),country,map})}/>}</main>}
   {(notice||error)&&<div className="city-game-feedback">{notice&&<div role="status">{notice}</div>}{error&&<div role="alert">{error}</div>}</div>}
   {city&&panel&&<aside className="city-game-drawer" aria-label={titles[panel]||'Ma ville'}><header><h2>{titles[panel]||'Ma ville'}</h2><Button variant="ghost" onClick={()=>setPanel('')} aria-label="Revenir à la ville"><X size={18}/></Button></header><div className="city-game-drawer-body">
    {panel==='missions'&&<City3BCampaign campaign={data.campaign} busy={busy} onClaim={mission=>call('mission_claim',{mission})} onAction={followAction} onRefresh={()=>call('snapshot')}/>}
    {panel==='life'&&<><nav className="city-game-drawer-links"><Button variant="ghost" onClick={()=>setPanel('districts')}>Quartiers</Button><Button variant="ghost" onClick={()=>setPanel('collection')}><Package size={16}/>Décorations</Button><Button variant="ghost" onClick={()=>setPanel('premium')}><Sparkles size={16}/>Boutique</Button><Button variant="ghost" onClick={()=>setPanel('visit')}><Globe2 size={16}/>Visiter</Button><Button variant="ghost" onClick={()=>setPanel('exchange')}>Ateliers & échanges</Button></nav>{data.budget?.available&&<section className="city3b-play-guide"><div><small>RECETTES QUOTIDIENNES</small><strong>{data.budget.claimed?'Recettes déjà perçues':`${data.budget.amount} Coins`}</strong></div><Button variant="champagne" disabled={busy||data.budget.claimed||!data.budget.amount} onClick={()=>call('budget_claim')}><Coins size={16}/>{data.budget.claimed?'À demain':'Percevoir'}</Button></section>}<City3BLife data={data} busy={busy} onAction={followAction} onCommand={(command,value='')=>call('life_action',{command,value,request:crypto.randomUUID()})} onRefresh={()=>call('snapshot')}/></>}
    {panel==='districts'&&<Districts data={data}/>}
    {panel==='premium'&&<DigitalStorePanel scope="city" onStoreChange={store=>setPremiumCodes(ownedPremiumCodes(store))}/>}
    {panel==='collection'&&<Collection data={data} busy={busy} call={call}/>}
    {panel==='exchange'&&<CityMunicipalExchange uid={uid} ownCityId={city.city_id} onUpdated={()=>call('snapshot')} onAction={followAction}/>}
    {panel==='visit'&&<Discovery uid={uid} savedFavorites={data.favorites}/>}
    {panel==='settings'&&<CitySettings city={city} busy={busy} call={call}/>}
   </div></aside>}
  </div>
  <section className="city-game-rotate" aria-label="Jouer en mode horizontal"><Smartphone aria-hidden="true"/><small>CRÉE TA VILLE · 3B</small><h2>Tourne ton téléphone</h2><p>Ta ville se joue à l’horizontale, avec toute la place pour construire et explorer en 3D.</p><Button variant="champagne" onClick={fullscreen}>Jouer en plein écran</Button><small>Si nécessaire, active la rotation automatique du téléphone.</small><Button variant="ghost" onClick={onClose}>Retour à l’application</Button></section>
 </dialog>,document.body);
}
function LoginRequired(){return <section className="city3b-hero"><div className="city3b-hero-copy"><p className="city3b-kicker">PASSEPORT 3B REQUIS</p><h2>Ta ville t’attend.</h2><p>Connecte-toi dans l’Espace membre pour retrouver tes constructions et ta progression.</p></div></section>}
function CreateCity({name,setName,country,busy,create,map,setMap}){return <section className="city3b-hero"><div className="city3b-hero-copy"><p className="city3b-kicker">CRÉE TA VILLE</p><h2>Une ville à toi.</h2><p>Choisis ton paysage, puis fonde ta ville. Un territoire de 4 km² à explorer et à construire. Aucun reset, aucune saison : ta ville reste à toi.</p><CityMapPicker value={map} onChange={setMap} disabled={busy}/><div className="city3b-form"><label>Nom de ta ville<input aria-label="Nom de la ville" value={name} maxLength={40} onChange={e=>setName(e.target.value)}/></label><p>{country?`Ton premier quartier : ${country}`:'Complète le pays de ton Passeport pour commencer.'}</p><Button variant="champagne" disabled={busy||name.trim().length<2||!country} onClick={create}>{busy?'Création…':'Fonder ma ville'}</Button></div></div></section>}
function Districts({data}){return <section className="city3b-panel"><h3>Les huit quartiers</h3><p>Les quartiers se débloquent automatiquement grâce au niveau de ta ville : constructions, routes distinctes, objets exposés, fréquentation et XP des missions font avancer ta progression. Les services publics comptent comme constructions. La progression de la Ville reste indépendante du Monde du 3B.</p><div className="city3b-cards">{(data.districts||[]).map(d=><article key={d.country} className="city3b-card" data-locked={!d.unlocked}><strong>{d.country}</strong><span>{CITY_VALUES[d.country]}</span><small>{d.unlocked?`Ouvert · quartier niveau ${d.level}`:'Verrouillé · développe ta ville pour l’ouvrir'}</small></article>)}</div></section>}
function Collection({data,busy,call}){const defs=useMemo(()=>new Map((data.definitions||[]).map(d=>[d.code,d])),[data.definitions]);const displayed=new Set((data.displays||[]).map(d=>d.item_instance_id));return <section className="city3b-panel"><h3>Collection permanente</h3><p>Expose tes objets dans la ville, ou range les véhicules et tenues dans les espaces dédiés.</p>{!data.items?.length?<div className="city3b-empty">Aucun objet permanent dans ton inventaire.</div>:<div className="city3b-cards">{data.items.map((item,index)=>{const d=defs.get(item.item_code)||{};return <article key={item.id} className="city3b-card"><strong>{d.name||item.item_code}</strong><span>{d.rarity||'3B'} · #{item.serial_no}</span><small>{d.item_type||'collectible'}</small>{displayed.has(item.id)?<Button variant="ghost" className="city3b-btn" disabled={busy} onClick={()=>call('remove_display',{item:item.id})}>Retirer de la ville</Button>:<Button variant="matrix" className="city3b-btn blue" disabled={busy} onClick={()=>call('display',{item:item.id,x:20+(index%8)*2,z:20+Math.floor(index/8)*2,rotation:0})}><Eye size={14}/> Exposer</Button>}{d.item_type==='vehicle'&&<Button variant="ghost" className="city3b-btn" disabled={busy} onClick={()=>call('asset_set',{asset:'GARAGE_3B',slot:(index%8)+1,item:item.id})}><CarFront size={14}/> Garage</Button>}{d.item_type==='outfit'&&<Button variant="ghost" className="city3b-btn" disabled={busy} onClick={()=>call('asset_set',{asset:'DRESSING_3B',slot:(index%20)+1,item:item.id})}><Shirt size={14}/> Dressing</Button>}</article>})}</div>}</section>}
function Discovery({uid,savedFavorites=[]}){
 const[rows,setRows]=useState(null),[visit,setVisit]=useState(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[favorites,setFavorites]=useState(()=>new Set(savedFavorites.map(f=>f.city_id)));
 useEffect(()=>{let live=true;city3bRequest('discover',{},uid).then(v=>{if(live)setRows(v.cities||[])}).catch(e=>{if(live){setRows([]);setNotice(e.message)}});return()=>{live=false};},[uid]);
 const open=async c=>{setNotice('');setBusy(true);try{setVisit(await city3bRequest('visit',{city:c.city_id},uid))}catch(e){setNotice(e.message)}finally{setBusy(false)}};
 const favorite=async c=>{setNotice('');setBusy(true);const add=!favorites.has(c.city_id);try{await city3bRequest('favorite',{city:c.city_id,add},uid);setFavorites(previous=>{const next=new Set(previous);if(add)next.add(c.city_id);else next.delete(c.city_id);return next});setNotice(add?'Ville ajoutée aux favoris.':'Ville retirée des favoris.')}catch(e){setNotice(e.message)}finally{setBusy(false)}};
 return <section className="city3b-panel"><h3>Découvrir les villes 3B</h3>{notice&&<div className="city3b-error" role="status">{notice}</div>}{visit&&<><div className="city3b-visit"><strong>{visit.city?.name}</strong><span>{visit.city?.origin_country} · niveau {visit.city?.city_level}</span><small>{visit.placements?.length||0} bâtiments · {visit.displays?.length||0} objets exposés</small><Button variant="ghost" className="city3b-btn" onClick={()=>setVisit(null)}>Retour à la liste</Button></div><City3BPrivatePreview data={visit} publicVisit/></>}{!visit&&(!rows?<div className="city3b-empty">Recherche…</div>:rows.length===0?<div className="city3b-empty">{notice?'La liste est momentanément indisponible.':'Les premières villes publiques apparaîtront ici.'}</div>:<div className="city3b-cards">{rows.map(c=><article key={c.city_id} className="city3b-card"><strong>{c.name}</strong><span>{c.origin_country} · niv. {c.level}</span><small>{c.visitors} visites</small><Button variant="matrix" className="city3b-btn blue" disabled={busy} onClick={()=>open(c)}>Visiter</Button><Button variant="ghost" className="city3b-btn" aria-pressed={favorites.has(c.city_id)} disabled={busy} onClick={()=>favorite(c)}>{favorites.has(c.city_id)?'★ Favori':'☆ Favori'}</Button></article>)}</div>)}</section>;
}
function CitySettings({city,busy,call}){
 const [name,setName]=useState(city.name),[visibility,setVisibility]=useState(city.visibility);
 return <section className="city3b-panel"><div className="city3b-form"><label>Nom de la ville<input aria-label="Nom de la ville" value={name} maxLength={40} onChange={e=>setName(e.target.value)}/></label><label>Visibilité<select aria-label="Visibilité de la ville" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="private">Privée</option><option value="public">Publique · les membres peuvent visiter</option></select></label><Button variant="champagne" disabled={busy||name.trim().length<2} onClick={()=>call('settings',{name:name.trim(),visibility})}>Enregistrer</Button><label>Lumière<select aria-label="Jour et nuit" value={city.day_mode||'auto'} disabled={busy} onChange={e=>call('environment',{day:e.target.value,weather:'clear',ambience:'urban'})}><option value="auto">Construction de jour (par défaut)</option><option value="day">Jour</option><option value="night">Nuit</option></select></label><p>Glisse pour déplacer la caméra. Pince avec deux doigts pour zoomer. Sélectionne un bâtiment pour le déplacer, le ranger ou suivre son chantier.</p></div></section>;
}
