import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Cloud, CloudOff, FileCheck2, LogIn, LogOut, RefreshCw, Send, ShieldCheck, UserCheck, UserPlus, XCircle } from "lucide-react";
import { authClient } from "../loyalty/client.js";
import { normalizeProjectPayload, reviewPreview } from "./staging-contract.js";
import { NOSBLOC_STAGING_ENV_VALID, NOSBLOC_STAGING_SYNC_ENABLED, nosblocStagingRequest } from "./staging-client.js";
import "./nosbloc-server.css";

const STAGING_COUNTRIES=["France","Algérie","Espagne","Maroc","Italie","Tunisie","Turquie","Estonie"];

function StagingPassportAccess({setNotice}){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[handle,setHandle]=useState("");
  const[name,setName]=useState("");
  const[country,setCountry]=useState("France");
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState("");
  const[message,setMessage]=useState("");

  async function submit(event){
    event.preventDefault();setBusy(true);setError("");setMessage("");
    try{
      if(mode==="create"){
        const normalized=handle.trim().toLowerCase();
        if(!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(normalized))throw new Error("Choisis un identifiant de 3 à 24 caractères : lettres minuscules, chiffres, point, tiret ou souligné.");
        const{data,error:authError}=await authClient.auth.signUp({email:email.trim(),password,options:{data:{handle:normalized,display_name:name.trim()||normalized,country}}});
        if(authError)throw authError;
        if(data.session){setNotice("Passeport staging créé et connecté.");}
        else setMessage("Compte créé. Confirme l’adresse e-mail, puis reviens te connecter ici.");
      }else{
        const{error:authError}=await authClient.auth.signInWithPassword({email:email.trim(),password});
        if(authError)throw authError;
        setNotice("Passeport staging connecté.");
      }
    }catch(failure){setError(failure?.message||"Connexion staging impossible.");}
    finally{setBusy(false);}
  }

  return <section className="nosbloc-server nosbloc-staging-access" aria-labelledby="staging-passport-title">
    <header><div><p className="nosbloc-eyebrow">PASSEPORT DE TEST ISOLÉ</p><h2 id="staging-passport-title">Entre dans Nosbloc staging.</h2><p>Ce compte appartient uniquement au projet Supabase de test. Il ne remplace pas ton compte 3B de production.</p></div><CloudOff size={28}/></header>
    <div className="nosbloc-server-status"><span><ShieldCheck size={17}/> Base séparée</span><span><XCircle size={17}/> Aucun paiement</span><span><XCircle size={17}/> Aucun Discover</span></div>
    <form onSubmit={submit} className="nosbloc-staging-form">
      <div className="nosbloc-staging-mode"><button type="button" aria-pressed={mode==="login"} onClick={()=>setMode("login")}><LogIn size={16}/> Connexion</button><button type="button" aria-pressed={mode==="create"} onClick={()=>setMode("create")}><UserPlus size={16}/> Créer un compte test</button></div>
      <label>Adresse e-mail<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="toi@exemple.fr"/></label>
      <label>Mot de passe<input type="password" required minLength={10} autoComplete={mode==="create"?"new-password":"current-password"} value={password} onChange={event=>setPassword(event.target.value)} /></label>
      {mode==="create"&&<><label>Identifiant 3B test<input required minLength={3} maxLength={24} value={handle} onChange={event=>setHandle(event.target.value)} placeholder="zakaria-test"/></label><label>Nom affiché<input required minLength={2} maxLength={80} value={name} onChange={event=>setName(event.target.value)} placeholder="Zakaria"/></label><label>Pays du Passeport<select value={country} onChange={event=>setCountry(event.target.value)}>{STAGING_COUNTRIES.map(value=><option key={value}>{value}</option>)}</select></label></>}
      {error&&<div className="nosbloc-server-error" role="alert">{error}</div>}
      {message&&<div className="nosbloc-server-success" role="status">{message}</div>}
      <button className="nosbloc-staging-submit" disabled={busy}>{mode==="create"?<><UserPlus size={17}/> Créer le Passeport test</>:<><LogIn size={17}/> Se connecter</>}</button>
    </form>
  </section>;
}

