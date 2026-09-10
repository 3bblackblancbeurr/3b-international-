import { ArrowUpRight } from 'lucide-react';
import { RouteLink, SectionIcon } from './AppNavigation.jsx';
export default function SectionCard({ item, goTo, index }) {
 return <RouteLink page={item.id} goTo={goTo} className="universe-card">
  <div className="universe-card-top"><SectionIcon page={item.id} size={25}/><span>{String(index+1).padStart(2,'0')}</span></div>
  <div><h3>{item.label}</h3><p>{item.description}</p></div>
  <div className="universe-card-bottom"><span>{['manga','secret'].includes(item.id)?'Bientôt':'Explorer'}</span><ArrowUpRight size={18}/></div>
 </RouteLink>;
}
