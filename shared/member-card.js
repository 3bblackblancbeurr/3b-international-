import {TIERS} from './loyalty.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const CARD_STORIES={
 discovery:'Le premier horizon',explorer:'Les portes du monde',heir:'Les racines de l’héritage',ambassador:'Le collectif sans frontières',legend:'Le monde couronné',builder:'La cité de demain',visionary:'Au-delà de l’horizon',eternal:'La lumière en héritage'
};
export const cardArtPath=tier=>'/loyalty-art/'+(TIERS.find(t=>t.id===tier?.id)||TIERS[0]).id+'.webp';
export function memberCardSvg(profile,tier=TIERS[0],{transparent=false,artworkDataUrl}={}){
 const t=TIERS.find(x=>x.id===tier.id)||TIERS[0],accent=t.color;
 const name=String(profile?.name||'TON NOM, TON HISTOIRE').slice(0,48),id=String(profile?.user_id||'3B INTERNATIONAL').slice(0,8).toUpperCase();
 const artwork=typeof artworkDataUrl==='string'&&/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/=]+$/.test(artworkDataUrl)?artworkDataUrl:null;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="756" viewBox="0 0 1200 756"><defs>
 <linearGradient id="foil" x2=".8" y2="1"><stop stop-color="${accent}"/><stop offset=".27" stop-color="#fff9e5"/><stop offset=".5" stop-color="${accent}"/><stop offset=".62" stop-color="#b89b63"/><stop offset=".82" stop-color="#fff4ce"/><stop offset="1" stop-color="${accent}"/></linearGradient>
 <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#03080b" stop-opacity="0"/><stop offset=".35" stop-color="#03080b" stop-opacity=".35"/><stop offset="1" stop-color="#03080b" stop-opacity=".95"/></linearGradient>
 <linearGradient id="top" x2="0" y2="1"><stop stop-color="#03080b" stop-opacity=".8"/><stop offset="1" stop-color="#03080b" stop-opacity="0"/></linearGradient>
 <clipPath id="edge"><rect width="1200" height="756" rx="40"/></clipPath><filter id="emboss"><feDropShadow dx="0" dy="2" stdDeviation="1" flood-color="#000" flood-opacity=".9"/></filter></defs>
 <g clip-path="url(#edge)">${transparent?'':'<rect width="1200" height="756" fill="#0c1820"/>'}${artwork?'<image href="'+artwork+'" width="1200" height="756" preserveAspectRatio="xMidYMid slice"/>':''}
 <rect width="1200" height="195" fill="url(#top)"/><rect y="370" width="1200" height="386" fill="url(#bottom)"/>
 <rect x="18" y="18" width="1164" height="720" rx="29" fill="none" stroke="url(#foil)" stroke-opacity=".75" stroke-width="1.3"/>
 <g fill="url(#foil)" font-family="Arial,sans-serif" filter="url(#emboss)"><text x="54" y="109" font-size="78" font-weight="900" letter-spacing="-7">3B</text><text x="191" y="85" font-size="20" font-weight="700" letter-spacing="4">INTERNATIONAL</text><text x="193" y="113" font-size="10" letter-spacing="4">BLACK · BLANC · BEUR</text></g>
 <rect x="994" y="47" width="154" height="51" rx="24" fill="#071015" fill-opacity=".75" stroke="${accent}" stroke-opacity=".5"/><text x="1071" y="79" text-anchor="middle" fill="#f7dfad" font-family="Arial,sans-serif" font-size="16" letter-spacing="3">${String(TIERS.indexOf(t)+1).padStart(2,'0')} / ${String(TIERS.length).padStart(2,'0')}</text>
 <g font-family="Arial,sans-serif" fill="${accent}" filter="url(#emboss)"><text x="56" y="487" font-size="12" letter-spacing="4">LE CERCLE · COLLECTION HÉRITAGE</text><text x="51" y="559" font-family="Georgia,serif" font-size="71" fill="url(#foil)">${escape(t.name)}</text><text x="56" y="595" font-size="20" fill="#f4ead9">${escape(CARD_STORIES[t.id])}</text>
 <path d="M56 623H1145" stroke="${accent}" stroke-opacity=".3"/>
 <text x="56" y="655" font-size="10" letter-spacing="2.5" opacity=".8">TITULAIRE · MEMBRE ${escape(id)}</text><text x="56" y="691" font-size="${Math.max(17,Math.min(24,850/name.length))}" letter-spacing="1.5" fill="#fff6e7">${escape(name)}</text><text x="925" y="654" font-size="11" letter-spacing="2">COLLECTION XP 3B</text><text x="925" y="688" font-size="9" letter-spacing=".5">PAS UN MOYEN DE PAIEMENT</text></g></g></svg>`;
}
