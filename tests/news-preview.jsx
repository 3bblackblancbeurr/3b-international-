// Synthetic browser recipe only; not bundled as a public production page.
import React from 'react';import {createRoot} from 'react-dom/client';
import '../src/styles/gold-master.css';import NewsStudio from '../src/member/news/NewsStudio.jsx';
createRoot(document.getElementById('news-test-root')).render(<main style={{maxWidth:1100,margin:'0 auto',padding:24}}><NewsStudio/></main>);
