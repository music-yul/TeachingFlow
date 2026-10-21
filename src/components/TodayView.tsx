import { getTodayActions } from '../todayActions'
import type { SummaryKind } from '../todayActions'
import { collectionMembers } from '../members'
import SummaryDialog from './SummaryDialog'
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AppData, HomeWidget, Session } from '../types'
import TodayLessonsWidget from './TodayLessonsWidget'
import { todayKey } from '../schedule'
import { availableHomeWidgets, orderedHomeLayout } from '../workspace'
import TimetableWidget from './TimetableWidget'
import CalendarView from './CalendarView'
import { isTaskOverdue, taskDateLabel } from '../taskDates'

type Props = { data: AppData; sessions: Session[]; update: (change: Partial<AppData>) => void; onSelect: (id: string) => void; onNavigate: (tab: '담임' | '업무' | '교과' | '동아리', reference?:string) => void }
const taskSort = (a: {date: string}, b: {date: string}) => (a.date || '9999').localeCompare(b.date || '9999')
const dueText = (date: string, today: string) => !date ? '기한 없음' : date < today ? `${date} · 기한 지남` : date === today ? '오늘' : date
export default function TodayView({ data, sessions, update, onSelect, onNavigate }: Props) {
  const [summaryOpen,setSummaryOpen]=useState<SummaryKind|null>(null)
  const [anchor, setAnchor] = useState(() => new Date())
  const desk = data.teacherDesk
  const today = todayKey()
  const layout = orderedHomeLayout(data.workspacePreferences.homeLayout).filter(item=>availableHomeWidgets(data).includes(item.id))
  const rowCount = Math.max(0, ...layout.map(item=>item.row+item.height))
  const rowSizes = `repeat(${rowCount}, ${ (112*10+12*9-12*11)/12 }px)`
  const patch = (change: Partial<typeof desk>) => update({ teacherDesk: { ...desk, ...change } })
  const actions=getTodayActions(data,today)
  const todayNotices=actions.notices.sort(taskSort)
  const summaryTasks=actions.tasks.sort(taskSort)
  const upcomingCollections=desk.collections.filter(item=>!item.archived)
  const pendingRecords=actions.followups
  const widgetViews: Record<HomeWidget, ReactNode> = {
    timetable: (<TimetableWidget data={data} sessions={sessions} height={layout.find(item=>item.id==='timetable')?.height}/>),
    summary: (<div className="desk-stats home-wide">{data.settings.features.homeroom&&<><button onClick={()=>setSummaryOpen('notices')}><strong>{todayNotices.length}</strong> 안내할 일</button><button onClick={()=>setSummaryOpen('collections')}><strong>{actions.collections.length}</strong> 취합 확인</button></>}{data.settings.features.work&&<button onClick={()=>setSummaryOpen('tasks')}><strong>{summaryTasks.length}</strong> 업무 확인</button>}{data.settings.features.homeroom&&<button onClick={()=>setSummaryOpen('followups')}><strong>{pendingRecords.length}</strong> 학생 후속 확인</button>}</div>),
    calendar: (<div className="home-wide"><CalendarView context="home" data={data} sessions={sessions} month={anchor} setMonth={setAnchor} onSelect={onSelect} update={update} onOpenArea={onNavigate} /></div>),
    lessons: (<TodayLessonsWidget data={data} sessions={sessions} update={update} onSelect={onSelect}/>),
    notices: (<section className="desk-card home-info-widget"><div className="desk-heading widget-heading"><h2>담임 안내</h2><button className="link-button widget-manage-link" onClick={()=>onNavigate('담임')}>관리</button></div>{todayNotices.map(item => <label className="desk-summary" key={item.id}><input type="checkbox" checked={item.done} onChange={e => patch({ notices: desk.notices.map(n => n.id === item.id ? { ...n, done: e.target.checked } : n) })} /><span><span className="widget-summary-title">{item.important?'★ ':''}{item.title}</span><small className={isTaskOverdue(item,today,true)?'desk-overdue':''}>{taskDateLabel(item,true)}</small></span></label>)}{!todayNotices.length && <p className="hint">오늘 안내할 내용이 없습니다.</p>}</section>),
    collections: (<section className="desk-card home-info-widget"><div className="desk-heading widget-heading"><h2>제출 현황</h2><button className="link-button widget-manage-link" onClick={()=>onNavigate('담임')}>관리</button></div>{upcomingCollections.map(item => { const targets = collectionMembers(desk,item,today); const missing = targets.filter(s => !item.received.includes(s.id)); return <details key={item.id} className="desk-item"><summary>{item.important?'★ ':''}{item.title} · {targets.length - missing.length}/{targets.length}명 제출 <span className={item.date && item.date < today && missing.length ? 'desk-overdue' : 'hint'}>{dueText(item.date, today)}</span></summary><p>{missing.length ? `미제출: ${missing.map(s => `${s.number} ${s.name}`).join(', ')}` : '모두 제출했습니다.'}</p></details> })}{!upcomingCollections.length && <p className="hint">진행 중인 제출 항목이 없습니다.</p>}</section>),
    tasks: (<section className="desk-card home-info-widget"><div className="desk-heading widget-heading"><h2>오늘의 할 일</h2><button className="link-button widget-manage-link" onClick={()=>onNavigate('업무')}>관리</button></div>{summaryTasks.map(item => <label className="desk-summary" key={item.id}><input type="checkbox" checked={item.done} onChange={e => patch({ tasks: desk.tasks.map(t => t.id === item.id ? { ...t, done: e.target.checked } : t) })} /><span><span className="widget-summary-title">{item.important?'★ ':''}{item.title}</span><small className={isTaskOverdue(item,today) ? 'desk-overdue' : ''}>{taskDateLabel(item)}{item.category && ` · ${item.category}`}</small></span></label>)}{!summaryTasks.length && <p className="hint">오늘 할 일이 없습니다.</p>}</section>),
    followups: (<section className="desk-card home-info-widget"><div className="desk-heading widget-heading"><h2>학생 후속 확인</h2><button className="link-button widget-manage-link" onClick={()=>onNavigate('담임')}>관리</button></div><p className={pendingRecords.length?undefined:'hint'}>{pendingRecords.length ? `오늘 확인할 기록 ${pendingRecords.length}건이 있습니다.` : '오늘 확인할 기록이 없습니다.'}</p></section>),
  }
  return <>
    {summaryOpen&&<SummaryDialog data={data} update={update} date={today} kind={summaryOpen} onClose={()=>setSummaryOpen(null)}/>}
    {!layout.length && <p className="banner">환경 설정 → 메인화면에서 표시할 위젯을 추가하세요.</p>}
    <div className="home-widget-grid" style={{gridTemplateRows:rowSizes}}>{layout.map(item => <div className={`home-widget home-widget-${item.id}`} key={item.id} style={{ gridColumn: `${item.column+1} / span ${item.width}`, gridRow: `${item.row+1} / span ${item.height}`, '--widget-rows': item.height } as CSSProperties}>{widgetViews[item.id]}</div>)}</div>
  </>
}
