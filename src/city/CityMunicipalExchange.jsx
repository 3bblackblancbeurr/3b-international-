import {useEffect,useRef,useState} from 'react';
import {Button} from '../design-system/index.jsx';
import {city3bRequest} from './city3b-client.js';
const labels={timber:'Bois',steel:'Métaux',circuits:'Circuits'};
const deals=[['timber_steel','6 bois → 4 métaux'],['steel_timber','4 métaux → 6 bois'],['steel_circuits','4 métaux → 3 circuits'],['circuits_steel','3 circuits → 4 métaux'],['timber_circuits','6 bois → 3 circuits'],['circuits_timber','3 circuits → 6 bois']];
const projects=[['water_efficiency','Gestion de l’eau','12 métaux + 6 circuits','Capacité d’eau +20 %'],['energy_efficiency','Réseau économe','12 circuits + 6 métaux','Capacité électrique +20 %'],['housing_gardens','Habitations végétales','12 bois + 6 métaux','Capacité de logement +20 %']];
export default function CityMunicipalExchange({uid,slot=1,ownCityId,onUpdated,onAction}){
 const [data,setData]=useState(null),[cities,setCities]=useState([]),[target,setTarget]=useState(''),[deal,setDeal]=useState(deals[0][0]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const live=useRef(true),pending=useRef(null);
 useEffect(()=>{live.current=true;city3bRequest('materials',{command:'snapshot',slot,saveId:ownCityId},uid).then(r=>{if(live.current)setData(r.materials);}).catch(e=>{if(live.current)setNotice(e.message);});city3bRequest('discover',{},uid).then(r=>{if(live.current)setCities((r.cities||[]).filter(c=>c.city_id!==ownCityId));}).catch(()=>{});return()=>{live.current=false;};},[uid,slot,ownCityId]);
 const act=async(command,body={})=>{if(busy)return;setBusy(true);setNotice('');try{
  const key=JSON.stringify([command,body]);if(pending.current?.key!==key)pending.current={key,request:crypto.randomUUID()};
  const r=await city3bRequest('materials',{command,...body,slot,saveId:ownCityId,request:pending.current.request},uid);
  if(!live.current)return;setData(r.materials);pending.current=null;setNotice(command==='offer'?'Contrat proposé : tes matériaux sont réservés jusqu’à acceptation ou annulation.':command==='upgrade'?'Projet municipal réalisé · +300 XP ville':'Matériaux mis à jour.');
  if(command==='upgrade')onUpdated?.();
 }catch(e){if(live.current)setNotice(e.message);}finally{if(live.current)setBusy(false);}};
 return <section className="city3b-panel city-municipal"><h3>Le maire · ateliers & échanges</h3><p>Produis des matériaux, échange avec une ville voisine et réalise des améliorations permanentes.</p>{notice&&<p role="status" className="city3b-error">{notice}</p>}{!data?<p>Chargement des matériaux…</p>:<>
  <div className="city-municipal-stock">{Object.entries(labels).map(([id,label])=><span key={id}><strong>{data.stock?.[id]||0}</strong> {label}<small>+{data.yield?.[id]||0} / jour</small></span>)}</div>
  <div className="city3b-actions"><Button variant="champagne" disabled={busy||data.claimedToday||!Object.keys(data.yield||{}).length} onClick={()=>act('claim')}>{data.claimedToday?'Production récupérée aujourd’hui':'Récupérer la production'}</Button><Button variant="ghost" onClick={()=>onAction({tab:'build',building:'TIMBER_WORKS_3B'})}>Construire un atelier</Button></div>
  <p>Atelier terminé et proche d’une route : 8 unités par jour, jusqu’à 24 par matériau. Le stock est sauvegardé.</p>
  <h4>Projets municipaux · niveau 5</h4><div className="city3b-cards">{projects.map(([id,title,cost,effect])=><article className="city3b-card" key={id}><strong>{title}</strong><span>{effect}</span><small>{cost} · +300 XP ville</small><Button variant="ghost" disabled={busy||data.upgrades?.[id]} onClick={()=>act('upgrade',{deal:id})}>{data.upgrades?.[id]?'Réalisé':'Réaliser'}</Button></article>)}</div>
  <h4>Échanges entre vrais joueurs</h4>{!data.available?<><p>Termine une Maison des échanges pour proposer ou accepter un contrat.</p><Button variant="matrix" onClick={()=>onAction({tab:'build',building:'TRADE_CENTER_3B'})}>Construire la Maison des échanges</Button></>:<>
   <div className="city3b-form"><label>Ville voisine<select aria-label="Ville destinataire" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choisir une ville publique</option>{cities.map(c=><option key={c.city_id} value={c.city_id}>{c.name} · niveau {c.level}</option>)}</select></label><label>Contrat équitable<select aria-label="Contrat de matériaux" value={deal} onChange={e=>setDeal(e.target.value)}>{deals.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><Button variant="champagne" disabled={busy||!target} onClick={()=>act('offer',{city:target,deal})}>Proposer ce contrat</Button></div>
   <p>La ville voisine doit aussi avoir une Maison des échanges. Valeurs fixes : bois 2, métal 3, circuit 4 ; chaque contrat vaut 12 de chaque côté. Acceptation volontaire, expiration après 48 h et restitution à la prochaine ouverture.</p>
  </>}
  <div className="city3b-cards">{(data.offers||[]).map(o=><article className="city3b-card" key={o.id}><strong>{o.outgoing?'Vers':'Depuis'} {o.otherCity}</strong><span>{o.giveQuantity} {labels[o.give]} ↔ {o.getQuantity} {labels[o.get]}</span><small>{o.state==='accepted'?'Échange effectué':o.state==='cancelled'?'Contrat annulé':'En attente'}</small>{o.state==='pending'&&<Button variant="ghost" disabled={busy||(!o.outgoing&&!data.available)} onClick={()=>act(o.outgoing?'cancel':'accept',{offer:o.id})}>{o.outgoing?'Annuler et récupérer':'Accepter'}</Button>}</article>)}</div>
 </>}</section>;
}
