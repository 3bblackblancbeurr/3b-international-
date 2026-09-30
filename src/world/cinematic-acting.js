const DEFAULT_PLAN=Object.freeze([
  Object.freeze({at:0,hero:'Idle',focus:'Idle',duration:1.2}),
]);

const PLANS=Object.freeze({
  'world-opening':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Idle',duration:2}),
    Object.freeze({at:.52,hero:'Talk',focus:'Idle',duration:1.1}),
    Object.freeze({at:.78,hero:'Idle',focus:'Idle',duration:1.2}),
  ]),
  'country-first-entry':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Idle',duration:1.4}),
    Object.freeze({at:.58,hero:'Talk',focus:'Idle',duration:.9}),
    Object.freeze({at:.82,hero:'Idle',focus:'Idle',duration:1}),
  ]),
  'kais-guidance':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Idle',duration:1.2}),
    Object.freeze({at:.28,hero:'Idle',focus:'Talk',duration:1.2}),
    Object.freeze({at:.58,hero:'Talk',focus:'Idle',duration:1.0}),
    Object.freeze({at:.84,hero:'Idle',focus:'Idle',duration:.8}),
  ]),
  'story-alliance':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Talk',duration:1.2}),
    Object.freeze({at:.34,hero:'Talk',focus:'Idle',duration:1.1}),
    Object.freeze({at:.68,hero:'Idle',focus:'Talk',duration:1}),
    Object.freeze({at:.88,hero:'Idle',focus:'Idle',duration:.8}),
  ]),
  'story-power':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Idle',duration:.6}),
    Object.freeze({at:.2,hero:'Cast',focus:'Idle',duration:1.6}),
    Object.freeze({at:.76,hero:'Idle',focus:'Idle',duration:.8}),
  ]),
  'memory-fragment':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Idle',duration:.7}),
    Object.freeze({at:.32,hero:'Cast',focus:'Idle',duration:1}),
    Object.freeze({at:.75,hero:'Idle',focus:'Idle',duration:.8}),
  ]),
  'story-restoration':Object.freeze([
    Object.freeze({at:0,hero:'Work',focus:'Idle',duration:1.4}),
    Object.freeze({at:.42,hero:'Cast',focus:'Idle',duration:1.3}),
    Object.freeze({at:.78,hero:'Idle',focus:'Idle',duration:1}),
  ]),
  'guardian-intro':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Cast',duration:1.4}),
    Object.freeze({at:.4,hero:'Talk',focus:'Idle',duration:.9}),
    Object.freeze({at:.7,hero:'Idle',focus:'Cast',duration:1}),
    Object.freeze({at:.9,hero:'Idle',focus:'Idle',duration:.6}),
  ]),
  'final-combat-intro':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Cast',duration:1.7}),
    Object.freeze({at:.45,hero:'Cast',focus:'Cast',duration:1.2}),
    Object.freeze({at:.78,hero:'Idle',focus:'Idle',duration:.8}),
  ]),
  'important-combat-result':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Hit',duration:.8}),
    Object.freeze({at:.35,hero:'Talk',focus:'Idle',duration:1.1}),
    Object.freeze({at:.72,hero:'Idle',focus:'Idle',duration:1}),
  ]),
  'companion-first-bond':Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Talk',duration:1}),
    Object.freeze({at:.38,hero:'Talk',focus:'Idle',duration:1}),
    Object.freeze({at:.74,hero:'Idle',focus:'Idle',duration:.9}),
  ]),
  discovery:Object.freeze([
    Object.freeze({at:0,hero:'Idle',focus:'Idle',duration:.8}),
    Object.freeze({at:.5,hero:'Talk',focus:'Idle',duration:.7}),
  ]),
  'story-finale':Object.freeze([
    Object.freeze({at:0,hero:'Cast',focus:'Idle',duration:1.8}),
    Object.freeze({at:.42,hero:'Talk',focus:'Idle',duration:1.2}),
    Object.freeze({at:.78,hero:'Idle',focus:'Idle',duration:1.4}),
  ]),
});

export function cinematicActingPlan(kind){
  return PLANS[kind]||DEFAULT_PLAN;
}

export function cinematicActingBeat(kind,progress){
  const value=Math.max(0,Math.min(1,Number(progress)||0)),plan=cinematicActingPlan(kind);
  let index=0;
  for(let i=0;i<plan.length;i+=1)if(value>=plan[i].at)index=i;
  return {index,...plan[index]};
}
