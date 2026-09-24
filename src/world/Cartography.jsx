import React,{memo,useMemo,useState} from 'react';
import {createTerrainField} from './terrain.js';
import {blankSave} from './rules.js';
import {REGIONS,compassHeading} from './settlements.js';
import {COMPASS_DIRECTIONS,compassDirection} from './heading.js';

const MapGround=memo(function MapGround({field}){return <><circle r={field.radius} fill="#253f37" stroke="#b4c5a330"/>{field.fields.map((f,i)=><rect key={'f'+i} x={f.x-f.w/2} y={f.z-f.h/2} width={f.w} height={f.h} fill="#728056" stroke="#a9ab711f" transform={`rotate(${-f.rotation*180/Math.PI} ${f.x} ${f.z})`}/>)}<circle cx={field.lake.x} cy={field.lake.z} r={field.lake.r} fill="#407c89" stroke="#769d9a" strokeWidth="1.5"/>{field.roads.map((r,i)=><polyline key={i} points={r.points.map(p=>p.x+','+p.z).join(' ')} fill="none" stroke={r.kind==='street'?'#ab9e82':'#768567'} strokeWidth={r.width} strokeLinejoin="round" strokeLinecap="round"/>)}{field.squares.map((p,i)=><circle key={'s'+i} cx={p.x} cy={p.z} r={p.r} fill="#ab9e82"/>)}{[...field.buildings,...field.civic,...field.paris].map((b,i)=><rect key={'b'+i} x={b.x-b.width/2} y={b.z-b.depth/2} width={b.width} height={b.depth} rx=".4" transform={`rotate(${-b.rotation*180/Math.PI} ${b.x} ${b.z})`} fill="#ddd0ad" stroke="#554d3f" strokeWidth=".5"/>)}</>;});
const HUB_DISTRICT_TONE={arrival:'#d6b46a',narrative:'#d6b46a',lore:'#75cfff',gameplay:'#f0a26f',economy:'#e3c26f',social:'#87d6b0',technology:'#72dfff',mobility:'#6ac8ef',city:'#b58cff',nature:'#79b987'};

function HubPlanOverlay({compact=false}){
 const train=(hubPlan.transport?.train?.stations||[]).map(id=>hubDistrictPosition(hubPlan,id)).filter(Boolean);
 const loop=train.length?[...train,train[0]]:[];
 const telepherics=hubPlan.transport?.telepherics?.lines||[];
 const ziplines=hubPlan.transport?.ziplines?.lines||[];
 return <g className="hub-plan-overlay" aria-hidden="true">
  {hubPlan.districts.map(district=>{
   const p=hubDistrictPosition(hubPlan,district.id),tone=HUB_DISTRICT_TONE[district.kind]||'#d6b46a',r=district.id==='heritage_square'?62:district.id==='broken_circle_tower'?52:compact?33:44;
   return <g key={district.id}>
    <circle cx={p.x} cy={p.z} r={r} fill={tone+'12'} stroke={tone+'72'} strokeWidth={compact?2.2:3.4}/>
    <circle cx={p.x} cy={p.z} r={Math.max(8,r*.18)} fill="#071018" stroke={tone} strokeWidth={compact?1.4:2.2}/>
    {!compact&&<text x={p.x} y={p.z+r+16} textAnchor="middle" fill="#f2e2bd" fontSize="11" fontWeight="700">{district.name}</text>}
   </g>;
  })}
  {loop.length>1&&<polyline points={loop.map(p=>p.x+','+p.z).join(' ')} fill="none" stroke="#d6b46a" strokeWidth={compact?3.5:5} strokeOpacity=".82" strokeDasharray={compact?'8 5':'14 8'} />}
  {telepherics.map(line=>{const a=hubDistrictPosition(hubPlan,line.from),b=hubDistrictPosition(hubPlan,line.to);return a&&b?<line key={line.id} x1={a.x} y1={a.z} x2={b.x} y2={b.z} stroke="#6ee5ff" strokeWidth={compact?2:3} strokeDasharray="7 5" strokeOpacity=".78"/>:null;})}
  {!compact&&ziplines.map(line=>{const a=hubDistrictPosition(hubPlan,line.from),b=hubDistrictPosition(hubPlan,line.to);return a&&b?<line key={line.id} x1={a.x} y1={a.z} x2={b.x} y2={b.z} stroke="#78d58c" strokeWidth="2" strokeDasharray="4 6" strokeOpacity=".6"/>:null;})}
  {hubPlan.countries.map(country=>{const p=hubCountryGatePosition(hubPlan,country.region);if(!p)return null;return <g key={country.code}>
   <circle cx={p.x} cy={p.z} r={compact?11:17} fill="#071018" stroke={country.color||'#d6b46a'} strokeWidth={compact?3:4}/>
   {!compact&&<><text x={p.x} y={p.z+4} textAnchor="middle" fill="#fff3cf" fontSize="10" fontWeight="900">{country.code}</text><text x={p.x} y={p.z+31} textAnchor="middle" fill="#e6d5af" fontSize="10">{country.country} · {country.value}</text></>}
  </g>;})}
  {!compact&&<g>
   <text x="0" y="-720" textAnchor="middle" fill="#d6b46a" fontSize="15" fontWeight="900">LA CITÉ DES HUIT HÉRITAGES</text>
   <text x="0" y="-697" textAnchor="middle" fill="#8adfff" fontSize="9">10 QUARTIERS · 8 PORTES DISPERSÉES · HUB SÛR</text>
  </g>}
 </g>;
}

