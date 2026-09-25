import {RouteLink,SectionIcon} from './AppNavigation.jsx';
import CompactCard from './CompactCard.jsx';
export default function SectionCard({item,goTo}){
 const icon=<SectionIcon page={item.id}/>;
 if(item.locked) return <CompactCard as="article" title={item.label} description={item.description} icon={icon} action="Verrouillé" locked aria-disabled="true" className="universe-card"/>;
 return <CompactCard as={RouteLink} page={item.id} goTo={goTo} title={item.label} description={item.description} icon={icon} action={['manga','secret'].includes(item.id)?'Bientôt':'Ouvrir'} className="universe-card"/>;
}

