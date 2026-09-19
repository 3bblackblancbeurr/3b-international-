function hash(input){let h=2166136261;for(let i=0;i<input.length;i+=1){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function hubWeatherFor(date=new Date()){
 const block=Math.floor(date.getHours()/4),key=date.toISOString().slice(0,10)+':'+block,value=hash(key)%100;
 if(value<12)return 'fog';
 if(value<25)return 'heavy_rain';
 if(value<48)return 'rain';
 return 'clear';
}
