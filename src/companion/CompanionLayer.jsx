import React, { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from 'react-dom';
import CompanionAvatar from "./CompanionAvatar.jsx";
import { DEFAULT_COMPANION_PREFS, companionLabel, sanitizeCompanionPrefs } from "./companion-model.js";
import useCompanionBehavior from "./useCompanionBehavior.js";
import useCompanionGaze from './useCompanionGaze.js';
import { companionGuidance } from './companion-assistant.js';
import { COMPANION_PERSONALITIES, DEFAULT_LIVING_PREFS, sanitizeLivingPrefs, companionReply, companionSceneLine, companionQuestion } from './companion-personality.js';
import useCompanionStage from './useCompanionStage.js';
import useCompanionVoice from './useCompanionVoice.js';
import CompanionStudio from './CompanionStudio.jsx';
import '../styles/companion-living.css';
import { Button } from '../design-system/index.jsx';
import { ArrowUpRight, Sparkles, Clock3, Fingerprint, X, Volume2, VolumeX } from 'lucide-react';
import ConstellationLink from './ConstellationLink.jsx';
import { CONSTELLATION_KEY, readConstellation } from './constellation.js';
import {
  companionPlatform, endCompanionLiveActivity, getCompanionCapabilities,
  openCompanionWallpaperPicker, requestOverlayPermission, setNativeCompanionMode,
  startCompanionLiveActivity, startCompanionOverlay, stopCompanionOverlay,
  syncCompanionWidget, updateCompanionLiveActivity,
} from "../native/companion.js";

const PREFS_KEY = "threeb_companion_prefs_v1";
const LIVING_PREFS_KEY = 'threeb_companion_living_v1';
function readPrefs() {
  try { return sanitizeCompanionPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")); }
  catch { return { ...DEFAULT_COMPANION_PREFS }; }
}
function readLivingPrefs() {
  try { return sanitizeLivingPrefs(JSON.parse(localStorage.getItem(LIVING_PREFS_KEY) || '{}')); }
  catch { return { ...DEFAULT_LIVING_PREFS }; }
}
const TRAVEL_ACTIONS = new Set(['walk', 'hang', 'fall']);
const POSE_LABELS = { dance: 'Le rythme est lancé', breakdance: 'Place au mouvement', pocket: 'Une petite surprise', hologram: 'Une idée prend forme', hang: 'Accroché aux lettres', fall: 'Attention, j’arrive !', land: 'Bien réceptionné', highfive: 'Tape-là !', hello: 'Salut toi', curious: 'J’ai une question', focus: 'À ton rythme', think: 'Je réfléchis' };

export default function CompanionLayer({ page, secretPhase, memberRegistered, goTo }) {
  const [prefs, setPrefs] = useState(readPrefs);
  const [living, setLiving] = useState(readLivingPrefs);
  const [panelOpen, setPanelOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [interaction, setInteraction] = useState(null);
  const [lastReply, setLastReply] = useState(null);
  const [history, setHistory] = useState([]);
  const [requestedTab, setRequestedTab] = useState(null);
  const [pendingTravel, setPendingTravel] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [linkOpen,setLinkOpen]=useState(false);
  const [bond,setBond]=useState(()=>{try{return readConstellation(window.localStorage);}catch{return [];}});
  const [capabilities, setCapabilities] = useState(null);
  const [nativeStatus, setNativeStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const refreshId = useRef(0);
  const shellRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const turnRef = useRef(0);
  const recentRef = useRef([]);
  const messageId = useRef(0);
  const platform = companionPlatform();
  const behavior = useCompanionBehavior({
    // The stage owns all movement. The existing reducer still handles real app events.
    prefs, page, secretPhase, memberRegistered, paused: true,
    nativeLowPower: capabilities?.lowPower === true,
    nativeReducedMotion: capabilities?.reducedMotion === true,
  });
  const { mode, lowPower, reducedMotion, visible, online } = behavior;
  const voice = useCompanionVoice({ enabled: prefs.enabled && living.voiceEnabled, visible, personality: living.personality, voiceId: living.voiceId, voiceStyle: living.voiceStyle });
  const stopVoice = useCallback(() => {
    window.dispatchEvent(new CustomEvent('threeb:companion-voice-stop'));
    voice.stop();
  }, [voice.stop]);
  const profile = COMPANION_PERSONALITIES.find(item => item.id === living.personality) || COMPANION_PERSONALITIES[0];
  const guidance = companionGuidance({ page, secretPhase, memberRegistered });
  const showReply = useCallback((reply, { userGesture = false, automatic = false, silent = false } = {}) => {
    if (!reply?.message) return;
    const next = { ...reply, duration: reply.duration || (reply.choices?.length ? 18000 : 6500), id: ++messageId.current };
    setInteraction(next);
    setLastReply(next);
    recentRef.current = [...recentRef.current.slice(-7), next.message];
    // Ambient locomotion is deliberately absent from the discussion history.
    if (!automatic || next.choices?.length) setHistory(current => [...current, { id: next.id, sender: 'companion', message: next.message }].slice(-12));
    if (!silent) {
      if (userGesture) window.dispatchEvent(new CustomEvent('threeb:companion-voice-stop'));
      voice.speak(next.message, { userGesture });
    }
  }, [voice.speak]);
  const onStageScene = useCallback(scene => {
    if (scene.source !== 'auto') return;
    showReply({ pose: scene.kind, message: companionSceneLine(scene.kind, living.personality, turnRef.current++, recentRef.current) }, { automatic: true });
  }, [living.personality, showReply]);
  const stage = useCompanionStage({
    shellRef, enabled: prefs.enabled, visible, reducedMotion, lowPower, discreet: prefs.reducedPresence,
    paused: panelOpen || focused || focusMode || ['secret', 'reward', 'celebrate', 'notification', 'sleep'].includes(mode),
    autonomous: living.initiative, batterySaver: prefs.batterySaver, page, personality: living.personality, onScene: onStageScene,
  });
  const pose = stage.pose || interaction?.pose || (focusMode ? 'focus' : mode);
  const label = mode === 'secret' && ['open', 'attempt'].includes(secretPhase) ? 'Le Secret est ouvert' : POSE_LABELS[pose] || companionLabel(pose);
  const motionAllowed = visible && !reducedMotion && !lowPower && !prefs.reducedPresence;
  useCompanionGaze(shellRef, visible && prefs.enabled && !reducedMotion && !lowPower && !stage.dragging && !prefs.reducedPresence);
  useEffect(() => {
    if (!interaction) return;
    const timer = setTimeout(() => setInteraction(null), interaction.duration);
    return () => clearTimeout(timer);
  }, [interaction]);
  useEffect(() => { setInteraction(null); }, [page, visible]);
  useEffect(() => {
    if (!pendingTravel || panelOpen) return;
    const frame = requestAnimationFrame(() => {
      const started = stage.play(pendingTravel);
      if (!started && pendingTravel === 'hang') showReply({ pose: 'curious', message: 'Je cherche une lettre bien visible. Fais défiler jusqu’à un titre, puis réessaie.' });
      setPendingTravel(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingTravel, panelOpen, stage.play, showReply]);
  useEffect(() => {
    if (!prefs.enabled || !living.initiative || !visible || panelOpen || focusMode || reducedMotion || lowPower || prefs.reducedPresence || stage.suspended) return;
    if (['secret', 'reward', 'celebrate', 'notification', 'sleep'].includes(mode)) return;
    const delay = living.personality === 'calme' ? 72000 : living.personality === 'energique' ? 38000 : 51000;
    const timer = setTimeout(() => {
      if (document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')) return;
      stage.play('curious');
      showReply(companionQuestion(living.personality, turnRef.current++), { automatic: true });
    }, delay);
    return () => clearTimeout(timer);
  }, [prefs.enabled, living.initiative, living.personality, visible, panelOpen, focusMode, reducedMotion, lowPower, prefs.reducedPresence, stage.suspended, mode, stage.play, showReply, lastReply?.choices ? lastReply.id : 0]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('threeb:companion-speaking', { detail: { speaking: voice.speaking } }));
    return () => { if (voice.speaking) window.dispatchEvent(new CustomEvent('threeb:companion-speaking', { detail: { speaking: false } })); };
  }, [voice.speaking]);
  useEffect(() => { if (stage.suspended || !prefs.enabled || !living.voiceEnabled) stopVoice(); }, [stage.suspended, prefs.enabled, living.voiceEnabled, stopVoice]);

  const updateLiving = useCallback(patch => {
    setLiving(current => {
      const next = sanitizeLivingPrefs({ ...current, ...patch });
      try { localStorage.setItem(LIVING_PREFS_KEY, JSON.stringify(next)); } catch { /* Session-only preferences remain usable. */ }
      return next;
    });
  }, []);
  function chooseLiving(patch) {
    if (patch.personality || patch.voiceId || patch.voiceStyle) stopVoice();
    if (patch.personality) {
      voice.unlock({ userGesture: true });
      flushSync(() => updateLiving(patch));
      stage.cancel();
      const chosen = COMPANION_PERSONALITIES.find(item => item.id === patch.personality);
      showReply({ pose: 'hello', message: `${chosen?.label || 'Gentil'}. ${companionSceneLine('hello', patch.personality, turnRef.current++, recentRef.current)}` }, { userGesture: true });
    }
    else updateLiving(patch);
  }
  function performAction(action, suppliedReply) {
    voice.unlock({ userGesture: true });
    const kind = action === 'cheer' ? 'celebrate' : action;
    if (kind === 'curious') {
      showReply(companionQuestion(living.personality, turnRef.current++), { userGesture: true });
      setRequestedTab({ tab: 'talk', id: ++messageId.current });
      stage.play('curious');
      return;
    }
    setFocusMode(kind === 'focus');
    const reply = suppliedReply || { action: kind, pose: kind, message: companionSceneLine(kind, living.personality, turnRef.current++, recentRef.current) };
    showReply(reply, { userGesture: true });
    window.dispatchEvent(new CustomEvent('threeb:companion-action', { detail: { action: kind } }));
    if (TRAVEL_ACTIONS.has(kind)) { setPanelOpen(false); setPendingTravel(kind); }
    else stage.play(kind);
  }
  function submitMessage(text, destination) {
    const message = String(text || '').trim().slice(0, 300);
    if (!message) return;
    setHistory(current => [...current, { id: ++messageId.current, sender: 'user', message }].slice(-12));
    const reply = companionReply({ text: message, personality: living.personality, page, secretPhase, memberRegistered, turn: turnRef.current++, now: new Date(), recent: recentRef.current });
    if (reply.control) {
      stopVoice(); stage.cancel(); setPendingTravel(null);
      if (reply.control === 'mute') updateLiving({ voiceEnabled: false });
      else setFocusMode(true);
      showReply(reply, { silent: true });
    }
    else if (reply.action) performAction(reply.action, reply);
    else { showReply(reply, { userGesture: true }); stage.play(reply.pose || 'think'); }
    if (destination && goTo && ['home', 'passport', 'member', 'secret', 'world3b', 'guide', 'shop'].includes(destination)) { setPanelOpen(false); goTo(destination); }
  }
  function toggleVoice() {
    if (living.voiceEnabled) { stopVoice(); updateLiving({ voiceEnabled: false }); return; }
    voice.unlock({ userGesture: true });
    flushSync(() => updateLiving({ voiceEnabled: true }));
    voice.speak('Salut. Moi, c’est ton compagnon 3B. Prêt à faire un bout de chemin ensemble ?', { userGesture: true });
  }
  function sampleVoice() {
    stopVoice();
    voice.unlock({ userGesture: true });
    if (!living.voiceEnabled) flushSync(() => updateLiving({ voiceEnabled: true }));
    voice.speak('Bienvenue dans l’univers 3B. Une voix, un caractère, et l’aventure qui nous attend. On y va ?', { userGesture: true });
  }
  const saveBond = next => {
    setBond(next);
    try{localStorage.setItem(CONSTELLATION_KEY,JSON.stringify(next));return true;}catch{return false;}
  };
  const overlayActive = capabilities?.overlayActive ?? prefs.androidOverlayEnabled;
  const liveActive = capabilities?.liveActivityActive ?? prefs.iosLiveActivityEnabled;
  const nativeOptions = { batterySaver: prefs.batterySaver, reducedPresence: prefs.reducedPresence, reducedMotion };

  const updatePrefs = useCallback((patch) => {
    setPrefs(current => {
      const next = sanitizeCompanionPrefs({ ...current, ...patch });
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* In-memory mode remains usable. */ }
      return next;
    });
  }, []);

  const refreshCapabilities = useCallback(async () => {
    const request = ++refreshId.current;
    const value = await getCompanionCapabilities();
    if (!mounted.current || request !== refreshId.current) return;
    setCapabilities(current => ({ ...current, ...value }));
    // Preferences describe actual external presence, never permission to restart a stopped service.
    if (value.available !== false) updatePrefs({
      ...(typeof value.overlayActive === "boolean" ? { androidOverlayEnabled: value.overlayActive } : {}),
      ...(typeof value.liveActivityActive === "boolean" ? { iosLiveActivityEnabled: value.liveActivityActive } : {}),
    });
  }, [updatePrefs]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; ++refreshId.current; };
  }, []);

  useEffect(() => {
    if (visible && !busyRef.current) void refreshCapabilities();
  }, [visible, panelOpen, refreshCapabilities]);

  useEffect(() => {
    const onStorage = event => {
      if (event.key === PREFS_KEY || event.key === null) setPrefs(readPrefs());
      if (event.key === LIVING_PREFS_KEY || event.key === null) setLiving(readLivingPrefs());
      if (event.key === CONSTELLATION_KEY || event.key === null) { try { setBond(readConstellation(localStorage)); } catch { setBond([]); } }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = event => {
      if (event.key === "Escape") {
        event.preventDefault(); setPanelOpen(false); shellRef.current?.focus({ preventScroll: true });
      }
    };
    const onOutside = event => {
      if (!panelRef.current?.contains(event.target) && !shellRef.current?.contains(event.target)) setPanelOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [panelOpen]);

  useEffect(() => {
    if (!visible) { setPanelOpen(false); setFocused(false); setPendingTravel(null); }
  }, [visible]);

  useEffect(() => {
    if (!visible || !prefs.enabled || platform !== "android" || !overlayActive || busy) return;
    let current = true;
    setNativeCompanionMode(mode, { batterySaver: prefs.batterySaver, reducedPresence: prefs.reducedPresence, reducedMotion })
      .then(result => { if (current && result?.updated === false) void refreshCapabilities(); })
      .catch(() => { if (current) setNativeStatus("Synchronisation Android indisponible. Vérifie le mode externe ci-dessous."); });
    return () => { current = false; };
  }, [mode, visible, prefs.enabled, prefs.batterySaver, prefs.reducedPresence, reducedMotion, platform, overlayActive, busy, refreshCapabilities]);

  useEffect(() => {
    if (!visible || platform !== "ios") return;
    let current = true;
    // Widget sync never creates a Live Activity or shares event payloads.
    syncCompanionWidget({ mode, message: label, enabled: prefs.enabled }).catch(() => {
      if (current && capabilities?.widgetSync) setNativeStatus("Le widget n’a pas pu être actualisé.");
    });
    if (prefs.enabled && liveActive && !busy) {
      updateCompanionLiveActivity({ mode, message: label })
        .then(result => { if (current && result?.updated === false) void refreshCapabilities(); })
        .catch(() => { if (current) setNativeStatus("La Live Activity n’a pas pu être actualisée."); });
    }
    return () => { current = false; };
  }, [mode, label, visible, prefs.enabled, platform, liveActive, busy, capabilities?.widgetSync, refreshCapabilities]);

  async function runNative(action) {
    if (busyRef.current) return;
    busyRef.current = true; ++refreshId.current; setBusy(true);
    try { await action(); }
    catch { if (mounted.current) setNativeStatus("L’opération n’a pas abouti. Réessaie depuis l’application 3B."); }
    finally {
      busyRef.current = false;
      if (mounted.current) { setBusy(false); await refreshCapabilities(); }
    }
  }

  const enableOverlay = () => runNative(async () => {
    setNativeStatus("Vérification de l’autorisation Android…");
    const permission = await requestOverlayPermission();
    if (!permission?.granted) {
      setNativeStatus("Dans Android, autorise l’affichage par-dessus les applications. Reviens ensuite ici pour activer le compagnon.");
      return;
    }
    const result = await startCompanionOverlay({ mode, ...nativeOptions });
    if (!result?.started) throw new Error("overlay_not_started");
    updatePrefs({ androidOverlayEnabled: true });
    setNativeStatus("Compagnon activé. Pour l’arrêter, utilise le bouton ici ou maintiens le doigt sur le personnage.");
  });
  const disableOverlay = () => runNative(async () => {
    const result = await stopCompanionOverlay();
    if (!result?.stopped) throw new Error("overlay_not_stopped");
    updatePrefs({ androidOverlayEnabled: false });
    setNativeStatus("Compagnon hors application arrêté.");
  });
  const enableLive = () => runNative(async () => {
    const result = await startCompanionLiveActivity({ mode, message: label });
    if (!result?.started) { setNativeStatus("Les Live Activities sont indisponibles ou désactivées dans les réglages iOS."); return; }
    updatePrefs({ iosLiveActivityEnabled: true });
    setNativeStatus(result.reused ? "Live Activity déjà active, état actualisé." : "Live Activity 3B activée.");
  });
  const disableLive = () => runNative(async () => {
    const result = await endCompanionLiveActivity();
    if (!result?.ended) throw new Error("live_activity_not_ended");
    updatePrefs({ iosLiveActivityEnabled: false }); setNativeStatus("Live Activity 3B arrêtée.");
  });
  const openWallpaper = () => runNative(async () => {
    const result = await openCompanionWallpaperPicker();
    setNativeStatus(result?.opened ? "Choisis Compagnon 3B dans les fonds animés Android. Les écrans disponibles dépendent de ton téléphone." : "Les fonds animés ne sont pas disponibles sur cet appareil.");
  });
  const disableCompanion = () => runNative(async () => {
    let externalStopped = true;
    try {
      if (platform === "android" && (overlayActive || prefs.androidOverlayEnabled)) {
        externalStopped = (await stopCompanionOverlay())?.stopped === true;
      }
      if (platform === "ios" && (liveActive || prefs.iosLiveActivityEnabled)) {
        externalStopped = (await endCompanionLiveActivity())?.ended === true;
      }
    } catch { externalStopped = false; }
    setNativeStatus(externalStopped ? "" : "Présence locale masquée. L’arrêt du mode externe n’a pas été confirmé : rouvre le compagnon pour réessayer, ou arrête-le depuis ton téléphone.");
    updatePrefs({ enabled: false, ...(externalStopped ? { androidOverlayEnabled: false, iosLiveActivityEnabled: false } : {}) });
    setPanelOpen(false);
  });

  if (!prefs.enabled) {
    const notice = nativeStatus || (overlayActive || liveActive ? "Le mode externe est encore actif. Rouvre le compagnon pour l’arrêter." : "");
    return <><button className="companion3b-reactivate" type="button" onClick={() => { updatePrefs({ enabled: true }); if (notice) setPanelOpen(true); }} aria-label="Réactiver le Compagnon 3B">3B</button>{notice && <p className="companion3b-stop-notice" role="status">{notice}</p>}</>;
  }

  return <>
    <Button ref={shellRef} type="button" variant="ghost" className="companion3b-shell companion3b-living-shell"
      data-mode={pose} data-page={page} data-facing={stage.facing} data-dragging={stage.dragging}
      data-motion={motionAllowed ? "full" : "reduced"} data-low-power={lowPower}
      data-discreet={prefs.reducedPresence} data-visible={visible && !stage.suspended} data-personality={living.personality}
      data-interaction={interaction?.pose || ''}
      style={stage.style}
      onPointerDown={stage.onPointerDown} onPointerMove={stage.onPointerMove} onPointerUp={stage.onPointerUp} onPointerCancel={stage.onPointerCancel}
      onLostPointerCapture={stage.onPointerCancel}
      onFocus={event => setFocused(event.currentTarget.matches(':focus-visible'))} onBlur={() => setFocused(false)}
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); stage.place(event.key === 'ArrowLeft' ? 'left' : 'right'); }
      }}
      onClick={() => {
        if (stage.consumeClick()) return;
        voice.unlock({ userGesture: true });
        if (!panelOpen) {
          if (lastReply?.choices?.length) setRequestedTab({ tab: 'talk', id: ++messageId.current });
          else performAction('hello');
        }
        setPanelOpen(open => !open);
      }}
      aria-label={`Compagnon 3B · ${label}`} aria-expanded={panelOpen} aria-controls={panelOpen ? "companion3b-panel" : undefined}
      aria-describedby={panelOpen ? "companion3b-position-help" : undefined} title={`${label} · ouvrir le compagnon`}>
      <span className="companion3b-bubble" data-side={stage.bubbleSide} aria-hidden="true">{interaction?.message || label}{interaction?.choices?.length > 0 && <small>Touche-moi pour répondre</small>}</span>
      <CompanionAvatar mode={pose} bond={bond} reduced={reducedMotion||lowPower||prefs.reducedPresence} active={visible&&!panelOpen&&!stage.suspended} speaking={voice.speaking} facing={stage.facing} size={prefs.reducedPresence || lowPower ? 72 : 112} decorative />
    </Button>

    {panelOpen && <aside ref={panelRef} className="companion3b-panel companion3b-living-panel" data-personality={living.personality} id="companion3b-panel" role="dialog" aria-labelledby="companion3b-title">
      <div className="companion3b-panel-head">
        <div><span className="companion3b-kicker">COMPAGNON 3B</span><h2 id="companion3b-title">L’esprit prend vie.</h2></div>
        <div className="companion3b-head-actions">
          <Button variant="ghost" type="button" disabled={!voice.available} onClick={toggleVoice} aria-pressed={living.voiceEnabled} aria-label={living.voiceEnabled ? 'Couper la voix du compagnon' : 'Activer la voix du compagnon'}>{living.voiceEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}</Button>
          <Button variant="ghost" ref={closeRef} type="button" onClick={() => { setPanelOpen(false); shellRef.current?.focus({ preventScroll: true }); }} aria-label="Fermer le compagnon"><X size={20}/></Button>
        </div>
      </div>
      <div className="companion3b-portrait" data-mode={pose}>
        <span className="companion3b-character-label">{profile.label}</span>
        <div className="companion3b-portrait-ring" aria-hidden="true"><CompanionAvatar mode={pose} bond={bond} reduced={reducedMotion||lowPower} active={visible} speaking={voice.speaking} size={200} decorative /></div>
        <div><span className="companion3b-presence"><i aria-hidden="true" /> {voice.speaking ? 'IL TE PARLE' : online ? 'À TES CÔTÉS' : 'PRÉSENT HORS LIGNE'}</span><strong>{label}</strong></div>
      </div>
      <p className="companion3b-response" role="status" aria-live="polite">{interaction?.message || lastReply?.message || guidance.message}</p>
      <CompanionStudio living={living} onLivingChange={chooseLiving} onAction={performAction} onSubmit={submitMessage} reply={lastReply} history={history} voice={voice} onVoiceToggle={toggleVoice} onVoiceSample={sampleVoice} onVoiceStop={stopVoice} focused={focusMode} onResume={() => { setFocusMode(false); performAction('hello'); }} requestedTab={requestedTab}/>
      {goTo&&<div className="companion3b-equipment" role="group" aria-label="Objets du compagnon">
        <Button variant="ghost" onClick={()=>{setPanelOpen(false);goTo('passport');}}><Fingerprint size={18}/><span>Passeport<small>Sa carte à la ceinture</small></span></Button>
        <Button variant="ghost" onClick={()=>{setPanelOpen(false);goTo('secret');}}><Clock3 size={18}/><span>Premier Secret<small>Son coffre & son horloge</small></span></Button>
      </div>}
      <Button variant="ghost" className="companion3b-link-trigger" aria-expanded={linkOpen} aria-controls="companion3b-link-zone" onClick={()=>setLinkOpen(open=>!open)}><Sparkles size={18}/><span><strong>{bond.length===8?'Votre constellation':'Tisser un lien'}</strong><small>Huit étoiles. Votre signature.</small></span><span aria-hidden="true">{linkOpen?'−':'+'}</span></Button>
      <div id="companion3b-link-zone" hidden={!linkOpen}>{linkOpen&&<ConstellationLink bond={bond} onChange={saveBond} onComplete={()=>performAction('hologram',{pose:'hologram',message:'Votre constellation est née. Huit étoiles, votre signature.'})}/>}</div>
      {goTo&&<div className="companion3b-shortcuts" aria-label="Suggestions du compagnon">{guidance.actions.map(action=><Button key={action.page} variant="ghost" onClick={()=>{setPanelOpen(false);goTo(action.page);}}><span><strong>{action.label}</strong><small>{action.hint}</small></span><ArrowUpRight size={18}/></Button>)}</div>}
      <Button variant="ghost" className="companion3b-settings-trigger" aria-expanded={settingsOpen} aria-controls="companion3b-settings" onClick={()=>setSettingsOpen(open=>!open)}>Ma présence <span aria-hidden="true">{settingsOpen?'−':'+'}</span></Button>
      <div id="companion3b-settings" hidden={!settingsOpen}>
      <div className="companion3b-energy" role="status">{reducedMotion ? "Animations réduites selon tes réglages" : lowPower ? "Batterie faible · animations au repos" : prefs.batterySaver ? "Batterie intelligente · promenades espacées" : "Promenades et pauses naturelles"}</div>
      <div className="companion3b-toggles">
        <label><span><strong>Batterie intelligente</strong><small>Plus de pauses entre les promenades</small></span><input type="checkbox" role="switch" checked={prefs.batterySaver} onChange={event => updatePrefs({ batterySaver: event.target.checked })} /></label>
        <label><span><strong>Présence discrète</strong><small>Plus petit, sans déplacement automatique</small></span><input type="checkbox" role="switch" checked={prefs.reducedPresence} onChange={event => updatePrefs({ reducedPresence: event.target.checked })} /></label>
      </div>
      <div className="companion3b-placement" role="group" aria-label="Position du compagnon"><Button variant="ghost" onClick={() => stage.place('left')}>À gauche</Button><Button variant="ghost" onClick={() => stage.place('right')}>À droite</Button></div>
      <p className="companion3b-hint" id="companion3b-position-help">Déplace-le avec le doigt, la souris ou les flèches du clavier.</p>

      {platform === "android" && <section className="companion3b-native-section" aria-label="Présence Android">
        <h3>Avec toi sur Android <span>{!capabilities || capabilities.available === false ? "État indisponible" : overlayActive ? "Actif" : "À l’arrêt"}</span></h3>
        <p className="companion3b-platform-note">Active sa présence au-dessus des applications avec l’autorisation Android. Tu gardes le contrôle.</p>
        <div className="companion3b-native-actions"><button type="button" disabled={busy || (!overlayActive && capabilities?.available === false)} onClick={overlayActive ? disableOverlay : enableOverlay}>{overlayActive ? "Arrêter hors de l’app" : "Activer hors de l’app"}</button><button type="button" disabled={busy || !capabilities?.liveWallpaper} onClick={openWallpaper}>Choisir le fond animé</button></div>
      </section>}
      {platform === "ios" && <section className="companion3b-native-section" aria-label="Présence iPhone">
        <h3>Avec toi sur iPhone <span>{!capabilities || capabilities.available === false ? "État indisponible" : liveActive ? "Actif" : "À l’arrêt"}</span></h3>
        <p className="companion3b-platform-note">Ajoute le widget 3B depuis les widgets de ton iPhone. La Live Activity utilise l’écran verrouillé et la Dynamic Island sur les modèles compatibles.</p>
        <div className="companion3b-native-actions"><button type="button" disabled={busy || (!liveActive && !capabilities?.liveActivity)} onClick={liveActive ? disableLive : enableLive}>{liveActive ? "Arrêter la Live Activity" : "Activer la Live Activity"}</button></div>
        {capabilities?.widgetSync === false && <p className="companion3b-hint">Le widget suit l’heure. La synchronisation avec l’app nécessite une version signée avec le groupe partagé 3B.</p>}
      </section>}
      {platform === "web" && <p className="companion3b-platform-note">Présent dans 3B, même hors ligne.</p>}
      {nativeStatus && <p className="companion3b-native-status" role="status" aria-live="polite">{nativeStatus}</p>}
      <p className="companion3b-privacy">Ta voix de compagnon est facultative. Aucun accès au micro ni à la caméra. Il repère seulement les titres visibles de 3B pour ses acrobaties. Ta discussion reste dans cette session.</p>
      <button className="companion3b-disable" type="button" disabled={busy} onClick={disableCompanion}>{busy ? "Un instant…" : "Mettre le compagnon de côté"}</button>
      </div>
    </aside>}
  </>;
}
