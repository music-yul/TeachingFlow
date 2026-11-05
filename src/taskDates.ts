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
/** 기간 업무는 날마다 따로 체크한다. 하루짜리·날짜 미정 업무는 기존처럼 전체 완료 하나만 쓴다. */
export function isDailyCheckTask(task: TeacherTask) { return taskKind(task)==='period' }
/** 그 날짜 기준으로 완료인지. 기간 업무는 전체 완료이거나 그날 체크했으면 완료. */
export function taskDoneOn(task: TeacherTask, date: string) { return task.done || (isDailyCheckTask(task) && (task.doneDates||[]).includes(date)) }
/** 날짜 기준 체크. 기간 업무는 그날만 체크하고, 나머지는 전체 완료를 바꾼다. */
export function toggleTaskOn(task: TeacherTask, date: string, checked: boolean): TeacherTask {
  if(!isDailyCheckTask(task)) return {...task,done:checked}
  const rest=(task.doneDates||[]).filter(value=>value!==date)
  return {...task,doneDates:checked?[...rest,date].sort():rest}
}
/** 기간 업무의 일일 체크 현황(주말 제외 설정 반영). */
export function taskDailyProgress(task: TeacherTask) {
  if(!isDailyCheckTask(task)||!task.date) return null
  const end=task.endDate||task.date
  let total=0
  for(const cursor=new Date(task.date+'T12:00:00');;cursor.setDate(cursor.getDate()+1)){
    const key=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`
    if(key>end||total>1000) break
    const day=cursor.getDay()
    if(!(task.excludeWeekends&&(day===0||day===6))) total++
  }
  const checked=(task.doneDates||[]).filter(date=>date>=task.date&&date<=end).length
  return {checked,total}
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
