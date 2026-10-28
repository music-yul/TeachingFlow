import type {AppData} from './types'
import type {DashboardItem} from './components/FlexibleDashboard'
export function journalEntries(data:AppData,item:DashboardItem,today:string){
 const date=new Date(`${today}T12:00:00`)
 const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
 const daysAgo=(days:number)=>{const d=new Date(date);d.setDate(d.getDate()-days);return key(d)}
 const mode=item.journalPeriod||'all'
 let start='',end=today
 if(mode==='yesterday')start=end=daysAgo(1)
 else if(mode==='today')start=today
 else if(mode==='week')start=daysAgo((date.getDay()+6)%7)
 else if(mode==='7days')start=daysAgo(6)
 else if(mode==='30days')start=daysAgo(29)
 else if(mode==='custom')start=daysAgo(Math.max(1,Math.min(365,Math.round(item.journalDays||7)))-1)
 const entries=Object.values(data.lessonJournal||{}).filter(e=>(!item.classId||e.classId===item.classId)&&(!item.journalRecordedOnly||Boolean(e.record?.trim()))&&e.date<=end&&(!start||e.date>=start)).sort((a,b)=>b.date.localeCompare(a.date)||b.period-a.period)
 if(mode!=='last')return entries
 const seen=new Set<string>()
 return entries.filter(e=>{if(seen.has(e.classId))return false;seen.add(e.classId);return true})
}
