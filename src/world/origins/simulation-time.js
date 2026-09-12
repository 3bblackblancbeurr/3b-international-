// Catch up short frame drops without a huge collision/combat step after a stall.
export function simulationFrame(raw,active){const elapsed=Number.isFinite(raw)?Math.max(0,Math.min(.1,raw)):0;const steps=active&&elapsed>0?Math.ceil(elapsed/(1/30)):0;return {elapsed,steps,step:steps?elapsed/steps:0};}
