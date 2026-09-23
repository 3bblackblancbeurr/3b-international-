import {RouteLink,SectionIcon} from './AppNavigation.jsx';
import CompactCard from './CompactCard.jsx';

export default function SectionCard({item,goTo}){
 const soon=item?.status==='soon';
 const preview=item?.status==='preview';
 if(soon){
  return <CompactCard as="article" data-section={item.id} data-status="soon" eyebrow="Bientôt" title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>} action="Bientôt" className="universe-card universe-card-soon"/>;
 }
 return <CompactCard as={RouteLink} page={item.id} goTo={goTo} data-section={item.id} data-status={preview?'preview':'open'} eyebrow={preview?'Aperçu':undefined} title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>} action={preview?'Bientôt':'Ouvrir'} className="universe-card"/>;
}
