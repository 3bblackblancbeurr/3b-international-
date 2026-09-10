import {RouteLink,SectionIcon} from './AppNavigation.jsx';
import CompactCard from './CompactCard.jsx';
export default function SectionCard({item,goTo}){
 return <CompactCard as={RouteLink} page={item.id} goTo={goTo} title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>} action={['manga','secret'].includes(item.id)?'Bientôt':'Ouvrir'} className="universe-card"/>;
}

