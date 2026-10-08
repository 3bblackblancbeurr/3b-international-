/** Browser voice casting for accessible French narration.
 * This ranks the voices installed on the user's device; it does not manufacture
 * or claim recorded actors. The script and subtitles remain authoritative. */
const hash=value=>{let n=2166136261;for(const char of String(value||'')){n^=char.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
const languageTag=value=>String(value||'').toLowerCase().replaceAll('_','-');
export function rankWorldVoice(voice,lang='fr-FR'){
 const language=languageTag(voice?.lang),wanted=languageTag(lang),family=wanted.split('-')[0];
 if(!language||!language.startsWith(family))return -Infinity;
 const name=String(voice?.name||'').toLowerCase();
 return (language===wanted?4:1)+(voice?.localService?1:0)+(voice?.default?0.5:0)
  +(/natural|neural|enhanced|premium|wavenet|studio/.test(name)?5:0)
  +(/google|microsoft|samsung|apple/.test(name)?1:0)
  -(/espeak|compact|basic|legacy/.test(name)?3:0);
}
export function pickWorldVoice(voices=[],{character='narrator',lang='fr-FR'}={}){
 const candidates=(Array.isArray(voices)?voices:[]).map(voice=>({voice,score:rankWorldVoice(voice,lang)}))
  .filter(row=>Number.isFinite(row.score)).sort((a,b)=>b.score-a.score||String(a.voice.name).localeCompare(String(b.voice.name)));
 if(!candidates.length)return null;
 const top=candidates[0].score;
 const cast=candidates.filter(row=>row.score>=top-1.5).slice(0,6);
 return cast[character==='narrator'?0:hash(character)%cast.length].voice;
}
export function worldVoiceProsody(character='narrator'){
 if(character==='narrator')return {rate:.93,pitch:.91};
 const n=hash(character);
 // Restrained differences: avoid exaggerated "robot" pitch shifts.
 return {rate:.94+(n%7)*.01,pitch:.94+((n>>>5)%9)*.012};
}
