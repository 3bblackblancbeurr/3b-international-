import { useCallback, useEffect, useRef, useState } from 'react';
import { HealthBridge, hasHealthBridge, healthError, nativePlatform, onHealthResume } from './nativeHealth.js';
import { blankHealth, mergeNativeSteps, withoutNativeSteps } from './model.js';

export function useNativeSteps(health) {
  const [status,setStatus] = useState({available:false,platform:nativePlatform(),status:'checking'});
  const [busy,setBusy] = useState(false), [message,setMessage] = useState(''), [lastSync,setLastSync] = useState(null);
  const epoch = useRef(0), locked = useRef(null), alive = useRef(true), enabled = useRef(health.data.nativeEnabled);
  enabled.current = health.data.nativeEnabled;
  useEffect(() => { alive.current = true; return () => { alive.current=false; epoch.current++; }; },[]);
  const check = useCallback(async () => {
    if (!hasHealthBridge()) { const result={available:false,platform:nativePlatform(),status:nativePlatform()==='web'?'web':'update'}; if(alive.current)setStatus(result); return result; }
    const result = await HealthBridge.getStatus(); if(alive.current)setStatus(result); return result;
  },[]);
  const refresh = useCallback(async (ask=false) => {
    if (locked.current || (!ask && !enabled.current) || !hasHealthBridge()) return;
    const lock={}; locked.current=lock; setBusy(true); setMessage('');
    const token=epoch.current;
    try {
      const state=await check();
      if(!alive.current || epoch.current!==token) return;
      if(!state.available) { setMessage('Health Connect ou Apple Santé doit être disponible sur ce téléphone.'); return; }
      if (ask) {
        const permission=await HealthBridge.requestStepsPermission();
        if(!alive.current || epoch.current!==token) return;
        if(permission.permission==='not-granted'||permission.permission==='denied') {
          enabled.current=false;health.setData(current=>withoutNativeSteps(current));throw {code:'permission_denied'};
        }
      } else if (state.platform==='android' && state.permission!=='granted') {
        enabled.current=false;health.setData(current=>withoutNativeSteps(current)); throw {code:'permission_denied'};
      }
      const result=await HealthBridge.readSteps({days:30});
      if(!alive.current || epoch.current!==token) return;
      mergeNativeSteps(blankHealth(),result); // Validate before a React state updater can run asynchronously.
      health.setData(current=>(alive.current && epoch.current===token)?mergeNativeSteps(current,result):current);
      enabled.current=true; setLastSync(result.syncedAt);
      const hasValues=result.days.some(day=>typeof day.steps==='number');
      setMessage(hasValues?'Les pas du téléphone sont à jour. Les saisies manuelles restent séparées.':state.platform==='ios'?'Aucun pas lisible. Apple ne permet pas de distinguer un refus de lecture d’une absence de données. Vérifie Santé → ton profil → Apps → 3B.':'Aucun pas disponible. Vérifie la synchronisation de Samsung Health et les sources de Health Connect.');
    } catch(error) { if(alive.current && epoch.current===token)setMessage(healthError(error)); }
    finally { if(locked.current===lock){locked.current=null;if(alive.current)setBusy(false);} }
  },[check,health.setData]);
  useEffect(() => { check().catch(()=>{if(alive.current)setStatus({available:false,platform:nativePlatform(),status:'unavailable'});}); },[check]);
  useEffect(() => { if(health.data.nativeEnabled)refresh(); return onHealthResume(()=>{if(enabled.current)refresh();}); },[health.data.nativeEnabled,refresh]);
  const disconnect=useCallback(async () => {
    if(locked.current?.disconnect)return;
    const lock={disconnect:true};locked.current=lock;setBusy(true);
    epoch.current++; enabled.current=false; health.setData(current=>withoutNativeSteps(current)); setLastSync(null);
    try { if(!hasHealthBridge()){setMessage('Pas importés effacés de 3B.');return;}const result=await HealthBridge.disconnect(); if(alive.current)setMessage(result.revoked===false?'Lecture arrêtée et pas importés effacés de 3B. Pour retirer aussi l’autorisation Apple, ouvre Santé → ton profil → Apps → 3B.':'Lecture arrêtée et pas importés effacés de 3B.'); }
    catch { if(alive.current)setMessage('Lecture arrêtée dans 3B. Vérifie les réglages du téléphone pour retirer aussi l’autorisation système.'); }
    finally {if(locked.current===lock){locked.current=null;if(alive.current)setBusy(false);}}
  },[health.setData]);
  return {status,busy,message,lastSync,connected:health.data.nativeEnabled,connect:()=>refresh(true),refresh:()=>refresh(false),disconnect,openSettings:async()=>{try{await HealthBridge.openSettings();}catch{setMessage('Ouvre les réglages de santé de ton téléphone pour gérer les autorisations.');}}};
}
