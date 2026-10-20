import type { AppData, Club, Day, Slot } from './types'
import { DAYS } from './types'
import { coversDate, dateKey, parseDate } from './schedule'
import { holidayName } from './holidays'
export type ClubSchedule={kind:'regular'|'autonomous';slots:Slot[];dates:{date:string;period:number}[];startDate:string;endDate:string}
export function normalizeClubSchedule(saved?:Partial<ClubSchedule>):ClubSchedule{
 const validDate=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&dateKey(parseDate(v))===v
 const period=(v:number)=>Number.isInteger(v)&&v>=1&&v<=14
 const slots=(Array.isArray(saved?.slots)?saved.slots:[]).filter(s=>s&&DAYS.includes(s.day)&&period(s.period)).filter((s,i,a)=>a.findIndex(t=>t.day===s.day&&t.period===s.period)===i)
 const dates=(Array.isArray(saved?.dates)?saved.dates:[]).filter(s=>s&&validDate(s.date)&&period(s.period)).filter((s,i,a)=>a.findIndex(t=>t.date===s.date&&t.period===s.period)===i).sort((a,b)=>a.date.localeCompare(b.date)||a.period-b.period)
 return {kind:saved?.kind==='autonomous'?'autonomous':'regular',slots,dates,startDate:validDate(saved?.startDate)?saved!.startDate!:'',endDate:validDate(saved?.endDate)?saved!.endDate!:''}
}
export function clubMeetingsOn(data:AppData,club:Club,date:string):number[]{
 const s=normalizeClubSchedule(club.schedule),explicit=s.dates.filter(d=>d.date===date).map(d=>d.period)
 const from=s.startDate||data.settings.termStart,to=s.endDate||data.settings.termEnd
 if((from&&date<from)||(to&&date>to))return [...new Set(explicit)]
 const events=data.events.filter(e=>!e.classIds.length&&coversDate(e,date))
 if((data.settings.useHolidays!==false&&holidayName(date))||events.some(e=>e.type==='closed'))return [...new Set(explicit)]
 const swap=events.find(e=>e.type==='swap'&&e.sourceDay)
 const day=(swap?.sourceDay||['일','월','화','수','목','금','토'][parseDate(date).getDay()]) as Day
 const weekly=s.slots.filter(slot=>slot.day===day&&!events.some(e=>e.type==='blocked'&&(!e.periods.length||e.periods.includes(slot.period)))).map(slot=>slot.period)
 return [...new Set([...weekly,...explicit])].sort((a,b)=>a-b)
}
export function clubMeetingDates(data:AppData,club:Club,anchor:string):string[]{
 const s=normalizeClubSchedule(club.schedule),year=parseDate(anchor).getFullYear()
 const from=s.startDate||data.settings.termStart||`${year}-01-01`,to=s.endDate||data.settings.termEnd||`${year}-12-31`
 const dates=new Set(s.dates.map(d=>d.date)),cursor=parseDate(from)
 for(let i=0;i<740&&dateKey(cursor)<=to;i++,cursor.setDate(cursor.getDate()+1)){const key=dateKey(cursor);if(clubMeetingsOn(data,club,key).length)dates.add(key)}
 return [...dates].sort()
}
export function preferredClubDate(dates:string[],today:string){return dates.includes(today)?today:dates.filter(d=>d<today).at(-1)||dates.find(d=>d>today)||today}
export function clubTimetableEntries(data:AppData){
 if(!data.settings.features.clubs)return []
 const now=new Date(),sunday=new Date(now);sunday.setDate(now.getDate()-now.getDay());const end=new Date(sunday);end.setDate(end.getDate()+6)
 return data.clubs.flatMap(club=>{const s=normalizeClubSchedule(club.schedule),slots=[...s.slots,...s.dates.filter(d=>d.date>=dateKey(sunday)&&d.date<=dateKey(end)).map(d=>({day:['일','월','화','수','목','금','토'][parseDate(d.date).getDay()] as Day,period:d.period}))];return slots.filter((slot,i,a)=>DAYS.includes(slot.day)&&a.findIndex(t=>t.day===slot.day&&t.period===slot.period)===i).map(slot=>({...slot,club}))})
}
