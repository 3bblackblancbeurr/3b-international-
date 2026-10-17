// QA-only fixture. Not a production route or a wallet integration.
import React from 'react';import {createRoot} from 'react-dom/client';
import '../src/styles/gold-master.css';import '../src/finance/finance.css';
import CryptoProjectStudio from '../src/finance/crypto/CryptoProjectStudio.jsx';
createRoot(document.getElementById('crypto-test-root')).render(<main className="finance-studio" style={{maxWidth:1180,padding:'24px',margin:'0 auto'}}><CryptoProjectStudio/></main>);
