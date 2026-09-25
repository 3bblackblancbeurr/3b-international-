const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const mean=(items,key)=>items.length?items.reduce((sum,item)=>sum+(Number(item?.[key])||0),0)/items.length:0;

function noise(seed){
  const x=Math.sin((Number(seed)||1)*12.9898+78.233)*43758.5453;
  return (x-Math.floor(x))*2-1;
}

export function createTrainingMemory(){
  return {shots:[],keeperReads:[],keeperMoves:[],outcomes:[]};
}

export function rememberTrainingShot(memory,shot,outcome){
  const next={...(memory||createTrainingMemory())};
  next.shots=[...(next.shots||[]),{
    targetX:clamp(shot?.targetX,-1,1),
    targetY:clamp(shot?.targetY,0,1),
    power:clamp(shot?.power,0,1),
    curve:clamp(shot?.curve,-1,1),
  }].slice(-8);
  next.outcomes=[...(next.outcomes||[]),outcome].slice(-8);
  return next;
}

export function rememberKeeperMove(memory,direction){
  const next={...(memory||createTrainingMemory())};
  next.keeperMoves=[...(next.keeperMoves||[]),clamp(direction,-1,1)].slice(-8);
  return next;
}
export function predictTrainingKeeper(memory,shot,attempt=0){
  const recent=(memory?.shots||[]).slice(-5);
  const learnedBias=mean(recent,'targetX');
  const repeatedSide=recent.length>=2&&Math.sign(recent.at(-1)?.targetX||0)===Math.sign(recent.at(-2)?.targetX||0);
  const difficulty=clamp(.3+attempt*.018,.3,.62);
  const target=clamp(shot?.targetX,-1,1);
  const curve=clamp(shot?.curve,-1,1);
  const anticipation=learnedBias*(repeatedSide?.38:.22);
  const read=target*difficulty+curve*.08+anticipation;
  const uncertainty=noise(attempt*17+Math.round((target+1)*97))*(1-difficulty)*.72;
  return clamp(read+uncertainty,-.94,.94);
}

const SHOT_PATTERNS=[
  {x:-.78,y:.72,p:.76,c:.18},
  {x:.72,y:.54,p:.84,c:-.12},
  {x:-.42,y:.34,p:.62,c:.34},
  {x:.86,y:.78,p:.88,c:-.22},
  {x:.18,y:.64,p:.7,c:.08},
  {x:-.88,y:.48,p:.9,c:.24},
];

export function createAdaptiveAiShot(memory,attempt=0){
  const pattern=SHOT_PATTERNS[attempt%SHOT_PATTERNS.length];
  const moves=(memory?.keeperMoves||[]).slice(-5);
  const keeperBias=moves.length?moves.reduce((a,b)=>a+b,0)/moves.length:0;
  const punishRepeated=Math.abs(keeperBias)>.28?-Math.sign(keeperBias)*.22:0;
  const jitter=noise(attempt*23+41);
  return {
    type:Math.abs(pattern.c)>.2?'curved-shot':'shot',
    power:clamp(pattern.p+jitter*.035,.48,.94),
    precision:clamp(.84+attempt*.006,.84,.96),
    curve:clamp(pattern.c+jitter*.05,-.5,.5),
    targetX:clamp(pattern.x+punishRepeated+jitter*.06,-.94,.94),
    targetY:clamp(pattern.y+noise(attempt*31+9)*.045,.2,.88),
  };
}
