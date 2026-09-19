function hash(input){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function worldWeatherForDate(region='hub',date=new Date()){
 const key=typeof date==='string'?date:date.toISOString().slice(0,10),v=hash(region+':'+key)%100;
 if(region==='estonie'){if(v<10)return'snow';if(v<26)return'fog';if(v<36)return'rain';return'clear';}
 if(region==='algerie'||region==='maroc'){if(v<6)return'storm';if(v<14)return'fog';if(v<22)return'rain';return'clear';}
 if(region==='tunisie'){if(v<8)return'storm';if(v<24)return'rain';if(v<32)return'fog';return'clear';}
 if(region==='france'||region==='hub'){if(v<8)return'storm';if(v<24)return'heavy_rain';if(v<42)return'rain';if(v<55)return'fog';return'clear';}
 if(v<7)return'storm';if(v<22)return'rain';if(v<33)return'fog';return'clear';
}
export const WEATHER_LABELS={clear:'Clair',rain:'Pluie',heavy_rain:'Forte pluie',fog:'Brouillard',snow:'Neige',storm:'Tempête'};
export function weatherProfile(weather){
 return {
  visibility:weather==='fog'?.58:weather==='storm'?.65:weather==='heavy_rain'?.74:weather==='rain'?.86:weather==='snow'?.82:1,
  precipitation:['rain','heavy_rain','snow','storm'].includes(weather),
  speed:weather==='snow'?2.5:weather==='rain'?11:weather==='heavy_rain'?17:weather==='storm'?23:0,
  opacity:weather==='snow'?.62:weather==='rain'?.3:weather==='heavy_rain'?.48:weather==='storm'?.62:0,
  wind:weather==='storm'?1:weather==='heavy_rain'?.68:weather==='rain'?.35:weather==='snow'?.18:.12,
 };
}
