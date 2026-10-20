import type { AppData, TeacherTask } from './types'
import { blankTask } from './taskDates'
export function calendarTaskDraft(date:string,notice=false){return{...blankTask(notice),date,scheduleType:'dated' as const}}
export function appendCalendarTask(data:AppData,kind:'work'|'homeroom',task:TeacherTask){const key=kind==='work'?'tasks':'notices';return{teacherDesk:{...data.teacherDesk,[key]:[...data.teacherDesk[key],task]}}}
