import {PremiumWorld} from './PremiumWorld.js';
import {CinematicDetailPass} from './CinematicDetailPass.js';

export class CinematicPremiumWorld extends PremiumWorld{
  constructor(scene,curve,event,options={}){
    super(scene,curve,event,options);
    this.cinematic=new CinematicDetailPass(scene,curve,event,{quality:options.quality||'high',palette:this.palette});
  }
  update(args={}){
    const base=super.update(args);
    const detail=this.cinematic.update({...args,wetness:base.wetness});
    return {...base,...detail};
  }
}
