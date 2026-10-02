import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { LuxuryProvider } from "./design-system/LuxuryExperience.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import {LoyaltyProvider} from './loyalty/LoyaltyContext.jsx';
import "./index.css";
import "./styles/platform-premium.css";
import "./styles/gold-master.css";
import "./styles/luxury-v2.css";
import { setupNativeApp } from './native/runtime.js';
import { captureAppOpen } from './lib/analytics.js';

document.documentElement.classList.add('js-app-ready');
const nativeSetup = setupNativeApp().catch(() => () => {});
if (import.meta.hot) import.meta.hot.dispose(() => { nativeSetup.then(dispose => dispose()); });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary><LoyaltyProvider><LuxuryProvider><App /></LuxuryProvider></LoyaltyProvider></AppErrorBoundary>
  </React.StrictMode>
);

captureAppOpen();
