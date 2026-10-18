// Local QA only; no invented account, server save or remote game launch.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {LoyaltyProvider} from '../src/loyalty/LoyaltyContext.jsx';
import GamesHub from '../src/games/GamesHub.jsx';
import '../src/styles/gold-master.css';
createRoot(document.getElementById('games-premium-preview')).render(
 <LoyaltyProvider><main style={{maxWidth:1280,margin:'auto'}}><GamesHub goTo={page=>{document.body.dataset.route=page;}} goToGame={game=>{document.body.dataset.game=game;}}/></main></LoyaltyProvider>
);
