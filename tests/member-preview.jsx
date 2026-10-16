// QA-only fixture. This is not bundled into the production application.
import React from 'react';
import {createRoot} from 'react-dom/client';
import '../src/styles/gold-master.css';
import MemberExperiences from '../src/member/MemberExperiences.jsx';
const profile={points:510,name:'Membre de test',handle:'demo'};
createRoot(document.getElementById('member-test-root'))
 .render(<MemberExperiences profile={profile} goTo={page=>{document.body.dataset.lastRoute=page;}}/>);
