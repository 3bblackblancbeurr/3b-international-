import {Button} from '../design-system/index.jsx';
import { useEffect, useMemo, useRef, useState } from "react";
import City3DMap from "./City3DMap.jsx";
import {cityFootprint,cityPlacementCheck,citySuggestedParcel,cityCatalogue,CITY_BUILD_CATEGORIES} from "./city3b-construction.js";
import {campaignSummary} from "./city3b-campaign.js";
import {
  Building2, House, Store, Trees, HeartPulse, TrainFront, Landmark,
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
  Sparkles,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cityBuildingKind, cityMapBlueprint, cityMapCustomRoads, cityMapInitialView, cityMapPlacementPolicy, cityMapRoads, cityMapSnap, cityMapUrbanScore } from "./city3b-map.js";
import { citySimulationSnapshot, cityTrafficRoutes } from "./city3b-simulation.js";
import { premiumEffectsFromCodes } from "../store/premium-effects.js";
import {CityInhabitantsLayer,useCityMotion} from "./City3BLife.jsx";
import "../styles/city-3b-builder.css";

const EMPTY_PREMIUM_CODES = new Set();
const requestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const normalizeRotation = value => ((Math.round((Number(value) || 0) / 90) * 90) % 360 + 360) % 360;
const placedOnly = rows => (Array.isArray(rows) ? rows : []).filter(row => row?.placement_state !== "stored");
const storedOnly = rows => (Array.isArray(rows) ? rows : []).filter(row => row?.placement_state === "stored");

// A decorative LOD marker identifies the architecture without changing its real plot.
function BuildingGlyph({kind,service,size,x,z}){
 return <g className="city3b-building-glyph" data-kind={kind} transform={`translate(${x} ${z}) scale(${size})`} aria-hidden="true" pointerEvents="none">
  {kind==='housing'?<><path d="M -.9 -.05 L 0 -.8 L .9 -.05 M -.67 -.13 V .7 H .67 V -.13"/><path d="M -.14 .7 V .2 H .15 V .7 M -.43 .02 H -.24 M .24 .02 H .43"/></>
   :kind==='green'?<><path d="M 0 .9 V .2"/><circle cx="0" cy="-.3" r=".64"/><circle cx="-.43" cy="-.03" r=".35"/><circle cx=".43" cy="-.03" r=".35"/></>
   :kind==='mobility'?<><rect x="-.8" y="-.5" width="1.6" height="1.1" rx=".2"/><path d="M -.55 -.2 H .55 M -.6 .8 V .5 M .6 .8 V .5"/></>
   :service==='energy'?<><path d="M -.8 -.45 H .8 L .6 .45 H -.6 Z M 0 -.45 V .45 M -.72 0 H .72 M 0 .45 V .8"/></>
   :service==='water'?<path d="M 0 -.8 C -.9 .25 -.75 .8 0 .8 C .75 .8 .9 .25 0 -.8 Z"/>
   :kind==='commerce'?<><path d="M -.8 -.15 L -.6 -.7 H .6 L .8 -.15 Z M -.65 -.15 V .7 H .65 V -.15 M -.45 .7 V .1 H -.05 V .7"/><path d="M -.3 -.7 V -.15 M .3 -.7 V -.15"/></>
   :kind==='civic'?<><path d="M -.8 -.35 L 0 -.8 L .8 -.35 M -.6 -.2 V .7 H .6 V -.2"/><path d="M 0 -.15 V .45 M -.3 .15 H .3"/></>
   :kind==='landmark'?<><path d="M -.8 .8 H .8 M -.6 .5 H .6 M -.35 .5 V -.65 H .35 V .5 M 0 -.95 V -.65"/></>
   :<><path d="M -.65 .8 V -.7 H .65 V .8 Z M -.8 .8 H .8"/><path d="M -.35 -.35 H -.15 M .15 -.35 H .35 M -.35 0 H -.15 M .15 0 H .35 M -.35 .35 H -.15 M .15 .35 H .35"/></>}
 </g>;
}

const footprint = cityFootprint;

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

function collisionState({draft,size,snapshot,ignoreId}) {return cityPlacementCheck(snapshot,draft,size,ignoreId);}

function BuildingMap(props) {
  const [view,setView]=useState('3d');
  return <div><div className="city3d-view-switch"><button type="button" aria-pressed={view==='3d'} onClick={()=>setView('3d')}>Ville 3D</button><button type="button" aria-pressed={view==='2d'} onClick={()=>setView('2d')}>Plan 2D</button><small>La même ville, les mêmes constructions sauvegardées</small></div>{view==='3d'?<City3DMap {...props} onPlan={()=>setView('2d')}/>:<PlanMap {...props}/>}</div>;
}

