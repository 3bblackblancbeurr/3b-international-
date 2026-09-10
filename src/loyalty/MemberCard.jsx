import {TIERS} from '../../shared/loyalty.js';
import {memberCardSvg,cardArtPath,CARD_STORIES} from '../../shared/member-card.js';
export async function downloadCard(profile,tier){
 const response=await fetch(cardArtPath(tier));
 if(!response.ok)throw Error('Le dessin de la carte est indisponible. Réessaie dans un instant.');
 const blob=await response.blob();
 const artworkDataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
 const url=URL.createObjectURL(new Blob([memberCardSvg(profile,tier,{artworkDataUrl})],{type:'image/svg+xml'}));
 const a=document.createElement('a');a.href=url;a.download='carte-3b-'+tier.id+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function MemberCard({tier=TIERS[0],profile,small=false}){
 const selected=TIERS.find(t=>t.id===tier.id)||TIERS[0];
 return <div className={'member-card physical-member-card member-card-'+selected.id+(small?' member-card-small':'')} style={{'--card-accent':selected.color}} role="img" aria-label={'Carte de fidélité 3B '+selected.name+' — '+CARD_STORIES[selected.id]+(profile?.name?', '+profile.name:'')}>
  <img className="member-card-illustration" src={cardArtPath(selected)} alt="" loading={small?'lazy':'eager'} decoding="async"/>
  <img className="member-card-lettering" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(memberCardSvg(profile,selected,{transparent:true}))} alt=""/>
 </div>;
}
