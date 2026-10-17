// Browser acceptance fixture, excluded from production entry points.
import React from 'react';import {createRoot} from 'react-dom/client';
import '../src/styles/gold-master.css';
import {LoyaltyProvider} from '../src/loyalty/LoyaltyContext.jsx';
import {authClient} from '../src/loyalty/client.js';
import AlbertPublicPreview from '../src/components/AlbertPublicPreview.jsx';
window.albertQAAuth=authClient.auth;
createRoot(document.getElementById('albert-test-root')).render(<LoyaltyProvider><main className="app3b" data-page="albert"><AlbertPublicPreview goTo={page=>{document.body.dataset.lastRoute=page;}}/></main></LoyaltyProvider>);
