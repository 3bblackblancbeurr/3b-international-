import {SHOP_TIERS,shopTierFor} from '../../shared/loyalty.js';
import {boutiqueArtPath,boutiqueCardSvg,boutiquePrintHtml} from '../../shared/boutique-card.js';
export async function downloadBoutiqueCard(profile,printable=false){
 if(!profile?.user_id)throw Error('Connecte-toi pour retrouver ta carte.');
 const tier=shopTierFor(profile.points),response=await fetch(boutiqueArtPath(tier));
 if(!response.ok)throw Error('Le dessin est indisponible. Réessaie dans un instant.');
 const blob=await response.blob();
 const artworkDataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
 const svg=boutiqueCardSvg(profile,tier,{artworkDataUrl});
 const content=printable?boutiquePrintHtml(svg,profile):svg;
 const url=URL.createObjectURL(new Blob([content],{type:printable?'text/html;charset=utf-8':'image/svg+xml'}));
 const a=document.createElement('a');a.href=url;a.download='3b-fidelite-boutique-'+tier.id+(printable?'-imprimer.html':'.svg');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function BoutiqueCard({profile,tier=shopTierFor(profile?.points),small=false}){
 const selected=SHOP_TIERS.find(t=>t.id===tier?.id)||SHOP_TIERS[0];
 return <div className={'boutique-member-card'+(small?' boutique-member-card-small':'')} role="img" aria-label={'Carte de fidélité boutique 3B '+selected.name+(selected.percent?' — réduction de '+selected.percent+' %':' — offerte à l’inscription')}>
  <img className="boutique-card-art" src={boutiqueArtPath(selected)} alt="" loading={small?'lazy':'eager'} decoding="async"/>
  <img className="boutique-card-type" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(boutiqueCardSvg(profile,selected,{transparent:true}))} alt=""/>
 </div>;
}
