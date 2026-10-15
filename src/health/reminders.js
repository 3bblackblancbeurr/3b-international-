import { localDay } from './model.js';

export const REMINDER_OPTIONS = [
  {id:'wake',label:'Mon moment au réveil',time:'08:00'},
  {id:'move',label:'Ma pause mouvement',time:'14:00'},
  {id:'rest',label:'Mon moment avant le repos',time:'21:30'},
];
export function validReminderTime(time) { return typeof time==='string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time); }
export function normalizeReminders(values) {
  if(!Array.isArray(values))return [];
  const seen=new Set();
  return values.filter(item=>item && REMINDER_OPTIONS.some(option=>option.id===item.id) && validReminderTime(item.time) && !seen.has(item.id) && seen.add(item.id)).map(item=>({id:item.id,time:item.time,title:'Un moment pour toi · 3B',body:'Retrouve ton espace Santé quand tu le souhaites.'}));
}
export function reminderCalendar(reminders, now=new Date()) {
  const values=normalizeReminders(reminders);
  if(!values.length)throw new Error('Choisis au moins un rappel avec une heure valide.');
  const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//3B International//Moments personnels//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  for(const item of values){
    const date=new Date(now),[h,m]=item.time.split(':').map(Number);date.setHours(h,m,0,0);if(date<=now)date.setDate(date.getDate()+1);
    const start=localDay(date).replace(/-/g,'')+'T'+item.time.replace(':','')+'00';
    lines.push('BEGIN:VEVENT',`UID:threeb-moment-${item.id}@3b-international.vercel.app`,`DTSTAMP:${stamp}`,`DTSTART:${start}`,'DURATION:PT5M','RRULE:FREQ=DAILY;COUNT=30','SUMMARY:Un moment pour toi - 3B','DESCRIPTION:Retrouve ton espace personnel 3B.','URL:https://3b-international.vercel.app/#sante','TRANSP:TRANSPARENT','BEGIN:VALARM','TRIGGER:PT0S','ACTION:DISPLAY','DESCRIPTION:Un moment pour toi - 3B','END:VALARM','END:VEVENT');
  }
  return lines.concat('END:VCALENDAR','').join('\r\n');
}
