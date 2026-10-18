import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, CheckCheck, ClipboardList, Download, FileCheck2, FolderOpen, ListChecks, Pencil, Plus, Search, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { Button, Progress } from '../../design-system/index.jsx';
import PrivateDocumentsVault from '../../documents-private/PrivateDocumentsVault.jsx';
import {
  ADMIN_CATEGORIES, ADMIN_JOURNEY_KEY, ADMIN_LIMITS, ADMIN_STAGES,
  addAdminCase, addAdminTask, adminCaseProgress, adminDeadline, adminToday,
  exportAdminJourney, importAdminJourney, loadAdminJourney, removeAdminCase, removeAdminTask,
  saveAdminJourney, updateAdminCase, updateAdminTask,
} from './admin-journey.js';
import './admin-journey.css';

const emptyForm = () => ({ title: '', categoryId: ADMIN_CATEGORIES[0].id, dueDate: '', stage: 'preparing' });
const safeStorage = () => { try { return globalThis.localStorage; } catch { return null; } };
const dateLabel = value => value ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Date à définir';
const updatedLabel = value => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));

function downloadText(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** No props required. Optional storage injection is useful for isolated previews. */
export default function AdminJourney({ storage: injectedStorage } = {}) {
  const storage = useRef(injectedStorage === undefined ? safeStorage() : injectedStorage);
  const [initial] = useState(() => loadAdminJourney(storage.current));
  const snapshotRef = useRef(initial.snapshot);
  const [state, setState] = useState(initial.state);
  const [blocked, setBlocked] = useState(initial.status === 'invalid');
  const [storageMessage, setStorageMessage] = useState(initial.message);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [today, setToday] = useState(adminToday);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [taskText, setTaskText] = useState('');
  const [taskEdit, setTaskEdit] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [replaceStorage, setReplaceStorage] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reloadConfirm, setReloadConfirm] = useState(false);
  const importRef = useRef(null);
  const titleRef = useRef(null);
  const detailRef = useRef(null);
  const headingRef = useRef(null);
  const taskInputRef = useRef(null);

  useEffect(() => { const timer = setInterval(() => setToday(adminToday()), 60_000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (form) titleRef.current?.focus(); }, [!!form]);
  const stats = useMemo(() => ({
    active: state.cases.filter(item => item.stage !== 'done').length,
    due: state.cases.filter(item => item.stage !== 'done' && ['late', 'soon'].includes(adminDeadline(item, today).tone)).length,
    done: state.cases.filter(item => item.stage === 'done').length,
  }), [state, today]);
  const shown = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    return state.cases.filter(item => (filter === 'all' || (filter === 'done' ? item.stage === 'done' : item.stage !== 'done')) &&
      `${item.title} ${ADMIN_CATEGORIES.find(category => category.id === item.categoryId)?.title}`.toLocaleLowerCase('fr').includes(normalized));
  }, [state, filter, query]);
  const selected = shown.find(item => item.id === selectedId) || shown[0] || null;
  const category = ADMIN_CATEGORIES.find(item => item.id === selected?.categoryId);
  const progress = selected ? adminCaseProgress(selected) : null;
  const deadline = selected ? adminDeadline(selected, today) : null;
  useEffect(() => { setTaskEdit(null); setTaskText(''); setDeleteId(null); }, [selected?.id]);

  function apply(next, message) {
    setState(next); setError(''); setFeedback(message);
    if (blocked) return;
    const result = saveAdminJourney(storage.current, next, { expectedRaw: snapshotRef.current });
    if (result.ok) { snapshotRef.current = result.snapshot; setConflict(false); }
    else if (result.conflict) setConflict(true);
    setStorageMessage(result.message);
  }
  function perform(action, message) {
    try { apply(action(), message); return true; }
    catch (caught) { setError(caught.message || 'Cette action n’a pas pu être effectuée.'); setFeedback(''); return false; }
  }
  function openForm(item) {
    setEditingId(item?.id || null); setError(''); setDeleteId(null);
    setForm(item ? { title: item.title, categoryId: item.categoryId, dueDate: item.dueDate, stage: item.stage } : emptyForm());
  }
  function closeForm() { setForm(null); setEditingId(null); headingRef.current?.focus(); }
  function submitCase(event) {
    event.preventDefault();
    try {
      const next = editingId ? updateAdminCase(state, editingId, form) : addAdminCase(state, form);
      setSelectedId(editingId || next.cases[0].id);
      setQuery(''); setFilter(form.stage === 'done' ? 'done' : 'active');
      apply(next, editingId ? 'Démarche modifiée.' : 'Démarche créée. Tes étapes sont prêtes.');
      closeForm();
    } catch (caught) { setError(caught.message); }
  }
  function addTask(event) {
    event.preventDefault();
    if (perform(() => addAdminTask(state, selected.id, taskText), 'Étape ajoutée.')) { setTaskText(''); taskInputRef.current?.focus(); }
  }
  function saveTask(event) {
    event.preventDefault();
    if (perform(() => updateAdminTask(state, selected.id, taskEdit.id, { text: taskEdit.text }), 'Étape modifiée.')) setTaskEdit(null);
  }
  function selectCase(id) {
    setSelectedId(id); setDeleteId(null); setTaskEdit(null); setTaskText('');
    requestAnimationFrame(() => detailRef.current?.focus());
  }
  async function readImport(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      if (file.size > ADMIN_LIMITS.fileBytes) throw new Error('Fichier trop volumineux (1 Mo maximum).');
      const imported = importAdminJourney(await file.text());
      setPendingImport(imported); setError(''); setFeedback('');
    } catch (caught) { setError(caught.message); }
  }
  function confirmImport() {
    apply(pendingImport, 'Export importé. Ton suivi est prêt.');
    setPendingImport(null); setSelectedId(null); setQuery(''); setFilter('all'); setTaskEdit(null); setDeleteId(null); closeForm();
  }
  function replaceBrokenStorage() {
    const result = saveAdminJourney(storage.current, state, { expectedRaw: snapshotRef.current });
    if (result.ok) { snapshotRef.current = result.snapshot; setBlocked(false); setConflict(false); setStorageMessage(''); setReplaceStorage(false); setFeedback('La sauvegarde a été remplacée par le suivi affiché.'); }
    else { if (result.conflict) setConflict(true); setStorageMessage(result.message); }
  }
  function reloadSaved() {
    const loaded = loadAdminJourney(storage.current);
    if (!['ready', 'empty'].includes(loaded.status)) {
      if (loaded.status === 'invalid') { snapshotRef.current = loaded.snapshot; setBlocked(true); setConflict(false); }
      setStorageMessage(loaded.message); setReloadConfirm(false); return;
    }
    snapshotRef.current = loaded.snapshot;
    setState(loaded.state); setBlocked(false); setConflict(false); setReloadConfirm(false); setReplaceStorage(false);
    setStorageMessage(''); setError(''); setFeedback('Suivi enregistré rechargé.');
    setPendingImport(null); setSelectedId(null); setQuery(''); setFilter('all'); setTaskEdit(null); setDeleteId(null); closeForm();
  }
  function exportData() {
    try { downloadText(exportAdminJourney(state), `3B-mes-demarches-${today}.json`); setFeedback('Export JSON préparé. Conserve-le dans un endroit privé.'); setError(''); }
    catch (caught) { setError(caught.message || 'Export impossible.'); }
  }
  function exportOriginal() {
    try {
      const raw = storage.current?.getItem(ADMIN_JOURNEY_KEY);
      if (typeof raw !== 'string') throw new Error('La sauvegarde originale n’est plus accessible.');
      downloadText(raw, `3B-demarches-sauvegarde-originale-${today}.json`);
      setFeedback('Sauvegarde originale préparée pour téléchargement.');
    } catch (caught) { setError(caught.message); }
  }

  return <section className="aj-shell" aria-labelledby="aj-title">
    <header className="aj-header">
      <div className="aj-heading"><span className="aj-eyebrow"><ClipboardList size={15} aria-hidden="true"/> MON CARNET DE DÉMARCHES</span>
        <h4 id="aj-title" ref={headingRef} tabIndex={-1}>Un peu d’ordre.<br/><em>L’esprit plus libre.</em></h4>
        <p>Garde le fil de tes démarches et retrouve la bonne source. Tu choisis les étapes, tu avances à ton rythme.</p>
      </div>
      <div className="aj-emblem" aria-hidden="true"><div><FileCheck2 size={36} strokeWidth={1.3}/><span>3B</span></div></div>
    </header>

    <div className="aj-stats" aria-label="Résumé de mon suivi"><div><strong>{stats.active}</strong><span>en cours</span></div><div><strong>{stats.due}</strong><span>à suivre cette semaine<small>y compris dates dépassées</small></span></div><div><strong>{stats.done}</strong><span>terminée{stats.done > 1 ? 's' : ''}</span></div></div>
    <div className="aj-tools"><Button onClick={() => openForm()} disabled={state.cases.length >= ADMIN_LIMITS.cases}><Plus size={17} aria-hidden="true"/> Nouvelle démarche</Button>
      <div><Button variant="health" onClick={exportData}><Download size={16} aria-hidden="true"/> Exporter</Button><Button variant="health" onClick={() => importRef.current?.click()}><Upload size={16} aria-hidden="true"/> Importer</Button></div>
      <input ref={importRef} className="aj-file-input" type="file" accept="application/json,.json" onChange={readImport} aria-label="Importer un export administratif 3B" tabIndex={-1}/>
    </div>
    <p className="aj-privacy"><ShieldCheck size={17} aria-hidden="true"/><span>Ce carnet contient les intitulés et étapes sur cet appareil. Pour tes vraies pièces privées, utilise le coffre chiffré membre ci-dessous. Ne mets ni identifiants sensibles ni documents dans les intitulés du carnet. Aucune démarche n’est transmise à un organisme.</span></p>
    {storageMessage && <div className="aj-notice" role="alert"><p>{storageMessage}</p>{blocked && <div className="aj-inline-actions"><Button variant="health" onClick={exportOriginal}>Exporter la sauvegarde originale</Button><Button variant="health" onClick={() => setReplaceStorage(true)}>Remplacer la sauvegarde</Button></div>}{conflict && <div className="aj-inline-actions"><Button variant="health" onClick={exportData}>Exporter mes changements</Button><Button variant="health" onClick={() => setReloadConfirm(true)}>Recharger le suivi enregistré</Button></div>}</div>}
    {reloadConfirm && <div className="aj-confirm" role="alert"><strong>Recharger le suivi enregistré ?</strong><p>Les changements présents uniquement dans cette page seront remplacés. Exporte-les avant de continuer si tu veux les conserver.</p><div className="aj-inline-actions"><Button onClick={reloadSaved}>Confirmer le rechargement</Button><Button variant="health" onClick={() => setReloadConfirm(false)}>Annuler</Button></div></div>}
    {replaceStorage && <div className="aj-confirm" role="alert"><strong>Remplacer la sauvegarde illisible ?</strong><p>Le suivi actuellement affiché prendra sa place. Exporte l’original si tu veux le conserver.</p><div className="aj-inline-actions"><Button onClick={replaceBrokenStorage}>Confirmer le remplacement</Button><Button variant="health" onClick={() => setReplaceStorage(false)}>Annuler</Button></div></div>}
    {pendingImport && <div className="aj-confirm" role="alert"><strong>Importer {pendingImport.cases.length} démarche{pendingImport.cases.length > 1 ? 's' : ''} ?</strong><p>L’import remplacera le suivi affiché. Exporte ton suivi actuel avant de continuer si tu veux le conserver.{blocked ? ' La sauvegarde locale illisible restera protégée jusqu’à confirmation de son remplacement.' : ''}</p><div className="aj-inline-actions"><Button onClick={confirmImport}>Remplacer mon suivi</Button><Button variant="health" onClick={() => setPendingImport(null)}>Annuler</Button></div></div>}
    {error && <p className="aj-feedback is-error" role="alert">{error}</p>}
    <p className="aj-feedback" role="status" aria-live="polite">{feedback}</p>

    {form && <form className="aj-editor" onSubmit={submitCase} aria-labelledby="aj-form-title">
      <div className="aj-editor-heading"><h5 id="aj-form-title">{editingId ? 'Modifier ma démarche' : 'Ma prochaine démarche'}</h5><Button variant="health" className="aj-icon-action" onClick={closeForm} aria-label="Fermer le formulaire"><X size={19}/></Button></div>
      <label className="aj-field aj-wide">Intitulé de la démarche<input ref={titleRef} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ex. Préparer mon rendez-vous" maxLength={ADMIN_LIMITS.title} required autoComplete="off"/></label>
      <label className="aj-field">Catégorie<select value={form.categoryId} onChange={event => setForm({ ...form, categoryId: event.target.value })}>{ADMIN_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label className="aj-field">État<select value={form.stage} onChange={event => setForm({ ...form, stage: event.target.value })}>{ADMIN_STAGES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="aj-field aj-wide">Ma prochaine échéance <span className="aj-optional">facultative</span><input type="date" value={form.dueDate} min="1900-01-01" max="9999-12-31" onChange={event => setForm({ ...form, dueDate: event.target.value })} aria-describedby="aj-date-help"/><small id="aj-date-help">Date personnelle de suivi. Vérifie les délais auprès de l’organisme. Aucun rappel n’est envoyé hors de l’application.</small></label>
      <div className="aj-inline-actions aj-wide"><Button type="submit"><Check size={17} aria-hidden="true"/>{editingId ? 'Enregistrer les modifications' : 'Créer ma démarche'}</Button><Button variant="health" onClick={closeForm}>Annuler</Button></div>
    </form>}

    {state.cases.length === 0 ? <div className="aj-empty"><span className="aj-empty-icon"><FolderOpen size={31} aria-hidden="true"/></span><h5>La première étape, c’est de la poser ici.</h5><p>Crée une démarche, choisis ta prochaine date et transforme ce qu’il reste à faire en petites étapes.</p><Button variant="health" onClick={() => openForm()}><Plus size={16} aria-hidden="true"/> Commencer mon suivi</Button></div> : <>
      <div className="aj-filters"><label className="aj-search"><Search size={17} aria-hidden="true"/><span className="aj-sr-only">Rechercher une démarche</span><input type="search" placeholder="Retrouver une démarche…" value={query} onChange={event => setQuery(event.target.value)} maxLength={100}/></label><label className="aj-filter"><span className="aj-sr-only">Afficher les démarches</span><select value={filter} onChange={event => { setFilter(event.target.value); setTaskEdit(null); setDeleteId(null); }}><option value="active">En cours ({stats.active})</option><option value="done">Terminées ({stats.done})</option><option value="all">Toutes ({state.cases.length})</option></select></label></div>
      {shown.length === 0 ? <p className="aj-no-results" role="status">Aucune démarche dans cette vue. Modifie la recherche ou choisis « Toutes ».</p> : <div className="aj-workspace">
        <nav className="aj-case-list" aria-label="Mes démarches">{shown.map(item => { const result = adminDeadline(item, today); const count = adminCaseProgress(item); return <Button variant="health" className={`aj-case ${item.id === selected?.id ? 'is-selected' : ''}`} key={item.id} aria-pressed={item.id === selected?.id} onClick={() => selectCase(item.id)}><span className="aj-case-top"><span>{ADMIN_CATEGORIES.find(group => group.id === item.categoryId)?.title}</span>{item.stage === 'done' ? <CheckCheck size={17} aria-label="Terminée"/> : <FolderOpen size={17} aria-hidden="true"/>}</span><strong>{item.title}</strong><span className={`aj-deadline aj-deadline--${result.tone}`}><CalendarDays size={14} aria-hidden="true"/>{result.label}</span><span className="aj-case-count">{count.completed}/{count.total} étapes cochées</span></Button>; })}</nav>
        {selected && <article className="aj-detail" aria-labelledby="aj-case-title"><header className="aj-detail-heading"><span className="aj-eyebrow">{category.title}</span><h5 ref={detailRef} tabIndex={-1} id="aj-case-title">{selected.title}</h5><div className="aj-detail-meta"><span className={`aj-deadline aj-deadline--${deadline.tone}`}><CalendarDays size={15} aria-hidden="true"/>{deadline.label}</span><time dateTime={selected.dueDate || undefined}>{dateLabel(selected.dueDate)}</time></div></header>
          <div className="aj-detail-actions"><label className="aj-stage"><span>État de la démarche</span><select value={selected.stage} onChange={event => perform(() => updateAdminCase(state, selected.id, { stage: event.target.value }), 'État de la démarche mis à jour.')}><option value="preparing">En préparation</option><option value="sent">Envoyée</option><option value="done">Terminée</option></select></label><Button variant="health" onClick={() => openForm(selected)}><Pencil size={15} aria-hidden="true"/> Modifier</Button></div>
          <div className="aj-progress-label"><strong><ListChecks size={17} aria-hidden="true"/> Mes prochaines étapes</strong><span>{progress.completed}/{progress.total}</span></div><Progress value={progress.percent} label={`Étapes de ${selected.title}`}/>
          <p className="aj-checklist-help">Ces étapes servent à ton organisation. Elles ne constituent pas une liste de pièces exigées par l’organisme.</p>
          <ul className="aj-tasks">{selected.tasks.map(task => <li key={task.id}>{taskEdit?.id === task.id ? <form className="aj-task-edit" onSubmit={saveTask}><label className="aj-sr-only" htmlFor="aj-task-edit">Modifier l’étape</label><input id="aj-task-edit" value={taskEdit.text} maxLength={ADMIN_LIMITS.task} onChange={event => setTaskEdit({ ...taskEdit, text: event.target.value })} required autoFocus/><div className="aj-inline-actions"><Button variant="health" type="submit" aria-label="Enregistrer l’étape"><Check size={16}/></Button><Button variant="health" onClick={() => setTaskEdit(null)} aria-label="Annuler la modification de l’étape"><X size={16}/></Button></div></form> : <><label className={task.done ? 'is-done' : ''}><input type="checkbox" checked={task.done} onChange={event => perform(() => updateAdminTask(state, selected.id, task.id, { done: event.target.checked }), event.target.checked ? 'Étape cochée.' : 'Étape réouverte.')}/><span>{task.text}</span></label><div className="aj-task-actions"><Button variant="health" className="aj-icon-action" onClick={() => setTaskEdit({ id: task.id, text: task.text })} aria-label={`Modifier l’étape : ${task.text}`}><Pencil size={14}/></Button><Button variant="health" className="aj-icon-action" onClick={() => perform(() => removeAdminTask(state, selected.id, task.id), 'Étape supprimée.')} aria-label={`Supprimer l’étape : ${task.text}`}><X size={16}/></Button></div></>}</li>)}</ul>
          {selected.tasks.length === 0 && <p className="aj-checklist-help">Aucune étape pour l’instant. Ajoute ta prochaine action.</p>}
          <form className="aj-add-task" onSubmit={addTask}><label htmlFor="aj-new-task">Ajouter une étape</label><div><input ref={taskInputRef} id="aj-new-task" value={taskText} placeholder="Ex. Prendre rendez-vous" maxLength={ADMIN_LIMITS.task} required onChange={event => setTaskText(event.target.value)} autoComplete="off" disabled={selected.tasks.length >= ADMIN_LIMITS.tasks}/><Button variant="health" type="submit" disabled={!taskText.trim() || selected.tasks.length >= ADMIN_LIMITS.tasks} aria-label="Ajouter cette étape"><Plus size={18}/></Button></div><small>{selected.tasks.length}/{ADMIN_LIMITS.tasks} étapes</small></form>
          <a className="aj-official-link" href={category.href} target="_blank" rel="noopener noreferrer"><ShieldCheck size={20} aria-hidden="true"/><span><strong>Ouvrir le site officiel</strong><small>{category.title} · {new URL(category.href).hostname}</small></span><ArrowUpRight size={18} aria-hidden="true"/></a>
          <footer className="aj-detail-footer"><small>Mis à jour le {updatedLabel(selected.updatedAt)}</small><Button variant="health" className="aj-delete" onClick={() => setDeleteId(selected.id)}><Trash2 size={15} aria-hidden="true"/> Supprimer</Button></footer>
          {deleteId === selected.id && <div className="aj-confirm" role="alert"><strong>Supprimer « {selected.title} » ?</strong><p>Cette démarche et ses étapes seront retirées du suivi local.</p><div className="aj-inline-actions"><Button onClick={() => { if (perform(() => removeAdminCase(state, selected.id), 'Démarche supprimée.')) { setDeleteId(null); setTaskEdit(null); headingRef.current?.focus(); } }}>Confirmer la suppression</Button><Button variant="health" onClick={() => setDeleteId(null)}>Annuler</Button></div></div>}
        </article>}
      </div>}
    </>}
    <p className="aj-footnote">Ton carnet est indépendant des sites administratifs. Les coches et l’état « Terminée » reflètent ton suivi personnel ; seul l’organisme confirme l’aboutissement d’une démarche.</p>
    <PrivateDocumentsVault cases={state.cases.map(({id,title})=>({id,title}))}/>
  </section>;
}
