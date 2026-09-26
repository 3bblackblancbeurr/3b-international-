import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArrowLeft, ArrowRight, BarChart3, Bell, Boxes, Check, CheckCircle2,
  Circle, Coins, Compass, Download, Eye, FileCheck2, FolderKanban, History,
  Home, LockKeyhole, Monitor, Plus, Rocket, RotateCcw, Search, Settings2,
  ShieldCheck, Smartphone, Sparkles, Store, Upload, UserRound, Users, WalletCards,
  Wifi, WifiOff, X
} from "lucide-react";
import { useLoyalty } from "../loyalty/LoyaltyContext.jsx";
import City3BPortal from "../components/City3BPortal.jsx";
import {
  NOSBLOC_STORAGE_KEY, PROJECT_TEMPLATES, PROJECT_TYPES, createActivity,
  createEmptyState, createProject, formatEuros, generateBuildPlan,
  normalizeState, projectReadiness
} from "./model.js";
import {
  appendProjectVersion, parseStateExport, restoreProjectVersion,
  serializeStateExport
} from "./versioning.js";
import {
  NOSBLOC_SERVER_ENABLED, NOSBLOC_SERVER_ENV, NOSBLOC_SERVER_ENV_VALID, nosblocServer
} from "./server-client.js";
import "./nosbloc.css";

const STATUS_LABELS = {
  draft: "Brouillon",
  private_test: "Test privé",
  review: "En vérification",
  approved: "Prêt",
  published: "Publié",
  restricted: "Action requise",
  suspended: "Suspendu",
  archived: "Archivé",
};

const MAIN_NAV = [
  ["home", "Accueil", Home],
  ["explore", "Explorer", Compass],
  ["create", "Créer", Plus],
  ["activity", "Activité", Bell],
  ["me", "Moi", UserRound],
];

const PRO_TABS = [
  ["project", "Projet", Settings2],
  ["versions", "Versions", History],
  ["team", "Équipe", Users],
  ["economy", "Économie", WalletCards],
  ["analytics", "Analytics", BarChart3],
  ["security", "Sécurité", ShieldCheck],
];

const nowIso = () => new Date().toISOString();

function loadState(storageKey, recoveryKey, profile) {
  const read = key => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? normalizeState(JSON.parse(raw), profile) : null;
    } catch {
      return null;
    }
  };
  const current = read(storageKey);
  if (current) return { state: current, recovered: false };
  const recovered = read(recoveryKey);
  if (recovered) return { state: recovered, recovered: true };
  return { state: createEmptyState(profile), recovered: false };
}

function statusTone(status) {
  if (status === "published" || status === "approved") return "good";
  if (status === "review" || status === "private_test") return "progress";
  if (status === "restricted" || status === "suspended") return "danger";
  if (status === "archived") return "muted";
  return "neutral";
}

function compactDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default function NosblocPage({ goTo }) {
  const account = useLoyalty();
  const ownerName = account.profile?.name || account.passport?.name || "Créateur 3B";
  const userKey = account.user?.id || "device";
  const storageKey = `${NOSBLOC_STORAGE_KEY}:${userKey}`;
  const recoveryKey = `${storageKey}:last-good`;
  const importRef = useRef(null);

  const [view, setView] = useState("home");
  const [state, setState] = useState(() => createEmptyState({ studioName: `Studio de ${ownerName}` }));
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [cityOpen, setCityOpen] = useState(false);
  const [serverState, setServerState] = useState({ connected: false, busy: false, error: "", lastSync: "" });

  useEffect(() => {
    const loadedState = loadState(storageKey, recoveryKey, { studioName: `Studio de ${ownerName}` });
    setState(loadedState.state);
    setSelectedId(loadedState.state.projects.find(project => project.status !== "archived")?.id || loadedState.state.projects[0]?.id || "");
    if (loadedState.recovered) setNotice("Dernière sauvegarde saine restaurée automatiquement.");
    setLoaded(true);
  }, [storageKey, recoveryKey, ownerName]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    addEventListener("online", sync);
    addEventListener("offline", sync);
    return () => {
      removeEventListener("online", sync);
      removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!NOSBLOC_SERVER_ENABLED || !NOSBLOC_SERVER_ENV_VALID || !account.user?.id) return undefined;
    let active = true;
    setServerState(previous => ({ ...previous, busy: true, error: "" }));
    nosblocServer.snapshot(account.user.id)
      .then(() => {
        if (active) setServerState({ connected: true, busy: false, error: "", lastSync: nowIso() });
      })
      .catch(error => {
        if (active) setServerState(previous => ({
          ...previous,
          connected: false,
          busy: false,
          error: error instanceof Error ? error.message : "Serveur Nosbloc indisponible.",
        }));
      });
    return () => { active = false; };
  }, [account.user?.id]);

  const selected = useMemo(
    () => state.projects.find(project => project.id === selectedId) || null,
    [state.projects, selectedId],
  );
  const activeProjects = useMemo(() => state.projects.filter(project => project.status !== "archived"), [state.projects]);
  const latestProject = useMemo(
    () => [...activeProjects].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null,
    [activeProjects],
  );
  const unread = state.activity.filter(item => !item.read).length;
  const coinsBalance = Number(account.profile?.points ?? state.wallet.coins.balance ?? 0);

  function persist(next, previous) {
    try {
      localStorage.setItem(recoveryKey, JSON.stringify(previous));
      localStorage.setItem(storageKey, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }

  function commit(updater, activity) {
    setState(previous => {
      const candidate = typeof updater === "function" ? updater(previous) : updater;
      const next = normalizeState({
        ...candidate,
        activity: activity ? [...(candidate.activity || []), createActivity(activity.type, activity.title, activity.detail, activity.metadata)].slice(-250) : candidate.activity,
        updatedAt: nowIso(),
      }, candidate.profile);
      if (!persist(next, previous)) setNotice("Sauvegarde locale indisponible. Évite de fermer l’application.");
      return next;
    });
  }

  function updateProject(projectId, patch, activity) {
    commit(previous => ({
      ...previous,
      projects: previous.projects.map(project => {
        if (project.id !== projectId) return project;
        const delta = typeof patch === "function" ? patch(project) : patch;
        return { ...project, ...delta, updatedAt: nowIso() };
      }),
    }), activity);
  }

  function openProject(projectId) {
    setSelectedId(projectId);
    setView("studio");
    setNotice("");
  }

  function archiveProject(projectId) {
    const project = state.projects.find(item => item.id === projectId);
    if (!project) return;
    updateProject(projectId, { status: "archived", visibility: "private" }, {
      type: "project",
      title: `${project.title} archivé`,
      detail: "Le projet reste récupérable depuis Mes projets.",
    });
    setView("projects");
    setNotice("Projet archivé. Rien n’a été supprimé définitivement.");
  }

  async function syncServerProject(project) {
    if (!NOSBLOC_SERVER_ENABLED) return null;
    if (!NOSBLOC_SERVER_ENV_VALID) throw new Error("Configuration serveur Nosbloc invalide.");
    setServerState(previous => ({ ...previous, busy: true, error: "" }));
    try {
      const synced = await nosblocServer.syncProject(project, account.user?.id);
      updateProject(project.id, {
        serverProjectId: synced.projectId,
        serverRevision: synced.revision,
        serverEnvironment: NOSBLOC_SERVER_ENV,
      });
      setServerState({ connected: true, busy: false, error: "", lastSync: nowIso() });
      return synced;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Synchronisation serveur impossible.";
      setServerState(previous => ({ ...previous, connected: false, busy: false, error: message }));
      throw error;
    }
  }

  async function runPrivateTest(project) {
    if (!project || serverState.busy) return;
    let serverMeta = {};
    if (NOSBLOC_SERVER_ENABLED) {
      try {
        const synced = await syncServerProject(project);
        const remote = await nosblocServer.privateTest(synced.projectId, project, account.user?.id);
        serverMeta = {
          serverProjectId: synced.projectId,
          serverRevision: synced.revision,
          serverVersionId: remote.versionId,
          serverVersionNo: remote.versionNo,
          serverEnvironment: NOSBLOC_SERVER_ENV,
        };
        setServerState({ connected: true, busy: false, error: "", lastSync: nowIso() });
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Le test serveur n’a pas abouti.");
        return;
      }
    }
    const result = appendProjectVersion(project, { stage: "private_test", note: "Test privé Nosbloc V2" });
    updateProject(project.id, { ...result.project, ...serverMeta }, {
      type: "project",
      title: `Test privé · ${project.title}`,
      detail: `Version ${result.version.versionNo} figée pour test${NOSBLOC_SERVER_ENABLED ? " et enregistrée côté serveur" : ""}.`,
    });
    setNotice(`Version ${result.version.versionNo} créée. Test privé prêt${NOSBLOC_SERVER_ENABLED ? " et synchronisé" : ""}.`);
  }

  async function requestReview(project) {
    if (!project || serverState.busy) return;
    const readiness = projectReadiness(project);
    if (!readiness.readyForReview) {
      const missing = readiness.checks.filter(check => !check.ok).map(check => check.label).slice(0, 3).join(" · ");
      setNotice(`Encore ${100 - readiness.score} % à sécuriser avant vérification${missing ? ` : ${missing}` : ""}.`);
      return;
    }
    let serverMeta = {};
    if (NOSBLOC_SERVER_ENABLED) {
      try {
        const synced = await syncServerProject(project);
        const remote = await nosblocServer.submitReview(synced.projectId, project, account.user?.id);
        serverMeta = {
          serverProjectId: synced.projectId,
          serverRevision: synced.revision,
          serverVersionId: remote.versionId,
          serverVersionNo: remote.versionNo,
          serverModerationCaseId: remote.caseId || null,
          serverEnvironment: NOSBLOC_SERVER_ENV,
        };
        setServerState({ connected: true, busy: false, error: "", lastSync: nowIso() });
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "La vérification serveur n’a pas abouti.");
        return;
      }
    }
    const result = appendProjectVersion(project, { stage: "review", note: "Demande de publication Nosbloc V2" });
    updateProject(project.id, { ...result.project, ...serverMeta }, {
      type: "moderation",
      title: `${project.title} envoyé en vérification`,
      detail: `Version ${result.version.versionNo}. La version est maintenant figée.`,
    });
    setNotice("Version envoyée en vérification. Le brouillon reste modifiable séparément.");
  }

  function restoreVersion(project, versionId) {
    try {
      const restored = restoreProjectVersion(project, versionId);
      updateProject(project.id, restored, {
        type: "project",
        title: `Version restaurée · ${project.title}`,
        detail: "La restauration a créé un nouveau brouillon privé.",
      });
      setNotice("Version restaurée comme brouillon. La version publiée reste intacte.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Restauration impossible.");
    }
  }

  function exportArchive() {
    const blob = new Blob([serializeStateExport(state)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nosbloc-3b-v2-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice("Archive Nosbloc exportée.");
  }

  async function importArchive(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("Archive trop volumineuse.");
      const imported = parseStateExport(await file.text(), { studioName: `Studio de ${ownerName}` });
      commit(() => imported, { type: "security", title: "Archive restaurée", detail: "Import vérifié et appliqué." });
      setSelectedId(imported.projects[0]?.id || "");
      setView("home");
      setNotice("Archive vérifiée et restaurée.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import impossible.");
    }
  }

  function markActivitiesRead() {
    commit(previous => ({ ...previous, activity: previous.activity.map(item => ({ ...item, read: true })) }));
  }

  if (!loaded) return <section className="nb2-loading">Ouverture de Nosbloc 3B…</section>;

  return (
    <section className="nb2-shell">
      <aside className="nb2-sidebar" aria-label="Nosbloc 3B">
        <button type="button" className="nb2-brand" onClick={() => setView("home")} aria-label="Accueil Nosbloc 3B">
          <span>3B</span><div><strong>NOSBLOC</strong><small>Creator Platform</small></div>
        </button>
        <nav className="nb2-side-nav">
          {MAIN_NAV.map(([id, label, Icon]) => <NavButton key={id} id={id} label={label} Icon={Icon} active={view === id} count={id === "activity" ? unread : 0} onClick={setView} />)}
          <div className="nb2-nav-separator" />
          <NavButton id="projects" label="Mes créations" Icon={FolderKanban} active={view === "projects"} onClick={setView} />
          <button type="button" className={`nb2-side-link ${view === "studio" ? "active" : ""}`} disabled={!selected} onClick={() => selected && setView("studio")}>
            <Boxes size={19} /><span>Studio</span>
          </button>
        </nav>
        <div className="nb2-side-foot">
          <div className={`nb2-network ${online ? "online" : "offline"}`}>{online ? <Wifi size={15} /> : <WifiOff size={15} />}{online ? "En ligne" : "Hors connexion"}</div>
          <button type="button" onClick={() => goTo?.("passport")}><ShieldCheck size={17} /> Passeport 3B</button>
        </div>
      </aside>

      <div className="nb2-main">
        <header className="nb2-topbar">
          <div>
            <p>{view === "studio" && selected ? selected.title : "NOSBLOC 3B"}</p>
            <span>{NOSBLOC_SERVER_ENABLED
              ? serverState.connected
                ? `Serveur ${NOSBLOC_SERVER_ENV} synchronisé`
                : serverState.error
                  ? "Serveur indisponible · copie locale conservée"
                  : "Connexion serveur…"
              : online ? "Sauvegarde automatique locale active" : "Modifications conservées sur cet appareil"}</span>
          </div>
          <div className="nb2-top-actions">
            <button type="button" className="nb2-icon-btn" onClick={() => { setView("activity"); markActivitiesRead(); }} aria-label="Activité">
              <Bell size={19} />{unread > 0 && <b>{Math.min(unread, 99)}</b>}
            </button>
            <button type="button" className="nb2-avatar" onClick={() => setView("me")} aria-label="Profil créateur">{String(ownerName).trim().charAt(0).toUpperCase() || "3"}</button>
          </div>
        </header>

        {notice && <div className="nb2-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Fermer"><X size={17} /></button></div>}

        <main className="nb2-content">
          {view === "home" && <HomeView ownerName={ownerName} projects={activeProjects} latestProject={latestProject} wallet={state.wallet} coinsBalance={coinsBalance} onNavigate={setView} onOpenProject={openProject} onOpenCity={() => setCityOpen(true)} />}
          {view === "explore" && <ExploreView projects={activeProjects} onOpenProject={openProject} onOpenCity={() => setCityOpen(true)} />}
          {view === "create" && <CreateView ownerName={ownerName} onCreate={project => {
            commit(previous => ({ ...previous, projects: [project, ...previous.projects] }), {
              type: "project", title: `Projet créé · ${project.title}`, detail: "Nouveau brouillon privé."
            });
            setSelectedId(project.id);
            setView("studio");
          }} />}
          {view === "activity" && <ActivityView items={state.activity} onReadAll={markActivitiesRead} />}
          {view === "me" && <ProfileView ownerName={ownerName} profile={state.profile} wallet={state.wallet} coinsBalance={coinsBalance} projects={activeProjects} onProjects={() => setView("projects")} onExport={exportArchive} onImport={() => importRef.current?.click()} />}
          {view === "projects" && <ProjectsView projects={state.projects} onOpen={openProject} onCreate={() => setView("create")} onArchive={archiveProject} />}
          {view === "studio" && selected && <StudioView project={selected} profile={state.profile} wallet={state.wallet} coinsBalance={coinsBalance} serverBusy={serverState.busy} serverConnected={serverState.connected} onBack={() => setView("projects")} updateProject={updateProject} onTest={runPrivateTest} onReview={requestReview} onRestore={restoreVersion} />}
          {view === "studio" && !selected && <EmptyState title="Aucun projet ouvert" text="Crée ton premier projet pour ouvrir le Studio." action="Créer" onAction={() => setView("create")} />}
        </main>
      </div>

      <nav className="nb2-mobile-nav" aria-label="Navigation Nosbloc mobile">
        {MAIN_NAV.map(([id, label, Icon]) => <button type="button" key={id} className={`${view === id ? "active" : ""} ${id === "create" ? "create" : ""}`} onClick={() => setView(id)}>
          <span className="nb2-mobile-icon"><Icon size={id === "create" ? 25 : 21} />{id === "activity" && unread > 0 && <b>{Math.min(unread, 9)}</b>}</span><small>{label}</small>
        </button>)}
      </nav>

      <input ref={importRef} hidden type="file" accept=".json,application/json" onChange={importArchive} />
      <City3BPortal open={cityOpen} onClose={() => setCityOpen(false)} />
    </section>
  );
}

function NavButton({ id, label, Icon, active, count = 0, onClick }) {
  return <button type="button" className={`nb2-side-link ${active ? "active" : ""}`} onClick={() => onClick(id)}>
    <Icon size={19} /><span>{label}</span>{count > 0 && <b>{Math.min(count, 99)}</b>}
  </button>;
}

function HomeView({ ownerName, projects, latestProject, wallet, coinsBalance, onNavigate, onOpenProject, onOpenCity }) {
  const published = projects.filter(project => project.status === "published").length;
  const reviewing = projects.filter(project => project.status === "review").length;
  return <div className="nb2-stack">
    <section className="nb2-hero">
      <div className="nb2-hero-copy">
        <p className="nb2-kicker">NOSBLOC 3B</p>
        <h1>Imagine. Construis.<br /><em>Publie.</em></h1>
        <p>Une plateforme simple devant, puissante derrière. Crée un jeu, un monde, un objet ou une expérience sans te perdre dans les outils.</p>
        <div className="nb2-hero-actions">
          <button type="button" className="nb2-primary" onClick={() => onNavigate("create")}><Plus size={18} /> Créer quelque chose</button>
          <button type="button" className="nb2-secondary" onClick={() => onNavigate("explore")}><Compass size={18} /> Découvrir</button>
        </div>
      </div>
      <div className="nb2-hero-orbit" aria-hidden="true"><span>3B</span><i /><i /><i /></div>
    </section>

    <section className="nb2-quick-grid">
      <QuickCard Icon={Compass} title="Découvrir" text="Voir les créations, mondes et expériences." action="Explorer" onClick={() => onNavigate("explore")} />
      <QuickCard Icon={Plus} title="Créer" text="IA, modèle, projet vide ou import." action="Commencer" onClick={() => onNavigate("create")} accent />
      <QuickCard Icon={Rocket} title="Continuer" text={latestProject ? latestProject.title : "Ton premier projet t’attend."} action={latestProject ? "Ouvrir le Studio" : "Créer"} onClick={() => latestProject ? onOpenProject(latestProject.id) : onNavigate("create")} />
    </section>

    <section className="nb2-section">
      <div className="nb2-section-head"><div><p className="nb2-kicker">AUJOURD’HUI</p><h2>Ton espace créateur</h2></div><button type="button" className="nb2-text-btn" onClick={() => onNavigate("projects")}>Mes créations <ArrowRight size={16} /></button></div>
      <div className="nb2-stat-grid">
        <Stat label="Projets actifs" value={projects.length} />
        <Stat label="Publiés" value={published} />
        <Stat label="En vérification" value={reviewing} />
        <Stat label="Revenus disponibles" value={formatEuros(wallet.real.availableCents)} />
      </div>
    </section>

    {latestProject && <section className="nb2-section">
      <div className="nb2-section-head"><div><p className="nb2-kicker">REPRENDRE</p><h2>{latestProject.title}</h2></div><Status status={latestProject.status} /></div>
      <ProjectProgress project={latestProject} />
      <button type="button" className="nb2-primary compact" onClick={() => onOpenProject(latestProject.id)}>Continuer <ArrowRight size={16} /></button>
    </section>}

    <section className="nb2-city-card">
      <div><p className="nb2-kicker">PREMIER BLOC OFFICIEL</p><h2>3B MA VILLE</h2><p>Construis ton bloc directement depuis Nosbloc avec le système Ville 3B déjà relié à ton Passeport.</p></div>
      <button type="button" onClick={onOpenCity}><Boxes size={22} /><span>Ouvrir 3B MA VILLE</span><ArrowRight size={18} /></button>
    </section>

    <section className="nb2-wallet-strip">
      <div><WalletCards size={20} /><span><small>ARGENT RÉEL</small><strong>{formatEuros(wallet.real.availableCents)}</strong></span></div>
      <div><Coins size={20} /><span><small>COINS 3B</small><strong>{Number(coinsBalance).toLocaleString("fr-FR")}</strong></span></div>
      <p>Deux soldes séparés. Aucun mélange entre monnaie interne et argent réel.</p>
    </section>
  </div>;
}

function QuickCard({ Icon, title, text, action, onClick, accent }) {
  return <button type="button" className={`nb2-quick-card ${accent ? "accent" : ""}`} onClick={onClick}>
    <span className="nb2-quick-icon"><Icon size={24} /></span><strong>{title}</strong><p>{text}</p><small>{action} <ArrowRight size={14} /></small>
  </button>;
}

function ExploreView({ projects, onOpenProject, onOpenCity }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = projects.filter(project => {
    const text = `${project.title} ${project.description} ${project.type} ${project.template}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const matchesFilter = filter === "all" || project.type === filter;
    return matchesQuery && matchesFilter;
  });
  return <div className="nb2-stack">
    <PageIntro kicker="EXPLORER" title="Trouve quelque chose qui mérite ton temps." text="Jeux, mondes, objets et expériences 3B dans une recherche unique." />
    <div className="nb2-search"><Search size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher jeux, mondes, objets, créateurs…" /></div>
    <div className="nb2-filter-row">
      <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tout</button>
      {PROJECT_TYPES.slice(0, 5).map(type => <button type="button" key={type.id} className={filter === type.id ? "active" : ""} onClick={() => setFilter(type.id)}>{type.label.split(" / ")[0]}</button>)}
    </div>

    <section className="nb2-featured-city">
      <div><span className="nb2-official-badge"><CheckCircle2 size={14} /> 3B OFFICIEL</span><h2>3B MA VILLE</h2><p>Le premier Bloc officiel réellement constructible.</p></div>
      <button type="button" className="nb2-secondary" onClick={onOpenCity}>Ouvrir <ArrowRight size={16} /></button>
    </section>

    <div className="nb2-project-grid">
      {visible.map(project => <ProjectCard key={project.id} project={project} onOpen={() => onOpenProject(project.id)} />)}
    </div>
    {!visible.length && <EmptyState title="Rien ici pour l’instant" text="Change le filtre ou crée la première expérience de cette catégorie." />}
  </div>;
}

function CreateView({ ownerName, onCreate }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ type: "world", mode: "template", title: "", description: "", template: PROJECT_TEMPLATES.world[0], audience: "Tout public" });
  const templates = PROJECT_TEMPLATES[form.type] || PROJECT_TEMPLATES.world;

  function setType(type) {
    setForm(previous => ({ ...previous, type, template: PROJECT_TEMPLATES[type][0] }));
    setStep(2);
  }

  function finish(event) {
    event.preventDefault();
    if (form.title.trim().length < 3) return;
    const project = createProject({
      title: form.title,
      type: form.type,
      template: form.template,
      description: form.description,
      audience: form.audience,
      creationMode: form.mode,
    }, ownerName);
    if (form.mode !== "blank") project.plan = generateBuildPlan(form.description || form.title, form.type);
    onCreate(project);
  }

  return <div className="nb2-stack nb2-create-flow">
    <PageIntro kicker="CRÉER" title="Qu’est-ce que tu veux construire ?" text="Nosbloc ne t’envoie pas dans un tableau technique. Choisis d’abord ton objectif." />
    <div className="nb2-steps" aria-label="Étapes de création"><span className={step >= 1 ? "active" : ""}>1</span><i /><span className={step >= 2 ? "active" : ""}>2</span><i /><span className={step >= 3 ? "active" : ""}>3</span></div>

    {step === 1 && <div className="nb2-type-grid">
      {PROJECT_TYPES.map(type => <button type="button" key={type.id} onClick={() => setType(type.id)}><Boxes size={23} /><strong>{type.label}</strong><p>{type.description}</p><ArrowRight size={17} /></button>)}
    </div>}

    {step === 2 && <>
      <button type="button" className="nb2-back-inline" onClick={() => setStep(1)}><ArrowLeft size={16} /> Retour</button>
      <div className="nb2-mode-grid">
        {[
          ["ai", Sparkles, "Créer avec l’IA", "Décris ton idée. Nosbloc prépare une structure et un plan."],
          ["template", FileCheck2, "Partir d’un modèle", "Commence avec une base organisée que tu peux modifier."],
          ["blank", Boxes, "Créer de zéro", "Aucune décision imposée. Studio vide et propre."],
          ["import", Upload, "Importer un projet", "Prépare un projet existant pour Nosbloc."],
        ].map(([id, Icon, title, text]) => <button type="button" key={id} onClick={() => { setForm(previous => ({ ...previous, mode: id })); setStep(3); }}><Icon size={25} /><strong>{title}</strong><p>{text}</p><ArrowRight size={17} /></button>)}
      </div>
    </>}

    {step === 3 && <form className="nb2-create-form" onSubmit={finish}>
      <button type="button" className="nb2-back-inline" onClick={() => setStep(2)}><ArrowLeft size={16} /> Retour</button>
      <div className="nb2-form-head"><p className="nb2-kicker">{PROJECT_TYPES.find(type => type.id === form.type)?.label}</p><h2>Donne une identité à ton projet.</h2></div>
      <label>Nom<input autoFocus maxLength={80} value={form.title} onChange={event => setForm(previous => ({ ...previous, title: event.target.value }))} placeholder="Ex. France — Justice" /></label>
      <label>Description<textarea rows={5} maxLength={600} value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} placeholder={form.mode === "ai" ? "Décris ce que tu veux. Exemple : une petite ville française avec une place, des boutiques, un terrain de foot…" : "Explique clairement l’expérience."} /></label>
      <div className="nb2-form-two"><label>Base<select value={form.template} onChange={event => setForm(previous => ({ ...previous, template: event.target.value }))}>{templates.map(template => <option key={template}>{template}</option>)}</select></label><label>Public<select value={form.audience} onChange={event => setForm(previous => ({ ...previous, audience: event.target.value }))}><option>Tout public</option><option>13+</option><option>16+</option><option>18+</option></select></label></div>
      <button className="nb2-primary" type="submit" disabled={form.title.trim().length < 3}><Rocket size={18} /> Créer et ouvrir le Studio</button>
    </form>}
  </div>;
}

function ActivityView({ items, onReadAll }) {
  const rows = [...items].reverse();
  return <div className="nb2-stack">
    <div className="nb2-section-head"><PageIntro kicker="ACTIVITÉ" title="Tout ce qui mérite ton attention." text="Projets, ventes, sécurité, invitations et modération au même endroit." /><button type="button" className="nb2-text-btn" onClick={onReadAll}>Tout marquer lu</button></div>
    <div className="nb2-activity-list">
      {rows.map(item => <article key={item.id} className={item.read ? "" : "unread"}><span className="nb2-activity-dot" /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{compactDate(item.createdAt)} · {item.type}</small></div></article>)}
    </div>
    {!rows.length && <EmptyState title="Aucune activité" text="Les événements importants apparaîtront ici, pas dans dix écrans différents." />}
  </div>;
}

function ProfileView({ ownerName, profile, wallet, coinsBalance, projects, onProjects, onExport, onImport }) {
  return <div className="nb2-stack">
    <section className="nb2-profile-hero">
      <div className="nb2-profile-avatar">{String(ownerName).trim().charAt(0).toUpperCase() || "3"}</div>
      <div><p className="nb2-kicker">CRÉATEUR 3B</p><h1>{ownerName}</h1><p>{profile.studioName}</p></div>
      <span className="nb2-trust"><ShieldCheck size={17} /> Confiance {profile.trustScore}/100</span>
    </section>
    <section className="nb2-section">
      <div className="nb2-section-head"><div><p className="nb2-kicker">PORTEFEUILLES</p><h2>Deux systèmes, aucune ambiguïté.</h2></div></div>
      <div className="nb2-wallet-grid">
        <article><span><WalletCards size={22} /> ARGENT RÉEL</span><strong>{formatEuros(wallet.real.availableCents)}</strong><dl><div><dt>En attente</dt><dd>{formatEuros(wallet.real.pendingCents)}</dd></div><div><dt>Versement</dt><dd>{formatEuros(wallet.real.payoutCents)}</dd></div></dl></article>
        <article><span><Coins size={22} /> COINS 3B</span><strong>{Number(coinsBalance).toLocaleString("fr-FR")}</strong><p>Monnaie interne. Ne représente pas ton solde bancaire.</p></article>
      </div>
    </section>
    <section className="nb2-section">
      <div className="nb2-settings-list">
        <button type="button" onClick={onProjects}><FolderKanban size={20} /><span><strong>Mes créations</strong><small>{projects.length} projet{projects.length > 1 ? "s" : ""} actif{projects.length > 1 ? "s" : ""}</small></span><ArrowRight size={17} /></button>
        <div className="nb2-setting-row"><ShieldCheck size={20} /><span><strong>Vérification créateur</strong><small>{profile.verification === "verifie" ? "Compte vérifié" : "Vérification non terminée"}</small></span><StatusText good={profile.verification === "verifie"}>{profile.verification === "verifie" ? "Vérifié" : "À faire"}</StatusText></div>
        <div className="nb2-setting-row"><WalletCards size={20} /><span><strong>Versements</strong><small>État du compte de paiement</small></span><StatusText good={profile.payoutStatus === "actif"}>{profile.payoutStatus === "actif" ? "Actifs" : "Verrouillés"}</StatusText></div>
        <button type="button" onClick={onExport}><Download size={20} /><span><strong>Exporter Nosbloc</strong><small>Sauvegarde complète vérifiable</small></span><ArrowRight size={17} /></button>
        <button type="button" onClick={onImport}><Upload size={20} /><span><strong>Restaurer une archive</strong><small>L’ancien état reste récupérable</small></span><ArrowRight size={17} /></button>
      </div>
    </section>
  </div>;
}

function ProjectsView({ projects, onOpen, onCreate, onArchive }) {
  const active = projects.filter(project => project.status !== "archived");
  const archived = projects.filter(project => project.status === "archived");
  return <div className="nb2-stack">
    <div className="nb2-section-head"><PageIntro kicker="MES CRÉATIONS" title="Tes projets, sans bruit autour." text="Brouillons, tests et versions publiées restent séparés." /><button type="button" className="nb2-primary compact" onClick={onCreate}><Plus size={17} /> Nouveau</button></div>
    <div className="nb2-project-grid">{active.map(project => <ProjectCard key={project.id} project={project} onOpen={() => onOpen(project.id)} onArchive={() => onArchive(project.id)} />)}</div>
    {!active.length && <EmptyState title="Ton Studio est prêt" text="Crée un premier projet. Rien d’autre n’est nécessaire pour commencer." action="Créer un projet" onAction={onCreate} />}
    {archived.length > 0 && <details className="nb2-archive"><summary><Archive size={17} /> Archives ({archived.length})</summary><div>{archived.map(project => <ProjectCard key={project.id} project={project} onOpen={() => onOpen(project.id)} />)}</div></details>}
  </div>;
}

function ProjectCard({ project, onOpen, onArchive }) {
  return <article className="nb2-project-card">
    <div className="nb2-project-cover"><span>{PROJECT_TYPES.find(type => type.id === project.type)?.label || "Projet"}</span><Status status={project.status} /></div>
    <div className="nb2-project-body"><h3>{project.title}</h3><p>{project.description || "Ajoute une description pour rendre le projet immédiatement compréhensible."}</p><ProjectProgress project={project} /><div className="nb2-card-foot"><small>Modifié {compactDate(project.updatedAt)}</small><div><button type="button" onClick={onOpen}><Eye size={16} /> Ouvrir</button>{onArchive && <button type="button" className="icon" onClick={onArchive} aria-label="Archiver"><Archive size={16} /></button>}</div></div></div>
  </article>;
}

function ProjectProgress({ project }) {
  const readiness = projectReadiness(project);
  return <div className="nb2-progress-wrap"><div className="nb2-progress"><i style={{ width: `${readiness.score}%` }} /></div><small>{readiness.score} % prêt</small></div>;
}

function StudioView({ project, profile, wallet, coinsBalance, serverBusy, serverConnected, onBack, updateProject, onTest, onReview, onRestore }) {
  const [mode, setMode] = useState(profile.studioMode === "pro" ? "pro" : "simple");
  const [proTab, setProTab] = useState("project");
  const readiness = projectReadiness(project);

  function patch(patchValue) {
    updateProject(project.id, patchValue);
  }

  function togglePlan(id) {
    patch({ plan: project.plan.map(item => item.id === id ? { ...item, done: !item.done } : item) });
  }

  return <div className="nb2-stack nb2-studio">
    <header className="nb2-studio-head">
      <button type="button" className="nb2-back-btn" onClick={onBack}><ArrowLeft size={18} /></button>
      <div><p className="nb2-kicker">NOSBLOC STUDIO</p><h1>{project.title}</h1><span><Status status={project.status} /> · sauvegarde auto</span></div>
      <div className="nb2-mode-switch" role="group" aria-label="Mode Studio"><button type="button" className={mode === "simple" ? "active" : ""} onClick={() => setMode("simple")}>Simple</button><button type="button" className={mode === "pro" ? "active" : ""} onClick={() => setMode("pro")}>Pro</button></div>
    </header>

    {mode === "simple" ? <div className="nb2-studio-layout">
      <section className="nb2-studio-canvas">
        <div className="nb2-canvas-head"><span><Boxes size={17} /> PROJET</span><span>{onlineLabel()}</span></div>
        <div className="nb2-simple-fields">
          <label>Nom<input value={project.title} maxLength={80} onChange={event => patch({ title: event.target.value })} /></label>
          <label>Description<textarea rows={5} value={project.description} maxLength={600} onChange={event => patch({ description: event.target.value })} /></label>
        </div>
        <div className="nb2-plan-head"><div><p className="nb2-kicker">PLAN DE PRODUCTION</p><h2>Les prochaines actions utiles</h2></div>{!project.plan.length && <button type="button" className="nb2-secondary compact" onClick={() => patch({ plan: generateBuildPlan(project.description || project.title, project.type) })}><Sparkles size={16} /> Générer</button>}</div>
        <div className="nb2-plan-list">{project.plan.map(item => <button type="button" key={item.id} className={item.done ? "done" : ""} onClick={() => togglePlan(item.id)}><span>{item.done ? <Check size={15} /> : <Circle size={15} />}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div><small>{item.priority}</small></button>)}</div>
      </section>

      <aside className="nb2-studio-aside">
        <div className="nb2-readiness-card"><div className="nb2-score"><strong>{readiness.score}</strong><span>%</span></div><h3>Prêt pour vérification</h3><div className="nb2-check-list">{readiness.checks.map(check => <span key={check.id} className={check.ok ? "ok" : ""}>{check.ok ? <CheckCircle2 size={15} /> : <Circle size={15} />}{check.label}</span>)}</div></div>
        <div className="nb2-studio-actions"><button type="button" className="nb2-secondary" disabled={serverBusy} onClick={() => onTest(project)}><Eye size={17} /> {serverBusy ? "Synchronisation…" : "Test privé"}</button><button type="button" className="nb2-primary" disabled={!readiness.readyForReview || serverBusy} onClick={() => onReview(project)}><Rocket size={17} /> Envoyer en vérification</button></div>
        <p className="nb2-safety-note"><LockKeyhole size={15} /> Une version envoyée en vérification est figée. Ton brouillon reste séparé.{NOSBLOC_SERVER_ENABLED ? ` Serveur : ${serverConnected ? "connecté" : "non synchronisé"}.` : ""}</p>
      </aside>
    </div> : <div className="nb2-pro-shell">
      <nav className="nb2-pro-tabs">{PRO_TABS.map(([id, label, Icon]) => <button type="button" key={id} className={proTab === id ? "active" : ""} onClick={() => setProTab(id)}><Icon size={17} />{label}</button>)}</nav>
      <section className="nb2-pro-content">
        {proTab === "project" && <ProjectProPanel project={project} patch={patch} />}
        {proTab === "versions" && <VersionsPanel project={project} onTest={() => onTest(project)} onRestore={versionId => onRestore(project, versionId)} />}
        {proTab === "team" && <TeamPanel project={project} patch={patch} />}
        {proTab === "economy" && <EconomyPanel project={project} wallet={wallet} coinsBalance={coinsBalance} />}
        {proTab === "analytics" && <AnalyticsPanel project={project} />}
        {proTab === "security" && <SecurityPanel project={project} patch={patch} />}
      </section>
    </div>}
  </div>;
}

function onlineLabel() {
  return typeof navigator === "undefined" || navigator.onLine ? "Synchronisé localement" : "Hors connexion · reprise locale";
}

function ProjectProPanel({ project, patch }) {
  return <div className="nb2-pro-grid">
    <Panel title="Configuration" icon={<Settings2 size={20} />}>
      <label>Nom<input value={project.title} onChange={event => patch({ title: event.target.value })} /></label>
      <label>Audience<select value={project.audience} onChange={event => patch({ audience: event.target.value })}><option>Tout public</option><option>13+</option><option>16+</option><option>18+</option></select></label>
      <label>Modèle<select value={project.template} onChange={event => patch({ template: event.target.value })}>{(PROJECT_TEMPLATES[project.type] || []).map(value => <option key={value}>{value}</option>)}</select></label>
    </Panel>
    <Panel title="Plateformes" icon={<Monitor size={20} />}>
      <Toggle label="Mobile" icon={<Smartphone size={17} />} checked={project.platforms.mobile} onChange={checked => patch({ platforms: { ...project.platforms, mobile: checked } })} />
      <Toggle label="Web" icon={<Compass size={17} />} checked={project.platforms.web} onChange={checked => patch({ platforms: { ...project.platforms, web: checked } })} />
      <Toggle label="PC" icon={<Monitor size={17} />} checked={project.platforms.pc} onChange={checked => patch({ platforms: { ...project.platforms, pc: checked } })} />
    </Panel>
    <Panel title="État" icon={<Rocket size={20} />}><Status status={project.status} /><p>Production : {project.productionVersionId ? "version figée active" : "aucune version publiée"}</p><p>Dernier test : {compactDate(project.lastTestedAt)}</p></Panel>
  </div>;
}

function VersionsPanel({ project, onTest, onRestore }) {
  const versions = [...(project.versions || [])].reverse();
  return <div className="nb2-stack">
    <div className="nb2-section-head"><div><p className="nb2-kicker">VERSIONS IMMUABLES</p><h2>Chaque étape importante reste récupérable.</h2></div><button type="button" className="nb2-secondary compact" onClick={onTest}><Plus size={16} /> Version de test</button></div>
    <div className="nb2-version-list">{versions.map(version => <article key={version.id}><span>v{version.versionNo}</span><div><strong>{STATUS_LABELS[version.stage] || version.stage}</strong><p>{version.note}</p><small>{compactDate(version.createdAt)} · #{version.fingerprint}</small></div><button type="button" onClick={() => onRestore(version.id)}><RotateCcw size={15} /> Restaurer</button></article>)}</div>
    {!versions.length && <EmptyState title="Aucune version figée" text="Lance un test privé pour créer la première version récupérable." />}
  </div>;
}

function TeamPanel({ project, patch }) {
  const rows = project.splits || [];
  function updateRow(id, delta) {
    patch({ splits: rows.map(row => row.id === id ? { ...row, ...delta } : row) });
  }
  return <div className="nb2-stack">
    <PageIntro kicker="ÉQUIPE" title="Droits et partage visibles avant de publier." text="Une personne invitée n’obtient pas automatiquement des droits sensibles." />
    <div className="nb2-team-list">{rows.map(row => <article key={row.id}><div className="nb2-member-avatar">{row.name.charAt(0).toUpperCase()}</div><div><strong>{row.name}</strong><small>{row.role} · {row.status}</small></div><label>Part<input type="number" min="0" max="100" step="0.5" disabled={row.status === "owner" && rows.length === 1} value={(row.shareBps / 100).toString()} onChange={event => updateRow(row.id, { shareBps: Math.max(0, Math.min(10000, Math.round(Number(event.target.value) * 100))) })} /><span>%</span></label></article>)}</div>
    <p className="nb2-safety-note"><ShieldCheck size={15} /> Le total doit être exactement 100 % et tous les membres rémunérés doivent avoir accepté avant vérification.</p>
  </div>;
}

function EconomyPanel({ project, wallet, coinsBalance }) {
  return <div className="nb2-stack">
    <PageIntro kicker="ÉCONOMIE" title="L’argent réel n’est jamais un Coin 3B." text="Deux portefeuilles, deux historiques et aucune conversion implicite." />
    <div className="nb2-wallet-grid">
      <article><span><WalletCards size={22} /> ARGENT RÉEL</span><strong>{formatEuros(wallet.real.availableCents)}</strong><dl><div><dt>En attente</dt><dd>{formatEuros(wallet.real.pendingCents)}</dd></div><div><dt>Versement</dt><dd>{formatEuros(wallet.real.payoutCents)}</dd></div></dl></article>
      <article><span><Coins size={22} /> COINS 3B</span><strong>{Number(coinsBalance).toLocaleString("fr-FR")}</strong><p>Économie interne 3B. Aucun retrait bancaire direct depuis ce solde.</p></article>
    </div>
    <Panel title="Projet" icon={<Store size={20} />}><dl className="nb2-finance-lines"><div><dt>Revenus attribués</dt><dd>{formatEuros(project.stats?.revenueCents || 0)}</dd></div><div><dt>État publication</dt><dd>{STATUS_LABELS[project.status] || project.status}</dd></div><div><dt>Partage équipe</dt><dd>{(project.splits || []).reduce((sum, row) => sum + Number(row.shareBps || 0), 0) / 100} %</dd></div></dl></Panel>
  </div>;
}

function AnalyticsPanel({ project }) {
  const stats = project.stats || {};
  return <div className="nb2-stack">
    <PageIntro kicker="ANALYTICS" title="Quatre chiffres d’abord. Le détail ensuite." text="Aucune métrique inventée : seulement les données réellement disponibles." />
    <div className="nb2-stat-grid"><Stat label="Joueurs" value={Number(stats.players || 0).toLocaleString("fr-FR")} /><Stat label="Rétention J+7" value={`${Number(stats.retention7 || 0)} %`} /><Stat label="Session moyenne" value={`${Number(stats.sessionMinutes || 0)} min`} /><Stat label="Confiance" value={`${Number(stats.trustScore ?? 100)}/100`} /></div>
  </div>;
}

function SecurityPanel({ project, patch }) {
  const rights = project.rights || {};
  return <div className="nb2-stack">
    <PageIntro kicker="SÉCURITÉ & DROITS" title="Publier seulement ce que tu peux réellement publier." text="Les validations sensibles restent explicites et séparées du simple design." />
    <Panel title="Droits" icon={<ShieldCheck size={20} />}>
      <Toggle label="Le contenu principal m’appartient" checked={rights.coreOwned} onChange={checked => patch({ rights: { ...rights, coreOwned: checked } })} />
      <Toggle label="Les éléments tiers sont licenciés" checked={rights.thirdPartyLicensed} onChange={checked => patch({ rights: { ...rights, thirdPartyLicensed: checked } })} />
      <Toggle label="Public et classification vérifiés" checked={rights.ageRatingReviewed} onChange={checked => patch({ rights: { ...rights, ageRatingReviewed: checked } })} />
      <Toggle label="Modération activée" checked={project.safety?.moderation === true} onChange={checked => patch({ safety: { ...project.safety, moderation: checked } })} />
    </Panel>
    <p className="nb2-safety-note"><LockKeyhole size={15} /> Les contrôles réels d’autorisation doivent rester côté serveur. Cette interface ne donne jamais un droit à elle seule.</p>
  </div>;
}

function Panel({ title, icon, children }) {
  return <section className="nb2-panel"><div className="nb2-panel-title">{icon}<h3>{title}</h3></div>{children}</section>;
}

function Toggle({ label, icon, checked, onChange }) {
  return <label className="nb2-toggle-row"><span>{icon}{label}</span><input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} /><i /></label>;
}

function PageIntro({ kicker, title, text }) {
  return <div className="nb2-page-intro"><p className="nb2-kicker">{kicker}</p><h1>{title}</h1><p>{text}</p></div>;
}

function Stat({ label, value }) {
  return <article className="nb2-stat"><small>{label}</small><strong>{value}</strong></article>;
}

function Status({ status }) {
  return <span className={`nb2-status ${statusTone(status)}`}>{STATUS_LABELS[status] || status}</span>;
}

function StatusText({ good, children }) {
  return <span className={`nb2-status-text ${good ? "good" : ""}`}>{children}</span>;
}

function EmptyState({ title, text, action, onAction }) {
  return <section className="nb2-empty"><Boxes size={35} /><h3>{title}</h3><p>{text}</p>{action && <button type="button" className="nb2-primary compact" onClick={onAction}>{action}</button>}</section>;
}
