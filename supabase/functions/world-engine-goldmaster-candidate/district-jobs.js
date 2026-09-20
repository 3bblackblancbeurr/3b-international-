export const DISTRICT_JOBS={
 atelier:{title:'Le repas des bâtisseurs',detail:'Porte une provision aux artisans. Ils partageront le bois et la pierre préparés pour le quartier.',cost:1,reward:{wood:2,stone:1},label:'Livrer aux artisans'},
 garden:{title:'Les jardins reprennent vie',detail:'Apporte une provision aux jardiniers et aide à la récolte. Tu repartiras avec trois provisions pour ton groupe.',cost:1,reward:{food:3},label:'Aider les jardiniers'},
};
export function availableJobs(home){return Object.entries(DISTRICT_JOBS).filter(([id])=>!home.jobs?.includes(id));}
