import React, { useId } from "react";

export default function CompanionAvatar({ mode = "idle", size = 118, title = "Compagnon 3B", decorative = false }) {
  const uid = useId().replace(/:/g, "");
  const paint = name => `url(#${uid}-${name})`;
  return (
    <svg
      className="companion3b-avatar"
      data-mode={mode}
      viewBox="0 0 256 300"
      width={size}
      height={Math.round(size * 1.17)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-c3bGold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0b6" />
          <stop offset=".28" stopColor="#e8bd64" />
          <stop offset=".62" stopColor="#8f5f19" />
          <stop offset="1" stopColor="#ffe19a" />
        </linearGradient>
        <linearGradient id={`${uid}-c3bWhite`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".42" stopColor="#d8dbe2" />
          <stop offset="1" stopColor="#777e8d" />
        </linearGradient>
        <radialGradient id={`${uid}-c3bVisor`} cx=".38" cy=".3" r=".9">
          <stop offset="0" stopColor="#27384a" />
          <stop offset=".24" stopColor="#0a111b" />
          <stop offset="1" stopColor="#020305" />
        </radialGradient>
        <linearGradient id={`${uid}-c3bBlue`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8be8ff" />
          <stop offset=".52" stopColor="#2aa8ff" />
          <stop offset="1" stopColor="#1767ff" />
        </linearGradient>
        <filter id={`${uid}-c3bBlueGlow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`${uid}-c3bGoldGlow`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <ellipse className="companion3b-shadow" cx="128" cy="282" rx="65" ry="11" />

      <g className="companion3b-halo" filter={paint("c3bGoldGlow")}>
        <ellipse cx="160" cy="29" rx="35" ry="12" fill="none" stroke={paint("c3bGold")} strokeWidth="5" transform="rotate(-13 160 29)" />
        <path d="M164 18l3 6 7 2-6 3-2 7-3-6-7-2 6-3z" fill="#fff3b8" />
      </g>

      <g className="companion3b-cape">
        <path d="M177 152c33 14 52 42 61 68-17-9-32-14-48-13-2-17-8-34-23-47z" fill="#070a0f" stroke={paint("c3bGold")} strokeWidth="4" />
        <text x="196" y="192" fill="#e8bd64" fontSize="18" fontWeight="900" transform="rotate(18 196 192)">3B</text>
      </g>

      <g className="companion3b-body">
        <path d="M79 150c9-32 32-50 57-50 29 0 53 18 61 53l3 65c-9 20-31 31-65 31-34 0-57-12-68-33z" fill="#080a0e" stroke={paint("c3bGold")} strokeWidth="4" />
        <path d="M76 156c-18 12-27 36-24 61 12 4 25 2 36-6l11-50z" fill={paint("c3bWhite")} stroke="#a1732b" strokeWidth="3" />
        <path d="M195 156c18 12 26 35 24 58-12 5-24 3-36-5l-10-48z" fill={paint("c3bWhite")} stroke="#a1732b" strokeWidth="3" />
        <path d="M86 145c15-15 33-21 50-21 20 0 38 7 51 22l-15 16c-9-10-21-15-36-15-14 0-26 5-35 15z" fill={paint("c3bWhite")} />
        <circle cx="136" cy="162" r="18" fill="#06080c" stroke={paint("c3bGold")} strokeWidth="3" />
        <text x="136" y="169" textAnchor="middle" fill="#f2ca72" fontSize="18" fontWeight="900">3B</text>
      </g>

      <g className="companion3b-head">
        <path d="M55 102c2-56 37-88 82-88 47 0 81 32 83 87-7 23-29 42-83 42-51 0-75-16-82-41z" fill={paint("c3bWhite")} stroke={paint("c3bGold")} strokeWidth="4" />
        <path d="M69 97c4-44 31-67 68-67 39 0 64 24 68 67-8 21-28 31-68 31-40 0-60-10-68-31z" fill={paint("c3bVisor")} stroke="#151b24" strokeWidth="3" />
        <path d="M84 55c14-15 36-23 59-20" fill="none" stroke="#70859b" strokeWidth="5" strokeLinecap="round" opacity=".33" />
        <g className="companion3b-eyes" filter={paint("c3bBlueGlow")}>
          <path className="companion3b-eye left" d="M91 82c12-10 24-9 34 1-5 12-12 17-18 17-7 0-12-5-16-18z" fill={paint("c3bBlue")} />
          <path className="companion3b-eye right" d="M150 83c11-10 23-11 35-1-4 13-10 18-17 18-7 0-13-5-18-17z" fill={paint("c3bBlue")} />
        </g>
        <g className="companion3b-ear">
          <circle cx="63" cy="92" r="19" fill="#070a0f" stroke={paint("c3bGold")} strokeWidth="4" />
          <circle cx="63" cy="92" r="10" fill="none" stroke="#2aa8ff" strokeWidth="4" />
          <circle cx="211" cy="92" r="19" fill="#070a0f" stroke={paint("c3bGold")} strokeWidth="4" />
          <circle cx="211" cy="92" r="10" fill="none" stroke="#2aa8ff" strokeWidth="4" />
        </g>
      </g>

      <g className="companion3b-legs">
        <path d="M91 226c0 24-3 39-13 49l42 1 8-41z" fill="#0a0c10" stroke="#a1732b" strokeWidth="3" />
        <path d="M174 226c1 24 4 39 14 49l-42 1-7-41z" fill="#0a0c10" stroke="#a1732b" strokeWidth="3" />
        <path d="M70 267c16-7 33-5 49 4l-3 16H66z" fill="#080a0f" stroke={paint("c3bWhite")} strokeWidth="6" />
        <path d="M187 267c-16-7-33-5-49 4l3 16h50z" fill="#080a0f" stroke={paint("c3bWhite")} strokeWidth="6" />
        <path d="M70 275h47" stroke={paint("c3bGold")} strokeWidth="3" />
        <path d="M143 275h47" stroke={paint("c3bGold")} strokeWidth="3" />
      </g>

      <g className="companion3b-fx" aria-hidden="true">
        <path d="M28 173l4 8 9 3-9 4-4 9-4-9-9-4 9-3z" fill="#f4c768" />
        <path d="M229 138l3 6 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#70d7ff" />
      </g>

      {mode === "walk" && (
        <g className="companion3b-mode-prop companion3b-walk-lines" aria-hidden="true" fill="none" stroke="#79d9ff" strokeLinecap="round">
          <path d="M18 232h31" strokeWidth="4" opacity=".8" />
          <path d="M8 246h38" strokeWidth="3" opacity=".5" />
          <path d="M25 258h20" strokeWidth="2" opacity=".35" />
        </g>
      )}

      {mode === "sleep" && (
        <g className="companion3b-mode-prop companion3b-sleep-prop" aria-hidden="true" fill="#8fe8ff" filter={paint("c3bBlueGlow")}>
          <text x="197" y="58" fontSize="21" fontWeight="900">Z</text>
          <text x="216" y="39" fontSize="15" fontWeight="900">Z</text>
          <text x="229" y="24" fontSize="11" fontWeight="900">Z</text>
        </g>
      )}

      {mode === "wake" && (
        <g className="companion3b-mode-prop companion3b-sun" aria-hidden="true" filter={paint("c3bGoldGlow")}>
          <circle cx="222" cy="43" r="10" fill="#ffd77f" />
          <g stroke="#ffd77f" strokeWidth="3" strokeLinecap="round">
            <path d="M222 24v-8M222 70v-8M203 43h-8M249 43h-8M209 30l-6-6M241 62l-6-6M235 30l6-6M203 62l6-6" />
          </g>
        </g>
      )}

      {mode === "clock" && (
        <g className="companion3b-mode-prop companion3b-clock" aria-hidden="true" filter={paint("c3bGoldGlow")}>
          <circle cx="34" cy="186" r="24" fill="#070a0f" stroke={paint("c3bGold")} strokeWidth="4" />
          <path d="M34 172v15l11 7" fill="none" stroke="#f7d98f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="34" cy="186" r="3" fill="#f7d98f" />
        </g>
      )}

      {mode === "notification" && (
        <g className="companion3b-mode-prop companion3b-alert" aria-hidden="true" filter={paint("c3bGoldGlow")}>
          <circle cx="222" cy="51" r="19" fill="#0b0f16" stroke="#e8bd64" strokeWidth="3" />
          <text x="222" y="60" textAnchor="middle" fill="#ffe7a8" fontSize="26" fontWeight="900">!</text>
        </g>
      )}

      {mode === "celebrate" && (
        <g className="companion3b-mode-prop companion3b-confetti" aria-hidden="true">
          <path d="M31 72l4 9 10 3-10 4-4 10-4-10-10-4 10-3z" fill="#ffd77f" />
          <path d="M224 95l3 7 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#64d6ff" />
          <path d="M41 138l10-7M218 157l12 6M48 112l-8-9M209 121l8-10" fill="none" stroke="#f2c770" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}

      {mode === "secret" && (
        <g className="companion3b-mode-prop companion3b-secret-hood" aria-hidden="true">
          <path d="M68 67c13-40 38-58 69-58 34 0 61 20 73 60-14-13-28-20-43-24-19-6-42-6-61 1-15 5-27 12-38 21z" fill="#020305" stroke={paint("c3bGold")} strokeWidth="3" opacity=".94" />
          <path d="M79 71c9-34 29-51 58-51 30 0 51 17 62 52" fill="none" stroke="#171d27" strokeWidth="13" strokeLinecap="round" />
          <text x="215" y="80" fill="#ffe19a" fontSize="25" fontWeight="900" filter={paint("c3bGoldGlow")}>?</text>
        </g>
      )}

      {mode === "reward" && (
        <g className="companion3b-mode-prop companion3b-chest" aria-hidden="true" filter={paint("c3bGoldGlow")}>
          <path d="M18 218h56v39H18z" fill="#15100a" stroke="#d9a948" strokeWidth="4" />
          <path d="M19 218c4-20 14-29 27-29s23 9 27 29z" fill="#0c0d10" stroke="#e8bd64" strokeWidth="4" />
          <path d="M42 214h9v44h-9z" fill="#d6a74a" />
          <rect x="37" y="227" width="19" height="15" rx="4" fill="#090b10" stroke="#fff0b6" strokeWidth="3" />
          <circle cx="46.5" cy="234.5" r="3" fill="#fff0b6" />
        </g>
      )}

      {mode === "guardian" && (
        <g className="companion3b-mode-prop companion3b-shield" aria-hidden="true" filter={paint("c3bGoldGlow")}>
          <path d="M20 180l28-11 28 11v23c0 23-13 39-28 48-15-9-28-25-28-48z" fill="#070a0f" stroke={paint("c3bGold")} strokeWidth="4" />
          <path d="M34 207l10 10 20-24" fill="none" stroke="#6fdaff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {mode === "support" && (
        <g className="companion3b-mode-prop companion3b-heart" aria-hidden="true" filter={paint("c3bGoldGlow")}>
          <path d="M215 188c-10-14-34-6-34 11 0 18 34 38 34 38s34-20 34-38c0-17-24-25-34-11z" fill="#ffe8ae" stroke="#d6a64b" strokeWidth="3" />
          <path d="M215 194c-7-8-20-3-20 7 0 9 20 22 20 22s20-13 20-22c0-10-13-15-20-7z" fill="#2aa8ff" opacity=".78" />
        </g>
      )}
    </svg>
  );
}
