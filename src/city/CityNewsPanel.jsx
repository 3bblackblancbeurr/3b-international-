import {Button} from '../design-system/index.jsx';
import CityAdvisorPortrait from './CityAdvisorPortrait.jsx';
import {cityNews,nextMayorMilestone} from './city3b-news.js';
import './city3b-advisor.css';
export default function CityNewsPanel({data,onAction,onRefresh,busy}){
 const news=cityNews(data),next=nextMayorMilestone(data.city?.city_level);
 return <section className="city3b-news-panel"><header><CityAdvisorPortrait name="Jade"/><div><p className="city3b-kicker">3B ACTUALITÉS · CYCLE {data.life?.day||0}</p><h2>Jade, votre rendez-vous avec la ville</h2><p>Les nouvelles, les demandes et les rendez-vous de vos habitants.</p></div></header><p className="city3b-news-next">{next.text} · Les dossiers précédents restent à accomplir dans l’ordre.</p><div className="city3b-news-feed">{news.map(n=><article key={n.id}><small>Jade · Journal de la ville</small><h3>{n.title}</h3><p>{n.text}</p><Button variant="ghost" onClick={()=>onAction({tab:n.tab})}>Voir le dossier →</Button></article>)}</div><Button variant="ghost" disabled={busy} onClick={onRefresh}>Actualiser le journal</Button></section>;
}
