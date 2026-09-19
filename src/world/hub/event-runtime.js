function hash(input){let h=2166136261;for(let i=0;i<input.length;i+=1){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function isHubEventActive(event,context={}){
 const hour=Number.isFinite(context.hour)?context.hour:12,day=Number.isFinite(context.day)?context.day:1,trigger=event.trigger||'';
 if(trigger==='daily')return true;
 if(trigger==='weekly')return day===0||day===6;
 if(trigger==='evening')return hour>=18&&hour<24;
 if(trigger==='night')return hour>=20||hour<6;
 if(trigger==='random_safe')return hash(String(context.dateKey||'day')+event.id)%3===0;
 if(trigger==='story_progress')return !!context.storyProgress;
 if(trigger==='story_flag')return !!context.storyFlag;
 if(trigger.startsWith('weather:'))return context.weather===trigger.slice(8);
 return false;
}
export function activeHubEvents(events,context){return events.filter((event)=>isHubEventActive(event,context));}
