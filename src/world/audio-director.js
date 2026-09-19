export const AUDIO_STATES={
 exploration:{music:1,ambience:1},
 mission:{music:1.08,ambience:.92},
 combat:{music:1.42,ambience:.62},
 guardian:{music:1.58,ambience:.52},
 secret:{music:.82,ambience:1.1},
};
export function audioStateProfile(state='exploration'){return AUDIO_STATES[state]||AUDIO_STATES.exploration;}
