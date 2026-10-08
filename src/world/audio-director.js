export const AUDIO_STATES={
 exploration:{music:1,ambience:1},
 mission:{music:1.08,ambience:.92},
 combat:{music:1.42,ambience:.62},
 guardian:{music:1.58,ambience:.52},
 secret:{music:.82,ambience:1.1},
 cinematic:{music:1.18,ambience:.74},
 homecoming:{music:1.28,ambience:.82},
 interior:{music:.88,ambience:.76},
};
export function audioStateProfile(state='exploration'){return AUDIO_STATES[state]||AUDIO_STATES.exploration;}
export const SCORE_LAYER_STATES=Object.freeze({
 exploration:{melody:1,harmony:1,bass:.9,counterline:0,pulse:0,threat:0},
 mission:{melody:1,harmony:.95,bass:.8,counterline:0,pulse:0,threat:0},
 combat:{melody:.95,harmony:.75,bass:1.08,counterline:0,pulse:1,threat:0},
 guardian:{melody:1,harmony:.85,bass:1.1,counterline:0,pulse:1,threat:1},
 secret:{melody:.7,harmony:.6,bass:.55,counterline:0,pulse:0,threat:0},
 cinematic:{melody:1,harmony:1.15,bass:.92,counterline:1,pulse:0,threat:0},
 homecoming:{melody:1,harmony:1.12,bass:.9,counterline:1,pulse:0,threat:0},
 interior:{melody:.72,harmony:.7,bass:.65,counterline:0,pulse:0,threat:0},
});
export function scoreLayerProfile(state='exploration'){return SCORE_LAYER_STATES[state]||SCORE_LAYER_STATES.exploration;}

/* Three intentional, low-fatigue headphones/phone-speaker mixes. They only
 * change local preference gain; no user consent or sound on/off is overridden. */
export const WORLD_AUDIO_PRESETS=Object.freeze({
 ambiance:Object.freeze({master:.77,music:.45,ambience:.72,sfx:.23,voice:.85}),
 cinema:Object.freeze({master:.79,music:.65,ambience:.57,sfx:.34,voice:.94}),
 discret:Object.freeze({master:.63,music:.22,ambience:.44,sfx:.15,voice:.85}),
});
/** The original Circle resonance is a subtle chord under the entire city.
 * It gains a little detail only on the central plaza, never a piercing drone. */
export function brokenCircleMusicGain(distance,{indoors=false}={}){
 const d=Number.isFinite(Number(distance))?Math.max(0,Number(distance)):10000;
 const near=Math.max(0,1-d/190);
 return .0022+(indoors?.001:.0055)*near*near;
}
