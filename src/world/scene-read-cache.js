import {activeCampaignSnapshot} from './campaign-runtime.js';
import {hubPhysicalItemsForLevel} from './hub/tower-navigation.js';

// Save transitions replace their root object. Walking/rendering does not.
// Keep these read models out of the per-frame allocation path.
export function createSceneReadCache(){
 let previousSave,campaign,previousItems,previousRegion,previousLevel,previousLife,previousLifts,previousTowerLife,map;
 return{
  campaign(save){if(save!==previousSave){previousSave=save;campaign=activeCampaignSnapshot(save);}return campaign;},
  map(items,region,landscape={}){
   if(items!==previousItems||region!==previousRegion||landscape.towerFloor!==previousLevel||landscape.lifeItems!==previousLife||landscape.liftItems!==previousLifts||landscape.towerLifeItems!==previousTowerLife){
    previousItems=items;previousRegion=region;previousLevel=landscape.towerFloor;previousLife=landscape.lifeItems;previousLifts=landscape.liftItems;previousTowerLife=landscape.towerLifeItems;
    map=region==='hub'?[...items,...hubPhysicalItemsForLevel(landscape)]:items;
   }
   return map;
  },
 };
}
