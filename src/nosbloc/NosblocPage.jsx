import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  Calculator,
  CheckCircle2,
  Circle,
  Compass,
  Eye,
  FileCheck2,
  FolderKanban,
  Gauge,
  Hammer,
  LayoutDashboard,
  LockKeyhole,
  PackagePlus,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import { useLoyalty } from "../loyalty/LoyaltyContext.jsx";
import City3BPortal from "../components/City3BPortal.jsx";
import {
  ECONOMY_RULES,
  NOSBLOC_STORAGE_KEY,
  PROJECT_TEMPLATES,
  PROJECT_TYPES,
  allocateTeamRevenue,
  createEmptyState,
  createProject,
  discoveryScore,
  formatEuros,
  generateBuildPlan,
  normalizeState,
  projectReadiness,
  simulateRevenue,
  validateSplits,
} from "./model.js";
import "./nosbloc.css";

const TABS = [
  ["overview", "Vue générale", LayoutDashboard],
  ["projects", "Projets", FolderKanban],
  ["studio", "Studio", Hammer],
  ["team", "Équipe", Users],
  ["economy", "Économie", WalletCards],
  ["market", "Assets", Store],
  ["discovery", "Découverte", Compass],
];

const SAMPLE_ASSETS = [
  { id: "medina-house-01", name: "Maison médina premium", creator: "Atelier Atlas", category: "Architecture", priceCents: 1200, license: "Projet commercial", royaltyBps: 0, tags: ["mobile", "intérieur"] },
  { id: "street-racer-pack", name: "Pack course urbaine", creator: "Velocity 3B", category: "Gameplay", priceCents: 2900, license: "Projet commercial", royaltyBps: 0, tags: ["véhicules", "course"] },
  { id: "guardian-animations", name: "Animations gardien", creator: "Motion Forge", category: "Animation", priceCents: 0, license: "Partage de revenus", royaltyBps: 300, tags: ["combat", "personnage"] },
  { id: "matrix-ui-kit", name: "Interface Matrix & or", creator: "Studio Nexus", category: "Interface", priceCents: 900, license: "Projet commercial", royaltyBps: 0, tags: ["mobile", "UI"] },
  { id: "mediterranean-ambience", name: "Ambiance port méditerranéen", creator: "Sons du Monde", category: "Audio", priceCents: 0, license: "Partage de revenus", royaltyBps: 200, tags: ["audio", "ville"] },
  { id: "street-football-system", name: "Système football de rue", creator: "Playmaker Lab", category: "Gameplay", priceCents: 4900, license: "Projet commercial", royaltyBps: 0, tags: ["sport", "multijoueur"] },
];

const STATUS_LABELS = {
  draft: "Brouillon",
  review: "En révision",
  approved: "Approuvé",
  published: "Publié",
};

