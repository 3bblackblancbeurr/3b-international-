import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Crosshair,
  Eye,
  HardDrive,
  Move,
  PackageOpen,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import "../styles/city-3b-builder.css";

const requestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const normalizeRotation = value => ((Math.round((Number(value) || 0) / 90) * 90) % 360 + 360) % 360;
const placedOnly = rows => (Array.isArray(rows) ? rows : []).filter(row => row?.placement_state !== "stored");
const storedOnly = rows => (Array.isArray(rows) ? rows : []).filter(row => row?.placement_state === "stored");

function footprint(definition, rotation, placement) {
  const raw = definition?.footprint || {};
  const hasDefinitionSize = Number.isFinite(Number(raw.w ?? raw.width)) && Number.isFinite(Number(raw.h ?? raw.height));
  let width = Math.max(1, Number(hasDefinitionSize ? (raw.w ?? raw.width) : (placement?.footprint_w || 1)));
  let height = Math.max(1, Number(hasDefinitionSize ? (raw.h ?? raw.height) : (placement?.footprint_h || 1)));
  const nextQuarterTurn = [90, 270].includes(normalizeRotation(rotation));
  const currentQuarterTurn = [90, 270].includes(normalizeRotation(placement?.rotation));
  if ((hasDefinitionSize && nextQuarterTurn) || (!hasDefinitionSize && placement && nextQuarterTurn !== currentQuarterTurn)) {
    [width, height] = [height, width];
  }
  return { width, height };
}

