import type { AppData, LessonJournalEntry,Session } from './types'
import { sessionLabel } from './schedule'
const order=(a:{date:string;period:number},b:{date:string;period:number})=>a.date.localeCompare(b.date)||a.period-b.period
/** Follow the next actual lesson of this class and subject, including makeup lessons. */
export function nextLessonFor(entry:Pick<LessonJournalEntry,'date'|'period'|'classId'|'subjectId'|'sessionId'>,sessions:Session[]){
 return sessions.filter(s=>s.classId===entry.classId&&s.subjectId===entry.subjectId&&s.id!==entry.sessionId&&!s.cancelled&&!s.hidden&&s.mode!=='none'&&order(s,entry)>0).sort(order)[0]
}
export function incomingLessonMemos(data:AppData,session:Session,sessions:Session[]){
 return Object.values(data.lessonJournal||{}).filter(entry=>entry.nextMemo.trim()&&nextLessonFor(entry,sessions)?.id===session.id).sort(order)
}
export function saveLessonJournal(data:AppData,session:Session,change:Partial<Pick<LessonJournalEntry,'record'|'nextMemo'>>):Partial<AppData>{
 const previous=data.lessonJournal?.[session.id]
 const entry:LessonJournalEntry={sessionId:session.id,date:session.date,period:session.period,classId:session.classId,subjectId:session.subjectId,record:'',nextMemo:'',...previous,...change,lessonTitle:sessionLabel(data,session)}
 return {lessonJournal:{...data.lessonJournal,[session.id]:entry}}
}

/** Resolve the current plan title; retain the snapshot if its session was removed. */
export function journalLessonTitle(data:AppData,entry:LessonJournalEntry,sessions:Session[]){
 const session=sessions.find(s=>s.id===entry.sessionId)
 return session?sessionLabel(data,session):entry.lessonTitle
}