const fmtPercent = bps => `${(Number(bps || 0) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
const safeNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function loadState(storageKey, profile) {
  try {
    const raw = localStorage.getItem(storageKey);
    return normalizeState(raw ? JSON.parse(raw) : null, profile);
  } catch {
    return createEmptyState(profile);
  }
}

export default function NosblocPage({ goTo }) {
  const account = useLoyalty();
  const ownerName = account.profile?.name || account.passport?.name || "Fondateur 3B";
  const storageKey = `${NOSBLOC_STORAGE_KEY}:${account.user?.id || "device"}`;
  const [tab, setTab] = useState("overview");
  const [state, setState] = useState(() => createEmptyState({ studioName: `Studio de ${ownerName}` }));
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    const next = loadState(storageKey, { studioName: `Studio de ${ownerName}` });
    setState(next);
    setSelectedId(current => current && next.projects.some(project => project.id === current)
      ? current
      : next.projects[0]?.id || "");
    setLoaded(true);
  }, [storageKey, ownerName]);

  const selected = useMemo(
    () => state.projects.find(project => project.id === selectedId) || state.projects[0] || null,
    [state.projects, selectedId],
  );

  const commit = updater => {
    setState(previous => {
      const changed = typeof updater === "function" ? updater(previous) : updater;
      const next = normalizeState({ ...changed, updatedAt: new Date().toISOString() }, changed.profile);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        setNotice("Sauvegardé sur cet appareil.");
      } catch {
        setNotice("La sauvegarde locale est indisponible sur cet appareil.");
      }
      return next;
    });
  };

  const updateProject = (projectId, patch) => {
    commit(previous => ({
      ...previous,
      projects: previous.projects.map(project => {
        if (project.id !== projectId) return project;
        const delta = typeof patch === "function" ? patch(project) : patch;
        return { ...project, ...delta, updatedAt: new Date().toISOString() };
      }),
    }));
  };

  const deleteProject = projectId => {
    commit(previous => ({ ...previous, projects: previous.projects.filter(project => project.id !== projectId) }));
    const next = state.projects.find(project => project.id !== projectId);
    setSelectedId(next?.id || "");
    setTab(next ? "projects" : "overview");
  };

  const openProject = (projectId, nextTab = "studio") => {
    setSelectedId(projectId);
    setTab(nextTab);
    setNotice("");
  };

  const requestReview = project => {
    const readiness = projectReadiness(project);
    if (!readiness.readyForReview) {
      setNotice(`Le projet est à ${readiness.score} %. Termine les contrôles manquants avant la révision.`);
      return;
    }
    updateProject(project.id, { status: "review", visibility: "private" });
    setNotice("Dossier envoyé en révision locale. Aucun paiement ni publication publique n’est activé.");
  };

  if (!loaded) return <section className="nosbloc-loading">Ouverture de Nosbloc du 3B…</section>;

  const projectCount = state.projects.length;
  const reviewCount = state.projects.filter(project => project.status === "review").length;
  const averageReadiness = projectCount
    ? Math.round(state.projects.reduce((sum, project) => sum + projectReadiness(project).score, 0) / projectCount)
    : 0;

  return (
    <section className="nosbloc-page">
      <header className="nosbloc-hero">
        <div>
          <p className="nosbloc-eyebrow">NOSBLOC DU 3B · CREATOR ECONOMY</p>
          <h1>Crée ton univers.<br /><em>Construis ton activité.</em></h1>
          <p className="nosbloc-lead">Jeux, villes, manga, mode, musique et services dans une seule plateforme créateur. Chaque projet garde son équipe, ses droits et sa trace économique.</p>
          <div className="nosbloc-hero-actions">
            <button type="button" className="nosbloc-primary" onClick={() => setTab("projects")}><Plus size={18} /> Nouveau projet</button>
            <button type="button" className="nosbloc-secondary" onClick={() => goTo?.("world3b")}>Voir le Monde du 3B <ArrowRight size={17} /></button>
          </div>
        </div>
        <aside className="nosbloc-trust-card">
          <ShieldCheck size={30} />
          <strong>3B Trust actif</strong>
          <span>Partages contrôlés · paiements verrouillés · aucune crypto · publication soumise à révision.</span>
          <small>Score de confiance du studio : {state.profile.trustScore}/100</small>
        </aside>
      </header>

      <div className="nosbloc-strip" role="status">
        <span><b>{projectCount}</b> projet{projectCount > 1 ? "s" : ""}</span>
        <span><b>{averageReadiness} %</b> préparation moyenne</span>
        <span><b>{reviewCount}</b> en révision</span>
        <span><LockKeyhole size={15} /> Retraits réels verrouillés</span>
      </div>

      <nav className="nosbloc-tabs" aria-label="Navigation Nosbloc">
        {TABS.map(([id, label, Icon]) => (
          <button type="button" key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
            <Icon size={18} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {notice && <div className="nosbloc-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Fermer">×</button></div>}

      {tab === "overview" && (
        <section className="nosbloc-official-city" aria-labelledby="nosbloc-city-title">
          <div className="nosbloc-official-city-copy">
            <p className="nosbloc-eyebrow">PREMIER BLOC OFFICIEL</p>
            <h2 id="nosbloc-city-title">3B MA VILLE</h2>
            <p>Le premier bloc réellement constructible de Nosbloc. Place tes bâtiments sur un plan interactif, déplace-les, sauvegarde ton brouillon et ouvre un aperçu privé lié à ton Passeport 3B.</p>
            <div className="nosbloc-city-locks" aria-label="État du bloc 3B Ma Ville">
              <span><CheckCircle2 size={16} /> Construction active</span>
              <span><LockKeyhole size={16} /> Discover verrouillé</span>
              <span><LockKeyhole size={16} /> Économie verrouillée</span>
            </div>
          </div>
          <button type="button" className="nosbloc-city-launch" onClick={() => setCityOpen(true)}>
            <Boxes size={24} />
            <span><small>OUVRIR LE BLOC</small><strong>Construire ma Ville 3B</strong></span>
            <ArrowRight size={20} />
          </button>
        </section>
      )}

      <div className="nosbloc-workspace">
        {tab === "overview" && <Overview state={state} projects={state.projects} openProject={openProject} setTab={setTab} />}
        {tab === "projects" && <Projects state={state} ownerName={ownerName} commit={commit} openProject={openProject} deleteProject={deleteProject} />}
        {tab === "studio" && <Studio project={selected} updateProject={updateProject} requestReview={requestReview} setTab={setTab} />}
        {tab === "team" && <Team project={selected} updateProject={updateProject} />}
        {tab === "economy" && <Economy project={selected} />}
        {tab === "market" && <Marketplace project={selected} updateProject={updateProject} />}
        {tab === "discovery" && <Discovery projects={state.projects} selected={selected} updateProject={updateProject} openProject={openProject} />}
      </div>
      <City3BPortal open={cityOpen} onClose={() => setCityOpen(false)} />
    </section>
  );
}

function EmptyProject({ setTab, title = "Ton studio est prêt." }) {
  return <section className="nosbloc-empty">
    <Boxes size={46} />
    <h2>{title}</h2>
    <p>Crée un premier projet pour ouvrir le Studio, constituer une équipe et préparer une économie transparente.</p>
    <button type="button" className="nosbloc-primary" onClick={() => setTab("projects")}><Plus size={18} /> Créer mon premier projet</button>
  </section>;
}

function Overview({ state, projects, openProject, setTab }) {
  if (!projects.length) return <EmptyProject setTab={setTab} />;
  const top = [...projects].sort((a, b) => discoveryScore(b) - discoveryScore(a))[0];
  return <div className="nosbloc-dashboard">
    <section className="nosbloc-panel nosbloc-studio-card">
      <p className="nosbloc-eyebrow">TON STUDIO</p>
      <h2>{state.profile.studioName}</h2>
      <div className="nosbloc-level"><span>{state.profile.level}</span><i style={{ width: "18%" }} /></div>
      <p>La progression du studio dépend de la qualité publiée, de la confiance, du retour des joueurs et du respect des règles.</p>
      <dl className="nosbloc-mini-stats">
        <div><dt>Vérification</dt><dd>Non demandée</dd></div>
        <div><dt>Versements</dt><dd>Verrouillés</dd></div>
        <div><dt>Créateur</dt><dd>70 % du net éligible</dd></div>
      </dl>
    </section>

    <section className="nosbloc-panel">
      <div className="nosbloc-panel-heading"><div><p className="nosbloc-eyebrow">PROJET LE PLUS AVANCÉ</p><h2>{top.title}</h2></div><Gauge size={25} /></div>
      <Readiness project={top} compact />
      <button type="button" className="nosbloc-secondary" onClick={() => openProject(top.id)}>Continuer dans le Studio <ArrowRight size={16} /></button>
    </section>

    <section className="nosbloc-panel nosbloc-wide">
      <div className="nosbloc-panel-heading"><div><p className="nosbloc-eyebrow">TES PROJETS</p><h2>Production en cours</h2></div><button type="button" className="nosbloc-text-button" onClick={() => setTab("projects")}>Tout voir</button></div>
      <div className="nosbloc-project-grid">
        {projects.slice(0, 4).map(project => <ProjectCard key={project.id} project={project} openProject={openProject} />)}
      </div>
    </section>

    <section className="nosbloc-panel nosbloc-wide nosbloc-flow">
      <p className="nosbloc-eyebrow">LE CIRCUIT NOSBLOC</p>
      <h2>De l’idée au revenu réel, sans zone grise.</h2>
      <div className="nosbloc-flow-grid">
        {[
          ["01", "Créer", "Projet, équipe, droits et prototype."],
          ["02", "Tester", "Mobile, stabilité, confiance et rétention."],
          ["03", "Publier", "Révision humaine et découverte progressive."],
          ["04", "Gagner", "Ventes, engagement et licences au centime."],
        ].map(([number, title, text]) => <article key={number}><span>{number}</span><strong>{title}</strong><p>{text}</p></article>)}
      </div>
    </section>
  </div>;
}

function ProjectCard({ project, openProject, onDelete }) {
  const readiness = projectReadiness(project);
  return <article className="nosbloc-project-card">
    <div className="nosbloc-project-top"><span>{PROJECT_TYPES.find(type => type.id === project.type)?.label}</span><b data-status={project.status}>{STATUS_LABELS[project.status] || project.status}</b></div>
    <h3>{project.title}</h3>
    <p>{project.description || "Ajoute une description claire pour ton équipe et les futurs joueurs."}</p>
    <div className="nosbloc-progress"><i style={{ width: `${readiness.score}%` }} /></div>
    <small>{readiness.score} % prêt · {project.template}</small>
    <div className="nosbloc-card-actions">
      <button type="button" onClick={() => openProject(project.id)}><Eye size={16} /> Ouvrir</button>
      {onDelete && <button type="button" className="danger" onClick={() => onDelete(project.id)} aria-label={`Supprimer ${project.title}`}><Trash2 size={16} /></button>}
    </div>
  </article>;
}

function Projects({ state, ownerName, commit, openProject, deleteProject }) {
  const [form, setForm] = useState({ title: "", type: "world", template: PROJECT_TEMPLATES.world[0], description: "", audience: "Tout public" });
  const templates = PROJECT_TEMPLATES[form.type] || PROJECT_TEMPLATES.world;

  const changeType = type => setForm(previous => ({ ...previous, type, template: PROJECT_TEMPLATES[type][0] }));
  const submit = event => {
    event.preventDefault();
    if (form.title.trim().length < 3) return;
    const project = createProject(form, ownerName);
    project.plan = form.description.trim().length >= 20 ? generateBuildPlan(form.description, form.type) : [];
    commit(previous => ({ ...previous, projects: [project, ...previous.projects] }));
    setForm({ title: "", type: "world", template: PROJECT_TEMPLATES.world[0], description: "", audience: "Tout public" });
    openProject(project.id);
  };

  return <div className="nosbloc-two-column">
    <form className="nosbloc-panel nosbloc-form" onSubmit={submit}>
      <p className="nosbloc-eyebrow">NOUVEAU PROJET</p>
      <h2>Donne une forme à ton idée.</h2>
      <label>Nom du projet<input required minLength={3} maxLength={80} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ex. 3B Street Racing" /></label>
      <fieldset><legend>Type de création</legend><div className="nosbloc-choice-grid">{PROJECT_TYPES.map(type => <button type="button" key={type.id} aria-pressed={form.type === type.id} onClick={() => changeType(type.id)}><strong>{type.label}</strong><small>{type.description}</small></button>)}</div></fieldset>
      <label>Point de départ<select value={form.template} onChange={event => setForm({ ...form, template: event.target.value })}>{templates.map(template => <option key={template}>{template}</option>)}</select></label>
      <label>Pour qui ?<input maxLength={60} value={form.audience} onChange={event => setForm({ ...form, audience: event.target.value })} /></label>
      <label>Décris la promesse<textarea rows={5} maxLength={600} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Que fait le joueur ? Pourquoi revient-il ? Qu’est-ce qui rend ce projet unique ?" /></label>
      <button className="nosbloc-primary" disabled={form.title.trim().length < 3}><Rocket size={18} /> Créer le projet</button>
      <small className="nosbloc-helper">Un plan de production est proposé automatiquement dès que la description est suffisamment précise.</small>
    </form>

    <section className="nosbloc-panel">
      <div className="nosbloc-panel-heading"><div><p className="nosbloc-eyebrow">BIBLIOTHÈQUE</p><h2>{state.projects.length} projet{state.projects.length > 1 ? "s" : ""}</h2></div><FolderKanban size={25} /></div>
      {state.projects.length
        ? <div className="nosbloc-project-list">{state.projects.map(project => <ProjectCard key={project.id} project={project} openProject={openProject} onDelete={deleteProject} />)}</div>
        : <p className="nosbloc-muted">Aucun projet pour le moment. Le premier deviendra la base de ton studio.</p>}
    </section>
  </div>;
}

function ProjectSelector({ project }) {
  if (!project) return null;
  return <div className="nosbloc-selected-project"><span>PROJET ACTIF</span><strong>{project.title}</strong><small>{project.template} · {STATUS_LABELS[project.status]}</small></div>;
}

function Studio({ project, updateProject, requestReview, setTab }) {
  const [prompt, setPrompt] = useState(project?.description || "");
  useEffect(() => setPrompt(project?.description || ""), [project?.id]);
  if (!project) return <EmptyProject setTab={setTab} title="Aucun projet sélectionné." />;
  const readiness = projectReadiness(project);

  const togglePlan = id => updateProject(project.id, {
    plan: project.plan.map(item => item.id === id ? { ...item, done: !item.done } : item),
  });
  const generate = () => updateProject(project.id, { description: prompt.trim() || project.description, plan: generateBuildPlan(prompt, project.type) });

  return <div className="nosbloc-studio-layout">
    <section className="nosbloc-panel">
      <ProjectSelector project={project} />
      <h2>Identité & publication</h2>
      <div className="nosbloc-form">
        <label>Nom<input value={project.title} maxLength={80} onChange={event => updateProject(project.id, { title: event.target.value })} /></label>
        <label>Description<textarea rows={5} maxLength={600} value={project.description} onChange={event => updateProject(project.id, { description: event.target.value })} /></label>
        <label>Public<input value={project.audience} maxLength={60} onChange={event => updateProject(project.id, { audience: event.target.value })} /></label>
        <fieldset><legend>Plateformes</legend><div className="nosbloc-check-grid">{["mobile", "web", "pc"].map(platform => <label key={platform}><input type="checkbox" checked={Boolean(project.platforms?.[platform])} onChange={event => updateProject(project.id, { platforms: { ...project.platforms, [platform]: event.target.checked } })} />{platform.toUpperCase()}</label>)}</div></fieldset>
        <fieldset><legend>Confiance</legend><label className="nosbloc-inline-check"><input type="checkbox" checked={project.safety?.moderation === true} onChange={event => updateProject(project.id, { safety: { ...project.safety, moderation: event.target.checked } })} /> Modération et signalement activés</label><label className="nosbloc-inline-check"><input type="checkbox" checked={project.safety?.cosmeticFirst === true} onChange={event => updateProject(project.id, { safety: { ...project.safety, cosmeticFirst: event.target.checked } })} /> Monétisation cosmétique d’abord</label></fieldset>
        <button type="button" className="nosbloc-primary" onClick={() => requestReview(project)} disabled={!readiness.readyForReview}><FileCheck2 size={18} /> Demander la révision</button>
        <small className="nosbloc-helper">Cette V1 prépare le dossier. La mise en ligne publique et les paiements restent verrouillés côté serveur.</small>
      </div>
    </section>

    <section className="nosbloc-panel">
      <p className="nosbloc-eyebrow">AI BUILD · PLAN LOCAL</p>
      <h2>Transformer ton idée en production.</h2>
      <label className="nosbloc-prompt"><textarea rows={5} maxLength={600} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Décris l’expérience à construire…" /><button type="button" className="nosbloc-secondary" onClick={generate}><Sparkles size={17} /> Générer le plan</button></label>
      {project.plan?.length
        ? <div className="nosbloc-plan">{project.plan.map(item => <button type="button" key={item.id} data-done={item.done} onClick={() => togglePlan(item.id)}><span>{item.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}</span><div><small>{item.category} · {item.priority}</small><strong>{item.title}</strong><p>{item.detail}</p></div></button>)}</div>
        : <div className="nosbloc-empty-mini"><Hammer size={32} /><p>Décris ton idée puis génère les premières étapes de production.</p></div>}
    </section>

    <section className="nosbloc-panel">
      <p className="nosbloc-eyebrow">CONTRÔLE AVANT RÉVISION</p>
      <Readiness project={project} />
    </section>
  </div>;
}

function Readiness({ project, compact = false }) {
  const readiness = projectReadiness(project);
  return <div className="nosbloc-readiness" data-compact={compact}>
    <div className="nosbloc-readiness-score"><strong>{readiness.score}</strong><span>/100</span></div>
    <div className="nosbloc-readiness-content">
      <div className="nosbloc-progress"><i style={{ width: `${readiness.score}%` }} /></div>
      {!compact && <ul>{readiness.checks.map(check => <li key={check.id} data-ok={check.ok}>{check.ok ? <CheckCircle2 size={16} /> : <Circle size={16} />}{check.label}<span>{check.weight} pts</span></li>)}</ul>}
      <p>{readiness.readyForReview ? "Le projet peut entrer en révision." : "Complète les points manquants. Aucun projet n’est publié automatiquement."}</p>
    </div>
  </div>;
}

function Team({ project, updateProject }) {
  if (!project) return <section className="nosbloc-empty"><Users size={42} /><h2>Choisis d’abord un projet.</h2></section>;
  const validation = validateSplits(project.splits);
  const preview = allocateTeamRevenue(70000, project.splits);

  const patchSplit = (id, patch) => updateProject(project.id, {
    splits: project.splits.map(row => row.id === id ? { ...row, ...patch } : row),
  });
  const add = () => updateProject(project.id, {
    splits: [...project.splits, { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`, name: "Nouveau membre", role: "Création", shareBps: 0, status: "draft" }],
  });
  const remove = id => updateProject(project.id, { splits: project.splits.filter(row => row.id !== id) });
  const equalize = () => {
    const count = project.splits.length;
    if (!count) return;
    const base = Math.floor(10000 / count);
    let assigned = 0;
    const splits = project.splits.map((row, index) => {
      const shareBps = index === count - 1 ? 10000 - assigned : base;
      assigned += shareBps;
      return { ...row, shareBps };
    });
    updateProject(project.id, { splits });
  };

  return <div className="nosbloc-two-column">
    <section className="nosbloc-panel">
      <ProjectSelector project={project} />
      <div className="nosbloc-panel-heading"><div><p className="nosbloc-eyebrow">CONTRAT D’ÉQUIPE</p><h2>Qui reçoit quoi ?</h2></div><Users size={25} /></div>
      <p>Le partage doit faire exactement 100 %. Les invitations et signatures réelles seront contrôlées par le serveur avant publication.</p>
      <div className="nosbloc-split-list">
        {project.splits.map(row => <article key={row.id}>
          <div className="nosbloc-split-identity">
            <input aria-label="Nom du membre" value={row.name} maxLength={50} onChange={event => patchSplit(row.id, { name: event.target.value })} />
            <input aria-label="Rôle du membre" value={row.role} maxLength={50} onChange={event => patchSplit(row.id, { role: event.target.value })} />
          </div>
          <label><input type="number" min="0" max="100" step="0.01" value={row.shareBps / 100} onChange={event => patchSplit(row.id, { shareBps: Math.round(safeNumber(event.target.value) * 100) })} /><span>%</span></label>
          <span className="nosbloc-split-status">{row.status === "owner" ? "Propriétaire" : "Invitation à signer"}</span>
          {row.status !== "owner" && <button type="button" className="nosbloc-icon-danger" onClick={() => remove(row.id)} aria-label={`Retirer ${row.name}`}><Trash2 size={17} /></button>}
        </article>)}
      </div>
      <div className="nosbloc-team-actions"><button type="button" className="nosbloc-secondary" onClick={add}><Plus size={17} /> Ajouter</button><button type="button" className="nosbloc-secondary" onClick={equalize}>Répartir également</button></div>
      <div className="nosbloc-split-total" data-valid={validation.valid}><span>Total</span><strong>{fmtPercent(validation.totalBps)}</strong><small>{validation.valid ? "Contrat équilibré" : "Le total doit être exactement 100 %"}</small></div>
    </section>

    <section className="nosbloc-panel">
      <p className="nosbloc-eyebrow">EXEMPLE AUTOMATIQUE</p>
      <h2>Sur 700 € créateur.</h2>
      {preview.valid
        ? <div className="nosbloc-allocation">{preview.allocations.map(row => <div key={row.id}><span><strong>{row.name}</strong><small>{row.role} · {fmtPercent(row.shareBps)}</small></span><b>{formatEuros(row.amountCents)}</b></div>)}</div>
        : <div className="nosbloc-warning">Corrige le partage pour voir la répartition exacte au centime.</div>}
      <div className="nosbloc-lock-note"><LockKeyhole size={19} /><div><strong>Versements désactivés en V1</strong><p>KYC, identité fiscale, seuil de retrait, chargebacks et anti-fraude devront être validés avant tout virement réel.</p></div></div>
    </section>
  </div>;
}