const icon=i=>i.type==='hubBuilding'?'▥':i.type==='hubTransport'?'↔':i.type==='hubMission'?'!':i.type==='hubNpc'?'●':i.type==='hubDistrict'?'◆':i.type==='hubGuardian'?'♜':i.type==='hubEvent'?'✦':i.type==='hubSecret'||i.type==='hubSecretStep'?'?':i.type==='landmark'?'▥':i.type==='vista'?'⌂':i.type==='camp'?'⌂':i.type==='resource'?'✦':i.type==='patrol'?'⚔':i.type==='portal'?'◇':i.type==='sanctuary'?'❧':i.type==='atelier'?'✂':i.type==='guardian'?'♜':i.type==='survey'?'⌾':i.type==='beacon'?'✧':i.type==='story'?'!':'·';
const mapVisible=i=>!['echo','final','hubRoad','hubStructure','hubTraffic'].includes(i.type);
export function Compass({heading=180,waypoint,position}){
 const direction=compassDirection(heading),degrees=Math.round(heading)%360;
 const bearing=waypoint?((Math.atan2(waypoint.x-position.x,position.z-waypoint.z)*180/Math.PI-heading+540)%360)-180:null;
 return <div className="world-compass" aria-label={'Cap de déplacement : '+direction+', '+degrees+' degrés'}>
  <div className="compass-track">{Array.from({length:24},(_,i)=>{
   const angle=i*15,diff=((angle-heading+540)%360)-180;
   return Math.abs(diff)<76?<span key={i} className={i%6===0?'cardinal':i%3===0?'ordinal':''} style={{left:'calc(50% + '+diff*1.5+'px)'}}>{i%3===0?COMPASS_DIRECTIONS[i/3]:'│'}</span>:null;
  })}{bearing!==null&&Math.abs(bearing)<76&&<b style={{left:'calc(50% + '+bearing*1.5+'px)'}}>◆</b>}</div>
  <i/><small><strong>{direction}</strong> · {degrees.toString().padStart(3,'0')}°</small>
 </div>;
}
export function MiniMap({region,items,position,heading=180,camera,waypoint,onOpen}){const [hidden,setHidden]=useState(false),[wide,setWide]=useState(region==='hub'),field=useMemo(()=>createTerrainField(region,blankSave()),[region]);const size=wide?(region==='hub'?134:78):46;return <aside className={'world-minimap'+(hidden?' collapsed':'')} aria-label="Mini-carte du monde"><div className="minimap-heading"><span>N ↑</span><button onClick={()=>setHidden(h=>!h)} aria-label={hidden?'Afficher la mini-carte':'Masquer la mini-carte'}>{hidden?'Carte':'−'}</button></div>{!hidden&&<><button className="minimap-open" onClick={onOpen} aria-label="Ouvrir la grande carte"><svg viewBox={`${-size} ${-size} ${size*2} ${size*2}`} aria-hidden="true"><g transform={`translate(${-position.x} ${-position.z})`}><MapGround field={field}/>{region==='hub'&&<HubPlanOverlay compact/>}{items.filter(mapVisible).map(i=><g key={i.id} transform={`translate(${i.x} ${i.z}) scale(${Math.max(1,size/65)})`}><circle r="3.3" fill="#132526" stroke={i.done?'#90aa94':i.color} strokeWidth=".65"/><text textAnchor="middle" y="1.7" fontSize="5" fill={i.done?'#90aa94':'#fff2ca'}>{icon(i)}</text></g>)}{waypoint&&<><line x1={position.x} y1={position.z} x2={waypoint.x} y2={waypoint.z} stroke="#f5d293" strokeWidth=".65" strokeDasharray="1.7 2"/><circle cx={waypoint.x} cy={waypoint.z} r="4.3" fill="none" stroke="#f5d293"/></>}</g><g transform={`rotate(${compassHeading(camera?.yaw)}) scale(${size/46})`}><path d="M 0 0 L -15 -24 Q 0 -31 15 -24 Z" fill="#e9d8a620"/></g><g className="minimap-player" transform={`rotate(${heading}) scale(${size/46})`}><path d="M 0 -4.2 L 2.9 3 L 0 1.8 L -2.9 3 Z" fill="#fff1c7" stroke="#192e2b" strokeWidth=".7"/></g></svg></button><div className="minimap-footer"><span>{waypoint?Math.round(Math.hypot(waypoint.x-position.x,waypoint.z-position.z))+' m':'Explorer librement'}</span><button onClick={()=>setWide(v=>!v)} aria-label={wide?'Rapprocher la mini-carte':'Élargir la mini-carte'}>{wide?'+':'−'}</button></div></>}</aside>;}
export function DetailedMap({region='hub',items,position,onSelect}){const field=useMemo(()=>createTerrainField(region,blankSave()),[region]);return <div className="play-map cartography-map"><svg viewBox={`${-field.radius-10} ${-field.radius-10} ${(field.radius+10)*2} ${(field.radius+10)*2}`} role="group" aria-label="Rues, bâtiments et lieux du pays"><MapGround field={field}/>{region==='hub'&&<HubPlanOverlay/>}{items.filter(mapVisible).map(item=><g key={item.id} role="button" tabIndex={0} aria-label={'Placer un repère : '+item.name} onClick={()=>onSelect(item)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(item);}}}><circle cx={item.x} cy={item.z} r="6" fill="#102625" stroke={item.done?'#72997d':item.color} strokeWidth="1"/><text x={item.x} y={item.z+2} textAnchor="middle" fill="#f2e5c8" fontSize="6">{icon(item)}</text><title>{item.name}</title></g>)}<circle cx={position.x} cy={position.z} r="3" fill="#fff1c7" stroke="#132e27"/><text x="0" y={-field.radius+8} fill="#eddfb5" fontSize="6" textAnchor="middle">N ↑</text></svg><p>▥ Bâtiment/Monument · ◇ Porte · ↔ Transport · ! Mission · ● Habitant · ✧ Souvenir · ♜ Gardien</p><small>{REGIONS[region]?.city} · Choisis un lieu pour poser un repère.</small></div>;}
