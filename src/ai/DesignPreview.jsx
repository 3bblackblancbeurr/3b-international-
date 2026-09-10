import {useId} from 'react';
import {DEFAULT_DESIGN} from '../../shared/studio.js';
import {shapeFor} from './garment-shapes.js';
export default function DesignPreview({design=DEFAULT_DESIGN}){
 const d={...DEFAULT_DESIGN,...design},id=useId().replaceAll(':','');
 const {kind,path}=shapeFor(d.garment),bag=kind==='bag',pants=kind==='pants',cap=kind==='cap',belt=kind==='belt';
 const showMark=d.placement!=='Sans logo'&&(d.placement==='Dos'?d.view==='Dos':d.view==='Face');
 const markX=d.placement==='Manche'?308:d.placement==='Jambe'?163:d.placement==='Poitrine'&&kind==='top'?245:210;
 const markY=d.placement==='Jambe'?315:belt?257:cap?217:bag?266:kind==='skirt'?183:kind==='shoe'?298:210;
 return <svg className="design-preview" viewBox="0 0 420 480" role="img" aria-label={'Aperçu schématique : '+d.garment+', '+d.pattern+', vue '+d.view}>
 <defs><linearGradient id={id+'-base'} x2="1" y2="1"><stop stopColor={d.color}/><stop offset=".5" stopColor={d.color}/><stop offset="1" stopColor={d.pattern==='Dégradé'?d.accent:'#000'}/></linearGradient><linearGradient id={id+'-light'}><stop stopColor="#000" stopOpacity=".5"/><stop offset=".36" stopColor="#fff" stopOpacity=".13"/><stop offset=".6" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".5"/></linearGradient><pattern id={id+'-pattern'} width="28" height="42" patternUnits="userSpaceOnUse">{d.pattern==='Matrix'?<text x="6" y="18" fill={d.accent} fontFamily="monospace" fontSize="8" opacity=".6">01<tspan x="13" dy="12">10</tspan></text>:d.pattern==='Rayures'?<path d="M14 0V42" stroke={d.accent} strokeWidth="6" opacity=".55"/>:d.pattern==='Monogramme'?<text x="4" y="25" fill={d.accent} fontSize="10" opacity=".4">3B</text>:d.pattern==='Damier'?<><rect width="14" height="21" fill={d.accent} opacity=".4"/><rect x="14" y="21" width="14" height="21" fill={d.accent} opacity=".4"/></>:d.pattern==='Floral'?<g fill={d.accent} opacity=".5"><ellipse cx="14" cy="15" rx="4" ry="10"/><ellipse cx="14" cy="15" rx="10" ry="4"/></g>:d.pattern==='Camouflage'?<path d="M0 7Q12 0 17 12T28 25V42L12 32L0 37Z" fill={d.accent} opacity=".3"/>:d.pattern==='Géométrique'?<path d="M0 21L14 0L28 21L14 42Z" stroke={d.accent} fill="none" opacity=".4"/>:null}</pattern><clipPath id={id+'-clip'}><path d={path}/></clipPath></defs>
 <ellipse cx="210" cy="418" rx="140" ry="12" fill="#000" opacity=".4"/>
 {bag&&<path d="M158 155 V122 Q158 62 210 62 Q262 62 262 122 V155" fill="none" stroke={d.accent} strokeWidth="12"/>}
 <path d={path} fill={'url(#'+id+'-base)'} stroke={d.accent} strokeWidth="2"/>
 <g clipPath={'url(#'+id+'-clip)'}><rect width="420" height="430" fill={'url(#'+id+'-pattern)'}/><rect width="420" height="430" fill={'url(#'+id+'-light)'}/>{['top','dress'].includes(kind)&&<><path d="M141 115L148 192M279 115L272 192M146 366H274" fill="none" stroke={d.accent} opacity=".55"/><path d="M177 84Q210 130 243 84" fill="none" stroke={d.accent} strokeWidth="8"/></>}{bag&&<path d="M112 207H309M110 344H310" stroke={d.accent} opacity=".6"/>}</g>
 {kind==='pants'&&<path d="M133 120H287M210 121V223M161 126L148 199M259 126L272 199" stroke={d.accent} opacity=".5" fill="none"/>}
 {kind==='skirt'&&<path d="M157 144H263M175 163L148 379M210 161V388M245 163L272 379" stroke={d.accent} opacity=".4" fill="none"/>}
 {kind==='coat'&&<path d="M181 72L210 165L239 72M210 165V407M152 285H190M230 285H268" stroke={d.accent} opacity=".6" fill="none"/>}
 {showMark&&<text x={markX} y={markY} textAnchor="middle" fontFamily="system-ui" fontSize={['Poitrine','Discret','Manche','Jambe'].includes(d.placement)?20:35} fontWeight="900" letterSpacing="-2" fill={d.accent}>3B</text>}
 {showMark&&d.personalization&&<text x="210" y={markY+24} textAnchor="middle" fontSize="9" fill={d.accent}>{d.personalization.slice(0,24)}</text>}
 <text x="210" y="453" textAnchor="middle" fontFamily="system-ui" fontSize="9" letterSpacing="2" fill="#b6c4c9">{d.garment.toUpperCase()} · {d.view.toUpperCase()} · CONCEPT</text></svg>;
}

