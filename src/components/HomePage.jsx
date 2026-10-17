// 3B HOME · Immersive Master II. The actual routes remain in AppNavigation
// rather than mounting the former 22-card scrolling dashboard.
import ImmersiveWorldHome from './ImmersiveWorldHome.jsx';

export default function HomePage({goTo}){
 return <ImmersiveWorldHome goTo={goTo}/>;
}
