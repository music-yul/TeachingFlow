import type { AppData, Session } from './types'
import { effectiveLessonIds, progressKey } from './schedule'
export function calendarLessonMemoText(data:AppData,session:Session){
 return [data.overrides[session.id]?.memo,...effectiveLessonIds(session).flatMap(id=>[data.lessons.find(lesson=>lesson.id===id)?.note,data.progress[progressKey(session.classId,id)]?.memo])].filter(Boolean).join(' · ')
}
export function saveCalendarLessonMemos(data:AppData,session:Session,memos:Record<string,string>,sessionMemo:string):Partial<AppData>{
 const progress={...data.progress}
 for(const id of effectiveLessonIds(session)){
  const key=progressKey(session.classId,id)
  progress[key]={...progress[key],memo:memos[id]?.trim()||''}
 }
 return {progress,overrides:{...data.overrides,[session.id]:{...data.overrides[session.id],memo:sessionMemo.trim()}}}
}
