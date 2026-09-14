import {PremiumWorld} from './PremiumWorld.js';
import {CinematicDetailPass} from './CinematicDetailPass.js';
import {HeroArchitecturePass} from './HeroArchitecturePass.js';
import {WetWeatherMicroFX} from './WetWeatherMicroFX.js';
import {SpeedAtmosphereFX} from './SpeedAtmosphereFX.js';
import {WorldGeometryV6} from './WorldGeometryV6.js';
import {SkyAtmosphereV6} from './SkyAtmosphereV6.js';

export class CinematicPremiumWorld extends PremiumWorld{
  constructor(scene,curve,event,options={}){
    super(scene,curve,event,options);
    const shared={quality:options.quality||'high',palette:this.palette};
    this.cinematic=new CinematicDetailPass(scene,curve,event,shared);
    this.heroArchitecture=new HeroArchitecturePass(scene,curve,event,shared);
    this.geometryV6=new WorldGeometryV6(scene,curve,event,shared);
    this.skyV6=new SkyAtmosphereV6(scene,event,shared);
    this.wetMicro=new WetWeatherMicroFX(scene,event,{quality:shared.quality});
    this.speedAtmosphere=new SpeedAtmosphereFX(scene,event,{quality:shared.quality,color:this.palette.matrix});
  }
  update(args={}){
    const base=super.update(args);
    const detail=this.cinematic.update({...args,wetness:base.wetness});
    const architecture=this.heroArchitecture.update(args);
    const geometry=this.geometryV6.update(args);
    const sky=this.skyV6.update(args);
    this.wetMicro.update({...args,wetness:base.wetness});
    this.speedAtmosphere.update({...args,wetness:base.wetness});
    return {...base,...detail,...architecture,...geometry,...sky};
  }
}
