import React from 'react';
import {TIERS} from '../../shared/loyalty.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function downloadCard(profile,tier){
 const name=escape(profile.name.length>48?profile.name.slice(0,47)+'…':profile.name),id=escape(profile.user_id.slice(0,8).toUpperCase());
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="756" viewBox="0 0 1200 756"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#101e2c"/><stop offset=".55" stop-color="#071018"/><stop offset="1" stop-color="${tier.color}"/></linearGradient></defs><rect width="1200" height="756" rx="48" fill="url(#g)"/><rect x="26" y="26" width="1148" height="704" rx="28" fill="none" stroke="${tier.color}" stroke-opacity=".5"/><g fill="none" stroke="${tier.color}" stroke-opacity=".23"><circle cx="1010" cy="315" r="260"/><circle cx="1010" cy="315" r="190"/><path d="M700 60L1200 600M740 600L1150 30"/></g><g fill="${tier.color}" font-family="Arial,sans-serif"><text x="72" y="108" font-size="52" font-weight="bold">3B INTERNATIONAL</text><text x="72" y="160" font-size="22" letter-spacing="8">LE CERCLE • CARTE MEMBRE</text><text x="72" y="380" font-size="86" font-family="Georgia,serif">${escape(tier.name)}</text><text x="76" y="442" font-size="26">${escape(tier.motto)}</text><text x="76" y="620" font-size="${Math.min(32,960/Math.min(profile.name.length,48))}">${name}</text><text x="76" y="665" font-size="20" letter-spacing="4">MEMBRE ${id}</text><text x="750" y="666" font-size="16">PAS UN MOYEN DE PAIEMENT</text></g></svg>`;
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='carte-3b-'+tier.id+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function MemberCard({tier=TIERS[0],profile,small=false}){
 return <div className={'member-card member-card-'+tier.id+(small?' member-card-small':'')} style={{'--card-accent':tier.color}}>
  <div className="member-card-orbit" aria-hidden="true"><i/><i/><i/><b>3B</b>{Array.from({length:8},(_,i)=><span key={i} style={{'--angle':i*45+'deg'}}/>)}</div>
  <div className="member-card-top"><strong>3B <small>INTERNATIONAL</small></strong><span>LE CERCLE</span></div>
  <div className="member-card-chip" aria-hidden="true"><i/><i/><i/></div>
  <div className="member-card-title"><span>CARTE {String(TIERS.indexOf(tier)+1).padStart(2,'0')} / 05</span><h3>{tier.name}</h3><p>{tier.motto}</p></div>
  <div className="member-card-bottom"><div><span>TITULAIRE</span><strong>{profile?.name||'Ton nom, ton histoire'}</strong></div><div><span>MEMBRE</span><strong>{profile?.user_id?.slice(0,8).toUpperCase()||'3B · INTERNATIONAL'}</strong></div></div>
 </div>;
}
