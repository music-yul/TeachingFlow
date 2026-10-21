import { todayKey } from './schedule'
import type { TeacherTask } from './types'

export function taskKind(task: TeacherTask) { return task.scheduleType || (task.date ? 'deadline' : 'todo') }
export function taskDeadline(task: TeacherTask, notice = false) {
  if(notice) return task.endDate || ''
  if(task.showDeadline !== undefined) return task.showDeadline ? task.deadlineDate || (taskKind(task)==='period'?task.endDate||task.date:task.date) || '' : ''
  return taskKind(task)==='period' ? task.endDate || task.date : taskKind(task)==='deadline' ? task.date : ''
}
export function taskCoversDate(task: TeacherTask, date: string, notice = false) {
  if(!notice && taskDeadline(task)===date) return true
  if(!notice&&taskKind(task)==='period'&&task.excludeWeekends){const day=new Date(date+'T12:00:00').getDay();if(day===0||day===6)return false}
  if(!task.date || (!notice && taskKind(task)==='todo')) return false
  const end=notice||taskKind(task)==='period'?task.endDate||task.date:task.date
  return date>=task.date && date<=end
}
export function taskDateLabel(task: TeacherTask, notice = false) {
  if(notice) return `안내 ${task.date||'미지정'}${task.endDate?` · 마감 ${task.endDate}`:''}`
  const dates=taskKind(task)==='todo'?'날짜 미정':taskKind(task)==='period'?`${task.date} ~ ${task.endDate||task.date}`:task.date||'날짜 미정'
  const deadline=taskDeadline(task)
  return dates+(taskKind(task)==='period'&&task.excludeWeekends?' · 주말 제외':'')+(deadline?deadline===(taskKind(task)==='period'?task.endDate||task.date:task.date)?' · 마감':` · 마감 ${deadline}`:'')
}
export function isTaskOverdue(task: TeacherTask, today: string, notice = false) {const date=taskDeadline(task,notice);return !task.done&&Boolean(date&&date<today)}
export const blankTask = (notice = false): TeacherTask => ({id:'',title:'',date:todayKey(),endDate:'',scheduleType:notice?undefined:'dated',showDeadline:false,deadlineDate:'',done:false,category:'',note:'',link:''})
/** Older separate deadlines remain readable; editing maps them onto the date/range. */
export function taskForEditing(task:TeacherTask):TeacherTask {
 const deadline=taskDeadline(task)
 const last=taskKind(task)==='period'?task.endDate||task.date:task.date
 if(deadline&&deadline!==last){
  const start=task.date&&task.date<deadline?task.date:deadline
  const previous=(task.date&&task.date>deadline)||(taskKind(task)==='period'&&task.endDate&&task.endDate!==deadline)
    ? `이전 일정: ${task.date}${task.endDate?` ~ ${task.endDate}`:''} · 마감 ${deadline}`:''
  return {...task,date:start,endDate:start===deadline?'':deadline,scheduleType:start===deadline?'dated':'period',showDeadline:true,deadlineDate:'',note:[task.note,previous].filter(Boolean).join('\n')}
 }
 return {...task,scheduleType:taskKind(task)==='period'?'period':task.date?'dated':'todo',showDeadline:Boolean(deadline),deadlineDate:''}
}
