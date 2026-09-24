import {RouteLink,SectionIcon} from './AppNavigation.jsx';
import CompactCard from './CompactCard.jsx';

export default function SectionCard({item,goTo}){
 const soon=item?.status==='soon';
 const preview=item?.status==='preview';
 const secret=item?.id==='secret';
 const secretLive=item?.secretPhase==='open'||item?.secretPhase==='attempt';
 const secretEyebrow=secret ? (secretLive ? (item.secretPhase==='attempt'?`Tentative · ${item.secretCountdown}`:`Signal actif · ${item.secretCountdown}`) : item.secretLabel) : undefined;
 const secretAction=secret ? (secretLive?'Entrer':'Vérifier') : undefined;
 if(soon){
  return <CompactCard as="article" data-section={item.id} data-status="soon" eyebrow="Bientôt" title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>} action="Bientôt" className="universe-card universe-card-soon"/>;
 }
 return <CompactCard as={RouteLink} page={item.id} goTo={goTo} data-section={item.id} data-status={preview?'preview':'open'} data-secret-phase={secret?item.secretPhase:undefined} eyebrow={secretEyebrow||(preview?'Aperçu':undefined)} title={item.label} description={item.description} icon={<SectionIcon page={item.id}/>} action={secretAction||(preview?'Bientôt':'Ouvrir')} className={`universe-card ${secret?'secret-universe-card':''} ${secretLive?'is-secret-live':''}`}/>;
}