function readDraft(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeDraft(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function collisionState({ draft, size, half, placements, ignoreId }) {
  const x = Math.round(Number(draft.x) || 0);
  const z = Math.round(Number(draft.z) || 0);
  if (x < -half || z < -half || x + size.width - 1 > half || z + size.height - 1 > half) {
    return { valid: false, reason: "Hors du terrain" };
  }
  const hit = placements.find(row => row.id !== ignoreId
    && x <= Number(row.x) + Number(row.footprint_w || 1) - 1
    && x + size.width - 1 >= Number(row.x)
    && z <= Number(row.z) + Number(row.footprint_h || 1) - 1
    && z + size.height - 1 >= Number(row.z));
  return hit ? { valid: false, reason: "Parcelle occupée" } : { valid: true, reason: "Emplacement disponible" };
}

function BuildingMap({ data, draft, activeDefinition, activePlacement, onPoint, onSelect, zoom, setZoom, center, setCenter, previewOnly = false }) {
  const svgRef = useRef(null);
  const city = data.city || {};
  const half = 50 + Number(city.land_tier || 1) * 45;
  const radius = Math.max(12, Math.round(half / zoom));
  const view = { x: center.x - radius, z: center.z - radius, size: radius * 2 };
  const placements = placedOnly(data.placements);
  const draftSize = activeDefinition || activePlacement
    ? footprint(activeDefinition, draft.rotation, activePlacement)
    : null;
  const validation = draftSize ? collisionState({ draft, size: draftSize, half, placements, ignoreId: activePlacement?.id }) : null;
  const gridStep = radius > 100 ? 20 : radius > 55 ? 10 : radius > 28 ? 5 : 2;
  const lines = [];
  for (let value = Math.ceil(view.x / gridStep) * gridStep; value <= view.x + view.size; value += gridStep) lines.push(value);
  const rows = [];
  for (let value = Math.ceil(view.z / gridStep) * gridStep; value <= view.z + view.size; value += gridStep) rows.push(value);

  const pointFromEvent = event => {
    const svg = svgRef.current;
    if (!svg) return null;
    const matrix = svg.getScreenCTM?.();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return { x: Math.round(local.x), z: Math.round(local.y) };
  };

  const pan = (dx, dz) => setCenter(previous => ({
    x: clamp(previous.x + dx * Math.max(4, Math.round(radius / 3)), -half, half),
    z: clamp(previous.z + dz * Math.max(4, Math.round(radius / 3)), -half, half),
  }));

  return <div className="city3b-builder-map-shell" data-preview={previewOnly}>
    <div className="city3b-builder-map-toolbar">
      <span><Crosshair size={15} /> X {draft.x} · Z {draft.z}</span>
      <button type="button" onClick={() => setZoom(value => Math.max(1, value / 1.5))} aria-label="Dézoomer"><ZoomOut size={17} /></button>
      <button type="button" onClick={() => setZoom(value => Math.min(8, value * 1.5))} aria-label="Zoomer"><ZoomIn size={17} /></button>
      <button type="button" onClick={() => setCenter({ x: 0, z: 0 })}>Centrer</button>
    </div>
    <div className="city3b-builder-map-pan" aria-label="Déplacer la vue">
      <button type="button" onClick={() => pan(0, -1)} aria-label="Vue vers le haut">↑</button>
      <button type="button" onClick={() => pan(-1, 0)} aria-label="Vue vers la gauche">←</button>
      <button type="button" onClick={() => pan(1, 0)} aria-label="Vue vers la droite">→</button>
      <button type="button" onClick={() => pan(0, 1)} aria-label="Vue vers le bas">↓</button>
    </div>
    <svg
      ref={svgRef}
      className="city3b-builder-map"
      viewBox={`${view.x} ${view.z} ${view.size} ${view.size}`}
      role="img"
      aria-label={previewOnly ? "Aperçu privé de la Ville 3B" : "Plan interactif de construction Ville 3B"}
      onClick={event => {
        if (previewOnly || event.target.closest?.("[data-placement]")) return;
        const point = pointFromEvent(event);
        if (point) onPoint?.(point);
      }}
      onWheel={event => {
        event.preventDefault();
        setZoom(value => event.deltaY < 0 ? Math.min(8, value * 1.25) : Math.max(1, value / 1.25));
      }}
    >
      <rect x={-half} y={-half} width={half * 2} height={half * 2} className="city3b-map-land" />
      {lines.map(value => <line key={`x-${value}`} x1={value} y1={view.z} x2={value} y2={view.z + view.size} className={value === 0 ? "city3b-map-axis" : "city3b-map-grid"} />)}
      {rows.map(value => <line key={`z-${value}`} x1={view.x} y1={value} x2={view.x + view.size} y2={value} className={value === 0 ? "city3b-map-axis" : "city3b-map-grid"} />)}
      <circle cx="0" cy="0" r={Math.max(2, radius / 45)} className="city3b-map-nexus" />
      {placements.map(row => {
        const selected = row.id === activePlacement?.id;
        return <g key={row.id} data-placement="true" className="city3b-map-building" data-selected={selected} onClick={event => { event.stopPropagation(); if (!previewOnly) onSelect?.(row); }}>
          <rect x={row.x} y={row.z} width={Math.max(1, row.footprint_w || 1)} height={Math.max(1, row.footprint_h || 1)} rx=".6" />
          {selected && <circle cx={Number(row.x) + Number(row.footprint_w || 1) / 2} cy={Number(row.z) + Number(row.footprint_h || 1) / 2} r={Math.max(1.4, radius / 60)} />}
        </g>;
      })}
      {!previewOnly && draftSize && <g className="city3b-map-draft" data-valid={validation?.valid}>
        <rect x={draft.x} y={draft.z} width={draftSize.width} height={draftSize.height} rx=".6" />
        <line x1={draft.x} y1={draft.z} x2={draft.x + draftSize.width} y2={draft.z + draftSize.height} />
        <line x1={draft.x + draftSize.width} y1={draft.z} x2={draft.x} y2={draft.z + draftSize.height} />
      </g>}
    </svg>
    {!previewOnly && validation && <div className="city3b-builder-validation" data-valid={validation.valid}>{validation.valid ? <CheckCircle2 size={16} /> : <Crosshair size={16} />}{validation.reason}</div>}
  </div>;
}

export default function City3BBuilder({ data, busy, call }) {
  const city = data.city || {};
  const storageKey = `threeb:city-editor:v1:${city.city_id || "unknown"}`;
  const definitions = useMemo(() => new Map((data.buildings || []).map(row => [row.code, row])), [data.buildings]);
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedPlacementId, setSelectedPlacementId] = useState("");
  const [draft, setDraft] = useState({ x: 0, z: 0, rotation: 0 });
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0, z: 0 });
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const saved = readDraft(storageKey);
    if (!saved) return;
    if (typeof saved.selectedCode === "string") setSelectedCode(saved.selectedCode);
    if (typeof saved.selectedPlacementId === "string") setSelectedPlacementId(saved.selectedPlacementId);
    if (saved.draft) setDraft({ x: Number(saved.draft.x) || 0, z: Number(saved.draft.z) || 0, rotation: normalizeRotation(saved.draft.rotation) });
    if (Array.isArray(saved.history)) setHistory(saved.history.slice(-30));
    if (Array.isArray(saved.future)) setFuture(saved.future.slice(-30));
  }, [storageKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      writeDraft(storageKey, { selectedCode, selectedPlacementId, draft, history: history.slice(-30), future: future.slice(-30), savedAt: new Date().toISOString() });
    }, 120);
    return () => clearTimeout(timer);
  }, [storageKey, selectedCode, selectedPlacementId, draft, history, future]);

  const placements = placedOnly(data.placements);
  const stored = storedOnly(data.placements);
  const selectedDefinition = definitions.get(selectedCode) || null;
  const selectedPlacement = (data.placements || []).find(row => row.id === selectedPlacementId) || null;
  const selectedPlacementDefinition = selectedPlacement ? definitions.get(selectedPlacement.building_code) : null;
  const activeDefinition = selectedPlacementDefinition || selectedDefinition;
  const size = activeDefinition || selectedPlacement ? footprint(activeDefinition, draft.rotation, selectedPlacement) : null;
  const half = 50 + Number(city.land_tier || 1) * 45;
  const validation = size ? collisionState({ draft, size, half, placements, ignoreId: selectedPlacement?.id }) : null;
  const filteredBuildings = (data.buildings || []).filter(row => `${row.name} ${row.code} ${row.country || ""}`.toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr")));

  const selectBuilding = row => {
    setSelectedCode(row.code);
    setSelectedPlacementId("");
    setDraft({ x: 0, z: 0, rotation: 0 });
    setCenter({ x: 0, z: 0 });
    setNotice(`${row.name} prêt à placer.`);
  };

  const selectPlacement = row => {
    setSelectedCode("");
    setSelectedPlacementId(row.id);
    setDraft({ x: Number(row.x) || 0, z: Number(row.z) || 0, rotation: normalizeRotation(row.rotation) });
    setCenter({ x: Number(row.x) || 0, z: Number(row.z) || 0 });
    setNotice("Bâtiment sélectionné : touche le plan pour le déplacer.");
  };

  const commitHistory = action => {
    setHistory(previous => [...previous.slice(-29), action]);
    setFuture([]);
  };

  const save = async () => {
    if (!activeDefinition || !validation?.valid || busy) return;
    const request = requestId();
    if (selectedPlacement) {
      const from = { x: Number(selectedPlacement.x), z: Number(selectedPlacement.z), rotation: normalizeRotation(selectedPlacement.rotation) };
      const to = { x: Math.round(draft.x), z: Math.round(draft.z), rotation: normalizeRotation(draft.rotation) };
      const result = await call("move", { placement: selectedPlacement.id, ...to, request });
      if (!result) return;
      commitHistory({ kind: "move", placement: selectedPlacement.id, from, to });
      setNotice("Déplacement sauvegardé sur le serveur.");
      return;
    }
    const beforeIds = new Set((data.placements || []).map(row => row.id));
    const to = { x: Math.round(draft.x), z: Math.round(draft.z), rotation: normalizeRotation(draft.rotation) };
    const result = await call("place", { building: activeDefinition.code, ...to, request });
    if (!result) return;
    const created = (result.placements || []).find(row => row.request_id === request || !beforeIds.has(row.id));
    if (created) {
      commitHistory({ kind: "place", placement: created.id, to });
      setSelectedPlacementId(created.id);
      setSelectedCode("");
    }
    setNotice("Construction sauvegardée sur le serveur.");
  };

  const storePlacement = async row => {
    if (!row || busy) return;
    const from = { x: Number(row.x), z: Number(row.z), rotation: normalizeRotation(row.rotation) };
    const result = await call("store", { placement: row.id, request: requestId() });
    if (!result) return;
    commitHistory({ kind: "store", placement: row.id, from });
    setSelectedPlacementId("");
    setNotice("Bâtiment rangé. Il reste acquis et peut être restauré.");
  };

  const applyAction = async (action, direction) => {
    if (!action || busy) return false;
    const reverse = direction === "undo";
    if (action.kind === "place") {
      return reverse
        ? Boolean(await call("store", { placement: action.placement, request: requestId() }))
        : Boolean(await call("move", { placement: action.placement, ...action.to, request: requestId() }));
    }
    if (action.kind === "move") {
      return Boolean(await call("move", { placement: action.placement, ...(reverse ? action.from : action.to), request: requestId() }));
    }
    if (action.kind === "store") {
      return reverse
        ? Boolean(await call("move", { placement: action.placement, ...action.from, request: requestId() }))
        : Boolean(await call("store", { placement: action.placement, request: requestId() }));
    }
    return false;
  };

  const undo = async () => {
    const action = history.at(-1);
    if (!await applyAction(action, "undo")) return;
    setHistory(previous => previous.slice(0, -1));
    setFuture(previous => [...previous, action]);
    setNotice("Action annulée. Les Coins d’un bâtiment acheté restent investis : le bâtiment est rangé, pas supprimé.");
  };

  const redo = async () => {
    const action = future.at(-1);
    if (!await applyAction(action, "redo")) return;
    setFuture(previous => previous.slice(0, -1));
    setHistory(previous => [...previous, action]);
    setNotice("Action rétablie et sauvegardée.");
  };

  if (preview) return <section className="city3b-builder-preview">
    <header><div><p className="city3b-kicker">APERÇU PRIVÉ · NON PUBLIÉ</p><h2>{city.name}</h2><span>Visible uniquement depuis ton Passeport pendant cette validation.</span></div><button type="button" className="city3b-btn primary" onClick={() => setPreview(false)}>Retour à l’éditeur</button></header>
    <BuildingMap data={data} draft={draft} zoom={zoom} setZoom={setZoom} center={center} setCenter={setCenter} previewOnly />
    <div className="city3b-preview-stats"><span>{placements.length} constructions</span><span>{data.districts?.filter(row => row.unlocked).length || 1}/8 quartiers</span><span>{city.day_mode} · {city.weather}</span></div>
  </section>;

  return <section className="city3b-builder">
    <header className="city3b-builder-head">
      <div><p className="city3b-kicker">NOSBLOC · BLOC VILLE</p><h2>Éditeur mobile de {city.name}</h2><p>Le serveur reste l’autorité : niveau, terrain, collisions et Coins sont revérifiés à chaque validation.</p></div>
      <div className="city3b-builder-save"><Save size={18} /><span><strong>Sauvegarde permanente</strong><small>{busy ? "Validation en cours…" : "Toutes les actions confirmées sont enregistrées"}</small></span></div>
    </header>

    <div className="city3b-builder-commandbar">
      <button type="button" disabled={!history.length || busy} onClick={undo}><Undo2 size={17} /> Annuler</button>
      <button type="button" disabled={!future.length || busy} onClick={redo}><Redo2 size={17} /> Rétablir</button>
      <button type="button" onClick={() => setPreview(true)}><Eye size={17} /> Aperçu privé</button>
      <span><HardDrive size={16} /> Brouillon local de reprise actif</span>
    </div>

    {notice && <div className="city3b-builder-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Fermer">×</button></div>}

    <div className="city3b-builder-layout">
      <div className="city3b-builder-canvas">
        <BuildingMap data={data} draft={draft} activeDefinition={activeDefinition} activePlacement={selectedPlacement} onPoint={point => setDraft(previous => ({ ...previous, ...point }))} onSelect={selectPlacement} zoom={zoom} setZoom={setZoom} center={center} setCenter={setCenter} />
        <div className="city3b-builder-nudge">
          <button type="button" onClick={() => setDraft(value => ({ ...value, z: value.z - 1 }))}>Z -1</button>
          <button type="button" onClick={() => setDraft(value => ({ ...value, x: value.x - 1 }))}>X -1</button>
          <button type="button" onClick={() => setDraft(value => ({ ...value, x: value.x + 1 }))}>X +1</button>
          <button type="button" onClick={() => setDraft(value => ({ ...value, z: value.z + 1 }))}>Z +1</button>
        </div>
      </div>

      <aside className="city3b-builder-inspector">
        <div className="city3b-builder-selected">
          <span>{selectedPlacement ? "BÂTIMENT SÉLECTIONNÉ" : selectedDefinition ? "PRÉVISUALISATION" : "CHOISIS UN BÂTIMENT"}</span>
          <strong>{activeDefinition?.name || selectedPlacement?.building_code || "Catalogue Ville 3B"}</strong>
          {activeDefinition && <small>{selectedPlacement ? "Déplacement sans nouveau coût" : `${activeDefinition.cost_coins || 0} Coins · niveau ${activeDefinition.unlock_level || 1}`}</small>}
        </div>
        {activeDefinition && <>
          <div className="city3b-builder-fields">
            <label>X<input type="number" value={draft.x} onChange={event => setDraft(value => ({ ...value, x: Number(event.target.value) }))} /></label>
            <label>Z<input type="number" value={draft.z} onChange={event => setDraft(value => ({ ...value, z: Number(event.target.value) }))} /></label>
          </div>
          <div className="city3b-builder-rotate">
            <button type="button" onClick={() => setDraft(value => ({ ...value, rotation: normalizeRotation(value.rotation - 90) }))}><RotateCcw size={17} /> -90°</button>
            <b>{normalizeRotation(draft.rotation)}°</b>
            <button type="button" onClick={() => setDraft(value => ({ ...value, rotation: normalizeRotation(value.rotation + 90) }))}><RotateCw size={17} /> +90°</button>
          </div>
          <button type="button" className="city3b-btn primary city3b-builder-confirm" disabled={busy || !validation?.valid} onClick={save}><Move size={17} /> {selectedPlacement ? "Valider le déplacement" : "Construire et sauvegarder"}</button>
          {selectedPlacement && <button type="button" className="city3b-btn danger" disabled={busy} onClick={() => storePlacement(selectedPlacement)}><PackageOpen size={17} /> Ranger le bâtiment</button>}
        </>}
      </aside>
    </div>

    <section className="city3b-builder-catalog">
      <div className="city3b-builder-catalog-head"><div><p className="city3b-kicker">CATALOGUE</p><h3>Bâtiments disponibles</h3></div><label><Search size={16} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher…" /></label></div>
      <div className="city3b-builder-building-list">{filteredBuildings.map(row => <button type="button" key={row.code} aria-pressed={selectedCode === row.code} onClick={() => selectBuilding(row)}><span className="city3b-building-thumb"><Building2 size={24} /></span><strong>{row.name}</strong><small>{row.country || "3B International"}</small><b>{row.cost_coins || 0} Coins</b></button>)}</div>
    </section>

    {stored.length > 0 && <section className="city3b-builder-stored"><p className="city3b-kicker">INVENTAIRE DE CONSTRUCTION</p><h3>Bâtiments rangés</h3><div>{stored.map(row => <button type="button" key={row.id} onClick={() => selectPlacement(row)}><PackageOpen size={18} /><span><strong>{definitions.get(row.building_code)?.name || row.building_code}</strong><small>Toucher puis choisir une parcelle pour restaurer</small></span></button>)}</div></section>}
  </section>;
}

export function City3BPrivatePreview({ data }) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0, z: 0 });
  return <section className="city3b-builder-preview city3b-builder-preview-standalone">
    <header><div><p className="city3b-kicker">APERÇU PRIVÉ · PASSEPORT 3B</p><h2>{data.city?.name || "Ma Ville 3B"}</h2><span>Aucune publication publique n’est déclenchée.</span></div></header>
    <BuildingMap data={data} draft={{ x: 0, z: 0, rotation: 0 }} zoom={zoom} setZoom={setZoom} center={center} setCenter={setCenter} previewOnly />
  </section>;
}
