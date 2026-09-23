import {RouteLink,SectionIcon} from './AppNavigation.jsx';
import CompactCard from './CompactCard.jsx';

export default function SectionCard({item,goTo}){
 const soon=item?.status==='soon';
 if(soon){
  return <CompactCard as="article" data-section={item.id} data-status="soon" eyebrow="Bientôt" title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>} action="Bientôt" className="universe-card universe-card-soon"/>;
 }
 return <CompactCard as={RouteLink} page={item.id} goTo={goTo} data-section={item.id} title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>} action="Ouvrir" className="universe-card"/>;
}
