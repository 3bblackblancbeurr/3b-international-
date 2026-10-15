import React, { useState } from 'react';
import { ShieldCheck, LockKeyhole, UnlockKeyhole, ShieldAlert, KeyRound, ArrowDownToLine, Trash2 } from 'lucide-react';
import { Button as HealthButton } from '../design-system/index.jsx';
import { HEALTH_VAULT_KEY } from './secureVault.js';
import './health-vault.css';

function saveFile(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function HealthVaultPanel({ health }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forget, setForget] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const mode = health.vaultMode;
  const creating = mode === 'legacy' || mode === 'temporary';

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (creating && (password.length < 12 || password !== confirm)) {
      setError(password.length < 12
        ? 'Choisis une phrase secrète d’au moins 12 caractères.'
        : 'Les deux phrases secrètes doivent correspondre.');
      return;
    }
    setBusy(true);
    try {
      if (creating) await health.enableSecureSave(password);
      else if (mode === 'locked') await health.unlockSecureSave(password);
      setPassword(''); setConfirm('');
    } catch (exception) {
      setError(exception?.message || 'Opération impossible. Aucune donnée n’a été supprimée.');
    } finally { setBusy(false); }
  }

  async function lock() {
    setBusy(true); setError('');
    try { await health.lockSecureSave(); }
    catch { setError('Impossible d’enregistrer le coffre avant verrouillage. Tes données restent ouvertes pour éviter leur perte.'); }
    finally { setBusy(false); }
  }

  function exportEncrypted() {
    try {
      const envelope = window.localStorage.getItem(HEALTH_VAULT_KEY);
      if (!envelope) throw new Error('Coffre introuvable.');
      saveFile('3B-Sante-coffre-chiffre.json', envelope);
      health.setNotice('Copie chiffrée exportée. Conserve aussi ta phrase secrète séparément.');
    } catch {
      setError('Impossible d’exporter le coffre chiffré.');
    }
  }

  async function importBackup(event) {
    event.preventDefault();
    if (!restoreFile || busy) return;
    setError('');
    if (restoreFile.size > 3000000) { setError('Fichier trop volumineux.'); return; }
    if (!window.confirm('Importer ce coffre remplacera ton journal temporaire actuellement visible. Continuer ?')) return;
    setBusy(true);
    try {
      const raw = await restoreFile.text();
      await health.importEncryptedVault(raw, restorePassphrase);
      setRestoreFile(null);
      setRestorePassphrase('');
      setShowRestore(false);
    } catch (exception) {
      setError(exception?.message || 'Import impossible ; aucune donnée effacée.');
    } finally { setBusy(false); }
  }

  function eraseLocked() {
    if (deleteText !== 'EFFACER') return;
    if (health.clear()) { setForget(false); setDeleteText(''); }
  }

  return <section className="h-vault" aria-label="Coffre privé Santé 3B">
    <div className="h-vault-title">
      <span className="h-vault-emblem"><LockKeyhole size={26} aria-hidden="true"/></span>
      <div><small>3B PRIVACY · LOCAL FIRST</small><h3>Mon coffre Santé privé</h3></div>
    </div>
    {mode === 'unlocked' ? <>
      <p className="h-vault-success"><ShieldCheck size={18}/> Coffre chiffré localement · AES-256-GCM</p>
      <p>Ton journal est chiffré avant enregistrement sur cet appareil. La phrase secrète et la clé de lecture ne sont pas envoyées à 3B. {health.saving ? 'Chiffrement en cours…' : 'Dernière sauvegarde locale terminée, sauf message d’erreur.'}</p>
      <div className="h-vault-actions">
        <HealthButton variant="health" className="h-secondary" disabled={busy || health.saving} onClick={exportEncrypted}><ArrowDownToLine size={17}/> Exporter le coffre chiffré</HealthButton>
        <HealthButton variant="health" className="h-secondary" disabled={busy} onClick={lock}><LockKeyhole size={17}/> Verrouiller maintenant</HealthButton>
      </div>
      <p className="h-vault-caution">Sans ta phrase secrète, personne — pas même 3B — ne peut récupérer ce coffre. Les données affichées restent lisibles tant qu’il est déverrouillé dans cette session.</p>
    </> : <>
      {mode === 'legacy' ? <p className="h-vault-warning"><ShieldAlert size={18}/> Ancienne sauvegarde non chiffrée détectée : conversion conseillée. L’original n’est supprimé qu’après création du coffre.</p>
        : <p>{mode === 'locked' ? 'Tes données enregistrées sont verrouillées. Saisis la phrase secrète créée sur cet appareil pour ouvrir ton journal.' : 'Aucune sauvegarde par défaut. Active gratuitement un coffre chiffré pour conserver ton journal sur cet appareil.'}</p>}
      <form onSubmit={submit} className="h-vault-form">
        <label className="h-field">{mode === 'locked' ? 'Ma phrase secrète Santé' : 'Créer une phrase secrète Santé (12 caractères minimum)'}
          <input type="password" value={password} minLength={mode === 'locked' ? 1 : 12} autoComplete={mode === 'locked' ? 'current-password' : 'new-password'} required onChange={event=>setPassword(event.target.value)} disabled={busy} />
        </label>
        {creating && <label className="h-field">Confirmer la phrase secrète
          <input type="password" value={confirm} minLength={12} autoComplete="new-password" required onChange={event=>setConfirm(event.target.value)} disabled={busy}/>
        </label>}
        {error && <p role="alert" className="h-vault-error">{error}</p>}
        <HealthButton variant="health" type="submit" className="h-primary" disabled={busy}>
          {mode === 'locked' ? <UnlockKeyhole size={18}/> : <KeyRound size={18}/>}
          {busy ? 'Protection en cours…' : mode === 'locked' ? 'Déverrouiller mon journal' : mode === 'legacy' ? 'Chiffrer ma sauvegarde actuelle' : 'Créer mon coffre chiffré'}
        </HealthButton>
      </form>
      {mode === 'temporary' && <div className="h-vault-restore">
        {!showRestore ? <HealthButton variant="health" className="h-link" onClick={()=>setShowRestore(true)}><ArrowDownToLine size={16}/> Restaurer un coffre chiffré depuis un fichier</HealthButton>
          : <form onSubmit={importBackup} className="h-vault-form">
            <label className="h-field">Fichier de sauvegarde chiffré 3B (.json)
              <input type="file" accept=".json,application/json" required onChange={event=>setRestoreFile(event.target.files?.[0] || null)} disabled={busy}/>
            </label>
            <label className="h-field">Phrase secrète du coffre importé
              <input type="password" autoComplete="off" value={restorePassphrase} required onChange={event=>setRestorePassphrase(event.target.value)} disabled={busy}/>
            </label>
            <HealthButton variant="health" className="h-secondary" type="submit" disabled={busy || !restoreFile}>Restaurer sur cet appareil</HealthButton>
            <HealthButton variant="health" className="h-link" type="button" onClick={()=>setShowRestore(false)} disabled={busy}>Annuler</HealthButton>
          </form>}
      </div>}
      <p className="h-vault-caution">Phrase secrète différente du mot de passe de ton compte 3B. En cas d’oubli, la récupération n’est pas possible. Le coffre reste sur ce téléphone ou ce navigateur ; aucune synchronisation automatique.</p>
      {mode === 'locked' && <div className="h-vault-forget">
        {!forget ? <HealthButton variant="health" className="h-link h-danger" onClick={()=>setForget(true)}><Trash2 size={15}/> Phrase oubliée ? Supprimer le coffre local</HealthButton>
          : <><p role="alert">Suppression définitive : le journal, les favoris et les menus conservés dans ce coffre seront perdus sur cet appareil. Cela ne révoque pas les permissions Santé du téléphone.</p>
            <label className="h-field">Tape EFFACER pour confirmer<input type="text" autoCapitalize="characters" value={deleteText} onChange={event=>setDeleteText(event.target.value)} /></label>
            <div className="h-vault-actions">
              <HealthButton variant="health" className="h-secondary" disabled={deleteText !== 'EFFACER'} onClick={eraseLocked}>Supprimer ce coffre</HealthButton>
              <HealthButton variant="health" className="h-link" onClick={()=>{setForget(false);setDeleteText('');}}>Annuler</HealthButton>
            </div>
          </>}
      </div>}
    </>}
  </section>;
}
