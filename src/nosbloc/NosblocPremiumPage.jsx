import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Boxes, Check, CheckCircle2,
  ChevronRight, CircleDollarSign, Cloud, CloudOff, Code2, Coins, Compass,
  Eye, FolderKanban, Gauge, History, Home, Layers3, LockKeyhole, Menu,
  Package, Plus, Rocket, RotateCcw, Search, Settings2, ShieldCheck, Sparkles,
  Store, TestTube2, UserRound, Users, WalletCards, WandSparkles, X
} from "lucide-react";
import { useLoyalty } from "../loyalty/LoyaltyContext.jsx";
import City3BPortal from "../components/City3BPortal.jsx";
import {
  NOSBLOC_STORAGE_KEY, PROJECT_TYPES, PROJECT_TEMPLATES, createEmptyState,
  createProject, discoveryScore, formatEuros, generateBuildPlan, normalizeState,
  projectReadiness, simulateRevenue
} from "./model.js";
import { appendProjectVersion, restoreProjectVersion } from "./versioning.js";
import "./nosbloc-premium.css";

const PRIMARY_NAV = [
  ["home", "Accueil", Home],
  ["explore", "Explorer", Compass],
  ["create", "Créer", Plus],
  ["activity", "Activité", Activity],
  ["me", "Moi", UserRound],
];

const STATUS = {
  draft: ["Brouillon", "neutral"],
  private_test: ["Test privé", "blue"],
  review: ["En vérification", "gold"],
  approved: ["Prêt", "green"],
  published: ["Publié", "green"],
  suspended: ["Suspendu", "danger"],
  archived: ["Archivé", "neutral"],
};

const PRO_TABS = [
  ["build", "Construction", Layers3],
  ["versions", "Versions", History],
  ["team", "Équipe", Users],
  ["economy", "Économie", WalletCards],
  ["analytics", "Analytics", BarChart3],
];

const nowIso = () => new Date().toISOString();

function loadLocal(storageKey, legacyKey, profile) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return { state: normalizeState(JSON.parse(raw), profile), migrated: false };
  } catch {}
  try {
    const legacy = localStorage.getItem(legacyKey);
    if (legacy) return { state: normalizeState(JSON.parse(legacy), profile), migrated: true };
  } catch {}
  return { state: createEmptyState(profile), migrated: false };
}

function activityEntry(type, title, detail) {
  return {
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random(),
    type,
    title,
    detail,
    createdAt: nowIso(),
  };
}

function moneyState(account) {
  const coins = Number(account.economy?.points ?? account.profile?.points ?? 0);
  return {
    availableCents: 0,
    pendingCents: 0,
    payoutCents: 0,
    coins: Number.isFinite(coins) ? Math.max(0, coins) : 0,
  };
}

