export const CAPTURE_SCENARIOS=Object.freeze([
 {id:'race-dry-day',durationSec:90,minFrames:5400,targetFps:60},
 {id:'race-wet-night',durationSec:90,minFrames:5400,targetFps:60},
 {id:'open-world-city',durationSec:120,minFrames:7200,targetFps:60},
 {id:'police-heat-6',durationSec:120,minFrames:7200,targetFps:60},
 {id:'garage-customization',durationSec:60,minFrames:3600,targetFps:60},
 {id:'country-transition',durationSec:90,minFrames:5400,targetFps:60}
]);
export function captureEvidenceTemplate(id){const s=CAPTURE_SCENARIOS.find(x=>x.id===id);return s?{id,source:'real-build',video:null,screenshots:[],averageFps:null,p1LowFps:null,frames:0,criticalBugs:[],approved:false}:null;}
export function validateCaptureEvidence(evidence={}){const spec=CAPTURE_SCENARIOS.find(x=>x.id===evidence.id),errors=[];if(!spec)return {ok:false,errors:['unknown-scenario']};if(evidence.source!=='real-build')errors.push('not-real-build');if(typeof evidence.video!=='string'||!evidence.video)errors.push('video-missing');if(!Array.isArray(evidence.screenshots)||evidence.screenshots.length<3)errors.push('screenshots');if((evidence.averageFps||0)<spec.targetFps)errors.push('average-fps');if((evidence.frames||0)<spec.minFrames)errors.push('sample-too-short');if((evidence.criticalBugs||[]).length)errors.push('critical-bugs');if(evidence.approved!==true)errors.push('approval');return {ok:errors.length===0,errors,spec};}
export function captureSuiteReport(records={}){const reports=CAPTURE_SCENARIOS.map(s=>validateCaptureEvidence(records[s.id]||{id:s.id}));return {scenarios:reports,passed:reports.filter(x=>x.ok).length,total:reports.length,complete:reports.every(x=>x.ok)};}
