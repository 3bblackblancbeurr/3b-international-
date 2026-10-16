import {ArrowUpRight,Compass} from 'lucide-react';
import {RouteLink} from './AppNavigation.jsx';

export default function NowGateway({goTo}){
 return <section className="now-home-gateway" aria-label="3B Maintenant">
  <RouteLink page="now" goTo={goTo} className="now-home-link">
   <span className="now-home-copy"><span className="now-home-eyebrow">LA VIE EN MOUVEMENT · NOUVEAU</span><strong>3B Maintenant.</strong><span>Une petite action. Un vrai impact dans ta journée.</span><span className="now-home-cta">Découvrir mon univers <ArrowUpRight size={18}/></span></span>
   <span className="now-home-art" aria-hidden="true"><i/><b>3B</b><Compass size={32}/></span>
  </RouteLink>
 </section>;
}
