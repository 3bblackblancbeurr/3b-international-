import React from "react";

export default function CompanionAvatar({ mode = "idle", size = 118, title = "Compagnon 3B" }) {
  return (
    <svg
      className="companion3b-avatar"
      data-mode={mode}
      viewBox="0 0 256 300"
      width={size}
      height={Math.round(size * 1.17)}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="c3bGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0b6" />
          <stop offset=".28" stopColor="#e8bd64" />
          <stop offset=".62" stopColor="#8f5f19" />
          <stop offset="1" stopColor="#ffe19a" />
        </linearGradient>
        <linearGradient id="c3bWhite" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".42" stopColor="#d8dbe2" />
          <stop offset="1" stopColor="#777e8d" />
        </linearGradient>
        <radialGradient id="c3bVisor" cx=".38" cy=".3" r=".9">
          <stop offset="0" stopColor="#27384a" />
          <stop offset=".24" stopColor="#0a111b" />
          <stop offset="1" stopColor="#020305" />
        </radialGradient>
        <linearGradient id="c3bBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8be8ff" />
          <stop offset=".52" stopColor="#2aa8ff" />
          <stop offset="1" stopColor="#1767ff" />
        </linearGradient>
        <filter id="c3bBlueGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="c3bGoldGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <ellipse className="companion3b-shadow" cx="128" cy="282" rx="65" ry="11" />

      <g className="companion3b-halo" filter="url(#c3bGoldGlow)">
        <ellipse cx="160" cy="29" rx="35" ry="12" fill="none" stroke="url(#c3bGold)" strokeWidth="5" transform="rotate(-13 160 29)" />
        <path d="M164 18l3 6 7 2-6 3-2 7-3-6-7-2 6-3z" fill="#fff3b8" />
      </g>

      <g className="companion3b-cape">
        <path d="M177 152c33 14 52 42 61 68-17-9-32-14-48-13-2-17-8-34-23-47z" fill="#070a0f" stroke="url(#c3bGold)" strokeWidth="4" />
        <text x="196" y="192" fill="#e8bd64" fontSize="18" fontWeight="900" transform="rotate(18 196 192)">3B</text>
      </g>

      <g className="companion3b-body">
        <path d="M79 150c9-32 32-50 57-50 29 0 53 18 61 53l3 65c-9 20-31 31-65 31-34 0-57-12-68-33z" fill="#080a0e" stroke="url(#c3bGold)" strokeWidth="4" />
        <path d="M76 156c-18 12-27 36-24 61 12 4 25 2 36-6l11-50z" fill="url(#c3bWhite)" stroke="#a1732b" strokeWidth="3" />
        <path d="M195 156c18 12 26 35 24 58-12 5-24 3-36-5l-10-48z" fill="url(#c3bWhite)" stroke="#a1732b" strokeWidth="3" />
        <path d="M86 145c15-15 33-21 50-21 20 0 38 7 51 22l-15 16c-9-10-21-15-36-15-14 0-26 5-35 15z" fill="url(#c3bWhite)" />
        <circle cx="136" cy="162" r="18" fill="#06080c" stroke="url(#c3bGold)" strokeWidth="3" />
        <text x="136" y="169" textAnchor="middle" fill="#f2ca72" fontSize="18" fontWeight="900">3B</text>
      </g>

      <g className="companion3b-head">
        <path d="M55 102c2-56 37-88 82-88 47 0 81 32 83 87-7 23-29 42-83 42-51 0-75-16-82-41z" fill="url(#c3bWhite)" stroke="url(#c3bGold)" strokeWidth="4" />
        <path d="M69 97c4-44 31-67 68-67 39 0 64 24 68 67-8 21-28 31-68 31-40 0-60-10-68-31z" fill="url(#c3bVisor)" stroke="#151b24" strokeWidth="3" />
        <path d="M84 55c14-15 36-23 59-20" fill="none" stroke="#70859b" strokeWidth="5" strokeLinecap="round" opacity=".33" />
        <g className="companion3b-eyes" filter="url(#c3bBlueGlow)">
          <path className="companion3b-eye left" d="M91 82c12-10 24-9 34 1-5 12-12 17-18 17-7 0-12-5-16-18z" fill="url(#c3bBlue)" />
          <path className="companion3b-eye right" d="M150 83c11-10 23-11 35-1-4 13-10 18-17 18-7 0-13-5-18-17z" fill="url(#c3bBlue)" />
        </g>
        <g className="companion3b-ear">
          <circle cx="63" cy="92" r="19" fill="#070a0f" stroke="url(#c3bGold)" strokeWidth="4" />
          <circle cx="63" cy="92" r="10" fill="none" stroke="#2aa8ff" strokeWidth="4" />
          <circle cx="211" cy="92" r="19" fill="#070a0f" stroke="url(#c3bGold)" strokeWidth="4" />
          <circle cx="211" cy="92" r="10" fill="none" stroke="#2aa8ff" strokeWidth="4" />
        </g>
      </g>

      <g className="companion3b-legs">
        <path d="M91 226c0 24-3 39-13 49l42 1 8-41z" fill="#0a0c10" stroke="#a1732b" strokeWidth="3" />
        <path d="M174 226c1 24 4 39 14 49l-42 1-7-41z" fill="#0a0c10" stroke="#a1732b" strokeWidth="3" />
        <path d="M70 267c16-7 33-5 49 4l-3 16H66z" fill="#080a0f" stroke="url(#c3bWhite)" strokeWidth="6" />
        <path d="M187 267c-16-7-33-5-49 4l3 16h50z" fill="#080a0f" stroke="url(#c3bWhite)" strokeWidth="6" />
        <path d="M70 275h47" stroke="url(#c3bGold)" strokeWidth="3" />
        <path d="M143 275h47" stroke="url(#c3bGold)" strokeWidth="3" />
      </g>

      <g className="companion3b-fx" aria-hidden="true">
        <path d="M28 173l4 8 9 3-9 4-4 9-4-9-9-4 9-3z" fill="#f4c768" />
        <path d="M229 138l3 6 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#70d7ff" />
      </g>
    </svg>
  );
}
