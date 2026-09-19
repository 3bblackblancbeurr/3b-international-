import {advanceHubMission} from './mission-runtime.js';

export const HUB_MISSION_TASKS={
 first_steps:[
  {id:'welcome_house',objective:0,label:'Maison de l’Accueil'},
 ],
 first_echo:[
  {id:'signal',objective:0,label:'Signal des Archives'},
  {id:'memory',objective:1,label:'Souvenir à restaurer'},
  {id:'beacon',objective:2,label:'Balise de mémoire'},
 ],
 blue_blackout:[
  {id:'relay_a',objective:0,label:'Relais Matrix A'},
  {id:'relay_b',objective:0,label:'Relais Matrix B'},
  {id:'relay_c',objective:0,label:'Relais Matrix C'},
  {id:'data_center',objective:1,label:'Centre de données'},
 ],
 garden_listens:[
  {id:'sound_a',objective:0,label:'Écho sonore I'},
  {id:'sound_b',objective:0,label:'Écho sonore II'},
  {id:'sound_c',objective:0,label:'Écho sonore III'},
  {id:'sound_d',objective:0,label:'Écho sonore IV'},
  {id:'fog_wait',objective:1,label:'Attendre le brouillard',weather:'fog'},
  {id:'signal_tree',objective:2,label:'Arbre-signal'},
 ],
 three_reflections:[
  {id:'window_a',objective:0,label:'Vitrine sous la pluie I',weather:'heavy_rain'},
  {id:'window_b',objective:0,label:'Vitrine sous la pluie II',weather:'heavy_rain'},
  {id:'window_c',objective:0,label:'Vitrine sous la pluie III',weather:'heavy_rain'},
  {id:'pattern',objective:1,label:'Motif des trois reflets'},
 ],
 eight_seeds:[
  ...Array.from({length:8},(_,index)=>({id:'seed_'+(index+1),objective:0,label:'Graine '+(index+1)})),
  {id:'conservatory',objective:1,label:'Conservatoire à restaurer'},
 ],
 golden_pattern:[
  {id:'scan',objective:0,label:'Scanner le motif'},
  {id:'material',objective:1,label:'Assembler le matériau'},
  {id:'customize',objective:2,label:'Personnaliser l’objet'},
 ],
 living_fabric:[
  {id:'fibre',objective:0,label:'Tester la fibre'},
  {id:'stabilize',objective:1,label:'Stabiliser le bleu Matrix'},
 ],
 lost_wolf_signal:[
  {id:'track_a',objective:0,label:'Trace du loup I'},
  {id:'track_b',objective:0,label:'Trace du loup II'},
  {id:'track_c',objective:0,label:'Trace du loup III'},
  {id:'protect',objective:1,label:'Protéger l’animal-signal'},
 ],
 broken_record:[
  {id:'audio_a',objective:0,label:'Fragment audio I'},
  {id:'audio_b',objective:0,label:'Fragment audio II'},
  {id:'audio_c',objective:0,label:'Fragment audio III'},
  {id:'restore',objective:1,label:'Restaurer le message'},
 ],
 storm_rescue:[
  {id:'rescue_crew',objective:1,label:'Équipage en détresse'},
 ],
 silent_cable:[
  {id:'inspect_line',objective:0,label:'Inspecter la ligne du téléphérique'},
  {id:'repair_pylon',objective:1,label:'Pylône à réparer'},
 ],
};

export const isPhysicalHubMission=(id)=>Object.hasOwn(HUB_MISSION_TASKS,id);

export const HUB_MISSION_TASK_BY_KEY=Object.fromEntries(
 Object.entries(HUB_MISSION_TASKS).flatMap(([missionId,tasks])=>tasks.map((task)=>[missionId+':'+task.id,{...task,missionId}]))
);

export function missionTaskAllowed(missionId,taskId,missionState,completed=[],evidence={}){
 const task=HUB_MISSION_TASK_BY_KEY[missionId+':'+taskId];
 if(!task||missionState?.status!=='active'||completed.includes(taskId)||task.objective!==missionState.completedObjectives)return false;
 if(task.weather&&task.weather!==evidence.weather)return false;
 return true;
}

export function applyHubMissionTask(missions,taskState,missionId,taskId,evidence={}){
 const current=missions[missionId],done=taskState[missionId]||[];
 if(!missionTaskAllowed(missionId,taskId,current,done,evidence))return null;
 const task=HUB_MISSION_TASK_BY_KEY[missionId+':'+taskId],nextDone=[...done,taskId];
 const required=HUB_MISSION_TASKS[missionId].filter((entry)=>entry.objective===task.objective).map((entry)=>entry.id);
 const objectiveDone=required.every((id)=>nextDone.includes(id));
 return {
  missions:objectiveDone?advanceHubMission(missions,missionId,1):missions,
  taskState:{...taskState,[missionId]:nextDone},
  objectiveDone,
 };
}
