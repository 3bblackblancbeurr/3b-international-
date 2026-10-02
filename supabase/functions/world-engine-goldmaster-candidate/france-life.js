import {DISTRICT_JOBS,currentJobActions,jobReadyToTurnIn} from './district-jobs.js';

// Authored slice: these residents connect existing contracts to useful services.
// This is not a crowd or traffic simulator. Coordinates use settlement space.
export const FRANCE_RESIDENTS=Object.freeze([
 {id:'nora',name:'Nora',role:'jardinière',work:[49,26],home:[22,8],jobs:['garden','spring_clearance'],activity:'Prépare les récoltes et surveille la source.'},
 {id:'malik',name:'Malik',role:'artisan',work:[-18,17],home:[-25,10],jobs:['atelier','route_repair'],activity:'Approvisionne les bâtisseurs et entretient le passage.'},
 {id:'ines',name:'Inès',role:'secouriste',work:[27,25],home:[6,17],jobs:['field_rescue','lost_animal'],activity:'Organise les recherches depuis le refuge.'},
 {id:'samuel',name:'Samuel',role:'livreur',work:[-6.84,-2.53],home:[0,-18],jobs:['courier','signal_watch','justice_case'],activity:'Prépare les livraisons et transmet les nouvelles du quartier.'},
]);

export function franceDistrictState(home={}){
 const completed=new Set([...(home.completedJobs||[]),...(home.jobs||[])]);
 return {completed:[...completed],gardenRestored:completed.has('garden'),sourceRestored:completed.has('spring_clearance'),routeRestored:completed.has('route_repair'),relayRestored:completed.has('signal_watch'),peopleRescued:completed.has('field_rescue'),
  basketPrice:completed.has('garden')?4:6,foodHarvestBonus:completed.has('spring_clearance')?1:0};
}

export function franceResidentState(id,home={},hour=12){
 const resident=FRANCE_RESIDENTS.find(npc=>npc.id===id);if(!resident)return null;
 const clock=Number.isFinite(hour)?((hour%24)+24)%24:12;
 const working=clock>=7&&clock<20,district=franceDistrictState(home),helped=resident.jobs.filter(job=>district.completed.includes(job));
 const text=helped.length?`Merci Kaïs. Je me souviens de ton aide : ${helped.map(job=>DISTRICT_JOBS[job].title).join(', ')}.`:resident.activity;
 const [x,z]=working?resident.work:resident.home;
 return {...resident,x,z,working,activityLabel:working?'Au travail':'Près de son domicile',text,helped};
}

export function franceResidentItems(home={},hour=12){
 return FRANCE_RESIDENTS.map(npc=>{const state=franceResidentState(npc.id,home,hour);return {id:'france:resident:'+npc.id,type:'franceResident',residentId:npc.id,name:state.name+' · '+state.role,x:state.x,z:state.z,range:4.5,actions:['talk'],color:'#8edeb2',working:state.working};});
}

export function districtContractGuide(region,home={}){
 const job=DISTRICT_JOBS[home.activeJob];if(!job)return null;
 if(jobReadyToTurnIn(home))return {title:'Remettre · '+job.title,detail:'Les étapes sont terminées. Retrouve le destinataire pour recevoir ta récompense.',target:region+':job:'+home.activeJob};
 const action=currentJobActions(home)[0];if(!action)return null;
 return {title:action.label,detail:job.title+' · étape '+((home.jobStage||0)+1)+'/'+job.steps.length,target:`${region}:job-action:${home.activeJob}:${action.id}`};
}
