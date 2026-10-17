// Decorative fictional network over NASA Earth imagery. Connection lines do
// not imply actual members, physical hubs or operating 3B locations.
const ROUTES=[
 ['M200 285 Q495 65 820 415','gold'],
 ['M158 425 Q395 175 729 242','cyan'],
 ['M215 635 Q482 275 786 528','gold'],
 ['M230 750 Q445 355 736 304','cyan'],
 ['M340 208 Q530 480 758 695','cyan'],
 ['M245 475 Q505 720 788 455','gold'],
 ['M155 570 Q422 92 653 333','gold'],
 ['M355 724 Q540 270 720 613','cyan'],
];
const SIGNALS=[
 [232,299,'FR'],[419,243,'ES'],[539,289,'IT'],[487,369,'DZ'],
 [450,417,'MA'],[586,385,'TN'],[656,340,'TR'],[596,212,'EE'],
 [292,553,'3B'],[733,495,'3B'],[689,686,'3B']
];
export default function HeritageSignalNetwork(){
 return <svg className="th-earth-network" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id="th-network-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8dba0" stopOpacity="0"/><stop offset=".47" stopColor="#ffe59b" stopOpacity=".9"/><stop offset="1" stopColor="#dc9841" stopOpacity=".18"/></linearGradient>
   <linearGradient id="th-network-blue" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#64d6ff" stopOpacity="0"/><stop offset=".4" stopColor="#87e8ff" stopOpacity=".94"/><stop offset="1" stopColor="#3795ff" stopOpacity=".13"/></linearGradient>
   <radialGradient id="th-network-signal"><stop offset="0" stopColor="#fff4c2"/><stop offset=".4" stopColor="#ffc975"/><stop offset="1" stopColor="#f0a54c" stopOpacity="0"/></radialGradient>
  </defs>
  <circle cx="500" cy="500" r="419" fill="none" stroke="#88d6ff" strokeOpacity=".27" strokeWidth="1.8"/>
  {ROUTES.map(([d,shade],i)=><path key={i} d={d} fill="none" stroke={shade==='gold'?'url(#th-network-gold)':'url(#th-network-blue)'} strokeWidth={i%3===0?3.7:2.4} strokeLinecap="round" opacity=".84"/>)}
  {SIGNALS.map(([x,y,label],i)=><g key={label+'-'+i} transform={`translate(${x} ${y})`}>
   <circle r="24" fill="url(#th-network-signal)" opacity=".65"/>
   <circle r="11" fill="#031727" stroke={i%3?'#8addff':'#e7b36c'} strokeWidth="2.5"/>
   <circle r="3" fill={i%3?'#abecff':'#ffe3af'}/>
  </g>)}
 </svg>;
}