function PlanMap({ data, draft, activeDefinition, activePlacement, onPoint, onSelect, zoom, setZoom, center, setCenter, previewOnly = false, tool = "build", roadStart = null, onRoadPoint, premiumCodes = EMPTY_PREMIUM_CODES }) {
  const svgRef = useRef(null);
  const motion = useCityMotion(svgRef);
  const dragRef = useRef(null);
  const draggedRef = useRef(false);
  const blueprint = useMemo(() => cityMapBlueprint(data), [data]);
  const roads = useMemo(() => cityMapRoads(blueprint), [blueprint]);
  const definitions = useMemo(() => new Map((data.buildings || []).map(row => [row.code, row])), [data.buildings]);
  const itemDefinitions = useMemo(() => new Map((data.definitions || []).map(row => [row.code, row])), [data.definitions]);
  const itemsById = useMemo(() => new Map((data.items || []).map(row => [row.id, row])), [data.items]);
  const premium = useMemo(() => premiumEffectsFromCodes(premiumCodes), [premiumCodes]);
  const simulation = useMemo(() => citySimulationSnapshot(data), [data]);
  const traffic = useMemo(() => cityTrafficRoutes(data, simulation), [data, simulation]);
  const half = blueprint.half;
  const radius = Math.max(12, Math.round(half / zoom));
  const view = { x: center.x - radius, z: center.z - radius, size: radius * 2 };
  const placements = placedOnly(data.placements);
  const draftSize = activeDefinition || activePlacement
    ? footprint(activeDefinition, draft.rotation, activePlacement)
    : null;
  const validation = draftSize ? collisionState({ draft, size: draftSize, snapshot: data, placements, ignoreId: activePlacement?.id }) : null;

  const pointFromEvent = event => {
    const svg = svgRef.current;
    if (!svg) return null;
    const matrix = svg.getScreenCTM?.();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return cityMapSnap({ x: local.x, z: local.y }, 2);
  };

  const pan = (dx, dz) => setCenter(previous => ({
    x: clamp(previous.x + dx * Math.max(4, Math.round(radius / 3)), -half, half),
    z: clamp(previous.z + dz * Math.max(4, Math.round(radius / 3)), -half, half),
  }));

  const beginMapDrag = event => {
    if (event.button !== undefined && event.button !== 0) return;
    if (!previewOnly && event.target.closest?.("[data-placement]")) return;
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, center: { ...center } };
    draggedRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveMapDrag = event => {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || drag.id !== event.pointerId || !svg) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) draggedRef.current = true;
    setCenter({
      x: clamp(drag.center.x - dx / rect.width * view.size, -half, half),
      z: clamp(drag.center.z - dy / rect.height * view.size, -half, half),
    });
  };

  const endMapDrag = event => {
    if (dragRef.current?.id !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
  };

  return <div className="city3b-builder-map-shell" data-preview={previewOnly} data-tool={tool} data-premium-roads={premium.matrixRoads||undefined} data-premium-architecture={premium.champagneArchitecture||undefined} data-premium-waterfront={premium.waterfront||undefined} data-premium-night={premium.nightLuxe||undefined}>
    <div className="city3b-builder-map-toolbar">
      <span><Crosshair size={15} /> {tool === "road" ? "TRACÉ ROUTE" : "PLAN VILLE"} · X {draft.x} · Z {draft.z}</span>
      <span className="city3b-map-progress">{blueprint.districts.filter(row => row.unlocked).length}/8 quartiers · Terrain {blueprint.landTier}/10</span>
      <Button variant="ghost" type="button" onClick={() => setZoom(value => Math.max(1, value / 1.5))} aria-label="Dézoomer"><ZoomOut size={17} /></Button>
      <Button variant="ghost" type="button" onClick={() => setZoom(value => Math.min(8, value * 1.5))} aria-label="Zoomer"><ZoomIn size={17} /></Button>
      <Button variant="ghost" type="button" onClick={() => setCenter({ x: 0, z: 0 })}>Centre-ville</Button>
    </div>
    <div className="city3b-builder-map-pan" aria-label="Déplacer la vue">
      <Button variant="ghost" type="button" onClick={() => pan(0, -1)} aria-label="Vue vers le haut">↑</Button>
      <Button variant="ghost" type="button" onClick={() => pan(-1, 0)} aria-label="Vue vers la gauche">←</Button>
      <Button variant="ghost" type="button" onClick={() => pan(1, 0)} aria-label="Vue vers la droite">→</Button>
      <Button variant="ghost" type="button" onClick={() => pan(0, 1)} aria-label="Vue vers le bas">↓</Button>
    </div>
    <svg
      ref={svgRef}
      className="city3b-builder-map city3b-builder-map-premium"
      viewBox={view.x+" "+view.z+" "+view.size+" "+view.size}
      role="img"
      aria-label={previewOnly ? "Carte urbaine de la Ville 3B" : "Carte interactive de construction de la Ville 3B"}
      onPointerDown={beginMapDrag}
      onPointerMove={moveMapDrag}
      onPointerUp={endMapDrag}
      onPointerCancel={endMapDrag}
      onClick={event => {
        if (draggedRef.current) { draggedRef.current = false; return; }
        if (previewOnly || event.target.closest?.("[data-placement]")) return;
        const point = pointFromEvent(event);
        if (!point) return;
        if (tool === "road") onRoadPoint?.(point);
        else onPoint?.(point);
      }}
      onWheel={event => {
        event.preventDefault();
        setZoom(value => event.deltaY < 0 ? Math.min(8, value * 1.25) : Math.max(1, value / 1.25));
      }}
    >
      <defs>
        <pattern id="city3b-small-grid" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M 6 0 L 0 0 0 6" className="city3b-map-micro-grid" />
        </pattern>
        <filter id="city3b-building-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="1.4" dy="1.8" stdDeviation="1.1" floodOpacity=".55" />
        </filter>
      </defs>

      <rect x={-half} y={-half} width={half * 2} height={half * 2} className="city3b-map-land" />
      <rect x={-half} y={-half} width={half * 2} height={half * 2} fill="url(#city3b-small-grid)" className="city3b-map-grid-overlay" />
      <path d={"M "+(-half)+" "+blueprint.coastZ+" Q 0 "+(blueprint.coastZ-half*.08)+" "+half+" "+blueprint.coastZ+" L "+half+" "+half+" L "+(-half)+" "+half+" Z"} className="city3b-map-water" />
      <path d={"M "+(-half)+" "+blueprint.coastZ+" Q 0 "+(blueprint.coastZ-half*.08)+" "+half+" "+blueprint.coastZ} className="city3b-map-coastline" />

      {blueprint.districts.map(district => <g key={district.code} className="city3b-map-district" data-unlocked={district.unlocked}>
        <ellipse cx={district.x} cy={district.z} rx={district.rx} ry={district.rz} />
        {district.index % 2 === 0 && <circle cx={district.x + district.rx * .35} cy={district.z - district.rz * .18} r={Math.max(3, district.rx * .18)} className="city3b-map-park" />}
      </g>)}

      {roads.rings.map(road => <circle key={road.id} cx="0" cy="0" r={road.radius} className={"city3b-map-road city3b-map-road-"+road.className} />)}
      {roads.boulevards.map(road => <line key={road.id} x1={road.x1} y1={road.z1} x2={road.x2} y2={road.z2} className="city3b-map-road city3b-map-boulevard" />)}
      {roads.radials.map(road => <line key={road.id} x1={road.x1} y1={road.z1} x2={road.x2} y2={road.z2} className="city3b-map-road city3b-map-radial" data-unlocked={road.unlocked} />)}
      {roads.custom.map(road => <line key={road.id} x1={road.x1} y1={road.z1} x2={road.x2} y2={road.z2} className="city3b-map-road city3b-map-road-custom" strokeWidth={road.width} />)}
      <g className="city3b-traffic-layer" aria-hidden="true">{traffic.slice(0,motion.mobile?12:24).map(vehicle => <circle key={vehicle.id} r={vehicle.size} className="city3b-traffic-dot" cx={motion.allowed?undefined:vehicle.x1} cy={motion.allowed?undefined:vehicle.z1}>{motion.allowed&&<animateMotion dur={vehicle.duration+"s"} begin={vehicle.delay+"s"} repeatCount="indefinite" path={"M "+vehicle.x1+" "+vehicle.z1+" L "+vehicle.x2+" "+vehicle.z2} />}</circle>)}</g>
      <CityInhabitantsLayer data={data} motion={motion.allowed} mobile={motion.mobile}/>
      {!previewOnly && tool === "road" && roadStart && <g className="city3b-road-start"><circle cx={roadStart.x} cy={roadStart.z} r="2.8" /><text x={roadStart.x + 4} y={roadStart.z - 4}>Départ</text></g>}

      <g className="city3b-map-center">
        <circle cx="0" cy="0" r={Math.max(7, half * .065)} />
        <circle cx="0" cy="0" r={Math.max(3.5, half * .03)} className="city3b-map-nexus" />
        <text x="0" y={Math.max(10, half * .09)} textAnchor="middle">CŒUR 3B</text>
      </g>

      {blueprint.districts.map(district => <g key={"label-"+district.code} className="city3b-map-district-label" data-unlocked={district.unlocked}>
        <text x={district.x} y={district.z - district.rz * .58} textAnchor="middle">{district.code} · {district.country}</text>
        <text x={district.x} y={district.z - district.rz * .58 + 5} textAnchor="middle" className="city3b-map-district-value">{district.unlocked ? district.value : "VERROUILLÉ"}</text>
      </g>)}

      {(data.displays||[]).map(display => {
        const item=itemsById.get(display.item_instance_id)||{};
        const definition=itemDefinitions.get(item.item_code)||{};
        const premiumMonument=item.item_code==="PREM_CITY_BROKEN_MONUMENT";
        return <g key={"display-"+display.item_instance_id} className="city3b-map-display" data-premium={premiumMonument||undefined} transform={"translate("+display.x+" "+display.z+") rotate("+(display.rotation||0)+")"}>
          {premiumMonument?<><circle r="5.8" className="city3b-display-ring"/><path d="M -4.5 3.5 A 5.8 5.8 0 0 1 3.4 -4.6 M 4.5 -3.5 A 5.8 5.8 0 0 1 -3.4 4.6" className="city3b-display-broken"/><text y="1.4" textAnchor="middle">3B</text></>:<><circle r="3.4"/><text y="1.2" textAnchor="middle">◆</text></>}
          {zoom>=2.2&&<text y="8" textAnchor="middle" className="city3b-display-label">{String(definition.name||item.item_code||"Collection").slice(0,16)}</text>}
        </g>;
      })}
      {placements.map(row => {
        const selected = row.id === activePlacement?.id;
        const definition = definitions.get(row.building_code) || {};
        const kind = cityBuildingKind(definition);
        const width = Math.max(2, Number(row.footprint_w || definition?.footprint?.w || definition?.footprint?.width || 2));
        const height = Math.max(2, Number(row.footprint_h || definition?.footprint?.h || definition?.footprint?.height || 2));
        return <g key={row.id} data-placement="true" data-kind={kind} className="city3b-map-building" data-selected={selected} onClick={event => { event.stopPropagation(); if (!previewOnly) onSelect?.(row); }}>
          <rect className="city3b-map-building-shadow" x={Number(row.x)+1.1} y={Number(row.z)+1.5} width={width} height={height} rx="1" />
          <rect x={row.x} y={row.z} width={width} height={height} rx="1" filter="url(#city3b-building-shadow)" />
          <path d={"M "+row.x+" "+row.z+" L "+(Number(row.x)+width)+" "+row.z+" L "+(Number(row.x)+width-1.2)+" "+(Number(row.z)+1.2)+" L "+(Number(row.x)+1.2)+" "+(Number(row.z)+1.2)+" Z"} className="city3b-map-roof" />
          <BuildingGlyph kind={kind} service={definition.metadata?.service} x={Number(row.x)+width/2} z={Number(row.z)+height/2} size={Math.max(1.5,Math.min(4,radius*(motion.mobile?.026:.016)))}/>
          {(selected || zoom >= 2.2) && <text x={Number(row.x)+width/2} y={Number(row.z)+height/2} textAnchor="middle" dominantBaseline="middle">{String(definition.name || row.building_code || "3B").slice(0,14)}</text>}
          {selected && <circle cx={Number(row.x) + width / 2} cy={Number(row.z) + height / 2} r={Math.max(2.2, radius / 60)} />}
        </g>;
      })}

      {!previewOnly && draftSize && <g className="city3b-map-draft" data-valid={validation?.valid}>
        <rect x={draft.x} y={draft.z} width={draftSize.width} height={draftSize.height} rx=".8" />
        <line x1={draft.x} y1={draft.z} x2={draft.x + draftSize.width} y2={draft.z + draftSize.height} />
        <line x1={draft.x + draftSize.width} y1={draft.z} x2={draft.x} y2={draft.z + draftSize.height} />
      </g>}
    </svg>
    <div className="city3b-map-legend" aria-label="Légende du plan">
      <span><i data-kind="road" /> Routes</span>
      <span><i data-kind="district" /> Quartiers</span>
      <span><i data-kind="building" /> Bâtiments</span>
      <span><i data-kind="green" /> Parcs</span>
      <span><i data-kind="water" /> Eau</span>
    </div>
    {!previewOnly && validation && <div className="city3b-builder-validation" data-valid={validation.valid}>{validation.valid ? <CheckCircle2 size={16} /> : <Crosshair size={16} />}{validation.reason}</div>}
  </div>;
}

