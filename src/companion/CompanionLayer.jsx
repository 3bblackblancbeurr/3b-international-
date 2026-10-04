import React, { useCallback, useEffect, useRef, useState } from "react";
import CompanionAvatar from "./CompanionAvatar.jsx";
import { DEFAULT_COMPANION_PREFS, companionLabel, sanitizeCompanionPrefs } from "./companion-model.js";
import useCompanionBehavior from "./useCompanionBehavior.js";
import useCompanionGaze from './useCompanionGaze.js';
import { companionGuidance, companionTouch } from './companion-assistant.js';
import { Button } from '../design-system/index.jsx';
import { ArrowUpRight, Hand, Sparkles, Moon, Clock3, Fingerprint } from 'lucide-react';
import ConstellationLink from './ConstellationLink.jsx';
import { CONSTELLATION_KEY, readConstellation } from './constellation.js';
import {
  companionPlatform, endCompanionLiveActivity, getCompanionCapabilities,
  openCompanionWallpaperPicker, requestOverlayPermission, setNativeCompanionMode,
  startCompanionLiveActivity, startCompanionOverlay, stopCompanionOverlay,
  syncCompanionWidget, updateCompanionLiveActivity,
} from "../native/companion.js";

const PREFS_KEY = "threeb_companion_prefs_v1";
function readPrefs() {
  try { return sanitizeCompanionPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")); }
  catch { return { ...DEFAULT_COMPANION_PREFS }; }
}

export default function CompanionLayer({ page, secretPhase, memberRegistered, goTo }) {
  const [prefs, setPrefs] = useState(readPrefs);
  const [panelOpen, setPanelOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [interaction, setInteraction] = useState(null);
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
  const dragRef = useRef(null);
  const suppressClick = useRef(false);
  const platform = companionPlatform();
  const behavior = useCompanionBehavior({
    prefs, page, secretPhase, memberRegistered, paused: panelOpen || focused || dragging,
    nativeLowPower: capabilities?.lowPower === true,
    nativeReducedMotion: capabilities?.reducedMotion === true,
  });
  const { mode, x, facing, lowPower, reducedMotion, visible, motionAllowed, online, react, setPosition } = behavior;
  const label = mode==='secret'&&['open','attempt'].includes(secretPhase) ? 'Le Secret est ouvert' : companionLabel(mode);
  const guidance = companionGuidance({ page, secretPhase, memberRegistered });
  useCompanionGaze(shellRef, visible && prefs.enabled && !reducedMotion && !lowPower && !dragging && !prefs.reducedPresence);
  useEffect(() => {
    if (!interaction) return;
    const timer = setTimeout(() => setInteraction(null), interaction.duration);
    return () => clearTimeout(timer);
  }, [interaction]);
  useEffect(() => { setInteraction(null); }, [page, visible]);
  const touch = kind => setInteraction(companionTouch(kind));
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
    if (!visible) { setPanelOpen(false); setFocused(false); setDragging(false); dragRef.current = null; }
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

  function pointerDown(event) {
    if (event.button !== 0 || !event.isPrimary) return;
    suppressClick.current = false;
    const displayedX = (event.currentTarget.getBoundingClientRect().left + 50) / Math.max(1, window.innerWidth) * 100;
    setPosition(displayedX);
    dragRef.current = { id: event.pointerId, start: event.clientX, x: displayedX };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.start;
    if (!suppressClick.current && Math.abs(delta) < 6) return;
    suppressClick.current = true; setDragging(true);
    setPosition(drag.x + delta / Math.max(1, window.innerWidth) * 100);
  }
  function pointerEnd(event) {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!prefs.enabled) {
    const notice = nativeStatus || (overlayActive || liveActive ? "Le mode externe est encore actif. Rouvre le compagnon pour l’arrêter." : "");
    return <><button className="companion3b-reactivate" type="button" onClick={() => { updatePrefs({ enabled: true }); if (notice) setPanelOpen(true); }} aria-label="Réactiver le Compagnon 3B">3B</button>{notice && <p className="companion3b-stop-notice" role="status">{notice}</p>}</>;
  }

  return <>
    <button ref={shellRef} type="button" className="companion3b-shell"
      data-mode={mode} data-page={page} data-facing={facing} data-dragging={dragging}
      data-motion={motionAllowed ? "full" : "reduced"} data-low-power={lowPower}
      data-discreet={prefs.reducedPresence} data-visible={visible}
      data-interaction={interaction?.pose || ''}
      style={{ "--companion-x": `${x}vw` }}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setPosition(x + (event.key === "ArrowLeft" ? -8 : 8)); }
      }}
      onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } if (!panelOpen) touch('hello'); setPanelOpen(open => !open); }}
      aria-label={`Compagnon 3B · ${label}`} aria-expanded={panelOpen} aria-controls={panelOpen ? "companion3b-panel" : undefined}
      aria-describedby={panelOpen ? "companion3b-position-help" : undefined} title={`${label} · ouvrir le compagnon`}>
      <span className="companion3b-bubble" data-side={x < 45 ? "right" : "left"} aria-hidden="true">{interaction?.message || label}</span>
      <CompanionAvatar mode={mode} interaction={interaction?.pose} bond={bond} reduced={reducedMotion||lowPower||!visible||panelOpen||prefs.reducedPresence} size={prefs.reducedPresence || lowPower ? 72 : 112} decorative />
    </button>

    {panelOpen && <aside ref={panelRef} className="companion3b-panel" id="companion3b-panel" role="dialog" aria-labelledby="companion3b-title">
      <div className="companion3b-panel-head">
        <div><span className="companion3b-kicker">COMPAGNON 3B</span><h2 id="companion3b-title">L’esprit 3B</h2></div>
        <button ref={closeRef} type="button" onClick={() => { setPanelOpen(false); shellRef.current?.focus({ preventScroll: true }); }} aria-label="Fermer le compagnon">×</button>
      </div>
      <div className="companion3b-portrait" data-mode={mode}>
        <div className="companion3b-portrait-ring" aria-hidden="true"><CompanionAvatar mode={mode} interaction={interaction?.pose} bond={bond} reduced={reducedMotion||lowPower||!visible} size={220} decorative /></div>
        <div><span className="companion3b-presence"><i aria-hidden="true" /> {online ? "À TES CÔTÉS" : "PRÉSENT HORS LIGNE"}</span><strong>{label}</strong><p>{guidance.message}</p></div>
      </div>
      {goTo&&<div className="companion3b-equipment" role="group" aria-label="Objets du compagnon">
        <Button variant="ghost" onClick={()=>{setPanelOpen(false);goTo('passport');}}><Fingerprint size={18}/><span>Passeport<small>Sa carte à la ceinture</small></span></Button>
        <Button variant="ghost" onClick={()=>{setPanelOpen(false);goTo('secret');}}><Clock3 size={18}/><span>Premier Secret<small>Son coffre & son horloge</small></span></Button>
      </div>}
      <div className="companion3b-touch" role="group" aria-label="Interagir avec le compagnon">
        <Button variant="ghost" aria-pressed={interaction?.pose==='hello'} onClick={()=>touch('hello')}><Hand size={17}/>Bonjour</Button>
        <Button variant="ghost" aria-pressed={interaction?.pose==='curious'} onClick={()=>touch('curious')}><Sparkles size={17}/>Curieux ?</Button>
        <Button variant="ghost" aria-pressed={interaction?.pose==='rest'} onClick={()=>touch('rest')}><Moon size={17}/>Une pause</Button>
      </div>
      <p className="companion3b-response" role="status" aria-live="polite">{interaction?.message || 'Un toucher, une réaction. Je suis là.'}</p>
      <Button variant="ghost" className="companion3b-link-trigger" aria-expanded={linkOpen} aria-controls="companion3b-link-zone" onClick={()=>setLinkOpen(open=>!open)}><Sparkles size={18}/><span><strong>{bond.length===8?'Votre constellation':'Tisser un lien'}</strong><small>Huit étoiles. Votre signature.</small></span><span aria-hidden="true">{linkOpen?'−':'+'}</span></Button>
      <div id="companion3b-link-zone" hidden={!linkOpen}>{linkOpen&&<ConstellationLink bond={bond} onChange={saveBond} onComplete={()=>setInteraction({pose:'hello',message:'Votre constellation est née.',duration:4000})}/>}</div>
      {goTo&&<div className="companion3b-shortcuts" aria-label="Suggestions du compagnon">{guidance.actions.map(action=><Button key={action.page} variant="ghost" onClick={()=>{setPanelOpen(false);goTo(action.page);}}><span><strong>{action.label}</strong><small>{action.hint}</small></span><ArrowUpRight size={18}/></Button>)}</div>}
      <Button variant="ghost" className="companion3b-settings-trigger" aria-expanded={settingsOpen} aria-controls="companion3b-settings" onClick={()=>setSettingsOpen(open=>!open)}>Ma présence <span aria-hidden="true">{settingsOpen?'−':'+'}</span></Button>
      <div id="companion3b-settings" hidden={!settingsOpen}>
      <div className="companion3b-energy" role="status">{reducedMotion ? "Animations réduites selon tes réglages" : lowPower ? "Batterie faible · animations au repos" : prefs.batterySaver ? "Batterie intelligente · promenades espacées" : "Promenades et pauses naturelles"}</div>
      <div className="companion3b-toggles">
        <label><span><strong>Batterie intelligente</strong><small>Plus de pauses entre les promenades</small></span><input type="checkbox" role="switch" checked={prefs.batterySaver} onChange={event => updatePrefs({ batterySaver: event.target.checked })} /></label>
        <label><span><strong>Présence discrète</strong><small>Plus petit, sans déplacement automatique</small></span><input type="checkbox" role="switch" checked={prefs.reducedPresence} onChange={event => updatePrefs({ reducedPresence: event.target.checked })} /></label>
      </div>
      <div className="companion3b-placement" role="group" aria-label="Position du compagnon"><Button variant="ghost" onClick={() => setPosition(12)}>À gauche</Button><Button variant="ghost" onClick={() => setPosition(88)}>À droite</Button></div>
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
      <p className="companion3b-privacy">Silencieux. Aucune lecture de l’écran, aucun accès au micro ou à la caméra par le compagnon.</p>
      <button className="companion3b-disable" type="button" disabled={busy} onClick={disableCompanion}>{busy ? "Un instant…" : "Mettre le compagnon de côté"}</button>
      </div>
    </aside>}
  </>;
}
