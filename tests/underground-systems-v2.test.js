import test from 'node:test';import assert from 'node:assert/strict';
import {createGarageState,addVehicleToGarage,repairVehicle,setVehicleDamage} from '../src/games/underground/garageSystemV2.js';
import {createDamageState,applyDamage,damagePerformanceMultiplier} from '../src/games/underground/damageSystemV2.js';
import {createSaveGame,normalizeSaveGame,UNDERGROUND_SAVE_VERSION} from '../src/games/underground/saveGameV2.js';
import {normalizeGameSettings,difficultyConfig} from '../src/games/underground/gameSettingsV2.js';
import {countryMissionDeck,availableMissions,missionResult} from '../src/games/underground/missionDirectorV2.js';
import {extendedCatalogueReport} from '../src/games/underground/extendedVehicleCatalogue.js';
import {visualQualityScore} from '../src/games/underground/visualQualityTargets.js';
import {CONCEPT_ART_REGISTRY,conceptArtReport,updateConceptArt} from '../src/games/underground/conceptArtRegistry.js';

test('garage owns tunes damages and repairs vehicles with economy cost',()=>{let g=createGarageState();g=addVehicleToGarage(g,'u3b-test');assert.equal(g.activeVehicleId,'u3b-test');g=setVehicleDamage(g,'u3b-test',60);const r=repairVehicle(g,'u3b-test',{balance:100000,vehicleValue:50000});assert.equal(r.ok,true);assert.equal(r.state.damage['u3b-test'],0);assert.ok(r.cost>0);});
test('damage creates performance penalties before total disablement',()=>{let d=createDamageState();d=applyDamage(d,{impact:20,zone:'engine',speedKph:180});const m=damagePerformanceMultiplier(d);assert.ok(m.power<1);assert.ok(m.power>0);});
test('save and settings are versioned and bounded',()=>{const save=createSaveGame();assert.equal(save.version,UNDERGROUND_SAVE_VERSION);assert.equal(normalizeSaveGame(save).career.level,1);const s=normalizeGameSettings({difficulty:'legend',hudScale:3,tractionControl:4});assert.equal(s.hudScale,1.4);assert.equal(s.tractionControl,1);assert.equal(difficultyConfig(s).id,'legend');});
test('each country has race, escape, secret and guardian missions',()=>{const d=countryMissionDeck('france');assert.ok(d.length>=27);assert.ok(d.some(x=>x.type==='secret'));assert.ok(d.some(x=>x.type==='escape'));assert.ok(d.some(x=>x.type==='boss'));assert.ok(availableMissions('france',{influence:9000}).length>0);assert.ok(missionResult(d[0],{success:true,mastery:true}).reward.xp>0);});
test('extended catalogue is exactly 1000 unique vehicles',()=>{const r=extendedCatalogueReport();assert.equal(r.total,1000);assert.equal(r.uniqueIds,true);assert.equal(r.byKind['city-variant'],800);});
test('visual gate refuses incomplete art and concept art never counts as production asset',()=>{assert.equal(visualQualityScore({averageFps:40,width:1280,height:720}).pass,false);const report=conceptArtReport();assert.equal(report.total,160);const id=Object.keys(CONCEPT_ART_REGISTRY)[0],updated=updateConceptArt(CONCEPT_ART_REGISTRY,id,{status:'approved',approved:true,productionAsset:true});assert.equal(updated[id].productionAsset,false);});
