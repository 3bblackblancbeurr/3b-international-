// Development-only recipe. Synthetic identities never authenticate to a server.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../src/styles/gold-master.css';
import {PrivateDocumentsWorkspace} from '../src/documents-private/PrivateDocumentsVault.jsx';
import AdminJourney from '../src/member/admin/AdminJourney.jsx';
const accounts={a:'a1000000-0000-4000-8000-000000000001',b:'b2000000-0000-4000-8000-000000000002',guest:null};
function Preview(){const [account,setAccount]=useState('a'),[publicFollowup,setPublicFollowup]=useState(false);return <main style={{maxWidth:1120,margin:'0 auto',padding:24,color:'var(--3b-text)',background:'var(--3b-obsidian)'}}><p>Recette locale uniquement · identités synthétiques · aucun compte de production.</p><nav aria-label="Contrôles de recette"><button onClick={()=>setAccount('a')}>QA : compte A</button><button onClick={()=>setAccount('b')}>QA : compte B</button><button onClick={()=>setAccount('guest')}>QA : visiteur</button><button onClick={()=>setPublicFollowup(value=>!value)}>QA : suivi administratif public</button></nav>{publicFollowup?<AdminJourney/>:<PrivateDocumentsWorkspace ownerId={accounts[account]} displayName={'Recette '+account.toUpperCase()} cases={[{id:'case-synthetic',title:'Dossier fiscal de recette'}]}/>}</main>;}
createRoot(document.getElementById('documents-private-qa')).render(<Preview/>);
