import {SHOP_TIERS,shopTierFor} from './loyalty.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const boutiqueArtPath=tier=>'/loyalty-art/boutique-'+(SHOP_TIERS.find(t=>t.id===tier?.id)||SHOP_TIERS[0]).id+'.webp';
export function boutiqueCardSvg(profile,tier=shopTierFor(profile?.points),{artworkDataUrl,transparent=false}={}){
 const t=SHOP_TIERS.find(x=>x.id===tier?.id)||SHOP_TIERS[0];
 const name=String(profile?.name||'TON NOM, TON STYLE').slice(0,48);
 const uid=String(profile?.user_id||'').replace(/-/g,'').toUpperCase();
 const cardId=/^[A-F0-9]{32}$/.test(uid)?'3B-FID-'+uid:'APERÇU · MODÈLE DE CARTE NON NOMINATIVE';
 const artwork=typeof artworkDataUrl==='string'&&/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/=]+$/.test(artworkDataUrl)?artworkDataUrl:null;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="756" viewBox="0 0 1200 756"><defs>
 <linearGradient id="shade"><stop stop-color="#070d14" stop-opacity=".95"/><stop offset=".47" stop-color="#070d14" stop-opacity=".56"/><stop offset="1" stop-color="#070d14" stop-opacity="0"/></linearGradient>
 <linearGradient id="base" x2="0" y2="1"><stop stop-color="#060b10" stop-opacity="0"/><stop offset="1" stop-color="#060b10" stop-opacity=".96"/></linearGradient>
 <linearGradient id="foil" x2="1" y2="1"><stop stop-color="${t.color}"/><stop offset=".5" stop-color="#fff8e8"/><stop offset="1" stop-color="${t.color}"/></linearGradient>
 <clipPath id="edge"><rect width="1200" height="756" rx="35"/></clipPath></defs>
 <g clip-path="url(#edge)">${transparent?'':'<rect width="1200" height="756" fill="#101921"/>'}${artwork?'<image href="'+artwork+'" width="1200" height="756" preserveAspectRatio="xMidYMid slice"/>':''}
 <rect width="1200" height="756" fill="url(#shade)"/><rect y="485" width="1200" height="271" fill="url(#base)"/>
 <rect x="17" y="17" width="1166" height="722" rx="25" fill="none" stroke="${t.color}" stroke-opacity=".65"/>
 <g font-family="Arial,sans-serif" fill="#f4ede0"><text x="52" y="108" font-size="76" font-weight="900" letter-spacing="-6" fill="url(#foil)">3B</text><text x="182" y="78" font-size="17" font-weight="700" letter-spacing="3">INTERNATIONAL</text><text x="183" y="106" font-size="12" letter-spacing="3">FIDÉLITÉ BOUTIQUE</text>
 <text x="53" y="207" font-size="13" letter-spacing="4" fill="${t.color}">LE CERCLE 3B</text><text x="49" y="292" font-family="Georgia,serif" font-size="83" fill="url(#foil)">${escape(t.name)}</text>
 <text x="52" y="362" font-size="${t.percent?56:30}" font-weight="600">${t.percent?'−'+t.percent+' %':'TON STYLE, TES AVANTAGES'}</text>
 <text x="54" y="397" font-size="15" fill="#d6d9d6">${t.percent?'SUR LES ARTICLES ÉLIGIBLES':'TA CARTE GRATUITE DÈS L’INSCRIPTION'}</text>
 <text x="54" y="528" font-size="15" letter-spacing="2.5">VÊTEMENTS · MAROQUINERIE · ACCESSOIRES</text>
 <path d="M54 558H1146" stroke="${t.color}" stroke-opacity=".45"/><text x="54" y="596" font-size="12" letter-spacing="2" fill="${t.color}">TITULAIRE</text>
 <text x="54" y="631" font-size="${Math.max(18,Math.min(25,800/name.length))}" font-weight="600" letter-spacing="1">${escape(name)}</text>
 <text x="54" y="677" font-size="14" letter-spacing="1" fill="#c5cbd0">${cardId}</text>
 <text x="54" y="711" font-size="11" fill="#9fa9b0">STATUT VÉRIFIÉ AU PAIEMENT · CARTE DE FIDÉLITÉ, SANS SOLDE MONÉTAIRE</text></g></g></svg>`;
}
export function boutiquePrintHtml(svg,profile){
 const tier=shopTierFor(profile?.points);
 return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ma carte de fidélité boutique 3B</title><style>
 body{font:14px Arial,sans-serif;color:#17202a;margin:28px;background:#f4f2ed}main{display:flex;flex-wrap:wrap;gap:12mm;margin-top:24px}.face{box-sizing:border-box;width:85.6mm;height:53.98mm;border-radius:3mm;overflow:hidden;flex:none}svg{width:100%;height:100%;display:block}.back{background:#101921;color:#f4ecda;padding:4mm;font-size:8pt;border:1px solid #a38f62}.back h2{font-size:14pt;margin:0 0 2mm}.back p{margin:1.5mm 0;line-height:1.3}.small{font-size:6.5pt;color:#bcc7ce}.tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;margin:2mm 0}.tiers span{display:block;font-size:6.5pt;color:#bcc7ce;margin-top:1mm}@media print{@page{size:A4;margin:15mm}body{margin:0;background:white}header{display:none}main{margin:0;gap:10mm}.face{break-inside:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style>
 <header><h1>Ta carte boutique, à conserver.</h1><p>Imprime à 100 % avec les arrière-plans activés. Deux faces de 85,6 × 53,98 mm à découper puis assembler. Cette version ne fournit pas un paiement ni un contrôle en caisse physique.</p></header><main><div class="face">${svg}</div><div class="face back"><h2>3B · LE CERCLE</h2><p>Carte ${escape(tier.name)} · Fidélité boutique</p><p><strong>1 € d’articles payé = 10 points</strong></p><div class="tiers"><div><b>Argent −5 %</b><span>1 000 points</span></div><div><b>Or −8 %</b><span>3 000 points</span></div><div><b>Noire −10 %</b><span>7 000 points</span></div></div><p class="small">Connecte-toi au paiement. Taux vérifié selon tes points, ajustés en cas de remboursement. Hors livraison, sans cumul. Carte personnelle sans valeur monétaire. Avantages à l’ouverture des ventes.</p><p class="small">3b-international.vercel.app/#cartes</p></div></main></html>`;
}
