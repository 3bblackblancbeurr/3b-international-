import { useCallback, useEffect, useRef, useState } from 'react';
import { HealthBridge, hasHealthBridge, healthError, nativePlatform, onHealthResume } from './nativeHealth.js';
import { blankHealth, mergeNativeSteps, withoutNativeSteps } from './model.js';

const LIVE_REFRESH_MS = 60_000;

export function useNativeSteps(health) {
  const [status,setStatus] = useState({available:false,platform:nativePlatform(),status:'checking'});
  const [busy,setBusy] = useState(false), [message,setMessage] = useState(''), [lastSync,setLastSync] = useState(null);
  const epoch = useRef(0), locked = useRef(null), alive = useRef(true), enabled = useRef(health.data.nativeEnabled);
  enabled.current = health.data.nativeEnabled;

  useEffect(() => { alive.current = true; return () => { alive.current=false; epoch.current++; }; },[]);

  const check = useCallback(async () => {
    if (!hasHealthBridge()) {
      const result={available:false,platform:nativePlatform(),status:nativePlatform()==='web'?'web':'update'};
      if(alive.current)setStatus(result);
      return result;
    }
    const result = await HealthBridge.getStatus();
    if(alive.current)setStatus(result);
    return result;
  },[]);

  const sync = useCallback(async ({ask=false,days=30,silent=false}={}) => {
    if (locked.current || (!ask && !enabled.current) || !hasHealthBridge()) return;
    const lock={}; locked.current=lock;
    if(!silent){setBusy(true);setMessage('');}
    const token=epoch.current;
    try {
      const state=await check();
      if(!alive.current || epoch.current!==token) return;
      if(!state.available) {
        if(!silent)setMessage('Health Connect ou Apple Santé doit être disponible sur ce téléphone.');
        return;
      }
      if (ask) {
        const permission=await HealthBridge.requestStepsPermission();
        if(!alive.current || epoch.current!==token) return;
        if(permission.permission==='not-granted'||permission.permission==='denied') {
          enabled.current=false;
          health.setData(current=>withoutNativeSteps(current));
          throw {code:'permission_denied'};
        }
      } else if (state.platform==='android' && state.permission!=='granted') {
        enabled.current=false;
        health.setData(current=>withoutNativeSteps(current));
        throw {code:'permission_denied'};
      }

      const result=await HealthBridge.readSteps({days});
      if(!alive.current || epoch.current!==token) return;
      mergeNativeSteps(blankHealth(),result); // Validate before a React updater runs.
      health.setData(current=>(alive.current && epoch.current===token)?mergeNativeSteps(current,result):current);
      enabled.current=true;
      setLastSync(result.syncedAt);
      if(!silent){
        const hasValues=result.days.some(day=>typeof day.steps==='number');
        setMessage(hasValues
          ? 'Compteur automatique synchronisé avec le téléphone.'
          : state.platform==='ios'
            ? 'Aucun pas lisible. Apple ne permet pas de distinguer un refus de lecture d’une absence de données. Vérifie Santé → ton profil → Apps → 3B.'
            : 'Aucun pas disponible. Vérifie Health Connect et, si tu l’utilises, le partage Samsung Health.');
      }
    } catch(error) {
      if(alive.current && epoch.current===token && !silent)setMessage(healthError(error));
    } finally {
      if(locked.current===lock){
        locked.current=null;
        if(alive.current && !silent)setBusy(false);
      }
    }
  },[check,health.setData]);

  useEffect(() => {
    check().catch(()=>{if(alive.current)setStatus({available:false,platform:nativePlatform(),status:'unavailable'});});
  },[check]);

  useEffect(() => {
    if(health.data.nativeEnabled) sync({days:30,silent:true});
    return onHealthResume(()=>{if(enabled.current)sync({days:1,silent:true});});
  },[health.data.nativeEnabled,sync]);

  useEffect(() => {
    if(!health.data.nativeEnabled || !hasHealthBridge()) return;
    const timer=window.setInterval(() => {
      if(!document.hidden && enabled.current) sync({days:1,silent:true});
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  },[health.data.nativeEnabled,sync]);

  const disconnect=useCallback(async () => {
    if(locked.current?.disconnect)return;
    const lock={disconnect:true};locked.current=lock;setBusy(true);
    epoch.current++; enabled.current=false; health.setData(current=>withoutNativeSteps(current)); setLastSync(null);
    try {
      if(!hasHealthBridge()){setMessage('Lecture automatique arrêtée dans 3B.');return;}
      const result=await HealthBridge.disconnect();
      if(alive.current)setMessage(result.revoked===false
        ? 'Lecture arrêtée et pas importés effacés de 3B. Pour retirer aussi l’autorisation Apple, ouvre Santé → ton profil → Apps → 3B.'
        : 'Lecture automatique arrêtée et pas importés effacés de 3B.');
    } catch {
      if(alive.current)setMessage('Lecture arrêtée dans 3B. Vérifie les réglages du téléphone pour retirer aussi l’autorisation système.');
    } finally {
      if(locked.current===lock){locked.current=null;if(alive.current)setBusy(false);}
    }
  },[health.setData]);

  return {
    status,busy,message,lastSync,
    connected:health.data.nativeEnabled,
    connect:()=>sync({ask:true,days:30}),
    refresh:()=>sync({days:30}),
    disconnect,
    openSettings:async()=>{try{await HealthBridge.openSettings();}catch{setMessage('Ouvre les réglages de santé de ton téléphone pour gérer les autorisations.');}}
  };
}
