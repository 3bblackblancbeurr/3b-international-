import {garmentFamily} from '../../shared/studio.js';
export function placementsFor(garment){const f=garmentFamily(garment);return ['Hauts','Vestes & manteaux','Tenues complètes'].includes(f)?['Poitrine','Centre','Dos','Manche','Discret','Sans logo']:f==='Bas'?['Jambe','Centre','Dos','Discret','Sans logo']:['Centre','Dos','Discret','Sans logo'];}
export function selectGarment(design,garment){const options=placementsFor(garment);return {...design,garment,customGarment:'',placement:options.includes(design.placement)?design.placement:options[0]};}

