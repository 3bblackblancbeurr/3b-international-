import { NEXUS_ART, GATE_PATHS } from '../passport/nexus-art-data.js';

// Original vector scenery: independent silhouettes, relief, material and sky per gate.
// No external images, font downloads, video, WebGL context or runtime network requests.
function Landscape({ code }) {
  const windows = (count, x, y, dx, w = 5, h = 10) => Array.from({ length: count }, (_, n) => <rect key={`${x}-${y}-${n}`} x={x+n*dx} y={y} width={w} height={h} rx={w/2} fill="currentColor" opacity=".6" />);
  if (code === 'FR') return <g><path d="M56 299V256H88V244H115V255H134V300M186 300V247H214V262H252V300" fill="#122b41"/><path d="M114 299Q144 225 151 136H169Q177 230 207 299L187 300Q178 263 160 263Q142 263 134 300Z" fill="#274357" stroke="currentColor" strokeWidth="1.2"/><path d="M160 101V139M150 148H170M146 178H175M137 216H183M126 254H194M123 261H197M139 213L177 180M144 180L185 216M132 251L184 220M138 220L194 252M150 163L174 191M149 189L168 164" fill="none" stroke="currentColor" strokeWidth="1.1"/><path d="M125 258H195M110 299H210" stroke="currentColor" strokeWidth="3"/>{windows(4,58,265,7)}{windows(4,218,272,7)}</g>;
  if (code === 'DZ') return <g fill="#27423f" stroke="currentColor" strokeWidth=".7"><path d="M51 308V259H75V233H105V211H142V189H178V223H214V247H243V280H270V312Z"/><path d="M125 212V196Q130 181 142 181Q154 181 160 196V212M87 233V221Q96 201 107 221V233M185 247V229Q199 214 211 229V247"/><path d="M158 190V148H177V190M156 147H179V137H156ZM162 137V126H173V137"/>{windows(5,57,274,8)}{windows(4,111,229,8)}{windows(3,184,261,10)}<path d="M70 307V259Q50 244 47 246M70 265Q84 240 96 245M70 264Q75 236 63 233M222 307V274Q210 251 195 259M222 275Q241 252 251 261" fill="none" strokeWidth="3"/></g>;
  if (code === 'ES') return <g fill="#463832" stroke="currentColor" strokeWidth=".8"><path d="M58 307V269H103V221H120V175L126 153L133 175V211H148V166L156 135L164 166V212H180V176L187 153L194 176V226H213V267H259V307Z"/><path d="M107 305V247Q157 193 209 247V305M121 247V302M190 247V302M125 182V207M155 171V204M187 183V209" fill="none"/><path d="M143 307V271Q157 243 172 271V307" fill="#09121a"/>{windows(4,65,278,9)}{windows(3,220,278,10)}<circle cx="157" cy="240" r="10" fill="none"/><path d="M157 229V251M146 240H168M149 232L165 248M149 248L165 232"/></g>;
  if (code === 'MA') return <g fill="#443d30" stroke="currentColor" strokeWidth=".8"><path d="M49 310V271H84V246H113V272H147V259H183V239H218V269H272V310Z"/><path d="M130 259V169H171V259M126 168H175V155H126ZM139 155V135H162V155M144 135V123H158V135M150 121V109"/><path d="M137 190Q151 176 164 190V210H137ZM137 222Q151 208 164 222V242H137Z" fill="#172b2c"/><path d="M53 277H91M52 287H91M186 248H214M186 257H214"/>{windows(4,221,280,10)}<path d="M94 310V282Q104 266 115 282V310" fill="#152528"/></g>;
  if (code === 'IT') return <g fill="#404339" stroke="currentColor" strokeWidth=".8"><path d="M61 305V218Q160 186 259 218V305ZM63 248Q160 217 257 248M63 274Q160 243 257 274M70 218V299M250 218V299"/><path d="M57 215Q160 179 263 215M57 222Q160 187 263 222M57 307H263" fill="none" strokeWidth="3"/>{Array.from({length:9},(_,n)=><g key={n}>{[0,1,2].map(row=><path key={row} d={`M${75+n*19} ${230+row*26-Math.sin(n*Math.PI/8)*13}q6-15 12 0v13h-12Z`} fill="#101f23" />)}</g>)}</g>;
  if (code === 'TN') return <g stroke="currentColor" strokeWidth=".7"><path d="M45 280Q150 249 282 261V312H45Z" fill="#164458"/><path d="M59 310V245H110V222H157V191H190V234H224V266H266V310Z" fill="#587175"/><path d="M150 194Q172 152 197 194ZM106 225Q130 190 157 225Z" fill="#215779"/><path d="M78 310V272Q89 251 101 272V310M165 235V208Q174 192 183 208V235M113 265V245H127V265M139 265V245H153V265" fill="#103b55"/><path d="M98 310H211V301H195V291H179V282H165V273H153" fill="none" strokeWidth="3"/><path d="M57 251H108M152 196H194M53 285H72"/></g>;
  if (code === 'TR') return <g fill="#353344" stroke="currentColor" strokeWidth=".8"><path d="M85 308V259H107V235H212V260H238V308Z"/><path d="M110 235Q159 146 209 235ZM93 258Q112 219 134 258ZM187 258Q209 219 230 258Z"/><path d="M156 199V182M159 181V172M77 308V205H86V308M234 308V205H243V308M73 205L81 180L90 205ZM230 205L238 180L247 205Z"/><path d="M74 230H90M231 230H247M117 237H204" strokeWidth="2"/>{windows(7,117,250,13)}{windows(9,105,284,12)}<path d="M151 308V284Q160 267 169 284V308" fill="#111322"/></g>;
  return <g fill="#243d47" stroke="currentColor" strokeWidth=".8"><path d="M49 310V277H80V251H109V273H138V226H171V271H199V246H232V278H271V310Z"/><path d="M72 251L95 213L118 251ZM130 226L154 175L179 226ZM190 246L215 207L241 246ZM49 277L65 258L81 277ZM235 278L253 255L272 278Z" fill="#385565"/><path d="M87 257V276H95V257M148 237V254H158V237M209 253V270H219V253M148 272V288H158V272" fill="currentColor" opacity=".55"/><path d="M59 310V290M70 310V290M116 310V289M127 310V289M178 310V289M189 310V289"/></g>;
}

