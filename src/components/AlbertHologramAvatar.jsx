// A bespoke sculpted 2.5D Albert portrait — no remotely hosted asset or
// additional WebGL context. Optimised for the compact mobile concierge stage.
export default function AlbertHologramAvatar(){
 return <div className="albert3b-avatar albert3b-sculpted-avatar" aria-hidden="true">
  <div className="albert3b-avatar-halo"/>
  <svg viewBox="0 0 280 320" role="presentation" focusable="false" className="albert3b-portrait-svg">
   <defs>
    <linearGradient id="albert3b-hair" x1=".1" y1=".15" x2=".85" y2=".9">
      <stop stopColor="#112e59"/><stop offset=".29" stopColor="#0a1a35"/><stop offset=".68" stopColor="#061326"/><stop offset="1" stopColor="#286297"/>
    </linearGradient>
    <linearGradient id="albert3b-skin" x1="0" y1=".1" x2=".94" y2=".92">
      <stop stopColor="#a4e8fb"/><stop offset=".19" stopColor="#578cba"/><stop offset=".48" stopColor="#22496f"/><stop offset=".72" stopColor="#102b4c"/><stop offset="1" stopColor="#4f8fc0"/>
    </linearGradient>
    <linearGradient id="albert3b-cheek" x1=".13" y1=".1" x2="1" y2="1">
      <stop stopColor="#beeafa" stopOpacity=".41"/><stop offset=".58" stopColor="#338dca" stopOpacity=".17"/><stop offset="1" stopColor="#00162d" stopOpacity=".4"/>
    </linearGradient>
    <linearGradient id="albert3b-suit" x1="0" x2="1" y1=".3" y2="1">
      <stop stopColor="#1a4e76"/><stop offset=".45" stopColor="#071a31"/><stop offset="1" stopColor="#020b1a"/>
    </linearGradient>
    <linearGradient id="albert3b-metal" x1="0" x2="1">
      <stop stopColor="#8ad9fa"/><stop offset=".5" stopColor="#f0c88e"/><stop offset="1" stopColor="#4b9bd6"/>
    </linearGradient>
    <radialGradient id="albert3b-eye" cx=".5" cy=".5" r=".5">
      <stop stopColor="#d3faff"/><stop offset=".35" stopColor="#62dafa"/><stop offset=".74" stopColor="#1269b4"/><stop offset="1" stopColor="#011727"/>
    </radialGradient>
    <radialGradient id="albert3b-necklight">
      <stop stopColor="#3fb8ff" stopOpacity=".34"/><stop offset="1" stopColor="#0a2345" stopOpacity="0"/>
    </radialGradient>
   </defs>
   <ellipse cx="140" cy="161" rx="100" ry="145" fill="url(#albert3b-necklight)"/>
   {/* Dark silk-like hair behind the face */}
   <path d="M91 188 C66 172 53 132 62 78 C70 32 99 7 139 8 C189 5 218 42 220 97 C221 145 217 186 230 229 C207 220 190 203 186 183 L88 198Z" fill="url(#albert3b-hair)" stroke="#357cb5" strokeWidth="1.5"/>
   <path d="M65 118 Q61 65 95 32 Q116 10 155 13 Q197 18 212 60" fill="none" stroke="#74dcff" strokeOpacity=".41" strokeWidth="3"/>
   <path d="M208 92 Q220 141 210 188 Q214 209 226 224" fill="none" stroke="#e4b77c" strokeOpacity=".55" strokeWidth="2"/>
   {/* Neck and layered midnight-blue collar */}
   <path d="M111 213 L111 241 Q124 256 142 262 Q161 254 171 239 L169 212Z" fill="url(#albert3b-skin)" stroke="#79b1d6" strokeWidth="1.5"/>
   <path d="M108 240 Q89 249 70 255 Q26 269 9 318 L273 318 Q251 274 213 257 Q188 252 170 239 Q155 269 141 274 Q122 273 108 240Z" fill="url(#albert3b-suit)" stroke="url(#albert3b-metal)" strokeWidth="2.5"/>
   <path d="M104 243 L131 281 L112 319 L48 319 Q53 279 78 259Z" fill="#061629" stroke="#4ba8da" strokeWidth="1.5"/>
   <path d="M177 243 L152 281 L173 319 L231 319 Q224 275 202 259Z" fill="#041426" stroke="#e5b27b" strokeWidth="1.5"/>
   <path d="M97 262 Q123 286 140 291 Q165 279 183 261" fill="none" stroke="#77c7ef" strokeWidth="1.5" strokeOpacity=".8"/>
   <path d="M78 265 L55 294 L61 319 M201 263 L227 292 L220 319" stroke="#5ccaff" strokeWidth="2" strokeOpacity=".67" fill="none"/>
   <path d="M65 298 Q77 304 95 307 M217 300 Q204 306 184 308" stroke="#f7c98b" strokeOpacity=".7" strokeWidth="1.8" fill="none"/>
   {/* Facial volume: cheekbones, nose and asymmetric studio lighting */}
   <path d="M86 89 Q93 49 121 42 Q158 30 181 59 Q197 81 195 118 L188 174 Q184 206 159 222 Q140 234 125 225 Q99 212 92 184 L84 126 Q78 114 86 89Z" fill="url(#albert3b-skin)" stroke="#a9e1f2" strokeOpacity=".82" strokeWidth="2"/>
   <path d="M89 102 Q105 76 118 64 Q131 54 150 61 Q171 69 188 92 Q190 124 175 145 Q159 158 140 154 Q108 149 94 163Z" fill="url(#albert3b-cheek)"/>
   <path d="M88 125 Q97 153 94 183 Q99 202 115 215" fill="none" stroke="#d5e9f7" strokeOpacity=".32" strokeWidth="3"/>
   <path d="M186 106 Q197 138 185 174 Q180 197 161 217" fill="none" stroke="#032342" strokeOpacity=".78" strokeWidth="6"/>
   <path d="M99 160 Q112 155 120 161 M162 160 Q172 154 183 160" fill="none" stroke="#83bdde" strokeOpacity=".38" strokeWidth="2"/>
   <path d="M139 127 Q133 151 138 164 Q141 170 148 166" fill="none" stroke="#c5edfb" strokeOpacity=".83" strokeWidth="2.5" strokeLinecap="round"/>
   <path d="M140 173 Q131 179 134 183 Q140 188 149 181" fill="#1b446a" stroke="#78bee4" strokeWidth="1.1"/>
   <path d="M119 193 Q130 198 140 198 Q153 197 164 193" stroke="#b4ddef" strokeWidth="2" strokeLinecap="round" fill="none"/>
   <path d="M129 205 Q141 211 153 205" stroke="#35648b" strokeWidth="1.2" fill="none"/>
   {/* Eyes + brows: lighting is static even with reduced motion */}
   <path d="M99 115 Q116 107 132 112 M152 112 Q167 105 183 114" stroke="#092c53" strokeWidth="5" strokeLinecap="round" fill="none"/>
   <path d="M98 131 Q115 121 132 130 Q116 142 99 132Z" fill="#091f3a" stroke="#95cfee" strokeWidth="1.5"/>
   <path d="M152 130 Q168 120 185 130 Q168 142 153 131Z" fill="#071a32" stroke="#a7dff6" strokeWidth="1.5"/>
   <g className="albert3b-eye-glimmer">
     <ellipse cx="116" cy="131" rx="6.5" ry="8" fill="url(#albert3b-eye)"/>
     <ellipse cx="168" cy="131" rx="6.5" ry="8" fill="url(#albert3b-eye)"/>
     <circle cx="118" cy="128" r="2" fill="#e2faff"/><circle cx="170" cy="128" r="2" fill="#f5ffff"/>
   </g>
   <path d="M100 125 Q115 121 132 128 M153 128 Q170 120 185 125" stroke="#b8f3ff" strokeOpacity=".65" strokeWidth="1.7" fill="none"/>
   <path d="M98 139 Q115 146 132 139 M152 139 Q167 145 184 139" fill="none" stroke="#5ab6ed" strokeOpacity=".65" strokeWidth="1.1"/>
   {/* Angular, sculpted hairline and separated forelock */}
   <path d="M86 104 Q74 64 99 38 Q116 23 141 23 Q174 22 197 51 Q204 68 198 106 Q188 82 174 68 Q160 59 149 54 Q131 75 105 79 Q95 91 86 104Z" fill="url(#albert3b-hair)" stroke="#3b87bd" strokeWidth="2"/>
   <path d="M115 47 Q145 37 165 45 Q183 52 191 68" fill="none" stroke="#9bdbed" strokeOpacity=".36" strokeWidth="2.3"/>
   <path d="M95 53 Q88 70 89 91 Q104 78 117 67" fill="none" stroke="#d2aa76" strokeWidth="1.4" strokeOpacity=".82"/>
   <path d="M181 51 Q197 67 195 95 L188 107" stroke="#5ce1ff" strokeOpacity=".68" strokeWidth="2.1" fill="none"/>
   {/* Subtle wearable electronics: non-biometric decorative details */}
   <path d="M85 116 L72 119 L71 154 L87 163" fill="none" stroke="#60d5fa" strokeWidth="3"/>
   <path d="M193 116 L207 119 L208 154 L191 161" fill="none" stroke="#7dcfff" strokeWidth="3"/>
   <rect x="68" y="137" width="7" height="13" rx="3" fill="#0d365e" stroke="#e6c18a" strokeWidth="1.4"/>
   <rect x="205" y="137" width="7" height="13" rx="3" fill="#0d365e" stroke="#e6c18a" strokeWidth="1.4"/>
   <circle cx="71" cy="143" r="2.6" fill="#d6f6ff"/><circle cx="208" cy="144" r="2.6" fill="#ffe2b8"/>
   <path d="M75 172 L84 201 L110 225 M203 171 L192 201 L170 225" fill="none" stroke="#45c7ff" strokeOpacity=".44" strokeWidth="1.2"/>
   <path d="M119 244 L141 257 L164 243" fill="none" stroke="#e0be89" strokeWidth="1.5" strokeOpacity=".85"/>
   <circle cx="141" cy="286" r="9" fill="#061c31" stroke="#e6c18a" strokeWidth="1.6"/>
   <path d="M138 281 L144 281 M137 285 L145 285 M138 289 L144 289" stroke="#9bddfa" strokeWidth="1.3" strokeLinecap="round"/>
   <path d="M25 318 H252" stroke="#7ddaff" strokeWidth="1.7" strokeOpacity=".7"/>
  </svg>
  <span className="albert3b-orbit albert3b-orbit-one"/>
  <span className="albert3b-orbit albert3b-orbit-two"/>
 </div>;
}
