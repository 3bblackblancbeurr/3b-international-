import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import {LoyaltyProvider} from './loyalty/LoyaltyContext.jsx';
import "./index.css";
import { setupNativeApp } from './native/runtime.js';

const nativeSetup = setupNativeApp().catch(() => () => {});
if (import.meta.hot) import.meta.hot.dispose(() => { nativeSetup.then(dispose => dispose()); });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LoyaltyProvider><App /></LoyaltyProvider>
  </React.StrictMode>
);
