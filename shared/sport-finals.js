export const WORLD_FINAL_SPORTS=Object.freeze([
 'Tous','Football','Rugby','Boxe','Tennis','Basketball','Volleyball','Hockey','Badminton','Tennis de table',
]);

export const WORLD_FINALS=Object.freeze([
 {id:'football-2022',sport:'Football',year:2022,competition:'Coupe du monde FIFA',title:'Argentine – France',source:'FIFA',videoId:'RgqKdplLIk4',format:'Match complet'},
 {id:'football-2018',sport:'Football',year:2018,competition:'Coupe du monde FIFA',title:'France – Croatie',source:'FIFA',videoId:'SvV6aUki6LU',format:'Match complet'},
 {id:'football-f-2015',sport:'Football',year:2015,competition:'Coupe du monde féminine FIFA',title:'États-Unis – Japon',source:'FIFA',videoId:'FXVTSQSSBqI',format:'Match complet'},
 {id:'futsal-2024',sport:'Football',year:2024,competition:'Coupe du monde de futsal',title:'Brésil – Argentine',source:"L'ÉQUIPE",videoId:'2ytvHA9e4zE',format:'Replay intégral'},
 {id:'rugby-2023',sport:'Rugby',year:2023,competition:'Coupe du monde de rugby',title:'Nouvelle-Zélande – Afrique du Sud',source:'World Rugby',videoId:'V0UKtnwL7Ss',format:'Match complet'},
 {id:'rugby-2019',sport:'Rugby',year:2019,competition:'Coupe du monde de rugby',title:'Angleterre – Afrique du Sud',source:'World Rugby',videoId:'CvG69FVRsUs',format:'Match complet'},
 {id:'basket-2023',sport:'Basketball',year:2023,competition:'Coupe du monde FIBA',title:'Allemagne – Serbie',source:'FIBA Basketball',videoId:'NMgQj7fNrSQ',format:'Match complet'},
 {id:'basket-f-2022',sport:'Basketball',year:2022,competition:'Coupe du monde féminine FIBA',title:'Chine – États-Unis',source:'FIBA Basketball',videoId:'_0y-TNMczzc',format:'Match complet'},
 {id:'volley-2022',sport:'Volleyball',year:2022,competition:'Championnat du monde',title:'Pologne – Italie',source:'Volleyball World',videoId:'EU8IDJryH14',format:'Finale complète'},
 {id:'ice-hockey-2019',sport:'Hockey',year:2019,competition:'Championnat du monde IIHF',title:'Canada – Finlande',source:'IIHF',videoId:'1dVT3Br0CnE',format:'Finale complète'},
 {id:'field-hockey-2014',sport:'Hockey',year:2014,competition:'Coupe du monde FIH',title:'Australie – Pays-Bas',source:'International Hockey Federation',videoId:'nAfzagRAS74',format:'Finale complète'},
 {id:'boxing-olympic-2012',sport:'Boxe',year:2012,competition:'Finale olympique · 75 kg femmes',title:'États-Unis – Russie',source:'Olympic Games',videoId:'6k3X0JnuuYA',format:'Combat complet'},
 {id:'boxing-world-2025',sport:'Boxe',year:2025,competition:'Championnats du monde IBA',title:'Session des finales hommes',source:'IBA Boxing',videoId:'LxuVQyNvZRs',format:'Finales complètes'},
 {id:'tennis-davis-2025',sport:'Tennis',year:2025,competition:'Finale de la Coupe Davis',title:'Flavio Cobolli – Jaume Munar',source:'World Tennis',videoId:'NlT4aOUEj5M',format:'Match complet'},
 {id:'badminton-2025',sport:'Badminton',year:2025,competition:'Championnats du monde BWF',title:'Shi Yu Qi – Kunlavut Vitidsarn',source:'BWF TV',videoId:'KgH2FQwZXG0',format:'Finale complète'},
 {id:'table-tennis-2025',sport:'Tennis de table',year:2025,competition:'Championnats du monde ITTF',title:'Hugo Calderano – Wang Chuqin',source:'World Table Tennis',videoId:'GfaSz4TKlpc',format:'Finale complète'},
]);

export function safeWorldFinalVideoId(value){
 const id=String(value||'').trim();
 return WORLD_FINALS.some(item=>item.videoId===id)&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
}
