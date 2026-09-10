import { useEffect, useId, useState } from "react";
import { Pause, Play } from "lucide-react";
import DigitalHead from "./DigitalHead.jsx";

const STREAMS = Array.from({ length: 58 }, (_, column) => ({
  left: `${(column + 0.25) * 100 / 58}%`,
  delay: `${-(column * 1.73 % 12)}s`,
  duration: `${5.5 + column * 3.7 % 7}s`,
  opacity: 0.42 + (column % 5) * 0.12,
  digits: Array.from({ length: 38 }, (_, row) => (column * 13 + row * 7 + row * row) % 3 === 0 ? "1" : "0").join(""),
}));

// These coordinates follow the printed circuit tracks inside the central card.
const CIRCUITS = [
  "M505 535H725L779 481H828L866 443H966L1000 409H1030",
  "M507 523H714L761 476H810L860 426H950L993 383H1029",
  "M694 505H737L784 458H845L879 424H968L1006 386H1026",
  "M690 490H727L775 442H829L861 410H949L978 381H1021",
  "M668 477H720L757 440H804L841 403H887L914 376H1019",
  "M723 356H778L817 317H878L904 291H993L1024 260",
  "M503 250H540L571 219H615L642 246H744",
  "M850 546H1003L1031 518H1265L1287 496V416",
  "M605 108H850L874 132H1010L1038 104H1191",
];

export default function PassportVisual({ options }) {
  const id = useId().replaceAll(":", "");
  const [paused, setPaused] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const motionAllowed = options.animations && !options.reducedMotion && !systemReducedMotion;
  const animated = motionAllowed && !paused;
  return <div className="passport-visual" data-animated={animated} data-matrix={options.matrix}>
    <div className="passport-card-stage">
      <svg className="passport-card-art" viewBox="465 75 848 502" role="img" aria-label="Carte Passeport Digital 3B" focusable="false">
        <defs><clipPath id={`${id}-card`}><rect x="465" y="75" width="848" height="502" rx="44" /></clipPath></defs>
        <image href="/passport-digital-3bv2.png" width="1694" height="928" clipPath={`url(#${id}-card)`} />
      </svg>

      <div className="passport-matrix-rain" aria-hidden="true">
        {STREAMS.map((stream, index) => <span key={index} className="passport-matrix-stream" style={{ left: stream.left, "--fall-delay": stream.delay, "--fall-duration": stream.duration, "--stream-opacity": stream.opacity }}>{stream.digits}<b>1</b></span>)}
      </div>
      <div className="passport-digital-grid" aria-hidden="true" />
      <div className="passport-blue-sweep" aria-hidden="true" />

      <svg className="passport-circuits" viewBox="465 75 848 502" aria-hidden="true" focusable="false">
        <defs><filter id={`${id}-electric`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.8" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {CIRCUITS.map((path, index) => <g key={path}>
            <path className="passport-circuit-track" d={path} />
            <path className="passport-circuit-pulse" d={path} pathLength="100" filter={`url(#${id}-electric)`} style={{ animationDelay: `${-index * 1.2}s`, animationDuration: `${5 + index % 4}s` }} />
          </g>)}
          <rect className="passport-circuit-perimeter" x="478" y="87" width="820" height="478" rx="34" pathLength="100" filter={`url(#${id}-electric)`} />
          <rect className="passport-chip-signal" x="517" y="102" width="75" height="60" rx="10" />
        </g>
        <g className="passport-circuit-nodes" fill="#9cffff">
          <circle cx="1030" cy="409" r="2.5" /><circle cx="1029" cy="383" r="2" /><circle cx="1021" cy="381" r="2" /><circle cx="887" cy="403" r="2" /><circle cx="845" cy="458" r="2.5" /><circle cx="1191" cy="104" r="2.5" />
        </g>
      </svg>

      {/* The original portrait is clipped from the unchanged artwork and animated
          over its own digital background, so no second face shows underneath. */}
      <svg className="passport-live-portrait" viewBox="465 75 848 502" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={`${id}-panel`}><rect x="1061" y="166" width="197" height="216" rx="10" /></clipPath>
          <clipPath id={`${id}-head`}><path d="M1158 172 C1112 172 1089 203 1089 238 C1080 239 1080 254 1085 269 C1087 281 1094 291 1102 293 C1109 312 1121 328 1131 335 L1131 353 C1120 367 1103 374 1080 384 L1238 384 C1218 373 1196 369 1186 354 L1186 335 C1200 324 1212 309 1218 292 C1228 286 1232 270 1232 255 C1233 244 1228 238 1224 238 C1223 201 1202 172 1158 172 Z" /></clipPath>
          <pattern id={`${id}-grid`} width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#137ac6" strokeWidth=".5" /></pattern>
          <radialGradient id={`${id}-aura`}><stop stopColor="#006ec4" stopOpacity=".45" /><stop offset="1" stopColor="#001026" /></radialGradient>
          <linearGradient id={`${id}-scan`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#14cbff" stopOpacity="0" /><stop offset=".85" stopColor="#18e3ff" stopOpacity=".18" /><stop offset="1" stopColor="#afffff" stopOpacity=".8" /></linearGradient>
        </defs>
        <g clipPath={`url(#${id}-panel)`}>
          <rect x="1061" y="166" width="197" height="216" fill={`url(#${id}-aura)`} />
          <rect x="1061" y="166" width="197" height="216" fill={`url(#${id}-grid)`} />
          <g>
            <image href="/passport-digital-3bv2.png" width="1694" height="928" clipPath={`url(#${id}-head)`} />
            <g className="passport-eye-glow" fill="#9bffff">
              <ellipse cx="1129" cy="269" rx="8" ry="2.6" /><ellipse cx="1185" cy="269" rx="8" ry="2.6" />
            </g>
            <g className="passport-eye-blink" fill="#00294e">
              <ellipse cx="1129" cy="269" rx="16" ry="7" /><ellipse cx="1185" cy="269" rx="16" ry="7" />
            </g>
          </g>
          <rect className="passport-face-scan" x="1061" y="150" width="197" height="28" fill={`url(#${id}-scan)`} />
          <path className="passport-face-signal" d="M1068 215V184H1099 M1220 184H1251V215 M1068 337V369H1099 M1220 369H1251V337" fill="none" stroke="#31dfff" strokeWidth="1.4" />
        </g>
      </svg>
      <DigitalHead animated={animated} />
      <div className="passport-portrait-scan" aria-hidden="true" />

    </div>
    <div className="passport-animation-toolbar">
      <span><i className={animated ? "digital-status is-live" : "digital-status"} aria-hidden="true" />{animated ? "Carte digitale animée" : "Carte en mode calme"}</span>
      <button type="button" className="passport-animation-toggle" disabled={!motionAllowed} aria-pressed={paused} onClick={() => setPaused(value => !value)}>
        {animated ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        {motionAllowed ? (paused ? "Reprendre l’animation" : "Mettre en pause") : "Mouvements réduits"}
      </button>
    </div>
  </div>;
}