export default function City3BBuilder({ data, busy, call, premiumCodes = EMPTY_PREMIUM_CODES, focus }) {
  const city = data.city || {};
  const storageKey = `threeb:city-editor:v1:${city.city_id || "unknown"}`;
  const definitions = useMemo(() => new Map((data.buildings || []).map(row => [row.code, row])), [data.buildings]);
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedPlacementId, setSelectedPlacementId] = useState("");
  const [draft, setDraft] = useState({ x: 0, z: 0, rotation: 0 });
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [zoom, setZoom] = useState(()=>cityMapInitialView(data).zoom);
  const [center, setCenter] = useState(()=>cityMapInitialView(data).center);
  const [query, setQuery] = useState("");
  const [category,setCategory]=useState("all"),[availableOnly,setAvailableOnly]=useState(true),[catalogLimit,setCatalogLimit]=useState(48);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [tool, setTool] = useState("build");
  const [roadStart, setRoadStart] = useState(null);

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
    if (!focus) return;
    setPreview(false);
    setRoadStart(null);
    setSelectedPlacementId("");
    setQuery("");
    setTool(focus.tool === "road" ? "road" : "build");
    if (focus.building && definitions.has(focus.building)) {
      setSelectedCode(focus.building);
      setDraft({ ...citySuggestedParcel(data,definitions.get(focus.building)), rotation: 0 });
      setNotice(`${definitions.get(focus.building).name} : choisis une parcelle puis enregistre la construction.`);
    } else if (focus.tool === "road") {
      setSelectedCode("");
      setNotice("Choisis deux points sur le plan pour tracer une route, puis enregistre le réseau.");
    }
  }, [focus, storageKey]);

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
  const validation = size ? collisionState({ draft, size, snapshot: data, placements, ignoreId: selectedPlacement?.id }) : null;
  const urban = useMemo(() => cityMapUrbanScore(data), [data]);
  const simulation = useMemo(() => citySimulationSnapshot(data), [data]);
  const premium = useMemo(() => premiumEffectsFromCodes(premiumCodes), [premiumCodes]);
  const customRoads = useMemo(() => cityMapCustomRoads(data), [data]);
  const filteredBuildings = useMemo(()=>cityCatalogue(data,{query,category,availableOnly}),[data,query,category,availableOnly]);
  const nextMission=campaignSummary(data.campaign).active;
  const affordable=!!selectedPlacement||Number(data.wallet?.coins||0)>=Number(activeDefinition?.cost_coins||0);
  const unlocked=!!selectedPlacement||Number(city.city_level||1)>=Number(activeDefinition?.unlock_level||1);
  useEffect(()=>setCatalogLimit(48),[query,category,availableOnly]);

  const selectBuilding = row => {
    setSelectedCode(row.code);
    setSelectedPlacementId("");
    const parcel=citySuggestedParcel(data,row,center);
    setDraft({ ...parcel, rotation: 0 });
    setCenter(parcel);
    setTool("build");
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

  const saveRoadPoint = async point => {
    if (busy) return;
    if (!roadStart) {
      setRoadStart(point);
      setNotice("Départ de route posé. Touche maintenant la destination.");
      return;
    }
    const length = Math.hypot(point.x - roadStart.x, point.z - roadStart.z);
    if (length < 6) {
      setNotice("Trace une route plus longue.");
      return;
    }
    const road = { id: requestId(), x1: roadStart.x, z1: roadStart.z, x2: point.x, z2: point.z, width: 4 };
    const result = await call("plan_roads", { roads: [...customRoads, road] });
    if (!result) return;
    setRoadStart(null);
    setNotice("Nouvel axe routier sauvegardé sur le serveur.");
  };

  const removeLastRoad = async () => {
    if (!customRoads.length || busy) return;
    const result = await call("plan_roads", { roads: customRoads.slice(0, -1) });
    if (result) {
      setRoadStart(null);
      setNotice("Dernier axe routier retiré.");
    }
  };

  const save = async () => {
    if (!activeDefinition || !validation?.valid || !affordable || !unlocked || busy) return;
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
    <header><div><p className="city3b-kicker">APERÇU PRIVÉ · NON PUBLIÉ</p><h2>{city.name}</h2><span>Ta ville sauvegardée, libre à explorer.</span></div><Button variant="champagne" type="button" className="city3b-btn primary" onClick={() => setPreview(false)}>Retour à l’éditeur</Button></header>
    <BuildingMap data={data} draft={draft} zoom={zoom} setZoom={setZoom} center={center} setCenter={setCenter} previewOnly premiumCodes={premiumCodes} />
    <div className="city3b-preview-stats"><span>{placements.length} constructions</span><span>{data.districts?.filter(row => row.unlocked).length || 1}/8 quartiers</span><span>{city.day_mode} · {city.weather}</span></div>
  </section>;

  return <section className="city3b-builder">
    <header className="city3b-builder-head">
      <div><p className="city3b-kicker">VILLE 3B · CITY BUILDER</p><h2>Construis {city.name}</h2><p>Bâtiments, quartiers et axes routiers partagent la même carte. Place les lieux de vie et les services, puis relie-les. Chaque construction confirmée reste dans ta ville.</p></div>
      <div className="city3b-builder-save"><Save size={18} /><span><strong>Sauvegarde permanente</strong><small>{busy ? "Validation en cours…" : "Toutes les actions confirmées sont enregistrées"}</small></span></div>
    </header>

    {nextMission&&<div className="city3b-play-guide"><div><small>PROCHAINE ÉTAPE · CHAPITRE {nextMission.chapter}</small><strong>{nextMission.title}</strong></div>{nextMission.status==='ready'?<button type="button" disabled={busy} onClick={()=>call('mission_claim',{mission:nextMission.code})}>Recevoir +{nextMission.coins} Coins</button>:nextMission.action?.building&&<button type="button" onClick={()=>{const row=definitions.get(nextMission.action.building);if(row)selectBuilding(row);}}>Choisir le bâtiment</button>}</div>}
    <div className="city3b-builder-commandbar">
      <Button variant="ghost" type="button" disabled={busy} onClick={()=>call('environment',{day:city.day_mode==='night'?'day':'night',weather:city.weather||'clear',ambience:city.ambience||'urban'})}>{city.day_mode==='night'?'☀ Jour':'☾ Nuit'}</Button>
      <Button variant="ghost" type="button" disabled={!history.length || busy} onClick={undo}><Undo2 size={17} /> Annuler</Button>
      <Button variant="ghost" type="button" disabled={!future.length || busy} onClick={redo}><Redo2 size={17} /> Rétablir</Button>
      <Button variant="ghost" type="button" onClick={() => setPreview(true)}><Eye size={17} /> Aperçu privé</Button>
      <Button variant="ghost" type="button" aria-pressed={tool === "build"} onClick={() => { setTool("build"); setRoadStart(null); }}><Building2 size={17} /> Bâtiments</Button>
      <Button variant="ghost" type="button" aria-pressed={tool === "road"} onClick={() => { setTool("road"); setSelectedCode(""); setSelectedPlacementId(""); }}><Move size={17} /> Routes</Button>
      {tool === "road" && customRoads.length > 0 && <Button variant="ghost" type="button" disabled={busy} onClick={removeLastRoad}>Retirer dernier axe</Button>}
      <span><HardDrive size={16} /> Brouillon local de reprise actif</span>
    </div>

    {notice && <div className="city3b-builder-notice" role="status">{notice}<Button variant="ghost" type="button" onClick={() => setNotice("")} aria-label="Fermer">×</Button></div>}

    <div className="city3b-builder-layout">
      <div className="city3b-builder-canvas">
        <BuildingMap data={data} draft={draft} activeDefinition={tool === "build" ? activeDefinition : null} activePlacement={tool === "build" ? selectedPlacement : null} onPoint={point => setDraft(previous => ({ ...previous, ...point }))} onSelect={selectPlacement} zoom={zoom} setZoom={setZoom} center={center} setCenter={setCenter} tool={tool} roadStart={roadStart} onRoadPoint={saveRoadPoint} premiumCodes={premiumCodes} />
        {tool === "build" && <div className="city3b-builder-nudge">
          <Button variant="ghost" type="button" onClick={() => setDraft(value => ({ ...value, z: value.z - 1 }))}>Z -1</Button>
          <Button variant="ghost" type="button" onClick={() => setDraft(value => ({ ...value, x: value.x - 1 }))}>X -1</Button>
          <Button variant="ghost" type="button" onClick={() => setDraft(value => ({ ...value, x: value.x + 1 }))}>X +1</Button>
          <Button variant="ghost" type="button" onClick={() => setDraft(value => ({ ...value, z: value.z + 1 }))}>Z +1</Button>
        </div>}
      </div>

      <aside className="city3b-builder-inspector">
        {tool === "road" ? <div className="city3b-builder-selected city3b-road-tool">
          <span>OUTIL ROUTE</span>
          <strong>{roadStart ? "Choisis la destination" : "Choisis le départ"}</strong>
          <small>Deux touches sur la carte créent un axe routier permanent. Les bâtiments ne peuvent plus être posés sur les axes réservés.</small>
          <b>{customRoads.length} axe(s) personnalisé(s)</b>
        </div> : <>
        <div className="city3b-builder-selected">
          <span>{selectedPlacement ? "BÂTIMENT SÉLECTIONNÉ" : selectedDefinition ? "PRÉVISUALISATION" : "CHOISIS UN BÂTIMENT"}</span>
          <strong>{activeDefinition?.name || selectedPlacement?.building_code || "Catalogue Ville 3B"}</strong>
          {activeDefinition && <small>{selectedPlacement ? "Déplacement sans nouveau coût" : `${activeDefinition.cost_coins || 0} Coins · niveau ${activeDefinition.unlock_level || 1}`}</small>}
        </div>
        {!activeDefinition&&<div className="city3b-quick-build"><p>Commence par un lieu de vie.</p>{['HOME_ORIGIN','CITY_HALL_3B','LAKE_HOMES_3B','PARK_UNITY'].map(code=>definitions.get(code)).filter(row=>row&&Number(row.unlock_level||1)<=Number(city.city_level||1)).map(row=><Button variant="ghost" type="button" key={row.code} onClick={()=>selectBuilding(row)}>{row.name} · {row.cost_coins||0} Coins</Button>)}</div>}
        {activeDefinition && <>
          {!affordable&&<p role="status">Il manque {Number(activeDefinition.cost_coins)-Number(data.wallet?.coins||0)} Coins. Accomplis une mission pour en gagner.</p>}
          {!unlocked&&<p role="status">Disponible au niveau {activeDefinition.unlock_level} de ta ville.</p>}
          <div className="city3b-builder-fields">
            <label>X<input type="number" value={draft.x} onChange={event => setDraft(value => ({ ...value, x: Number(event.target.value) }))} /></label>
            <label>Z<input type="number" value={draft.z} onChange={event => setDraft(value => ({ ...value, z: Number(event.target.value) }))} /></label>
          </div>
          <div className="city3b-builder-rotate">
            <Button variant="ghost" type="button" onClick={() => setDraft(value => ({ ...value, rotation: normalizeRotation(value.rotation - 90) }))}><RotateCcw size={17} /> -90°</Button>
            <b>{normalizeRotation(draft.rotation)}°</b>
            <Button variant="ghost" type="button" onClick={() => setDraft(value => ({ ...value, rotation: normalizeRotation(value.rotation + 90) }))}><RotateCw size={17} /> +90°</Button>
          </div>
          <Button variant="champagne" type="button" className="city3b-btn primary city3b-builder-confirm" disabled={busy || !validation?.valid || !affordable || !unlocked} onClick={save}><Move size={17} /> {selectedPlacement ? "Valider le déplacement" : "Construire et sauvegarder"}</Button>
          {selectedPlacement && <Button variant="danger" type="button" className="city3b-btn danger" disabled={busy} onClick={() => storePlacement(selectedPlacement)}><PackageOpen size={17} /> Ranger le bâtiment</Button>}
        </>}
        </>}
      </aside>
    </div>

    {simulation.available&&<section className="city3b-urban-health" aria-label="Simulation urbaine">
      <div><span>VILLE VIVANTE</span><strong>{simulation.available?simulation.satisfaction+'%':'—'}</strong><small>{simulation.status} · croissance {simulation.growthPerCycle>=0?"+":""}{simulation.growthPerCycle}</small></div>
      <div><span>Habitants</span><strong>{simulation.available?simulation.residents:'—'}</strong><small>{simulation.housingCapacity} places logement</small></div>
      <div><span>Emplois</span><strong>{simulation.available?simulation.jobs:'—'}</strong><small>{simulation.unemployment}% actifs sans emploi</small></div>
      <div><span>Mobilité</span><strong>{simulation.transit}%</strong><small>Routes proches et transports</small></div>
      <div><span>Services</span><strong>{simulation.services}%</strong><small>demande {simulation.serviceDemand}%</small></div>
      <div><span>Nature</span><strong>{simulation.green}%</strong><small>attractivité {simulation.attractiveness}%</small></div>
      <div><span>Logements</span><strong>{simulation.residentialDemand}%</strong><small>places occupées</small></div>
      <div><span>Actifs</span><strong>{simulation.employed}/{simulation.workingPopulation}</strong><small>avec un emploi</small></div>
    </section>}
    {(premium.matrixRoads||premium.champagneArchitecture||premium.waterfront||premium.brokenCircleMonument||premium.nightLuxe)&&<section className="city3b-premium-active"><Sparkles size={17}/><span><strong>Premium actif dans la ville</strong><small>{[premium.matrixRoads&&"Routes Matrix",premium.champagneArchitecture&&"Architecture Champagne",premium.waterfront&&"Waterfront",premium.brokenCircleMonument&&"Monument Cercle Brisé",premium.nightLuxe&&"Nuit Luxe"].filter(Boolean).join(" · ")}</small></span></section>}

    <section className="city3b-builder-catalog">
      <div className="city3b-builder-catalog-head"><div><p className="city3b-kicker">CATALOGUE</p><h3>Bâtiments disponibles</h3></div><label><Search size={16} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher…" /></label></div>
      <nav className="city3b-category-tabs" aria-label="Types de construction">{CITY_BUILD_CATEGORIES.map(([id,label])=><button type="button" key={id} aria-pressed={category===id} onClick={()=>setCategory(id)}>{label}</button>)}</nav>
      <div className="city3b-catalog-options"><label><input type="checkbox" checked={availableOnly} onChange={e=>setAvailableOnly(e.target.checked)}/> Débloqués uniquement</label><span>{filteredBuildings.length} bâtiments</span></div>
      <div className="city3b-builder-building-list">{filteredBuildings.slice(0,catalogLimit).map(row=>{const kind=cityBuildingKind(row),Icon=({housing:House,commerce:Store,green:Trees,civic:HeartPulse,mobility:TrainFront,landmark:Landmark})[kind]||Building2,locked=Number(row.unlock_level)>Number(city.city_level||1);return <Button variant="ghost" type="button" key={row.code} aria-pressed={selectedCode===row.code} disabled={locked||busy} onClick={()=>selectBuilding(row)}><span className="city3b-building-thumb" data-kind={kind}><Icon size={24}/></span><strong>{row.name}</strong><small>{locked?'Niveau '+row.unlock_level:row.country||'3B International'}</small><b>{row.cost_coins||0} Coins</b></Button>;})}</div>
      {!filteredBuildings.length&&<p>Aucun bâtiment dans cette catégorie. Change le filtre ou la recherche.</p>}
      {filteredBuildings.length>catalogLimit&&<Button variant="ghost" type="button" onClick={()=>setCatalogLimit(n=>n+48)}>Afficher plus de bâtiments</Button>}
    </section>

    {stored.length > 0 && <section className="city3b-builder-stored"><p className="city3b-kicker">INVENTAIRE DE CONSTRUCTION</p><h3>Bâtiments rangés</h3><div>{stored.map(row => <Button variant="ghost" type="button" key={row.id} onClick={() => selectPlacement(row)}><PackageOpen size={18} /><span><strong>{definitions.get(row.building_code)?.name || row.building_code}</strong><small>Toucher puis choisir une parcelle pour restaurer</small></span></Button>)}</div></section>}
  </section>;
}

export function City3BPrivatePreview({ data, premiumCodes = EMPTY_PREMIUM_CODES, publicVisit = false }) {
  const [zoom, setZoom] = useState(()=>cityMapInitialView(data).zoom);
  const [center, setCenter] = useState(()=>cityMapInitialView(data).center);
  return <section className="city3b-builder-preview city3b-builder-preview-standalone">
    <header><div><p className="city3b-kicker">{publicVisit?'VISITE · VILLE PUBLIQUE':'MA VILLE · VUE 3D'}</p><h2>{data.city?.name || "Ma Ville 3B"}</h2><span>{publicVisit?'Découvre le plan sauvegardé de cette ville.':'Aucune publication publique n’est déclenchée.'}</span></div></header>
    <BuildingMap data={data} draft={{ x: 0, z: 0, rotation: 0 }} zoom={zoom} setZoom={setZoom} center={center} setCenter={setCenter} previewOnly premiumCodes={premiumCodes} />
  </section>;
}
