const PEOPLE={Lina:[0,0],Sami:[1,0],Nora:[2,0],Aïcha:[3,0],Élio:[0,1],Inès:[1,1],Maël:[2,1],Jade:[3,1]};
export default function CityAdvisorPortrait({name}){
 const tile=PEOPLE[name];
 if(!tile)return <svg viewBox="0 0 96 96" className="city3b-advisor-portrait" role="img" aria-label={`Emblème de ${name}`}><rect width="96" height="96" rx="20" fill="#10232c"/><path d="M18 34L48 16L78 34M22 39H74M24 76H72M30 43V70M48 43V70M66 43V70" fill="none" stroke="#d5bc82" strokeWidth="6" strokeLinecap="round"/></svg>;
 return <span className="city3b-advisor-portrait city3b-advisor-photo" role="img" aria-label={`Portrait de ${name}`} style={{backgroundPosition:`${tile[0]*100/3}% ${tile[1]*100}%`}}/>;
}
