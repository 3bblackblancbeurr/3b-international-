import {useId} from 'react';
const PEOPLE={Lina:['#be825b','#29211f','#c5ad82',true],Sami:['#cfa67f','#332f2c','#344c50',false],Nora:['#d29a74','#31232b','#38647b',true],Aïcha:['#ad795a','#222831','#689582',true],Élio:['#dfa877','#50382e','#75628e',false],Inès:['#edbb97','#673c28','#527d68',true],Maël:['#af7b5c','#272623','#946979',false],Jade:['#e0b08b','#4a3025','#325c7b',true]};
export default function CityAdvisorPortrait({name}){
 const id=useId().replace(/[^a-z0-9]/gi,'');
 const [skin,hair,coat,long]=PEOPLE[name]||['#c49872','#302725','#7f744c',false];
 return <svg viewBox="0 0 96 96" className="city3b-advisor-portrait" role="img" aria-label={`Portrait de ${name}`}>
  <defs><linearGradient id={id} x2="1" y2="1"><stop stopColor="#152f3c"/><stop offset="1" stopColor="#030d15"/></linearGradient></defs>
  <rect width="96" height="96" rx="24" fill={`url(#${id})`}/><circle cx="48" cy="39" r="30" fill="none" stroke="#c9af7655"/><path d="M8 96V83Q12 68 35 66H61Q84 68 88 83V96" fill={coat}/>
  {long&&<path d="M24 44Q18 10 48 9Q78 12 72 66L59 72H35L24 66Z" fill={hair}/>}
  <path d="M38 56H58V71Q48 81 38 71Z" fill={skin}/><ellipse cx="48" cy="38" rx="22" ry="27" fill={skin}/>
  <path d={long?'M25 37Q20 12 47 11Q75 10 71 38Q65 18 56 20Q39 34 25 37':'M25 35Q18 10 48 10Q78 10 71 36L63 24L38 23Z'} fill={hair}/>
  <path d="M33 38Q37 35 41 38M55 38Q59 35 63 38" fill="none" stroke={hair} strokeWidth="2" strokeLinecap="round"/><circle cx="38" cy="42" r="1.8" fill="#172123"/><circle cx="58" cy="42" r="1.8" fill="#172123"/>
  <path d="M48 42L45 50L50 51M40 56Q48 62 56 56" fill="none" stroke="#784a3d" strokeWidth="1.5" strokeLinecap="round"/>
  {['Sami','Élio','Inès'].includes(name)&&<g fill="none" stroke="#d4c799" strokeWidth="1.7"><rect x="29" y="38" width="16" height="11" rx="4"/><rect x="51" y="38" width="16" height="11" rx="4"/><path d="M45 41H51"/></g>}
  {!long&&<path d="M29 50Q33 70 48 68Q63 70 67 50L58 57Q48 64 38 57Z" fill={hair} opacity=".5"/>}
  <path d="M34 68L44 81L36 90L27 72M62 68L52 81L60 90L69 72" fill="#ffffff22"/><path d="M48 80V96" stroke="#ddc392" strokeWidth="1.4"/><circle cx="73" cy="83" r="4" fill="#d9be82"/>
  {name==='Conseil des quartiers'&&<path d="M13 18L18 10L23 18L18 25Z M73 18L78 10L83 18L78 25Z" fill="#d6be84"/>}
 </svg>;
}
