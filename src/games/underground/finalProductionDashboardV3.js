import {finalAssetProductionReport,nextFinalAssetTask} from './finalAssetProductionV3.js';
import {environmentProductionReport} from './environmentAssetManifestV3.js';
import {mediaProductionReport} from './audioCinematicManifestV3.js';
import {captureSuiteReport} from './gameplayCaptureValidationV3.js';
import {scoreUndergroundHealth,improvementBacklog,releaseGate} from './gameHealthMonitor.js';

export function finalProductionDashboard(records={}){
 const assets=finalAssetProductionReport(records.finalAssets||{}),environments=environmentProductionReport(records.environmentDetails||{}),media=mediaProductionReport(records.media||{}),captures=captureSuiteReport(records.captures||{}),health=scoreUndergroundHealth(records.health||{}),backlog=improvementBacklog(records.health||{}),release=releaseGate({...records.health,realGoldMasters:assets.goldMasters.done,realGameplayCapture:captures.complete,averageFps:records.health?.averageFps||0,e2ePass:records.e2ePass===true,criticalBugs:records.criticalBugs||0});
 return {assets,environments,media,captures,health,backlog:backlog.items,nextTask:nextFinalAssetTask(records.finalAssets||{}),release,ready:assets.complete&&environments.ready&&media.audio.complete&&media.cinematics.complete&&captures.complete&&release.ready};
}
