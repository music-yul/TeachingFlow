import {journalLessonTitle} from './lessonJournal'
import {journalEntries} from './journalFilter'
import type {AppData,Session} from './types'
import type {DashboardItem} from './components/FlexibleDashboard'
import {getTodayActions} from './todayActions'
import {todayKey,coversDate} from './schedule'
import {calendarSources} from './calendarSources'
import {deskCalendarItems} from './workspace'
import {taskDeadline} from './taskDates'
import {collectionMembers} from './members'
import {holidayName} from './holidays'
import {widgetData} from './widgetPreferences'
export type WidgetPreview={value:string;label:string;detail:string}
export function getWidgetPreview(data:AppData,sessions:Session[],item:DashboardItem):WidgetPreview{
 const today=todayKey(),actions=getTodayActions(data,today),scoped=widgetData(data,item.options)
 const lessons=sessions.filter(s=>s.date===today&&!s.cancelled&&!s.hidden&&(!item.classId||s.classId===item.classId)).sort((a,b)=>a.period-b.period)
 const lessonText=lessons.map(s=>`${s.period}교시 ${data.classes.find(c=>c.id===s.classId)?.name||''}`).join(' · ')
 const count=(n:number,label:string,detail:string):WidgetPreview=>({value:String(n),label,detail})
 switch(item.kind){
 case 'summary':return count(actions.notices.length+actions.collections.length+actions.tasks.length+actions.followups.length,'확인 요약',`안내 ${actions.notices.length} · 제출 ${actions.collections.length} · 할 일 ${actions.tasks.length} · 후속 ${actions.followups.length}`)
 case 'lessons':return count(lessons.length,'오늘 수업',lessonText||'오늘 수업이 없습니다.')
 case 'timetable':return count(lessons.length,'오늘 시간표',lessonText||'오늘 수업이 없습니다.')
 case 'calendar':{
  const prefs=scoped.workspacePreferences.homeCalendar,sources=calendarSources(prefs)
  const events=sources.includes('school')?data.events.filter(e=>coversDate(e,today)).map(e=>e.title):[]
  const teaching=data.settings.features.teaching&&sources.includes('teaching')?lessons.map(s=>`${s.period}교시 ${data.classes.find(c=>c.id===s.classId)?.name||''}`):[]
  const blocks=data.settings.features.teaching&&sources.includes('teaching')?data.personalBlocks.filter(b=>b.date===today).map(b=>b.title):[]
  const memos=sources.includes('memo')?(data.dayNotes[today]||[]).map(n=>n.text):[]
  const holiday=sources.includes('school')&&data.settings.useHolidays!==false?holidayName(today):undefined
  const titles=[...(holiday?[holiday]:[]),...events,...teaching,...blocks,...deskCalendarItems(data,today,prefs).map(t=>t.title),...memos]
  return count(titles.length,'오늘 일정',`${today.slice(5).replace('-','/')} · ${titles.join(' · ')||'선택한 종류의 일정이 없습니다.'}`)
 }
 case 'tasks':return count(actions.tasks.length,'할 일',actions.tasks.map(t=>t.title).join(' · ')||'오늘 할 일이 없습니다.')
 case 'notices':return count(actions.notices.length,'안내',actions.notices.map(t=>t.title).join(' · ')||'오늘 안내할 내용이 없습니다.')
 case 'collections':{const pending=data.teacherDesk.collections.filter(c=>!c.archived&&collectionMembers(data.teacherDesk,c,today).some(s=>!c.received.includes(s.id)));return count(pending.length,'제출 확인',pending.map(c=>c.title).join(' · ')||'미제출 항목이 없습니다.')}
 case 'followups':return count(actions.followups.length,'후속 확인',actions.followups.length?'오늘 확인할 학생 기록이 있습니다.':'오늘 확인할 기록이 없습니다.')
 case 'deadlines':{const tasks=data.teacherDesk.tasks.filter(t=>!t.done&&taskDeadline(t)).sort((a,b)=>taskDeadline(a).localeCompare(taskDeadline(b)));return count(tasks.length,'마감 업무',tasks.map(t=>`${taskDeadline(t)} ${t.title}`).join(' · ')||'미완료 마감 업무가 없습니다.')}
 case 'progress':{const ids=data.classes.filter(c=>!c.archived&&(!item.classId||c.id===item.classId)).map(c=>c.id);const list=sessions.filter(s=>ids.includes(s.classId)&&!s.cancelled&&!s.hidden),assigned=list.filter(s=>s.lessonIds.length).length;return count(assigned,'수업 배정',`${list.length}시간 중 ${assigned}시간 배정 · ${ids.length}학급`)}
 case 'journal':{const entries=journalEntries(data,item,today);return count(entries.length,'수업 기록',entries[0]?`${entries[0].date} ${journalLessonTitle(data,entries[0],sessions)||entries[0].record}`:'저장된 수업 기록이 없습니다.')}
 case 'memo':return {value:item.text?.trim().split('\n')[0]||'빈 메모',label:'메모',detail:item.text||'눌러서 메모를 입력하세요.'}
 case 'links':return count((item.text?.match(/https?:\/\/[^\s]+/g)||[]).length,'바로가기',item.text||'눌러서 자료 링크를 입력하세요.')
 }
}