export default function NosblocServerPanel({ account, selected, updateProject, setNotice }) {
  const uid = account.user?.id;
  const [snapshot, setSnapshot] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [handle, setHandle] = useState("");
  const [memberKey, setMemberKey] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const candidates = useMemo(() => (selected?.splits || []).filter(row => row.status !== "owner"), [selected]);
  useEffect(() => { if (!memberKey && candidates[0]?.id) setMemberKey(candidates[0].id); }, [candidates, memberKey]);

  async function call(action, body = {}) {
    setBusy(action); setError("");
    try { return await nosblocStagingRequest(action, body, uid); }
    catch (failure) { setError(failure.message); return null; }
    finally { setBusy(""); }
  }
  async function refresh() {
    if (!uid) return;
    const data = await call("snapshot");
    if (data) setSnapshot(data);
  }
  useEffect(() => { if (NOSBLOC_STAGING_SYNC_ENABLED && NOSBLOC_STAGING_ENV_VALID && uid) refresh(); }, [uid]);
  if (!NOSBLOC_STAGING_SYNC_ENABLED) return null;
  if (!NOSBLOC_STAGING_ENV_VALID) return <section className="nosbloc-server"><div className="nosbloc-server-error" role="alert">Configuration bloquée : cette prévisualisation ne pointe pas vers le projet Supabase Nosbloc staging officiel.</div></section>;
  if (!uid) return <StagingPassportAccess setNotice={setNotice}/>;

  async function syncProject() {
    if (!selected) return;
    const result = await call("project_sync", { project: normalizeProjectPayload(selected), idempotency: crypto.randomUUID() });
    if (!result?.projectId) return;
    updateProject(selected.id, { serverProjectId: result.projectId, serverRevision: result.revision, serverSyncAt: new Date().toISOString() });
    setNotice("Projet lié au Passeport et synchronisé dans Nosbloc staging.");
    await refresh();
  }
  async function invite() {
    if (!selected?.serverProjectId || !memberKey || !handle.trim()) return;
    const row = candidates.find(item => item.id === memberKey);
    const result = await call("invite_create", { projectId: selected.serverProjectId, memberKey, handle, role: row?.role, shareBps: row?.shareBps, idempotency: crypto.randomUUID() });
    if (result) { setHandle(""); setNotice("Invitation staging liée au vrai compte 3B du membre."); await refresh(); }
  }
  async function invitationDecision(invitationId, accept) {
    const result = await call("invite_decide", { invitationId, accept, idempotency: crypto.randomUUID() });
    if (result) await refresh();
  }
  async function createVersion(stage) {
    if (!selected?.serverProjectId) return;
    if (stage === "review" && !reviewPreview(selected).ready) { setNotice("Les droits, accords d’équipe et contrôles doivent être validés avant la modération."); return; }
    const synced = await call("project_sync", { project: normalizeProjectPayload(selected), idempotency: crypto.randomUUID() });
    if (!synced) return;
    const result = await call(stage === "review" ? "review_submit" : "version_checkpoint", {
      projectId: selected.serverProjectId, project: normalizeProjectPayload(selected), note: stage === "review" ? "Version envoyée à la modération humaine" : "Point de reprise serveur", idempotency: crypto.randomUUID(),
    });
    if (result) { setNotice(stage === "review" ? "Version immuable placée dans la file de modération privée." : "Point de reprise serveur créé."); await refresh(); }
  }
  async function moderate(caseId, decision) {
    const result = await call("moderation_decide", { caseId, decision, reason: moderationReason, idempotency: crypto.randomUUID() });
    if (result) { setModerationReason(""); await refresh(); }
  }
  async function signOut(){
    setSnapshot(null);setError("");await authClient.auth.signOut();setNotice("Passeport staging déconnecté.");
  }

  const incoming = snapshot?.incomingInvitations || [];
  const queue = snapshot?.moderationQueue || [];
  return <section className="nosbloc-server" aria-labelledby="nosbloc-server-title">
    <header><div><p className="nosbloc-eyebrow">ENVIRONNEMENT DE TEST</p><h2 id="nosbloc-server-title">Synchronisation serveur privée</h2><p>Passeport réel de staging, versions immuables, invitations de compte à compte et modération humaine. Discover et paiements restent verrouillés.</p></div><div className="nosbloc-server-header-actions"><button type="button" onClick={refresh} disabled={!!busy} aria-label="Actualiser"><RefreshCw size={18}/></button><button type="button" onClick={signOut} disabled={!!busy} aria-label="Déconnecter le Passeport staging"><LogOut size={18}/></button></div></header>
    <div className="nosbloc-server-status"><span><Cloud size={17}/> Serveur staging actif</span><span><ShieldCheck size={17}/> Production intacte</span><span><XCircle size={17}/> Discover fermé</span><span><XCircle size={17}/> Paiements fermés</span></div>
    {account.profile&&<p className="nosbloc-staging-identity">Connecté : <strong>@{account.profile.handle}</strong> · {account.profile.country}</p>}
    {error && <div className="nosbloc-server-error" role="alert">{error}</div>}
    <div className="nosbloc-server-grid">
      <article><h3>Projet actif</h3><strong>{selected?.title || "Aucun projet"}</strong><small>{selected?.serverProjectId ? `Lié · ${selected.serverProjectId.slice(0, 8)}` : "Pas encore lié au serveur"}</small><button type="button" onClick={syncProject} disabled={!selected || !!busy}><Cloud size={17}/> Synchroniser</button>{selected?.serverProjectId && <div className="nosbloc-server-actions"><button type="button" onClick={() => createVersion("checkpoint")} disabled={!!busy}>Point serveur</button><button type="button" onClick={() => createVersion("review")} disabled={!!busy}><FileCheck2 size={16}/> Modération</button></div>}</article>
      <article><h3>Inviter un vrai membre</h3><select value={memberKey} onChange={event => setMemberKey(event.target.value)} disabled={!selected?.serverProjectId}>{candidates.map(row => <option value={row.id} key={row.id}>{row.name} · {row.role} · {row.shareBps / 100}%</option>)}</select><input value={handle} onChange={event => setHandle(event.target.value)} placeholder="Identifiant 3B staging du membre" maxLength={24}/><button type="button" onClick={invite} disabled={!selected?.serverProjectId || !memberKey || !handle.trim() || !!busy}><Send size={16}/> Envoyer l’invitation staging</button></article>
      <article><h3>Mes invitations reçues</h3>{incoming.length ? incoming.map(row => <div className="nosbloc-server-row" key={row.invitation_id}><span><strong>{row.project_title}</strong><small>{row.role_name} · {row.share_bps / 100}%</small></span><button onClick={() => invitationDecision(row.invitation_id, true)} disabled={!!busy} aria-label="Accepter"><UserCheck size={15}/></button><button onClick={() => invitationDecision(row.invitation_id, false)} disabled={!!busy} aria-label="Refuser"><XCircle size={15}/></button></div>) : <p>Aucune invitation en attente.</p>}</article>
    </div>
    {snapshot?.isModerator && <section className="nosbloc-moderation"><h3><ShieldCheck size={18}/> File de modération humaine</h3><input value={moderationReason} onChange={event => setModerationReason(event.target.value)} placeholder="Motif de la décision" maxLength={300}/>{queue.length ? queue.map(row => <div className="nosbloc-server-row" key={row.case_id}><span><strong>{row.project_title}</strong><small>Version {row.version_no} · {row.owner_handle}</small></span><button onClick={() => moderate(row.case_id, "approved")} disabled={!!busy}><CheckCircle2 size={15}/> Approuver en privé</button><button onClick={() => moderate(row.case_id, "rejected")} disabled={!!busy}><XCircle size={15}/> Refuser</button></div>) : <p>Aucun dossier en attente.</p>}</section>}
  </section>;
}
