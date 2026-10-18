export const PROJECT_FORMAT='3b-crypto-project';
export const TOKEN_DECIMALS=18;
export const UINT256_MAX=(1n<<256n)-1n;
export const NETWORKS=Object.freeze({local:{name:'EVM locale',chainId:null,tier:'local'},sepolia:{name:'Ethereum Sepolia',chainId:11155111,tier:'testnet'},mainnet:{name:'Ethereum Mainnet',chainId:1,tier:'production'}});
export const PROJECT_EVIDENCE=Object.freeze([
 {id:'design',title:'Usage et répartition',description:'Finalité, destinataires et justification de l’offre.'},
 {id:'custody',title:'Garde et destinataire',description:'Contrôle de l’adresse, personnes habilitées et procédure de récupération.'},
 {id:'security',title:'Revue technique',description:'Revue indépendante du code, des paramètres et des risques.'},
 {id:'testnet',title:'Recette sur testnet',description:'Résultats de recette, réseau, transactions et anomalies traitées.'},
 {id:'legal',title:'Qualification et conditions',description:'Analyse du projet et des droits associés par les personnes compétentes.'},
 {id:'operations',title:'Exploitation et incidents',description:'Suivi, communication et traitement des incidents.'},
]);
const clean=(value,max=500)=>typeof value==='string'?value.slice(0,max):'';
export function newCryptoProject(){return {version:1,title:'Projet T3B',purpose:'',supplyTokens:'',recipient:'',network:'local',organisation:'',lead:'',reviewer:'',evidence:Object.fromEntries(PROJECT_EVIDENCE.map(item=>[item.id,{reference:'',reviewer:'',date:''}]))};}
export function normalizeCryptoProject(value){const empty=newCryptoProject();return {...empty,title:typeof value?.title==='string'?clean(value.title,100):empty.title,purpose:clean(value?.purpose,1000),supplyTokens:clean(value?.supplyTokens,100),recipient:clean(value?.recipient,42),network:Object.hasOwn(NETWORKS,value?.network)?value.network:'local',organisation:clean(value?.organisation,120),lead:clean(value?.lead,120),reviewer:clean(value?.reviewer,120),evidence:Object.fromEntries(PROJECT_EVIDENCE.map(({id})=>[id,{reference:clean(value?.evidence?.[id]?.reference,500),reviewer:clean(value?.evidence?.[id]?.reviewer,120),date:clean(value?.evidence?.[id]?.date,10)}]))};}
export function parseTokenSupply(value){
 if(typeof value!=='string'||value.length>100||!/^\d+(?:[.,]\d{1,18})?$/.test(value.trim()))throw new Error('Saisis une quantité positive, avec 18 décimales maximum et sans notation scientifique.');
 const [whole,fraction='']=value.trim().replace(',','.').split('.');const units=BigInt(whole)*10n**18n+BigInt(fraction.padEnd(18,'0'));
 if(units<=0n)throw new Error('L’offre du projet doit être supérieure à zéro.');if(units>UINT256_MAX)throw new Error('L’offre dépasse la limite uint256 du contrat.');return units;
}
export function isRecipient(value){return typeof value==='string'&&/^0x[0-9a-fA-F]{40}$/.test(value)&&!/^0x0{40}$/i.test(value);}
export function validateCryptoParameters(project){const errors={};if(!project?.title?.trim())errors.title='Donne un nom à ce dossier.';if(!project?.purpose?.trim())errors.purpose='Décris la finalité du projet.';let supplyBaseUnits=null;try{supplyBaseUnits=parseTokenSupply(project?.supplyTokens).toString();}catch(error){errors.supplyTokens=error.message;}if(!isRecipient(project?.recipient))errors.recipient='Renseigne une adresse publique Ethereum non nulle (0x et 40 caractères hexadécimaux).';if(!Object.hasOwn(NETWORKS,project?.network))errors.network='Choisis un environnement connu.';return {valid:Object.keys(errors).length===0,errors,supplyBaseUnits};}
const validDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;};
export function projectToday(){const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function assessCryptoProject(value,asOf=projectToday()){
 const project=normalizeCryptoProject(value),parameters=validateCryptoParameters(project);const required=project.network==='local'?['design']:project.network==='sepolia'?['design','custody','security']:PROJECT_EVIDENCE.map(item=>item.id);
 const evidence=PROJECT_EVIDENCE.map(item=>{const proof=project.evidence[item.id];return {...item,required:required.includes(item.id),complete:!!proof.reference.trim()&&!!proof.reviewer.trim()&&validDate(proof.date)&&proof.date<=asOf};});
 const governanceComplete=!!project.organisation.trim()&&!!project.lead.trim()&&!!project.reviewer.trim()&&project.lead.trim().toLowerCase()!==project.reviewer.trim().toLowerCase();const missing=evidence.filter(item=>item.required&&!item.complete);
 const complete=parameters.valid&&governanceComplete&&missing.length===0;const status=!parameters.valid?'draft':!complete?'documentation':project.network==='local'?'local-preparation':project.network==='sepolia'?'testnet-review':'production-review';
 const labels={draft:'Paramètres à compléter',documentation:'Dossier en préparation','local-preparation':'Dossier local complet','testnet-review':'Prêt pour une revue testnet','production-review':'Revue de lancement à effectuer'};
 return {parameters,evidence,missing,governanceComplete,status,label:labels[status],complete,network:NETWORKS[project.network],deployed:false,broadcastEnabled:false};
}
export function createCryptoManifest(value,asOf){const project=normalizeCryptoProject(value),assessment=assessCryptoProject(project,asOf);return {format:PROJECT_FORMAT,version:1,project,contract:{name:'ThreeBTokenPrototype',tokenName:'3B Token Prototype',symbol:'T3B',decimals:18,supplyMode:'fixed-constructor-only',mintAdmin:false,upgradeable:false},parameters:{initialRecipient:assessment.parameters.valid?project.recipient:null,supplyBaseUnits:assessment.parameters.supplyBaseUnits},network:{...assessment.network,deployed:false,contractAddress:null},review:{status:assessment.status,parametersValid:assessment.parameters.valid,governanceComplete:assessment.governanceComplete,missingEvidence:assessment.missing.map(item=>item.id),evidenceNature:'user-declared references; not independently verified'},execution:{mode:'preparation-only',signed:false,broadcast:false},simulation:{symbol:'3BT démo',decimals:2,linkedToPrototype:false}};}
export function exportCryptoProject(value){return JSON.stringify(createCryptoManifest(value),null,2);}
export function importCryptoProject(text){
 if(typeof text!=='string'||text.length>30000)throw new Error('Le manifeste est trop volumineux (30 Ko maximum).');let parsed;try{parsed=JSON.parse(text);}catch{throw new Error('Le manifeste JSON est illisible.');}
 if(parsed?.format!==PROJECT_FORMAT||parsed.version!==1||parsed.project?.version!==1||!Object.hasOwn(NETWORKS,parsed.project?.network))throw new Error('Ce fichier n’est pas un manifeste de projet T3B compatible.');
 const forbidden=['privatekey','mnemonic','seedphrase','secret','rpcurl'];function inspect(value){if(value&&typeof value==='object')for(const [key,entry]of Object.entries(value)){if(forbidden.includes(key.toLowerCase().replace(/[_-]/g,'')))throw new Error('Ce manifeste contient un champ sensible qui ne doit pas être importé.');inspect(entry);}}inspect(parsed);
 const limits={title:100,purpose:1000,supplyTokens:100,recipient:42,organisation:120,lead:120,reviewer:120};for(const [key,limit]of Object.entries(limits))if(typeof parsed.project[key]!=='string'||parsed.project[key].length>limit)throw new Error('Le champ '+key+' est invalide ou trop long.');
 for(const item of PROJECT_EVIDENCE){const proof=parsed.project.evidence?.[item.id];if(!proof||typeof proof.reference!=='string'||proof.reference.length>500||typeof proof.reviewer!=='string'||proof.reviewer.length>120||typeof proof.date!=='string'||proof.date.length>10)throw new Error('Une référence de revue est invalide.');}
 const project=normalizeCryptoProject(parsed.project);if(parsed.contract&&(parsed.contract.symbol!=='T3B'||parsed.contract.decimals!==18))throw new Error('Le manifeste ne décrit pas le prototype T3B à 18 décimales.');return project;
}
