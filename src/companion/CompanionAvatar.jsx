import React, { useId } from 'react';

/** A single pair of eyes, a ceramic shell and an asymmetric orbit. */
export default function CompanionAvatar({ mode = 'idle', interaction = '', size = 118, title = 'Compagnon 3B', decorative = false }) {
  const uid = useId().replace(/:/g, '');
  const paint = name => `url(#${uid}-${name})`;
  const sleeping = mode === 'sleep' || interaction === 'rest';
  const smile = interaction === 'hello' || ['wake','celebrate','support'].includes(mode);
  const symbol = ({secret:'secret',guardian:'shield',reward:'reward',clock:'clock',notification:'notification'})[mode];
  return <svg className="companion3b-avatar" data-mode={mode} data-interaction={interaction} viewBox="0 0 256 300" width={size} height={Math.round(size * 1.17)} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : title} aria-hidden={decorative || undefined} focusable="false">
    <defs>
      <linearGradient id={`${uid}-ceramic`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--3b-white)"/><stop offset=".45" stopColor="var(--3b-text)"/><stop offset="1" stopColor="var(--3b-muted)"/></linearGradient>
      <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--3b-champagne-highlight)"/><stop offset=".5" stopColor="var(--3b-champagne)"/><stop offset="1" stopColor="var(--3b-border-strong)"/></linearGradient>
      <radialGradient id={`${uid}-glass`} cx=".25" cy=".15" r="1"><stop stopColor="var(--3b-matrix)" stopOpacity=".3"/><stop offset=".4" stopColor="var(--3b-carbon)"/><stop offset="1" stopColor="var(--3b-obsidian)"/></radialGradient>
      <linearGradient id={`${uid}-mantle`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--3b-carbon)"/><stop offset="1" stopColor="var(--3b-obsidian)"/></linearGradient>
    </defs>
    <ellipse className="companion3b-shadow" cx="128" cy="275" rx="45" ry="7"/>
    <g className="companion3b-orbit companion3b-orbit-back" fill="none" stroke={paint('gold')} strokeWidth="2">
      <ellipse cx="127" cy="171" rx="94" ry="29" transform="rotate(-35 127 171)" strokeDasharray="190 320"/>
      <circle cx="55" cy="220" r="4" fill="var(--3b-champagne)"/>
    </g>
    <g className="companion3b-body">
      <path className="companion3b-cape" d="M156 131c41 15 64 43 70 94-19-5-36-4-55 7l-29-68z" fill={paint('mantle')} stroke="var(--3b-border-strong)" strokeWidth="1.5"/>
      <path d="M89 132c21-18 49-20 72-4l20 72c-9 24-29 41-56 44-26-8-43-24-49-45z" fill={paint('ceramic')} stroke="var(--3b-border-strong)" strokeWidth="2"/>
      <path d="M105 142c9 5 23 5 35 0l14 65-27 18-26-18z" fill={paint('mantle')}/>
      <path d="M104 145l-5 47M153 144l13 41" fill="none" stroke={paint('gold')} strokeWidth="3" strokeLinecap="round"/>
      <g className="companion3b-core"><path d="M127 158l13 12-13 14-13-14z" fill="none" stroke="var(--3b-matrix)" strokeWidth="2"/><circle cx="127" cy="170" r="3" fill="var(--3b-matrix)"/></g>
      <text x="128" y="205" textAnchor="middle" fill="var(--3b-champagne)" fontSize="13" fontWeight="600" letterSpacing="2">3B</text>
      <path className="companion3b-arm companion3b-arm-left" d="M86 143c-11 7-17 29-15 46l10 4 14-42" fill={paint('ceramic')} stroke="var(--3b-border)" strokeWidth="2"/>
      <path className="companion3b-arm companion3b-arm-right" d="M163 144c15 8 25 26 39 40l-10 7-35-40" fill={paint('ceramic')} stroke="var(--3b-border)" strokeWidth="2"/>
    </g>
    <g className="companion3b-head">
      <path d="M68 103c-1-41 19-69 57-73 39-5 67 19 70 53l-5 27c-14 24-83 39-111 9z" fill={paint('ceramic')} stroke="var(--3b-border-strong)" strokeWidth="2"/>
      <path d="M78 83c8-25 34-37 61-34 30 2 44 19 42 42-2 19-25 32-56 31-30-1-50-13-47-39z" fill={paint('glass')} stroke="var(--3b-carbon)" strokeWidth="2"/>
      <path d="M96 60c13-6 29-7 43-4" fill="none" stroke="var(--3b-white)" strokeWidth="2" strokeLinecap="round" opacity=".24"/>
      <path d="M183 67l3 14-2 15" fill="none" stroke={paint('gold')} strokeWidth="3" strokeLinecap="round"/>
      <g className="companion3b-gaze">
        <g className="companion3b-eyes" fill="none" stroke="var(--3b-matrix)" strokeWidth="7" strokeLinecap="round">
          {sleeping ? <><path className="companion3b-eye" d="M100 88h14"/><path className="companion3b-eye" d="M143 88h12"/></> : smile ? <><path className="companion3b-eye" d="M99 89q8-12 16-1"/><path className="companion3b-eye" d="M142 87q7-11 14-1"/></> : <><path className="companion3b-eye" d="M108 79v13"/><path className="companion3b-eye" d="M149 77v12"/></>}
        </g>
        <path d={smile ? 'M119 105q10 7 19-2' : 'M123 105h10'} fill="none" stroke="var(--3b-muted)" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </g>
    <g className="companion3b-legs" fill={paint('mantle')} stroke={paint('gold')} strokeWidth="1.5"><path d="M103 232l-7 24q13 9 24 0l5-17"/><path d="M142 231l10 24q12 7 20-3l-10-25"/></g>
    <path className="companion3b-orbit companion3b-orbit-front" d="M48 199c7 22 52 29 100 12" fill="none" stroke={paint('gold')} strokeWidth="2" strokeLinecap="round"/>
    {symbol && <g className="companion3b-signal" aria-hidden="true" stroke="var(--3b-champagne)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="211" cy="131" r="19" fill="var(--3b-obsidian)" stroke="var(--3b-border-strong)"/>
      {symbol==='secret'&&<><path d="M206 125q0-7 8-5t-2 11v3"/><circle cx="212" cy="140" r="1"/></>}
      {symbol==='shield'&&<path d="M211 119l9 4v8q-1 9-9 13-8-4-9-13v-8zM206 131l4 4 7-8"/>}
      {symbol==='clock'&&<><circle cx="211" cy="131" r="11"/><path d="M211 124v7l5 3"/></>}
      {symbol==='reward'&&<path d="M211 119l4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1z"/>}
      {symbol==='notification'&&<><path d="M211 121v12"/><circle cx="211" cy="140" r="1"/></>}
    </g>}
    {sleeping&&<text x="192" y="55" fill="var(--3b-muted)" fontSize="17">z</text>}
  </svg>;
}