export default function NosblocPremiumPage({ goTo }) {
  const account = useLoyalty();
  const ownerName = account.profile?.name || account.passport?.name || "Créateur 3B";
  const storageKey = NOSBLOC_STORAGE_KEY + ":premium:" + (account.user?.id || "device");
  const recoveryKey = storageKey + ":last-good";
  const [state, setState] = useState(() => createEmptyState({ studioName: "Studio de " + ownerName }));
  const [view, setView] = useState("home");
  const [selectedId, setSelectedId] = useState("");
  const [studioMode, setStudioMode] = useState("simple");
  const [proTab, setProTab] = useState("build");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const profile = { studioName: "Studio de " + ownerName };
    const legacyKey = NOSBLOC_STORAGE_KEY + ":" + (account.user?.id || "device");
    const loadedState = loadLocal(storageKey, legacyKey, profile);
    setState(loadedState.state);
    setSelectedId(loadedState.state.projects?.[0]?.id || "");
    if (loadedState.migrated) {
      try { localStorage.setItem(storageKey, JSON.stringify(loadedState.state)); } catch {}
      setNotice("Tes projets Nosbloc existants ont été repris automatiquement dans la nouvelle interface.");
    }
    setLoaded(true);
  }, [storageKey, ownerName]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const selected = useMemo(
    () => state.projects.find(project => project.id === selectedId) || state.projects[0] || null,
    [state.projects, selectedId],
  );

  const commit = (updater, message, entry) => {
    setState(previous => {
      const changed = typeof updater === "function" ? updater(previous) : updater;
      const next = normalizeState({
        ...changed,
        activity: entry ? [entry, ...(changed.activity || previous.activity || [])].slice(0, 80) : (changed.activity || previous.activity || []),
        updatedAt: nowIso(),
      }, changed.profile || previous.profile);
      try {
        localStorage.setItem(recoveryKey, JSON.stringify(previous));
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (message) setNotice(message);
  };

  const updateProject = (id, patch, message, entry) => {
    commit(previous => ({
      ...previous,
      projects: previous.projects.map(project => {
        if (project.id !== id) return project;
        const delta = typeof patch === "function" ? patch(project) : patch;
        return { ...project, ...delta, updatedAt: nowIso() };
      }),
    }), message, entry);
  };

  const openStudio = id => {
    setSelectedId(id);
    setView("studio");
    setStudioMode("simple");
    setProTab("build");
    setNotice("");
  };

  const startPrivateTest = project => {
    if (!project) return;
    const result = appendProjectVersion(project, {
      stage: "checkpoint",
      note: "Version de test privé",
    });
    updateProject(
      project.id,
      { ...result.project, status: "private_test", visibility: "private" },
      "Test privé préparé. La version publique reste inchangée.",
      activityEntry("test", "Test privé créé", project.title),
    );
  };

  const requestReview = project => {
    if (!project) return;
    const ready = projectReadiness(project);
    if (!ready.readyForReview) {
      setNotice("Publication bloquée : complète la checklist. Score actuel " + ready.score + " %.");
      return;
    }
    const result = appendProjectVersion(project, {
      stage: "review",
      note: "Soumission à la vérification Nosbloc",
    });
    updateProject(
      project.id,
      result.project,
      "Version figée envoyée en vérification. Aucun paiement ou publication automatique n’a été déclenché.",
      activityEntry("review", "Projet envoyé en vérification", project.title),
    );
  };

  const restoreVersion = (project, versionId) => {
    try {
      const restored = restoreProjectVersion(project, versionId);
      updateProject(
        project.id,
        restored,
        "Version restaurée dans un nouveau brouillon privé.",
        activityEntry("restore", "Version restaurée", project.title),
      );
      setStudioMode("simple");
    } catch (error) {
      setNotice(error?.message || "Restauration impossible.");
    }
  };

  if (!loaded) return <section className="nb2-loading">Ouverture de Nosbloc 3B…</section>;

  return (
    <section className="nb2-app">
      <div className="nb2-bg" aria-hidden="true" />
      <DesktopRail view={view} setView={setView} onClose={() => goTo?.("home")} />
      <main className="nb2-main">
        <TopBar
          view={view}
          selected={selected}
          online={online}
          onBack={() => view === "studio" ? setView("home") : goTo?.("home")}
          onCreate={() => setView("create")}
        />
        {notice && <div className="nb2-notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Fermer"><X size={17}/></button></div>}

        {view === "home" && <HomeView
          state={state}
          ownerName={ownerName}
          openStudio={openStudio}
          setView={setView}
          setCityOpen={setCityOpen}
          goTo={goTo}
        />}
        {view === "explore" && <ExploreView projects={state.projects} marketplace={state.marketplace || []} openStudio={openStudio} />}
        {view === "create" && <CreateView ownerName={ownerName} state={state} commit={commit} openStudio={openStudio} />}
        {view === "activity" && <ActivityView state={state} />}
        {view === "me" && <ProfileView state={state} account={account} setCityOpen={setCityOpen} />}
        {view === "studio" && <StudioView
          project={selected}
          mode={studioMode}
          setMode={setStudioMode}
          proTab={proTab}
          setProTab={setProTab}
          updateProject={updateProject}
          startPrivateTest={startPrivateTest}
          requestReview={requestReview}
          restoreVersion={restoreVersion}
          setView={setView}
          account={account}
        />}
      </main>
      <MobileNav view={view} setView={setView} />
      <City3BPortal open={cityOpen} onClose={() => setCityOpen(false)} />
    </section>
  );
}

function DesktopRail({ view, setView, onClose }) {
  return <aside className="nb2-rail">
    <button className="nb2-brand" onClick={() => setView("home")} aria-label="Accueil Nosbloc"><b>3B</b><span>NOSBLOC</span></button>
    <nav aria-label="Navigation Nosbloc">
      {PRIMARY_NAV.map(([id, label, Icon]) => <button key={id} data-active={view === id} onClick={() => setView(id)}><Icon size={19}/><span>{label}</span></button>)}
    </nav>
    <div className="nb2-rail-foot">
      <button onClick={onClose}><ArrowLeft size={18}/><span>3B International</span></button>
    </div>
  </aside>;
}

function MobileNav({ view, setView }) {
  return <nav className="nb2-mobile-nav" aria-label="Navigation Nosbloc mobile">
    {PRIMARY_NAV.map(([id, label, Icon]) => <button key={id} data-active={view === id} data-create={id === "create"} onClick={() => setView(id)}><span><Icon size={id === "create" ? 24 : 20}/></span><small>{label}</small></button>)}
  </nav>;
}

function TopBar({ view, selected, online, onBack, onCreate }) {
  const title = view === "studio" ? selected?.title || "Studio" : {
    home: "Nosbloc 3B", explore: "Explorer", create: "Créer", activity: "Activité", me: "Mon espace",
  }[view] || "Nosbloc 3B";
  return <header className="nb2-topbar">
    <button className="nb2-back" onClick={onBack} aria-label="Retour"><ArrowLeft size={19}/></button>
    <div><small>NOSBLOC DU 3B</small><strong>{title}</strong></div>
    <span className="nb2-network" data-online={online}>{online ? <Cloud size={15}/> : <CloudOff size={15}/>} {online ? "En ligne" : "Hors ligne"}</span>
    {view !== "create" && view !== "studio" && <button className="nb2-top-create" onClick={onCreate}><Plus size={17}/> Créer</button>}
  </header>;
}

function HomeView({ state, ownerName, openStudio, setView, setCityOpen, goTo }) {
  const projects = state.projects || [];
  const recent = [...projects].sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
  const average = projects.length ? Math.round(projects.reduce((sum,p) => sum + projectReadiness(p).score, 0) / projects.length) : 0;
  return <div className="nb2-view">
    <section className="nb2-hero">
      <div>
        <p className="nb2-kicker">IMAGINE · CONSTRUIS · PUBLIE</p>
        <h1>Bonsoir {ownerName.split(" ")[0]}.<br/><em>Tu veux faire quoi ?</em></h1>
        <p>Nosbloc cache la complexité. Commence par une action simple, puis ouvre les outils pro uniquement quand tu en as besoin.</p>
      </div>
      <div className="nb2-hero-actions">
        <ActionCard icon={Compass} title="Découvrir" text="Jeux, mondes et créateurs." onClick={() => setView("explore")} tone="blue"/>
        <ActionCard icon={WandSparkles} title="Créer" text="IA, modèle ou projet vide." onClick={() => setView("create")} tone="gold"/>
        <ActionCard icon={FolderKanban} title="Mon Studio" text={recent ? "Continuer " + recent.title : "Démarrer mon premier projet"} onClick={() => recent ? openStudio(recent.id) : setView("create")} />
      </div>
    </section>

    <section className="nb2-summary">
      <Summary icon={FolderKanban} value={projects.length} label="projets"/>
      <Summary icon={Gauge} value={average + " %"} label="préparation"/>
      <Summary icon={ShieldCheck} value="Actif" label="3B Trust"/>
      <Summary icon={WalletCards} value="Séparés" label="€ / Coins"/>
    </section>

    {recent && <section className="nb2-section">
      <SectionTitle eyebrow="REPRENDRE" title="Continue là où tu t’es arrêté." action="Tous les projets" onAction={() => setView("explore")}/>
      <ProjectHero project={recent} onOpen={() => openStudio(recent.id)}/>
    </section>}

    <section className="nb2-section">
      <SectionTitle eyebrow="PREMIER BLOC OFFICIEL" title="3B MA VILLE"/>
      <article className="nb2-city-card">
        <div><Boxes size={28}/><span><b>Construis ta ville permanente</b><small>Passeport 3B · quartiers · collection · aperçu privé</small></span></div>
        <button onClick={() => setCityOpen(true)}>Ouvrir ma Ville 3B <ArrowRight size={17}/></button>
      </article>
    </section>

    <section className="nb2-section">
      <SectionTitle eyebrow="PARCOURS UNIQUE" title="Une seule logique du début au revenu."/>
      <div className="nb2-journey">
        {[
          ["01","Découvrir","Trouve une idée ou un univers."],
          ["02","Créer","IA, modèle ou projet vide."],
          ["03","Tester","Test privé mobile et PC."],
          ["04","Publier","Version figée + vérification."],
          ["05","Vendre","Prix et droits transparents."],
          ["06","Gagner","Revenus et Coins séparés."],
        ].map(row => <article key={row[0]}><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small></article>)}
      </div>
    </section>

    <button className="nb2-world-link" onClick={() => goTo?.("world3b")}><span><GlobeMark/>Le Monde du 3B</span><ChevronRight size={19}/></button>
  </div>;
}

function ActionCard({ icon: Icon, title, text, onClick, tone }) {
  return <button className="nb2-action-card" data-tone={tone || "default"} onClick={onClick}><span><Icon size={24}/></span><b>{title}</b><small>{text}</small><ChevronRight size={18}/></button>;
}

function Summary({ icon: Icon, value, label }) {
  return <article><Icon size={18}/><strong>{value}</strong><small>{label}</small></article>;
}

function SectionTitle({ eyebrow, title, action, onAction }) {
  return <div className="nb2-section-title"><div><small>{eyebrow}</small><h2>{title}</h2></div>{action && <button onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>;
}

function ProjectHero({ project, onOpen }) {
  const ready = projectReadiness(project);
  const status = STATUS[project.status] || [project.status, "neutral"];
  return <article className="nb2-project-hero">
    <div className="nb2-project-art"><Sparkles size={30}/><span>{PROJECT_TYPES.find(x => x.id === project.type)?.label || "Projet"}</span></div>
    <div className="nb2-project-copy">
      <div className="nb2-project-meta"><span data-tone={status[1]}>{status[0]}</span><small>{ready.score} % prêt</small></div>
      <h3>{project.title}</h3>
      <p>{project.description || "Ajoute une description pour clarifier ton projet."}</p>
      <div className="nb2-progress"><i style={{width: ready.score + "%"}}/></div>
      <button onClick={onOpen}>Continuer <ArrowRight size={17}/></button>
    </div>
  </article>;
}

function ExploreView({ projects, marketplace = [], openStudio }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [section, setSection] = useState("projects");
  const [previewId, setPreviewId] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const rows = useMemo(() => projects
    .filter(project => type === "all" || project.type === type)
    .filter(project => (project.title + " " + project.description).toLocaleLowerCase("fr").includes(normalizedQuery))
    .sort((a,b) => discoveryScore(b) - discoveryScore(a)), [projects, normalizedQuery, type]);
  const shopRows = useMemo(() => marketplace
    .filter(item => !normalizedQuery || (String(item.name || item.title || "") + " " + String(item.category || "")).toLocaleLowerCase("fr").includes(normalizedQuery))
    .slice(0, 80), [marketplace, normalizedQuery]);
  const creators = useMemo(() => {
    const byName = new Map();
    for (const project of projects) {
      const owner = (project.splits || []).find(row => row.status === "owner") || project.splits?.[0];
      const name = String(owner?.name || "Créateur 3B").trim();
      const key = name.toLocaleLowerCase("fr");
      const current = byName.get(key) || { name, projects: 0, published: 0 };
      current.projects += 1;
      if (project.status === "published") current.published += 1;
      byName.set(key, current);
    }
    return [...byName.values()]
      .filter(row => !normalizedQuery || row.name.toLocaleLowerCase("fr").includes(normalizedQuery))
      .sort((a,b) => b.projects - a.projects);
  }, [projects, normalizedQuery]);
  const preview = projects.find(project => project.id === previewId) || null;

  if (preview) return <ProjectPublicView project={preview} onBack={() => setPreviewId("")} onOpenStudio={() => openStudio(preview.id)} />;

  return <div className="nb2-view">
    <section className="nb2-page-head"><p className="nb2-kicker">EXPLORER</p><h1>Trouve sans chercher partout.</h1><p>Une recherche unique pour les créations, la Boutique et les créateurs Nosbloc.</p></section>
    <div className="nb2-explore-sections" role="tablist" aria-label="Explorer Nosbloc">
      <button role="tab" aria-selected={section === "projects"} data-active={section === "projects"} onClick={() => setSection("projects")}><Compass size={16}/> Créations</button>
      <button role="tab" aria-selected={section === "shop"} data-active={section === "shop"} onClick={() => setSection("shop")}><Store size={16}/> Boutique</button>
      <button role="tab" aria-selected={section === "creators"} data-active={section === "creators"} onClick={() => setSection("creators")}><Users size={16}/> Créateurs</button>
    </div>
    <div className="nb2-search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher créations, objets, créateurs…"/></div>

    {section === "projects" && <>
      <div className="nb2-chips">
        <button data-active={type === "all"} onClick={() => setType("all")}>Tout</button>
        {PROJECT_TYPES.map(item => <button key={item.id} data-active={type === item.id} onClick={() => setType(item.id)}>{item.label}</button>)}
      </div>
      {!rows.length ? <EmptyState icon={Compass} title="Aucune création correspondante." text="Crée un premier projet ou change le filtre."/> :
        <div className="nb2-card-grid">{rows.map(project => <ProjectCard key={project.id} project={project} onOpen={() => setPreviewId(project.id)}/>)}</div>}
    </>}

    {section === "shop" && (!shopRows.length
      ? <EmptyState icon={Store} title="La Boutique créateur est prête, mais aucune offre publique n’est activée." text="Les paiements restent verrouillés tant que l’environnement réel, le KYC et la fiscalité ne sont pas validés."/>
      : <div className="nb2-card-grid">{shopRows.map((item,index) => <article className="nb2-card" key={item.id || item.asset_id || index}>
          <div className="nb2-card-cover"><Package size={25}/><small>{item.category || "Asset Nosbloc"}</small></div>
          <div className="nb2-card-body"><span className="nb2-status" data-tone="gold">Boutique</span><h3>{item.name || item.title || "Création 3B"}</h3><p>{item.creator || item.license || "Ressource créateur"}</p><button disabled title="Paiements réels verrouillés">Paiement verrouillé <LockKeyhole size={14}/></button></div>
        </article>)}</div>
    )}

    {section === "creators" && (!creators.length
      ? <EmptyState icon={Users} title="Aucun créateur correspondant." text="Les profils apparaissent à partir des projets du studio."/>
      : <div className="nb2-creator-grid">{creators.map(creator => <article key={creator.name}><span><UserRound size={21}/></span><div><b>{creator.name}</b><small>{creator.projects} projet{creator.projects > 1 ? "s" : ""} · {creator.published} publié{creator.published > 1 ? "s" : ""}</small></div><ShieldCheck size={17}/></article>)}</div>
    )}
  </div>;
}

function ProjectPublicView({ project, onBack, onOpenStudio }) {
  const ready = projectReadiness(project);
  const status = STATUS[project.status] || [project.status, "neutral"];
  const owner = (project.splits || []).find(row => row.status === "owner") || project.splits?.[0];
  return <div className="nb2-view">
    <button className="nb2-inline-back" onClick={onBack}><ArrowLeft size={16}/> Explorer</button>
    <section className="nb2-public-project">
      <div className="nb2-public-cover"><Sparkles size={38}/><small>{project.template}</small></div>
      <div className="nb2-public-copy">
        <span className="nb2-status" data-tone={status[1]}>{status[0]}</span>
        <h1>{project.title}</h1>
        <p>{project.description || "Création Nosbloc 3B."}</p>
        <div className="nb2-public-by"><UserRound size={16}/> Créé par <b>{owner?.name || "Créateur 3B"}</b></div>
        <div className="nb2-progress"><i style={{width: ready.score + "%"}}/></div>
        <small>{ready.score} % de préparation · {PROJECT_TYPES.find(x => x.id === project.type)?.label}</small>
        <div className="nb2-public-actions">
          <button className="primary" onClick={onOpenStudio}><FolderKanban size={17}/> Ouvrir mon Studio</button>
          <button disabled><Eye size={17}/> Aperçu public après validation</button>
        </div>
      </div>
    </section>
  </div>;
}
function ProjectCard({ project, onOpen }) {
  const ready = projectReadiness(project);
  const status = STATUS[project.status] || [project.status, "neutral"];
  return <article className="nb2-card">
    <div className="nb2-card-cover"><Sparkles size={25}/><small>{project.template}</small></div>
    <div className="nb2-card-body"><span className="nb2-status" data-tone={status[1]}>{status[0]}</span><h3>{project.title}</h3><p>{project.description || "Projet Nosbloc 3B"}</p><div className="nb2-progress"><i style={{width: ready.score + "%"}}/></div><button onClick={onOpen}>Ouvrir <ArrowRight size={15}/></button></div>
  </article>;
}

function CreateView({ ownerName, state, commit, openStudio }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ type: "world", start: "ai", title: "", description: "", audience: "Tout public" });
  const templates = PROJECT_TEMPLATES[form.type] || PROJECT_TEMPLATES.world;
  const [template, setTemplate] = useState(templates[0]);

  useEffect(() => setTemplate((PROJECT_TEMPLATES[form.type] || PROJECT_TEMPLATES.world)[0]), [form.type]);

  const create = () => {
    const project = createProject({
      title: form.title.trim() || "Nouveau projet 3B",
      type: form.type,
      template,
      description: form.description.trim(),
      audience: form.audience,
    }, ownerName);
    if (form.start === "ai" && form.description.trim()) project.plan = generateBuildPlan(form.description, form.type);
    const next = { ...state, projects: [project, ...state.projects] };
    commit(next, "Projet créé et sauvegardé.", activityEntry("create", "Projet créé", project.title));
    openStudio(project.id);
  };

  return <div className="nb2-view nb2-create">
    <section className="nb2-page-head"><p className="nb2-kicker">CRÉER</p><h1>Une question à la fois.</h1><p>Pas de tableau technique au départ. Nosbloc te guide jusqu’au Studio.</p></section>
    <div className="nb2-stepper"><span data-active={step >= 1}>1</span><i/><span data-active={step >= 2}>2</span><i/><span data-active={step >= 3}>3</span></div>
    {step === 1 && <section className="nb2-wizard">
      <h2>Qu’est-ce que tu veux créer ?</h2>
      <div className="nb2-choice-grid">{PROJECT_TYPES.map(item => <button key={item.id} data-active={form.type === item.id} onClick={() => setForm({...form,type:item.id})}><Boxes size={22}/><b>{item.label}</b><small>{item.description}</small></button>)}</div>
      <WizardActions next={() => setStep(2)}/>
    </section>}
    {step === 2 && <section className="nb2-wizard">
      <h2>Comment veux-tu commencer ?</h2>
      <div className="nb2-choice-grid nb2-choice-4">
        {[
          ["ai","Avec l’IA",WandSparkles,"Décris ton idée, Nosbloc prépare le plan."],
          ["template","Avec un modèle",Layers3,"Pars d’une structure déjà organisée."],
          ["blank","De zéro",Code2,"Un projet propre sans décisions imposées."],
          ["import","Importer",Package,"Prépare l’import sans écraser ton studio."],
        ].map(([id,label,Icon,text]) => <button key={id} data-active={form.start === id} onClick={() => setForm({...form,start:id})}><Icon size={22}/><b>{label}</b><small>{text}</small></button>)}
      </div>
      <WizardActions back={() => setStep(1)} next={() => setStep(3)}/>
    </section>}
    {step === 3 && <section className="nb2-wizard">
      <h2>Donne une identité au projet.</h2>
      <div className="nb2-form">
        <label>Nom<input value={form.title} maxLength={80} onChange={e => setForm({...form,title:e.target.value})} placeholder="Ex. France — Justice"/></label>
        <label>Décris ce que tu veux créer<textarea value={form.description} maxLength={600} rows={5} onChange={e => setForm({...form,description:e.target.value})} placeholder="Explique l’expérience, ce que le joueur fait et ce qui doit la rendre spéciale."/></label>
        <label>Point de départ<select value={template} onChange={e => setTemplate(e.target.value)}>{templates.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Public<select value={form.audience} onChange={e => setForm({...form,audience:e.target.value})}><option>Tout public</option><option>7+</option><option>12+</option><option>16+</option></select></label>
      </div>
      <WizardActions back={() => setStep(2)} next={create} nextLabel="Créer le projet" disabled={form.title.trim().length < 3}/>
    </section>}
  </div>;
}

function WizardActions({ back, next, nextLabel = "Continuer", disabled }) {
  return <div className="nb2-wizard-actions">{back && <button className="secondary" onClick={back}><ArrowLeft size={16}/> Retour</button>}<button className="primary" disabled={disabled} onClick={next}>{nextLabel}<ArrowRight size={16}/></button></div>;
}

function ActivityView({ state }) {
  const rows = state.activity || [];
  return <div className="nb2-view"><section className="nb2-page-head"><p className="nb2-kicker">ACTIVITÉ</p><h1>Tout au même endroit.</h1><p>Projets, sécurité, ventes, paiements et modération utilisent une seule boîte.</p></section>
    <div className="nb2-filter-row"><button data-active>Tout</button><button>Projets</button><button>Ventes</button><button>Sécurité</button><button>Modération</button></div>
    {!rows.length ? <EmptyState icon={Activity} title="Aucune activité récente." text="Tes actions importantes apparaîtront ici."/> :
      <div className="nb2-activity-list">{rows.map(row => <article key={row.id}><span><Activity size={17}/></span><div><b>{row.title}</b><p>{row.detail}</p><small>{new Date(row.createdAt).toLocaleString("fr-FR")}</small></div></article>)}</div>}
  </div>;
}

function ProfileView({ state, account, setCityOpen }) {
  const money = moneyState(account);
  return <div className="nb2-view">
    <section className="nb2-page-head"><p className="nb2-kicker">MON ESPACE</p><h1>{state.profile?.studioName || "Mon Studio 3B"}</h1><p>Passeport, sécurité et revenus séparés clairement.</p></section>
    <div className="nb2-wallets">
      <article className="nb2-wallet real"><small>€ ARGENT RÉEL</small><strong>{formatEuros(money.availableCents)}</strong><p>Disponible</p><dl><div><dt>En attente</dt><dd>{formatEuros(money.pendingCents)}</dd></div><div><dt>Versement</dt><dd>{formatEuros(money.payoutCents)}</dd></div></dl><span><LockKeyhole size={14}/> Versements verrouillés jusqu’à vérification serveur/KYC</span></article>
      <article className="nb2-wallet coins"><small>◉ COINS 3B</small><strong>{money.coins.toLocaleString("fr-FR")}</strong><p>Solde plateforme</p><span><Coins size={14}/> Jamais mélangé avec les euros</span></article>
    </div>
    <section className="nb2-settings-card"><div><ShieldCheck size={24}/><span><b>3B Trust</b><small>Rôles, versions, droits et journalisation.</small></span></div><strong>{state.profile?.trustScore ?? 100}/100</strong></section>
    <button className="nb2-settings-card action" onClick={() => setCityOpen(true)}><div><Boxes size={24}/><span><b>3B MA VILLE</b><small>Premier bloc officiel lié au Passeport.</small></span></div><ChevronRight size={20}/></button>
  </div>;
}

function StudioView({ project, mode, setMode, proTab, setProTab, updateProject, startPrivateTest, requestReview, restoreVersion, setView, account }) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  if (!project) return <div className="nb2-view"><EmptyState icon={FolderKanban} title="Aucun projet sélectionné." text="Crée ou ouvre un projet."/><button className="nb2-primary-inline" onClick={() => setView("create")}>Créer un projet</button></div>;
  const ready = projectReadiness(project);
  const status = STATUS[project.status] || [project.status, "neutral"];
  const setField = (key, value) => updateProject(project.id, { [key]: value });
  return <div className="nb2-view nb2-studio">
    <section className="nb2-studio-head">
      <div><span className="nb2-status" data-tone={status[1]}>{status[0]}</span><h1>{project.title}</h1><p>{project.template} · {ready.score} % prêt</p></div>
      <div className="nb2-mode"><button data-active={mode === "simple"} onClick={() => setMode("simple")}>Simple</button><button data-active={mode === "pro"} onClick={() => setMode("pro")}><Code2 size={15}/> Pro</button></div>
    </section>

    {mode === "simple" ? <SimpleStudio project={project} ready={ready} setField={setField} updateProject={updateProject} startPrivateTest={startPrivateTest} requestReview={requestReview}/> :
      <ProStudio project={project} ready={ready} proTab={proTab} setProTab={setProTab} updateProject={updateProject} restoreVersion={restoreVersion} account={account}/>}

    <section className="nb2-danger-zone">
      <button onClick={() => setConfirmArchive(!confirmArchive)}><Settings2 size={16}/> Zone avancée</button>
      {confirmArchive && <div><p>Archiver retire le projet des parcours actifs sans effacer son historique.</p><button className="danger" onClick={() => updateProject(project.id,{status:"archived",visibility:"private"},"Projet archivé.",activityEntry("archive","Projet archivé",project.title))}>Archiver le projet</button></div>}
    </section>
  </div>;
}

function SimpleStudio({ project, ready, setField, updateProject, startPrivateTest, requestReview }) {
  const plan = Array.isArray(project.plan) ? project.plan : [];
  const togglePlan = id => updateProject(project.id, { plan: plan.map(row => row.id === id ? {...row,done:!row.done} : row) });
  const generate = () => updateProject(project.id, { plan: generateBuildPlan(project.description, project.type) }, "Plan de production généré.");
  return <div className="nb2-simple-studio">
    <section className="nb2-simple-card">
      <div className="nb2-card-title"><span>1</span><div><b>Modifier</b><small>L’essentiel du projet, sans outils techniques.</small></div></div>
      <div className="nb2-form"><label>Nom<input value={project.title} onChange={e => setField("title", e.target.value)} maxLength={80}/></label><label>Description<textarea value={project.description} onChange={e => setField("description", e.target.value)} rows={4} maxLength={600}/></label></div>
    </section>

    <section className="nb2-simple-card">
      <div className="nb2-card-title"><span>2</span><div><b>Construire</b><small>Une checklist claire, générable depuis ton idée.</small></div></div>
      {!plan.length ? <button className="nb2-magic" onClick={generate}><WandSparkles size={18}/> Préparer mon plan avec Nosbloc</button> :
      <div className="nb2-task-list">{plan.map(row => <button key={row.id} data-done={row.done} onClick={() => togglePlan(row.id)}><span>{row.done ? <Check size={15}/> : null}</span><div><b>{row.title}</b><small>{row.detail}</small></div><em>{row.priority}</em></button>)}</div>}
    </section>

    <section className="nb2-simple-card">
      <div className="nb2-card-title"><span>3</span><div><b>Tester</b><small>Fige une version privée avant toute publication.</small></div></div>
      <div className="nb2-test-panel"><TestTube2 size={24}/><div><b>Test privé</b><p>Mobile + PC · version isolée · production inchangée.</p></div><button onClick={() => startPrivateTest(project)}>Préparer le test</button></div>
    </section>

    <section className="nb2-simple-card">
      <div className="nb2-card-title"><span>4</span><div><b>Publier</b><small>Nosbloc vérifie d’abord les prérequis.</small></div></div>
      <ReadinessChecklist ready={ready}/>
      <button className="nb2-publish" disabled={!ready.readyForReview} onClick={() => requestReview(project)}><Rocket size={18}/>{ready.readyForReview ? "Envoyer en vérification" : "Complète la checklist pour publier"}</button>
    </section>
  </div>;
}

function ReadinessChecklist({ ready }) {
  return <div className="nb2-checklist">{ready.checks.map(check => <div key={check.id} data-ok={check.ok}><span>{check.ok ? <Check size={14}/> : null}</span><b>{check.label}</b><small>{check.weight} pts</small></div>)}</div>;
}

function ProStudio({ project, ready, proTab, setProTab, updateProject, restoreVersion, account }) {
  return <div className="nb2-pro">
    <nav className="nb2-pro-tabs">{PRO_TABS.map(([id,label,Icon]) => <button key={id} data-active={proTab === id} onClick={() => setProTab(id)}><Icon size={16}/>{label}</button>)}</nav>
    {proTab === "build" && <BuildPro project={project} ready={ready} updateProject={updateProject}/>}
    {proTab === "versions" && <VersionsPro project={project} restoreVersion={restoreVersion}/>}
    {proTab === "team" && <TeamPro project={project}/>}
    {proTab === "economy" && <EconomyPro project={project} account={account}/>}
    {proTab === "analytics" && <AnalyticsPro project={project}/>}
  </div>;
}

function BuildPro({ project, ready, updateProject }) {
  const toggleRight = key => updateProject(project.id,{rights:{...project.rights,[key]:!project.rights?.[key]}});
  return <div className="nb2-pro-grid">
    <section className="nb2-pro-card"><SectionTitle eyebrow="PRÉPARATION" title={ready.score + " % prêt"}/><ReadinessChecklist ready={ready}/></section>
    <section className="nb2-pro-card"><SectionTitle eyebrow="DROITS & CLASSIFICATION" title="Avant publication"/><label className="nb2-switch"><input type="checkbox" checked={!!project.rights?.coreOwned} onChange={() => toggleRight("coreOwned")}/><span/><b>Contenu principal détenu ou autorisé</b></label><label className="nb2-switch"><input type="checkbox" checked={!!project.rights?.thirdPartyLicensed} onChange={() => toggleRight("thirdPartyLicensed")}/><span/><b>Licences tierces vérifiées</b></label><label className="nb2-switch"><input type="checkbox" checked={!!project.rights?.ageRatingReviewed} onChange={() => toggleRight("ageRatingReviewed")}/><span/><b>Classification d’âge contrôlée</b></label></section>
  </div>;
}

function VersionsPro({ project, restoreVersion }) {
  const versions = [...(project.versions || [])].reverse();
  return <section className="nb2-pro-card"><SectionTitle eyebrow="HISTORIQUE" title="Versions immuables"/>{!versions.length ? <EmptyState icon={History} title="Aucune version figée." text="Un test privé ou une soumission crée automatiquement une version."/> : <div className="nb2-version-list">{versions.map(v => <article key={v.id}><span>v{v.versionNo}</span><div><b>{v.note}</b><small>{v.stage} · {new Date(v.createdAt).toLocaleString("fr-FR")}</small><code>{v.fingerprint}</code></div><button onClick={() => restoreVersion(project,v.id)}><RotateCcw size={15}/> Restaurer</button></article>)}</div>}</section>;
}

function TeamPro({ project }) {
  return <section className="nb2-pro-card"><SectionTitle eyebrow="ÉQUIPE" title="Accès et partage"/><p className="nb2-muted">Les droits serveur restent la source de vérité. Une invitation locale ne donne jamais d’accès réel tant qu’elle n’est pas acceptée côté serveur.</p><div className="nb2-team-list">{(project.splits || []).map(member => <article key={member.id}><span><UserRound size={17}/></span><div><b>{member.name}</b><small>{member.role} · {member.status}</small></div><strong>{(Number(member.shareBps||0)/100).toLocaleString("fr-FR")}%</strong></article>)}</div></section>;
}

function EconomyPro({ project, account }) {
  const example = simulateRevenue({grossEuros:100,taxRate:20,storeRate:10,refundRate:2});
  const money = moneyState(account);
  return <div className="nb2-pro-grid">
    <section className="nb2-pro-card"><SectionTitle eyebrow="€ ARGENT RÉEL" title={formatEuros(money.availableCents)}/><p className="nb2-muted">Solde réel affiché séparément des Coins. Les écritures financières doivent venir du ledger serveur, jamais du navigateur.</p><div className="nb2-lock-banner"><LockKeyhole size={17}/> Paiements et versements restent verrouillés tant que KYC, fiscalité et configuration serveur ne sont pas validés.</div></section>
    <section className="nb2-pro-card"><SectionTitle eyebrow="SIMULATION" title="Exemple transparent sur 100 €"/><dl className="nb2-receipt"><div><dt>Vente brute</dt><dd>{formatEuros(example.gross)}</dd></div><div><dt>Taxes</dt><dd>-{formatEuros(example.taxes)}</dd></div><div><dt>Frais</dt><dd>-{formatEuros(example.storeFees)}</dd></div><div><dt>Remboursements estimés</dt><dd>-{formatEuros(example.refunds)}</dd></div><div className="total"><dt>Part créateur simulée</dt><dd>{formatEuros(example.creatorDirect)}</dd></div></dl><small>Simulation uniquement · aucun solde réel n’est créé.</small></section>
  </div>;
}

function AnalyticsPro({ project }) {
  const stats = project.stats || {};
  return <section className="nb2-pro-card"><SectionTitle eyebrow="ANALYTICS" title="Les chiffres utiles d’abord"/><div className="nb2-analytics"><Summary icon={Users} value={Number(stats.players||0).toLocaleString("fr-FR")} label="joueurs"/><Summary icon={RotateCcw} value={Number(stats.retention7||0) + " %"} label="retour J+7"/><Summary icon={Gauge} value={Number(stats.sessionMinutes||0) + " min"} label="session"/><Summary icon={ShieldCheck} value={Number(stats.trustScore||100) + "/100"} label="confiance"/></div></section>;
}

function EmptyState({ icon: Icon, title, text }) {
  return <section className="nb2-empty"><span><Icon size={27}/></span><h2>{title}</h2><p>{text}</p></section>;
}

function GlobeMark() {
  return <span className="nb2-globe" aria-hidden="true">◉</span>;
}
