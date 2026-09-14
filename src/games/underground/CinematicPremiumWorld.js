import {PremiumWorld} from './PremiumWorld.js';
import {CinematicDetailPass} from './CinematicDetailPass.js';
import {HeroArchitecturePass} from './HeroArchitecturePass.js';

export class CinematicPremiumWorld extends PremiumWorld{
  constructor(scene,curve,event,options={}){
    super(scene,curve,event,options);
    const shared={quality:options.quality||'high',palette:this.palette};
    this.cinematic=new CinematicDetailPass(scene,curve,event,shared);
    this.heroArchitecture=new HeroArchitecturePass(scene,curve,event,shared);
  }
  update(args={}){
    const base=super.update(args);
    const detail=this.cinematic.update({...args,wetness:base.wetness});
    const architecture=this.heroArchitecture.update(args);
    return {...base,...detail,...architecture};
  }
}