function Economy({ project }) {
  const [inputs, setInputs] = useState({ grossEuros: 1000, taxRate: 20, storeRate: 0, refundRate: 2, engagementRewardEuros: 75 });
  const result = simulateRevenue(inputs);
  const allocation = allocateTeamRevenue(result.creatorTotal, project?.splits || []);
  const set = key => event => setInputs(previous => ({ ...previous, [key]: safeNumber(event.target.value) }));

  return <div className="nosbloc-economy-layout">
    <section className="nosbloc-panel nosbloc-form">
      <div className="nosbloc-panel-heading"><div><p className="nosbloc-eyebrow">SIMULATEUR TRANSPARENT</p><h2>Du paiement au créateur.</h2></div><Calculator size={26} /></div>
      <label>Ventes TTC estimées (€)<input type="number" min="0" step="10" value={inputs.grossEuros} onChange={set("grossEuros")} /></label>
      <label>Taxes / TVA estimées (%)<input type="number" min="0" max="80" step="0.1" value={inputs.taxRate} onChange={set("taxRate")} /></label>
      <label>Commission boutique externe (%)<input type="number" min="0" max="50" step="0.1" value={inputs.storeRate} onChange={set("storeRate")} /></label>
      <label>Remboursements / litiges (%)<input type="number" min="0" max="40" step="0.1" value={inputs.refundRate} onChange={set("refundRate")} /></label>
      <label>Récompense engagement (€)<input type="number" min="0" step="5" value={inputs.engagementRewardEuros} onChange={set("engagementRewardEuros")} /></label>
      <small className="nosbloc-helper">Simulation pédagogique, pas une promesse de revenu. Les taux réels dépendront du pays, du canal de paiement et du contrat créateur.</small>
    </section>

    <section className="nosbloc-panel nosbloc-receipt">
      <p className="nosbloc-eyebrow">REÇU PRÉVISIONNEL</p>
      <h2>{project?.title || "Projet Nosbloc"}</h2>
      <dl>
        <div><dt>Ventes brutes</dt><dd>{formatEuros(result.gross)}</dd></div>
        <div className="negative"><dt>Taxes estimées</dt><dd>− {formatEuros(result.taxes)}</dd></div>
        <div className="negative"><dt>Boutique externe</dt><dd>− {formatEuros(result.storeFees)}</dd></div>
        <div className="negative"><dt>Remboursements</dt><dd>− {formatEuros(result.refunds)}</dd></div>
        <div className="subtotal"><dt>Revenu net éligible</dt><dd>{formatEuros(result.eligible)}</dd></div>
        <div className="creator"><dt>Créateur · 70 %</dt><dd>{formatEuros(result.creatorDirect)}</dd></div>
        <div className="creator"><dt>Engagement qualifié</dt><dd>+ {formatEuros(result.engagementReward)}</dd></div>
        <div><dt>Opérations 3B · 20 %</dt><dd>{formatEuros(result.operations)}</dd></div>
        <div><dt>Fonds créateurs · 5 %</dt><dd>{formatEuros(result.creatorPool)}</dd></div>
        <div><dt>Protection & croissance · 5 %</dt><dd>{formatEuros(result.protectionGrowth)}</dd></div>
      </dl>
      <div className="nosbloc-creator-total"><span>REVENU CRÉATEUR ESTIMÉ</span><strong>{formatEuros(result.creatorTotal)}</strong></div>
      {allocation.valid && <div className="nosbloc-allocation compact">{allocation.allocations.map(row => <div key={row.id}><span>{row.name}</span><b>{formatEuros(row.amountCents)}</b></div>)}</div>}
    </section>

    <section className="nosbloc-panel nosbloc-wide">
      <p className="nosbloc-eyebrow">RÈGLE DE BASE</p>
      <div className="nosbloc-rule-bars">
        <div style={{ "--share": `${ECONOMY_RULES.creatorShareBps / 100}%` }}><strong>70 %</strong><span>Créateur</span></div>
        <div style={{ "--share": `${ECONOMY_RULES.platformOperationsBps / 100}%` }}><strong>20 %</strong><span>Plateforme</span></div>
        <div style={{ "--share": `${ECONOMY_RULES.creatorPoolBps / 100}%` }}><strong>5 %</strong><span>Fonds créateurs</span></div>
        <div style={{ "--share": `${ECONOMY_RULES.protectionGrowthBps / 100}%` }}><strong>5 %</strong><span>Protection</span></div>
      </div>
    </section>
  </div>;
}

