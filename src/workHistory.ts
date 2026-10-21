import type { AppData, WorkRecord } from './types'
export type WorkHistoryEntry=WorkRecord & {kind:'record'|'completed'}
export function workHistoryEntries(data:AppData):WorkHistoryEntry[]{
 const records=(data.teacherDesk.workRecords||[]).map(record=>({...record,kind:'record' as const}))
 const completed=data.teacherDesk.tasks.filter(task=>task.done).map(task=>({id:task.id,title:task.title,date:task.endDate||task.date||'',category:task.category||'',content:task.note||'',link:task.link||'',kind:'completed' as const}))
 return [...records,...completed].sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title,'ko'))
}
