import { todayKey } from './schedule'
import type { TeacherTask } from './types'

export function taskKind(task: TeacherTask) { return task.scheduleType || (task.date ? 'deadline' : 'todo') }
export function taskDeadline(task: TeacherTask, notice = false) {
  if(notice) return task.endDate || ''
  if(task.showDeadline !== undefined) return task.showDeadline ? task.deadlineDate || '' : ''
  return taskKind(task)==='period' ? task.endDate || task.date : taskKind(task)==='deadline' ? task.date : ''
}
export function taskCoversDate(task: TeacherTask, date: string, notice = false) {
  if(!notice && taskDeadline(task)===date) return true
  if(!task.date || (!notice && taskKind(task)==='todo')) return false
  const end=notice||taskKind(task)==='period'?task.endDate||task.date:task.date
  return date>=task.date && date<=end
}
export function taskDateLabel(task: TeacherTask, notice = false) {
  if(notice) return `안내 ${task.date||'미지정'}${task.endDate?` · 마감 ${task.endDate}`:''}`
  const dates=taskKind(task)==='todo'?'날짜 미정':taskKind(task)==='period'?`${task.date} ~ ${task.endDate||task.date}`:task.date||'날짜 미정'
  const deadline=taskDeadline(task)
  return dates+(deadline?` · 마감 ${deadline}`:'')
}
export function isTaskOverdue(task: TeacherTask, today: string, notice = false) {const date=taskDeadline(task,notice);return !task.done&&Boolean(date&&date<today)}
export const blankTask = (notice = false): TeacherTask => ({id:'',title:'',date:todayKey(),endDate:'',scheduleType:notice?undefined:'dated',showDeadline:false,deadlineDate:'',done:false,category:'',note:'',link:''})
/** 기존 마감·기간 업무를 편집할 때도 등록된 마감일을 보존한다. */
export function taskForEditing(task:TeacherTask):TeacherTask {
  const deadline=taskDeadline(task)
  return {...task,scheduleType:taskKind(task)==='period'?'period':task.date?'dated':'todo',showDeadline:Boolean(deadline),deadlineDate:deadline}
}
