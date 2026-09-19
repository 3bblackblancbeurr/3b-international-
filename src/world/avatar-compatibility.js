import {getWeaponHandling} from './weapon-handling.js';

const cloneMount=mount=>mount?{...mount,position:[...mount.position],rotation:[...mount.rotation]}:null;

export function avatarCompatibility(avatar={}){
 const warnings=[],adjustments={bagDepth:0,pendantDepth:0,capeClearance:0,weaponClearance:0};
 if(avatar.headwear==='hood'&&Number(avatar.hair)>0)warnings.push({id:'hood-hair',level:'info',message:'La capuche masque automatiquement la coiffure pour éviter le clipping.'});
 if(avatar.outer==='cape'&&avatar.bag){adjustments.bagDepth=-.13;adjustments.capeClearance=.035;warnings.push({id:'cape-bag',level:'info',message:'Le sac est écarté du dos pour laisser respirer la cape.'});}
 if(avatar.outer==='scarf'&&avatar.pendant){adjustments.pendantDepth=.045;warnings.push({id:'scarf-pendant',level:'info',message:'Le pendentif est avancé devant l’écharpe.'});}
 const profile=getWeaponHandling(avatar.weapon);
 if(profile.stow==='back'&&(avatar.bag||avatar.outer==='cape')){adjustments.weaponClearance=avatar.bag?.14:.08;warnings.push({id:'back-stack',level:'info',message:'Le support dorsal de l’arme est décalé pour limiter les collisions avec '+(avatar.bag&&avatar.outer==='cape'?'le sac et la cape':avatar.bag?'le sac':'la cape')+'.'});}
 if(profile.stow==='back'&&avatar.bag&&avatar.outer==='cape')warnings.push({id:'back-density',level:'warning',message:'Configuration dorsale dense : vérifie la vue Dos et le TEST COMPLET avant validation.'});
 return {warnings,adjustments};
}

export function resolveWeaponHandling(id,avatar={}){
 const base=getWeaponHandling(id),{adjustments}=avatarCompatibility({...avatar,weapon:id});
 const result={...base,grip:cloneMount(base.grip),holster:cloneMount(base.holster)};
 if(result.holster&&adjustments.weaponClearance){
  result.holster.position[2]-=adjustments.weaponClearance;
  result.holster.position[0]+=(id==='paris'||id==='carthage')?.04:-.04;
 }
 return result;
}
