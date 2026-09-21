import {useId} from 'react';
import {DEFAULT_DESIGN} from '../../shared/studio.js';

const esc=value=>String(value||'').slice(0,26).toUpperCase();
function patternContent(d,id){
 if(d.pattern==='Matrix')return <pattern id={id} width="34" height="50" patternUnits="userSpaceOnUse"><text x="5" y="15" fill={d.accent} fontFamily="monospace" fontSize="7" opacity=".42">01<tspan x="16" dy="14">10</tspan><tspan x="4" dy="14">3B</tspan></text></pattern>;
 if(d.pattern==='Rayures')return <pattern id={id} width="42" height="10" patternUnits="userSpaceOnUse"><rect width="20" height="10" fill={d.secondary}/></pattern>;
 if(d.pattern==='Monogramme')return <pattern id={id} width="48" height="42" patternUnits="userSpaceOnUse"><text x="4" y="25" fill={d.accent} fontSize="10" fontWeight="800" opacity=".24">3B</text></pattern>;
 if(d.pattern==='Topographie')return <pattern id={id} width="58" height="48" patternUnits="userSpaceOnUse"><path d="M-4 22Q14 4 30 19T62 21M-8 35Q12 18 28 34T66 31" fill="none" stroke={d.accent} strokeWidth="1.2" opacity=".28"/></pattern>;
 if(d.pattern==='Carte urbaine')return <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse"><path d="M3 0V64M22 0V64M43 0V64M0 11H64M0 34H64M0 52H64M3 11L43 52M22 34L64 11" stroke={d.accent} strokeWidth=".8" opacity=".18"/></pattern>;
 if(d.pattern==='Géométrique')return <pattern id={id} width="50" height="50" patternUnits="userSpaceOnUse"><path d="M25 1L49 25L25 49L1 25Z" fill="none" stroke={d.accent} opacity=".34"/></pattern>;
 if(d.pattern==='Damier')return <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill={d.secondary}/><rect x="20" y="20" width="20" height="20" fill={d.secondary}/></pattern>;
 return null;
}
function NumberMark({d}){
 if(!d.playerNumber||d.numberStyle==='Sans numéro')return null;
 const outline=d.numberStyle==='Outline double';
 return <text x="210" y="292" textAnchor="middle" fontFamily={d.numberStyle==='Digital Matrix'?'monospace':'Arial Black, system-ui'} fontSize="102" fontWeight="900" letterSpacing="-6" fill={outline?'transparent':d.accent} stroke={outline?d.accent:'none'} strokeWidth={outline?'3':'0'} paintOrder="stroke">{esc(d.playerNumber).slice(0,3)}</text>;
}
export default function DesignPreview({design=DEFAULT_DESIGN}){
 const d={...DEFAULT_DESIGN,...design},id=useId().replaceAll(':',''),front=d.view==='Face',sleeveless=d.sleeve==='Sans manches'||d.jerseySport==='Basketball';
 const body=sleeveless?'M151 76L183 64Q210 84 237 64L269 76L288 123L266 154L279 399H141L154 154L132 123Z':'M137 82L178 64Q210 86 242 64L283 82L349 147L302 211L274 190L283 399H137L146 190L118 211L71 147Z';
 const patternId=id+'pattern',clipId=id+'clip',shadeId=id+'shade',baseId=id+'base';
 const show3B=d.logoPlacement!=='Sans logo 3B'&&front;
 const logoX=d.logoPlacement==='3B officiel · centre poitrine'?210:251;
 const logoY=147;
 return <svg className="design-preview jersey-preview" viewBox="0 0 420 480" role="img" aria-label={'Aperçu maillot '+d.jerseySport+', '+d.pattern+', vue '+d.view}>
  <defs>
   <linearGradient id={baseId} x1="0" y1="0" x2="1" y2="1"><stop stopColor={d.color}/><stop offset=".62" stopColor={d.color}/><stop offset="1" stopColor={d.secondary}/></linearGradient>
   <linearGradient id={shadeId}><stop stopColor="#000" stopOpacity=".34"/><stop offset=".28" stopColor="#fff" stopOpacity=".08"/><stop offset=".58" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".46"/></linearGradient>
   {patternContent(d,patternId)}
   <clipPath id={clipId}><path d={body}/></clipPath>
  </defs>
  <ellipse cx="210" cy="428" rx="126" ry="13" fill="#000" opacity=".42"/>
  <path d={body} fill={'url(#'+baseId+')'} stroke="#ffffff" strokeOpacity=".12" strokeWidth="1.2"/>
  <g clipPath={'url(#'+clipId+')'}>
   {['Matrix','Rayures','Monogramme','Topographie','Carte urbaine','Géométrique','Damier'].includes(d.pattern)&&<rect x="0" y="0" width="420" height="420" fill={'url(#'+patternId+')'}/>}
   {d.pattern==='Dégradé'&&<rect width="420" height="420" fill={'linear-gradient('+d.color+','+d.secondary+')'} opacity="0"/>}
   {d.pattern==='Bandes latérales'&&<><path d="M121 100L157 118L169 399H137L146 190L118 211L71 147Z" fill={d.secondary}/><path d="M299 100L263 118L251 399H283L274 190L302 211L349 147Z" fill={d.secondary}/></>}
   {d.pattern==='Bande centrale'&&<rect x="176" y="62" width="68" height="338" fill={d.secondary} opacity=".88"/>}
   {d.pattern==='Chevron poitrine'&&<path d="M105 152L210 226L315 152L315 188L210 258L105 188Z" fill={d.secondary} opacity=".9"/>}
   {d.pattern==='Diagonal dynamique'&&<><path d="M65 285L318 88L350 132L95 332Z" fill={d.secondary} opacity=".92"/><path d="M84 316L337 119L347 134L96 334Z" fill={d.accent} opacity=".65"/></>}
   <rect width="420" height="420" fill={'url(#'+shadeId+')'}/>
   <g fill="none" stroke={d.accent} strokeOpacity=".36" strokeWidth="1.3">
    {d.construction==='Raglan performance'&&<><path d="M178 65L144 131"/><path d="M242 65L276 131"/></>}
    {d.construction==='Panneaux ergonomiques'&&<><path d="M147 190Q173 231 160 398"/><path d="M273 190Q247 231 260 398"/></>}
    {d.construction==='Manches montées'&&!sleeveless&&<><path d="M137 82Q153 104 148 143"/><path d="M283 82Q267 104 272 143"/></>}
    <path d="M139 395Q210 405 281 395"/>
   </g>
   <g stroke="#fff" strokeOpacity=".045">
    {Array.from({length:18}).map((_,i)=><path key={i} d={'M100 '+(95+i*16)+'H320'}/>)}
   </g>
  </g>
  {d.collar==='Col V performance'&&<path d="M178 65Q210 91 242 65L210 118Z" fill={d.secondary} stroke={d.accent} strokeOpacity=".45"/>}
  {d.collar==='Col V croisé'&&<><path d="M178 65Q210 88 242 65L218 112L210 119L202 112Z" fill={d.secondary}/><path d="M184 70L210 116L236 70" fill="none" stroke={d.accent} strokeWidth="6"/></>}
  {d.collar==='Col rond performance'&&<path d="M181 66Q210 97 239 66" fill="none" stroke={d.accent} strokeWidth="8"/>}
  {d.collar==='Col polo moderne'&&<><path d="M180 66L197 99L210 88L223 99L240 66" fill={d.secondary}/><path d="M210 87V126" stroke={d.accent} strokeWidth="2"/></>}
  {d.collar==='Col officier'&&<path d="M181 67Q210 84 239 67L235 87Q210 100 185 87Z" fill={d.secondary} stroke={d.accent} strokeWidth="1"/>}
  {front?<>
   {show3B&&<g transform={'translate('+(logoX-18)+' '+(logoY-20)+')'}><rect width="36" height="30" rx="6" fill="#080a0b" stroke={d.accent} strokeWidth="1.4"/><text x="18" y="20" textAnchor="middle" fontFamily="Arial Black,system-ui" fontSize="13" fontWeight="900" fill={d.accent}>3B</text></g>}
   {d.teamName&&<text x="210" y="194" textAnchor="middle" fontFamily="system-ui" fontSize="11" fontWeight="750" letterSpacing="2" fill={d.accent}>{esc(d.teamName).slice(0,22)}</text>}
   {d.frontSponsor&&<text x="210" y="258" textAnchor="middle" fontFamily="system-ui" fontSize="17" fontWeight="800" letterSpacing="1" fill={d.accent}>{esc(d.frontSponsor).slice(0,20)}</text>}
   {d.hemText&&<text x="210" y="371" textAnchor="middle" fontFamily="monospace" fontSize="7" letterSpacing="1.6" fill={d.accent} opacity=".84">{esc(d.hemText).slice(0,30)}</text>}
  </>:<>
   {d.playerName&&<text x="210" y="166" textAnchor="middle" fontFamily="system-ui" fontSize="17" fontWeight="800" letterSpacing="2.5" fill={d.accent}>{esc(d.playerName).slice(0,18)}</text>}
   <NumberMark d={d}/>
   {d.teamName&&<text x="210" y="333" textAnchor="middle" fontFamily="system-ui" fontSize="9" fontWeight="700" letterSpacing="1.8" fill={d.accent}>{esc(d.teamName).slice(0,22)}</text>}
  </>}
  {d.sleeveText&&!sleeveless&&front&&<text x="311" y="159" textAnchor="middle" transform="rotate(40 311 159)" fontFamily="system-ui" fontSize="7" fontWeight="700" fill={d.accent}>{esc(d.sleeveText).slice(0,12)}</text>}
  <text x="210" y="449" textAnchor="middle" fontFamily="system-ui" fontSize="8" letterSpacing="2" fill="#b8c4c8">{d.jerseySport.toUpperCase()} · {d.view.toUpperCase()} · PROTOTYPE 3B</text>
  <text x="210" y="466" textAnchor="middle" fontFamily="system-ui" fontSize="7" letterSpacing="1.2" fill="#6f858d">{d.cut.toUpperCase()} · {d.material.toUpperCase().slice(0,38)}</text>
 </svg>;
}