function Marketplace({ project, updateProject }) {
  const licensed = new Set(project?.licensedAssets || []);
  const license = asset => {
    if (!project || licensed.has(asset.id)) return;
    updateProject(project.id, { licensedAssets: [...project.licensedAssets, asset.id] });
  };
  return <div className="nosbloc-market-layout">
    <section className="nosbloc-panel nosbloc-wide">
      <div className="nosbloc-panel-heading"><div><p className="nosbloc-eyebrow">3B CREATOR MARKET</p><h2>Construire sans tout refaire.</h2></div><Store size={26} /></div>
      <p>Architecture, animation, musique, systèmes de jeu et interfaces. Chaque asset affiche son auteur et sa licence avant utilisation.</p>
      {!project && <div className="nosbloc-warning">Sélectionne un projet pour ajouter une licence.</div>}
      <div className="nosbloc-assets">
        {SAMPLE_ASSETS.map(asset => <article key={asset.id}>
          <div className="nosbloc-asset-visual"><PackagePlus size={28} /><span>{asset.category}</span></div>
          <h3>{asset.name}</h3>
          <p>par {asset.creator}</p>
          <div className="nosbloc-tags">{asset.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
          <strong>{asset.priceCents ? formatEuros(asset.priceCents) : `${fmtPercent(asset.royaltyBps)} des revenus liés`}</strong>
          <small>{asset.license}</small>
          <button type="button" className="nosbloc-secondary" disabled={!project || licensed.has(asset.id)} onClick={() => license(asset)}>{licensed.has(asset.id) ? <><CheckCircle2 size={16} /> Licence ajoutée</> : <><Plus size={16} /> Ajouter au projet</>}</button>
        </article>)}
      </div>
    </section>

    <section className="nosbloc-panel">
      <p className="nosbloc-eyebrow">LICENCES DU PROJET</p>
      <h2>{project?.title || "Aucun projet actif"}</h2>
      {project?.licensedAssets?.length
        ? <ul className="nosbloc-license-list">{project.licensedAssets.map(id => { const asset = SAMPLE_ASSETS.find(item => item.id === id); return <li key={id}><CheckCircle2 size={17} /><span><strong>{asset?.name || id}</strong><small>{asset?.creator || "Créateur Nosbloc"}</small></span></li>; })}</ul>
        : <p className="nosbloc-muted">Aucune licence ajoutée. Les achats de cette démonstration ne déclenchent aucun paiement réel.</p>}
    </section>

    <section className="nosbloc-panel">
      <p className="nosbloc-eyebrow">DEVENIR VENDEUR</p>
      <h2>Un métier, pas seulement un jeu.</h2>
      <p>Artiste 3D, animateur, compositeur, designer textile, développeur, auteur ou comédien voix : chacun pourra vendre ou licencier son travail.</p>
      <div className="nosbloc-lock-note"><ShieldCheck size={19} /><div><strong>Droits obligatoires</strong><p>Le vendeur devra confirmer qu’il possède les droits, fournir les sources utiles et accepter le contrôle anti-copie.</p></div></div>
    </section>
  </div>;
}

function Discovery({ projects, selected, updateProject, openProject }) {
  if (!projects.length) return <section className="nosbloc-empty"><Compass size={44} /><h2>Les projets apparaîtront ici.</h2></section>;
  const sorted = [...projects].sort((a, b) => discoveryScore(b) - discoveryScore(a));
  const patchStat = key => event => selected && updateProject(selected.id, { stats: { ...selected.stats, [key]: safeNumber(event.target.value) } });

  return <div className="nosbloc-two-column">
    <section className="nosbloc-panel">
      <p className="nosbloc-eyebrow">3B DISCOVERY LAB</p>
      <h2>La qualité avant la taille.</h2>
      <p>Chaque nouveau projet peut recevoir un petit échantillon de joueurs. La visibilité grandit seulement si l’expérience est stable, utile et appréciée.</p>
      <div className="nosbloc-ranking">
        {sorted.map((project, index) => <button type="button" key={project.id} onClick={() => openProject(project.id, "discovery")}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{project.title}</strong><small>Préparation {projectReadiness(project).score} % · Confiance {project.stats?.trustScore ?? 100}</small></div><b>{discoveryScore(project)}</b></button>)}
      </div>
    </section>

    <section className="nosbloc-panel">
      <ProjectSelector project={selected} />
      <p className="nosbloc-eyebrow">SIMULER LE SIGNAL QUALITÉ</p>
      <h2>Ce que l’algorithme regarde.</h2>
      {selected && <div className="nosbloc-form">
        <label>Rétention J+7 (%)<input type="number" min="0" max="100" value={selected.stats?.retention7 || 0} onChange={patchStat("retention7")} /></label>
        <label>Session active moyenne (minutes)<input type="number" min="0" max="60" value={selected.stats?.sessionMinutes || 0} onChange={patchStat("sessionMinutes")} /></label>
        <label>Score de confiance<input type="number" min="0" max="100" value={selected.stats?.trustScore ?? 100} onChange={patchStat("trustScore")} /></label>
        <div className="nosbloc-discovery-score"><span>SCORE DÉCOUVERTE</span><strong>{discoveryScore(selected)}</strong><small>40 % préparation · 25 % rétention · 15 % temps actif · 20 % confiance</small></div>
      </div>}
    </section>

    <section className="nosbloc-panel nosbloc-wide">
      <p className="nosbloc-eyebrow">PROGRESSION DE TEST</p>
      <div className="nosbloc-test-ladder">{[["100", "Premier test"], ["1 000", "Signal confirmé"], ["10 000", "Montée en visibilité"], ["MONDE", "Distribution large"]].map(([value, label], index) => <article key={value}><span>{index + 1}</span><strong>{value}</strong><small>{label}</small></article>)}</div>
      <p className="nosbloc-muted">Ces volumes sont des paliers de conception, pas une garantie automatique. Les contrôles anti-bot, la diversité des joueurs et la sécurité priment sur le nombre brut.</p>
    </section>
  </div>;
}