export function PortalArtwork({ code = 'FR', id = 'nx-gate', compact = false, locked = false }) {
  const art = NEXUS_ART[code] || {color:'#d6bc87'};
  const gate = GATE_PATHS[code] || GATE_PATHS.FR;
  const url = name => `url(#${id}-${name})`;
  return <svg className="nx-gate-art" viewBox="0 0 320 400" aria-hidden="true" focusable="false" style={{color:art.color}}>
    <defs>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2=".6"><stop stopColor="#716046"/><stop offset=".22" stopColor="#d7c19a"/><stop offset=".38" stopColor="#403c36"/><stop offset=".56" stopColor="#b6a789"/><stop offset=".8" stopColor="#4e4940"/><stop offset="1" stopColor="#ab9978"/></linearGradient>
      <linearGradient id={`${id}-stone`} x1="0" x2="1"><stop stopColor="#111921"/><stop offset=".32" stopColor="#35444d"/><stop offset=".55" stopColor="#111923"/><stop offset="1" stopColor="#30373b"/></linearGradient>
      <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#38434a"/><stop offset="1" stopColor="#060b11"/></linearGradient>
      <radialGradient id={`${id}-sky`} cx=".5" cy=".35" r=".85"><stop stopColor={locked?'#261f28':art.color} stopOpacity=".36"/><stop offset=".44" stopColor="#101e2b"/><stop offset="1" stopColor="#040810"/></radialGradient>
      <radialGradient id={`${id}-bloom`}><stop stopColor={art.color} stopOpacity=".21"/><stop offset="1" stopColor={art.color} stopOpacity="0"/></radialGradient>
      <linearGradient id={`${id}-veil`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#102230" stopOpacity="0"/><stop offset=".7" stopColor="#16333f" stopOpacity=".18"/><stop offset="1" stopColor="#07131b" stopOpacity=".93"/></linearGradient>
      <clipPath id={`${id}-clip`}><path d={gate}/></clipPath>
    </defs>
    <ellipse cx="160" cy="226" rx="153" ry="169" fill={url('bloom')}/>
    <ellipse cx="160" cy="344" rx="134" ry="21" fill="#000" opacity=".65"/>
    <path d="M36 344L68 316H251L284 344V355H36Z" fill={url('floor')} stroke="#61717a" strokeOpacity=".22"/>
    <path d="M47 340H273M36 351H284M57 331H263" stroke={art.color} strokeOpacity=".19"/>
    <path d={gate} transform="translate(9 8)" fill="#05090d" stroke="#141b21" strokeWidth="26"/>
    <path d={gate} fill={url('sky')} stroke={url('stone')} strokeWidth="32"/>
    <g clipPath={url('clip')}>
      <circle cx="180" cy="145" r="38" fill={url('bloom')}/>
      <circle cx="180" cy="145" r="24" fill="none" stroke="currentColor" strokeOpacity=".19" strokeWidth=".7"/>
      <path d="M47 221L88 184L119 203L167 171L207 207L244 181L287 224V320H47Z" fill="currentColor" opacity=".045"/>
      {code==='EE'&&<path d="M25 169Q83 81 163 139T296 110M23 185Q111 79 174 154T299 133" stroke="currentColor" opacity=".12" strokeWidth="14" fill="none"/>}
      {Array.from({length:compact?15:36},(_,n)=><circle key={n} cx={60+(n*53)%200} cy={68+(n*31)%164} r={n%5===0?1.05:.55} fill="#eaf4fc" opacity={.2+(n%4)*.13}/>)}
      {code==='ORIGINE'?<g fill="none" stroke="currentColor"><circle cx="160" cy="188" r="58" opacity=".5"/><circle cx="160" cy="188" r="48" strokeDasharray="28 10" opacity=".35"/><path d="M143 191V176A17 17 0 0 1 177 176V191M137 191H183V227H137Z" strokeWidth="2"/><circle cx="160" cy="206" r="3" fill="currentColor"/><path d="M160 209V216"/></g>:<Landscape code={code}/>}
      <path d={gate} fill={url('veil')}/>
      {!compact&&Array.from({length:9},(_,n)=><path key={n} d={`M${88+n*18} 104V${124+(n*23)%103}`} stroke="currentColor" opacity=".11" strokeWidth=".6"/>)}
    </g>
    <path d={gate} fill="none" stroke={url('metal')} strokeWidth="7"/>
    <path d={gate} fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="1"/>
    {[0,1].map(side=><g key={side} transform={side?'translate(320 0) scale(-1 1)':undefined}>
      <path d="M54 315V182L63 169V315Z" fill={url('metal')}/><path d="M51 316H76V324H48Z" fill={url('stone')} stroke="#b6a17b" strokeOpacity=".4"/>
      <path d="M58 207V293M67 193V305" stroke="currentColor" strokeOpacity=".34"/>
      {[222,247,272].map(y=><path key={y} d={`M53 ${y}l6-6 6 6-6 6Z`} fill="none" stroke="#bca77e" strokeWidth=".7"/>)}
    </g>)}
    <path d="M150 38L160 25L170 38L160 51Z" fill={url('metal')} stroke="#dac9a8" strokeOpacity=".6"/>
    <path d="M160 32V44M155 38H165" stroke="#202126"/>
    <path d="M79 323H241" stroke="currentColor" strokeOpacity=".75"/>
    {!compact&&<g opacity=".55" fill="none" stroke="#b7a683" strokeWidth=".55"><path d="M20 69V48H42M278 48H300V69M20 300V321H38M282 321H300V300"/><path d="M27 183H40M280 183H293M33 178V188M287 178V188"/></g>}
  </svg>;
}

export function CircleArtwork({ doors = [], id = 'nx-circle', large = false }) {
  return <svg className={large?'nx-circle-art is-large':'nx-circle-art'} viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <defs><radialGradient id={`${id}-aura`}><stop stopColor="#396987" stopOpacity=".27"/><stop offset="1" stopColor="#07121a" stopOpacity="0"/></radialGradient></defs>
    <circle cx="120" cy="120" r="116" fill={`url(#${id}-aura)`}/>
    <circle cx="120" cy="120" r="104" fill="none" stroke="#7f8b91" strokeOpacity=".2" strokeWidth=".5"/>
    <circle cx="120" cy="120" r="78" fill="none" stroke="#b7a17a" strokeOpacity=".25" strokeWidth=".7"/>
    {Array.from({length:8},(_,i)=><g key={i} transform={`rotate(${i*45} 120 120)`}>
      <path d="M89.2 35.4A90 90 0 0 1 150.8 35.4" fill="none" stroke={doors[i]?.sealed?'#e0c69c':'#516372'} strokeWidth="6"/>
      <path d="M90.2 38.2A87 87 0 0 1 149.8 38.2" fill="none" stroke={doors[i]?.sealed?'#fff0c9':'#9dc2d3'} strokeOpacity=".55" strokeWidth=".6"/>
      <path d="M120 15V23M117 18H123" stroke="#c3b28f" strokeWidth=".6"/>
      <circle cx="120" cy="51" r="1.5" fill={doors[i]?.restored?'#f3d3a0':'#688294'}/>
    </g>)}
    <path d="M101 75L120 64L139 75M101 165L120 176L139 165" fill="none" stroke="#c8b189" strokeWidth=".8"/>
    <text x="117" y="139" textAnchor="middle" fill="#e0d0b1" fontFamily="Georgia,serif" fontSize="58" letterSpacing="-5">3B</text>
  </svg>;
}
