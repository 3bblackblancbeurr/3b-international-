// Original instrumental motifs written for the fictional eight-guardian story.
// The timbres evoke strings, breath and plucked instruments; these synthesized
// web themes do not claim to be recordings of traditional national music.
const themes={
 hub:{title:'Les huit liens',root:53,bpm:72,instrument:'strings',motif:[0,null,7,null,9,null,7,4,2,null,4,null,7,null,2,null],chords:[0,5,7,0],pan:-.08},
 france:{title:'Le poids des preuves',root:55,bpm:76,instrument:'strings',motif:[0,null,2,7,null,4,2,null,9,null,7,4,2,null,0,null],chords:[0,5,2,7],pan:-.17},
 italie:{title:'Une lueur demeure',root:57,bpm:82,instrument:'pluck',motif:[0,4,null,7,9,null,7,4,2,null,4,7,12,null,9,7],chords:[0,5,9,7],pan:.16},
 estonie:{title:'La clarté des aurores',root:52,bpm:62,instrument:'bell',motif:[12,null,7,null,3,null,5,null,10,null,7,null,5,null,3,null],chords:[0,3,8,7],pan:.22},
 turquie:{title:'Le repère qui demeure',root:50,bpm:68,instrument:'reed',motif:[0,null,1,5,7,null,8,7,5,null,1,0,7,null,5,null],chords:[0,5,7,0],pan:-.19},
 algerie:{title:'Les portes ouvertes',root:53,bpm:80,instrument:'reed',motif:[0,2,null,5,7,null,10,7,5,2,null,0,2,null,5,null],chords:[0,5,10,7],pan:.12},
 tunisie:{title:'Avancer malgré le vent',root:55,bpm:86,instrument:'pluck',motif:[0,null,5,7,9,7,null,5,2,null,4,7,5,null,2,0],chords:[0,5,7,2],pan:-.12},
 maroc:{title:'La dignité du geste',root:50,bpm:74,instrument:'pluck',motif:[0,null,3,5,null,7,5,3,10,null,7,5,3,null,2,0],chords:[0,5,3,7],pan:.18},
 espagne:{title:'Le feu maîtrisé',root:52,bpm:96,instrument:'pluck',motif:[0,1,4,null,7,8,7,4,5,4,1,null,0,4,7,null],chords:[0,5,1,7],pan:-.2},
};
export const REALM_SCORE_THEMES=Object.freeze(Object.fromEntries(Object.entries(themes).map(([region,theme])=>[region,Object.freeze({...theme,region,motif:Object.freeze(theme.motif),chords:Object.freeze(theme.chords),origin:'original-3b-web-score'})])));
export function realmScoreTheme(region){return REALM_SCORE_THEMES[region]||REALM_SCORE_THEMES.hub;}
export function scoreFrequency(midi){return 440*2**((midi-69)/12);}
export function realmScoreTempo(region,state='exploration'){return realmScoreTheme(region).bpm*(['combat','guardian'].includes(state)?1.12:state==='secret'?.88:1);}
/** One eighth-note step, with a maximum of six voices. The scheduler owns time
 * and lifecycle; this pure score never grants a reward or changes boss state. */
export function realmScoreStep(region,state='exploration',step=0){
 const theme=realmScoreTheme(region),index=((Math.floor(step)%32)+32)%32,combat=['combat','guardian'].includes(state),cinematic=['cinematic','homecoming'].includes(state),chord=theme.chords[Math.floor(index/8)],notes=[];
 const note=(semitones,instrument,role,duration,gain,pan=0)=>notes.push({frequency:scoreFrequency(theme.root+semitones),instrument,role,duration,gain,pan});
 const motif=theme.motif[index%16];
 if(motif!==null){note(motif+12,theme.instrument,'melody',combat?.8:1.8,combat?.036:.030,theme.pan);if(cinematic&&index%4===0)note(motif+24,'bell','counterline',2.6,.009,-theme.pan);}
 if(index%8===0){note(chord-12,'lowstring','bass',combat?2.8:4.8,.028);note(chord,'strings','harmony',5.5,.012,-.26);note(chord+7,'strings','harmony',5.5,.010,.26);}
 if(combat&&index%4===2)note(chord-12,'lowstring','pulse',1.3,.022);
 if(state==='guardian'&&index%4===0)note(chord+12,'reed','threat',1.4,.015,-theme.pan);
 return {theme:theme.title,region:theme.region,step:index,seconds:30/realmScoreTempo(region,state),notes,percussion:combat&&index%4===0?{frequency:index%8===0?170:740,gain:.025,duration:.095}:null};
}
export const WEAPON_METAL_TIMBRES=Object.freeze({
 rapier:{fundamental:1660,partials:[1,1.48,2.08],duration:.2,gain:.07},
 blade:{fundamental:1120,partials:[1,1.61,2.43],duration:.24,gain:.075},
 daggers:{fundamental:2040,partials:[1,1.37,2.2],duration:.13,gain:.054},
 spear:{fundamental:1280,partials:[1,1.82,2.51],duration:.23,gain:.071},
 shield:{fundamental:760,partials:[1,1.53,2.32],duration:.33,gain:.09},
});
export function weaponMetalTimbre(weapon='blade',guard=false){if(guard)return WEAPON_METAL_TIMBRES.shield;const id=String(weapon).toLowerCase();return /rapi|paris|escrime/.test(id)?WEAPON_METAL_TIMBRES.rapier:/dagu|balti|double|scissor|claw/.test(id)?WEAPON_METAL_TIMBRES.daggers:/lance|spear/.test(id)?WEAPON_METAL_TIMBRES.spear:WEAPON_METAL_TIMBRES.blade;}
