import test from 'node:test';import assert from 'node:assert/strict';
import {createCareerState,completeCareerEvent,cityBossesForCountry,countryUnlocked} from '../src/games/underground/careerProgressionV2.js';
import {eventsFor} from '../src/games/underground/data.js';
import {eventPayout,economyHealth,vehiclePurchasePrice} from '../src/games/underground/economyBalanceV2.js';
import {adaptiveSkill,rivalDecision,bossPhases} from '../src/games/underground/rivalAiV2.js';
import {OPEN_WORLD_PLANS,worldContentReport} from '../src/games/underground/openWorldPlanV2.js';
import {createAudioState,updateAudioDirector,audioMix} from '../src/games/underground/audioDirectorV2.js';
import {raceHudModel,worldHudModel} from '../src/games/underground/hudModelV2.js';
import {adaptivePerformanceState,choosePerformanceProfile} from '../src/games/underground/performanceBudgetV2.js';
import {completionSnapshot} from '../src/games/underground/gameCompletionDirector.js';

test('career starts in France and event completion advances persistent progression',()=>{let s=createCareerState();assert.equal(countryUnlocked(s,'france'),true);assert.equal(countryUnlocked(s,'algeria'),false);const e=eventsFor('france')[0];s=completeCareerEvent(s,e,{mastery:true});assert.ok(s.xp>0);assert.ok(s.coins>5000);assert.equal(s.countries.france.completedEvents.length,1);assert.equal(cityBossesForCountry('france').length,20);});
test('economy keeps vehicle acquisition within bounded race counts',()=>{const price=vehiclePurchasePrice({performanceIndex:450,rarity:'rare'}),pay=eventPayout({tier:3,minutes:4,mastery:true,position:1});const h=economyHealth({vehiclePrice:price,balance:5000,avgEventPayout:pay});assert.ok(price>0);assert.ok(pay>0);assert.equal(h.noPayToWin,true);});
test('rival AI adapts without exceeding hard skill ceiling',()=>{const skill=adaptiveSkill({base:.9,playerWinRate:.8,streak:5,difficulty:1,boss:true});assert.ok(skill<=.995);assert.ok(rivalDecision({style:'attacker',skill,relativePositionM:20,seed:.9}).action);assert.equal(bossPhases({progress:.9}).phase,'final');});
test('all eight countries have open-world plans with art-ready route archetypes',()=>{assert.equal(Object.keys(OPEN_WORLD_PLANS).length,8);assert.equal(worldContentReport().readyForArt,true);});
test('audio HUD and performance directors produce bounded runtime state',()=>{const a=updateAudioDirector(createAudioState(),{speedKph:260,rpm:7000,throttle:1,heat:5,wetness:.8,finalLap:true});assert.ok(audioMix(a).music<=1);const hud=raceHudModel({speedKph:201.4,heat:5,damage:85});assert.ok(hud.alerts.includes('critical-damage'));assert.ok(worldHudModel({level:4,xp:500,nextXp:1000}).progress<=1);const profile=choosePerformanceProfile({memoryGb:8,cores:8,width:1920,mobile:false});assert.ok(adaptivePerformanceState({profile,frameMs:30}).traffic<1);});
test('completion director exposes honest 3D asset bottleneck',()=>{const s=completionSnapshot({metrics:{visual:65,vehicles:75,gameplay:70,world:65,police:80,performance:60,quality:70,realGoldMasters:0,realGameplayCapture:false,averageFps:45,e2ePass:false,criticalBugs:0}});assert.equal(s.release.ready,false);assert.equal(s.stream.assets3d,0);assert.ok(s.next.streams.some(x=>x.id==='assets3d'));});
