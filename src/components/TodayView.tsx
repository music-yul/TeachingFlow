import { getTodayActions } from '../todayActions'
import type { SummaryKind } from '../todayActions'
import { collectionMembers } from '../members'
import SummaryDialog from './SummaryDialog'
import { useState } from 'react'
import type { ReactNode } from 'react'
import FlexibleDashboard from './FlexibleDashboard'
import {getWidgetPreview} from '../widgetPreview'
import { taskDeadline } from '../taskDates'
import type { AppData, HomeWidget, Session } from '../types'
import TodayLessonsWidget from './TodayLessonsWidget'
import { todayKey } from '../schedule'
import { widgetData, widgetOptions } from '../widgetPreferences'
import TimetableWidget from './TimetableWidget'
import CalendarView from './CalendarView'
import { isTaskOverdue, taskDateLabel } from '../taskDates'

type Props = { data: AppData; sessions: Session[]; update: (change: Partial<AppData>) => void; onSelect: (id: string) => void; onNavigate: (tab: '담임' | '업무' | '교과' | '동아리', reference?:string) => void }
const taskSort = (a: {date: string}, b: {date: string}) => (a.date || '9999').localeCompare(b.date || '9999')
const dueText = (date: string, today: string) => !date ? '기한 없음' : date < today ? `${date} · 기한 지남` : date === today ? '오늘' : date
export default function TodayView({ data, sessions, update, onSelect, onNavigate }: Props) {
  const [summaryOpen,setSummaryOpen]=useState<SummaryKind|null>(null)
  const desk = data.teacherDesk
  const today = todayKey()
  const patch = (change: Partial<typeof desk>) => update({ teacherDesk: { ...desk, ...change } })
  const actions=getTodayActions(data,today)
  const todayNotices=actions.notices.sort(taskSort)
  const summaryTasks=actions.tasks.sort(taskSort)
  const upcomingCollections=desk.collections.filter(item=>!item.archived)
  const pendingRecords=actions.followups
  const widgetViews: Record<HomeWidget, ReactNode> = {
    timetable: null,
    summary: (<div className="desk-stats home-wide">{data.settings.features.homeroom&&<><button onClick={()=>setSummaryOpen('notices')}><strong>{todayNotices.length}</strong> 안내할 일</button><button onClick={()=>setSummaryOpen('collections')}><strong>{actions.collections.length}</strong> 취합 확인</button></>}{data.settings.features.work&&<button onClick={()=>setSummaryOpen('tasks')}><strong>{summaryTasks.length}</strong> 업무 확인</button>}{data.settings.features.homeroom&&<button onClick={()=>setSummaryOpen('followups')}><strong>{pendingRecords.length}</strong> 후속 확인</button>}</div>),
    calendar: null,
    lessons: (<TodayLessonsWidget data={data} sessions={sessions} update={update} onSelect={onSelect}/>),
    notices: (<section className="desk-card home-info-widget"><div className="desk-heading widget-heading"><h2>담임 안내</h2><button className="link-button widget-manage-link" onClick={()=>onNavigate('담임')}>관리</button></div>{todayNotices.map(item => <label className="desk-summary" key={item.id}><input type="checkbox" checked={item.done} onChange={e => patch({ notices: desk.notices.map(n => n.id === item.id ? { ...n, done: e.target.checked } : n) })} /><span><span className="widget-summary-title">{item.important?'★ ':''}{item.title}</span><small className={isTaskOverdue(item,today,true)?'desk-overdue':''}>{taskDateLabel(item,true)}</small></span></label>)}{!todayNotices.length && <p className="hint">오늘 안내할 내용이 없습니다.</p>}</section>),
    collections: (<section className="desk-card home-info-widget"><div className="desk-heading widget-heading"><h2>제출 현황</h2><button className="link-button widget-manage-link" onClick={()=>onNavigate('담임')}>관리</button></div>{upcomingCollections.map(item => { const targets = collectionMembers(desk,item,today); const missing = targets.filter(s => !item.received.includes(s.id)); return <details key={item.id} className="desk-item"><summary>{item.important?'★ ':''}{item.title} · {targets.length - missing.length}/{targets.length}명 제출 <span className={item.date && item.date < today && missing.length ? 'desk-overdue' : 'hint'}>{dueText(item.date, today)}</span></summary><p>{missing.length ? `미제출: ${missing.map(s => `${s.number} ${s.name}`).join(', ')}` : '모두 제출했습니다.'}</p></details> })}{!upcomingCollections.length && <p className="hint">진행 중인 제출 항목이 없습니다.</p>}</section>),
    tasks: (<section className="desk-card home-info-widget"><div className="desk-heading widget-heading"><h2>오늘의 할 일</h2><button className="link-button widget-manage-link" onClick={()=>onNavigate('업무')}>관리</button></div>{summaryTasks.map(item => <label className="desk-summary" key={item.id}><input type="checkbox" checked={item.done} onChange={e => patch({ tasks: desk.tasks.map(t => t.id === item.id ? { ...t, done: e.target.checked } : t) })} /><span><span className="widget-summary-title">{item.important?'★ ':''}{item.title}</span><small className={isTaskOverdue(item,today) ? 'desk-overdue' : ''}>{taskDateLabel(item)}{item.category && ` · ${item.category}`}</small></span></label>)}{!summaryTasks.length && <p className="hint">오늘 할 일이 없습니다.</p>}</section>),
    followups: (<section className="desk-card home-info-widget"><div className="desk-heading widget-heading"><h2>후속 확인</h2><button className="link-button widget-manage-link" onClick={()=>onNavigate('담임')}>관리</button></div><p className={pendingRecords.length?undefined:'hint'}>{pendingRecords.length ? `오늘 확인할 기록 ${pendingRecords.length}건이 있습니다.` : '오늘 확인할 기록이 없습니다.'}</p></section>),
  }
  return <>
    {summaryOpen&&<SummaryDialog data={data} update={update} date={today} kind={summaryOpen} onClose={()=>setSummaryOpen(null)}/>}
    <FlexibleDashboard data={data} update={update} preview={item=>getWidgetPreview(data,sessions,item)} render={(item,changeItem,closeExpanded)=>{
      const scoped=widgetData(data,item.options)
      const updateScoped:Props['update']=change=>{
        if(change.workspacePreferences){changeItem({options:widgetOptions(change.workspacePreferences)});const remaining={...change};delete remaining.workspacePreferences;if(Object.keys(remaining).length)update(remaining)}else update(change)
      }
      const select=(id:string)=>{closeExpanded();onSelect(id)}
      if(item.kind==='summary')return <div className="desk-stats home-wide">{data.settings.features.homeroom&&<><button onClick={()=>{closeExpanded();setSummaryOpen('notices')}}><strong>{todayNotices.length}</strong> 안내</button><button onClick={()=>{closeExpanded();setSummaryOpen('collections')}}><strong>{actions.collections.length}</strong> 제출</button></>}{data.settings.features.work&&<button onClick={()=>{closeExpanded();setSummaryOpen('tasks')}}><strong>{summaryTasks.length}</strong> 할 일</button>}{data.settings.features.homeroom&&<button onClick={()=>{closeExpanded();setSummaryOpen('followups')}}><strong>{pendingRecords.length}</strong> 후속 확인</button>}</div>
      if(item.kind==='calendar')return <HomeCalendarWidget data={scoped} sessions={sessions} update={updateScoped} onSelect={select} onNavigate={onNavigate}/>

      if(item.kind==='timetable')return <TimetableWidget data={scoped} sessions={sessions} height={Math.max(1,Math.round(item.h/2))}/>
      if(item.kind==='lessons')return <TodayLessonsWidget data={scoped} sessions={sessions.filter(s=>!item.classId||s.classId===item.classId)} update={updateScoped} onSelect={select}/>
      if(item.kind==='progress')return <div>{data.classes.filter(c=>!c.archived&&(!item.classId||c.id===item.classId)).map(c=>{const list=sessions.filter(s=>s.classId===c.id&&!s.cancelled&&!s.hidden);const assigned=list.filter(s=>s.lessonIds.length).length;return <div className="fd-list-row" key={c.id}><button className="link-button" onClick={()=>onNavigate('교과')}>{c.name}</button><small>수업 배정 {assigned}/{list.length}시간 · {data.subjects.find(s=>s.id===c.subjectId)?.name}</small></div>})}{!data.classes.some(c=>!c.archived)&&<p className="hint">교과에서 학급을 등록하세요.</p>}</div>
      if(item.kind==='deadlines'){const tasks=desk.tasks.filter(t=>!t.done&&taskDeadline(t)).sort((a,b)=>taskDeadline(a).localeCompare(taskDeadline(b)));return <div>{tasks.map(t=><label className="desk-summary" key={t.id}><input type="checkbox" checked={t.done} onChange={e=>patch({tasks:desk.tasks.map(old=>old.id===t.id?{...old,done:e.target.checked}:old)})}/><span>{t.title}<small>{taskDeadline(t)}{taskDeadline(t)<today?' · 기한 지남':''}</small></span></label>)}{!tasks.length&&<p className="hint">미완료 마감 업무가 없습니다.</p>}</div>}
      if(item.kind==='journal'){const entries=Object.values(data.lessonJournal||{}).filter(e=>!item.classId||e.classId===item.classId).sort((a,b)=>b.date.localeCompare(a.date)||b.period-a.period);return <div>{entries.map(e=><div className="fd-list-row" key={e.sessionId}><button className="link-button" onClick={()=>select(e.sessionId)}>{e.date} · {e.period}교시 · {data.classes.find(c=>c.id===e.classId)?.name}</button><div>{e.lessonTitle}</div><small>{e.record}</small></div>)}{!entries.length&&<p className="hint">저장된 수업 기록이 없습니다.</p>}</div>}
      if(item.kind==='memo'||item.kind==='links')return null
      return widgetViews[item.kind]
    }}/>
  </>
}

function HomeCalendarWidget({data,sessions,update,onSelect,onNavigate}:Props){
 const [anchor,setAnchor]=useState(()=>new Date())
 return <div className="home-wide"><CalendarView context="home" data={data} sessions={sessions} month={anchor} setMonth={setAnchor} onSelect={onSelect} update={update} onOpenArea={onNavigate}/></div>
}
