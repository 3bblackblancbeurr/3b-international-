import { useCallback, useEffect, useReducer, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  companionMotionAllowed,
  companionReducer,
  createCompanionState,
  nextCompanionDeadline,
} from "./companion-model.js";

function readReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
    || document.documentElement.getAttribute("data-motion") === "reduced"
    || document.documentElement.getAttribute("data-experience-motion") === "reduced";
}

export default function useCompanionBehavior({
  prefs,
  page,
  secretPhase,
  memberRegistered,
  paused = false,
  nativeLowPower = false,
  nativeReducedMotion = false,
}) {
  const [webLowPower, setWebLowPower] = useState(false);
  const [webReducedMotion, setWebReducedMotion] = useState(readReducedMotion);
  const lowPower = webLowPower || nativeLowPower;
  const reducedMotion = webReducedMotion || nativeReducedMotion;
  const [state, dispatch] = useReducer(companionReducer, null, () => createCompanionState({
    prefs,
    context: { page, secretPhase, memberRegistered },
    environment: {
      visible: typeof document === "undefined" || !document.hidden,
      online: typeof navigator === "undefined" || navigator.onLine !== false,
      paused,
      lowPower,
      reducedMotion,
    },
    now: Date.now(),
  }));

  const react = useCallback((eventType, detail) => {
    dispatch({ type: "event", eventType, detail, now: Date.now() });
  }, []);
  const setPosition = useCallback((x) => {
    dispatch({ type: "position", x, now: Date.now() });
  }, []);

  useEffect(() => {
    dispatch({ type: "sync", prefs, context: { page, secretPhase, memberRegistered }, now: Date.now() });
  }, [prefs.enabled, prefs.quiet, prefs.batterySaver, prefs.reducedPresence,
    prefs.androidOverlayEnabled, prefs.iosLiveActivityEnabled, page, secretPhase, memberRegistered]);

  useEffect(() => {
    dispatch({ type: "sync", environment: { paused, lowPower, reducedMotion }, now: Date.now() });
  }, [paused, lowPower, reducedMotion]);

  useEffect(() => {
    const deadline = nextCompanionDeadline(state);
    if (deadline === null) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: "tick", now: Date.now() }), Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (!prefs.enabled) return undefined;
    const onEvent = (event) => {
      const type = event.type === "threeb:companion" ? event.detail?.type : event.type.slice("threeb:".length);
      react(type, event.detail);
    };
    const events = ["threeb:companion", "threeb:reward", "threeb:celebrate", "threeb:notification", "threeb:secret"];
    events.forEach((name) => window.addEventListener(name, onEvent));
    return () => events.forEach((name) => window.removeEventListener(name, onEvent));
  }, [prefs.enabled, react]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => setWebReducedMotion(readReducedMotion());
    sync();
    if (media?.addEventListener) media.addEventListener("change", sync);
    else media?.addListener?.(sync);
    const observer = typeof MutationObserver === "function" ? new MutationObserver(sync) : null;
    observer?.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion", "data-experience-motion"] });
    return () => {
      if (media?.removeEventListener) media.removeEventListener("change", sync);
      else media?.removeListener?.(sync);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let nativeActive = true;
    let nativeListener;
    const syncVisibility = () => {
      if (mounted) dispatch({ type: "sync", environment: { visible: !document.hidden && nativeActive }, now: Date.now() });
    };
    const syncNetwork = () => {
      const online = navigator.onLine !== false;
      dispatch({ type: "sync", environment: { online }, now: Date.now() });
      react(online ? "support" : "guardian");
    };
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("online", syncNetwork);
    window.addEventListener("offline", syncNetwork);
    if (Capacitor.isNativePlatform()) {
      let receivedState = false;
      App.addListener("appStateChange", ({ isActive }) => {
        receivedState = true;
        nativeActive = isActive;
        syncVisibility();
      }).then((listener) => {
        if (!mounted) listener.remove().catch(() => {});
        else nativeListener = listener;
      }).catch(() => {});
      App.getState().then(({ isActive }) => {
        if (!receivedState) {
          nativeActive = isActive;
          syncVisibility();
        }
      }).catch(() => {});
    }
    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("online", syncNetwork);
      window.removeEventListener("offline", syncNetwork);
      nativeListener?.remove().catch(() => {});
    };
  }, [react]);

  useEffect(() => {
    if (!prefs.enabled || typeof navigator.getBattery !== "function") return undefined;
    let mounted = true;
    let battery;
    const sync = () => {
      if (mounted && battery) setWebLowPower(!battery.charging && battery.level <= 0.2);
    };
    // Promise.resolve also catches synchronous API rejection in restricted WebViews.
    Promise.resolve().then(() => navigator.getBattery()).then((value) => {
      if (!mounted) return;
      battery = value;
      sync();
      battery.addEventListener("levelchange", sync);
      battery.addEventListener("chargingchange", sync);
    }).catch(() => {});
    return () => {
      mounted = false;
      battery?.removeEventListener("levelchange", sync);
      battery?.removeEventListener("chargingchange", sync);
    };
  }, [prefs.enabled]);

  return {
    mode: state.mode,
    x: state.x,
    facing: state.facing,
    lowPower,
    reducedMotion,
    visible: state.environment.visible,
    online: state.environment.online,
    motionAllowed: companionMotionAllowed(state),
    react,
    setPosition,
  };
}
