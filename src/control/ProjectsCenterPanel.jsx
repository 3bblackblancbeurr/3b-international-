import {Boxes,CheckCircle2,Cloud,GitBranch,Link2Off} from 'lucide-react';

const PROJECTS=[
 'Application 3B','Monde du 3B','Passeport 3B','3B Origins','Jeux 3B',
 'Nosbloc du 3B','3B Guardians','Stylcam','Sport 3B','Boutique 3B'
];

export default function ProjectsCenterPanel({pulse}){
 return <section className="control-section control-projects control-hide-in-focus" id="cc-projects" aria-label="Projets 3B">
  <header className="control-section-heading">
   <div><p className="control-kicker"><Boxes size={13}/> PROJETS · JALONS VÉRIFIABLES</p><h2>Projects Center</h2></div>
   <span className="control-projects-badge">10 PROJETS</span>
  </header>

  <div className="control-projects-lead">
   <Cloud size={17}/>
   <div><strong>Application 3B</strong><small>{pulse?.production===true?'Production répond au contrôle réel':pulse?.production===false?'Production à vérifier':'Contrôle production en cours'}</small></div>
   <span>{pulse?.commitSha||'main'}</span>
  </div>

  <div className="control-projects-list">
   {PROJECTS.map((name,index)=>{
    const app=index===0;
    return <article key={name}>
     <span className={'control-project-orb '+(app&&pulse?.production===true?'is-good':'')}>{app?<CheckCircle2 size={14}/>:<Link2Off size={14}/>}</span>
     <div><strong>{name}</strong><small>{app?(pulse?.commit?'Dernière activité GitHub globale disponible':'Source GitHub en attente'):'Suivi de jalons dédié non connecté'}</small></div>
     <b>{app?'ACTIF':'À CONNECTER'}</b>
    </article>;
   })}
  </div>

  <footer className="control-projects-foot"><GitBranch size={13}/><span>Aucun pourcentage d’avancement n’est calculé sans jalons mesurables propres à chaque projet.</span></footer>
 </section>;
}
