import { taskDateLabel } from '../taskDates'
import WorkRecordDialog from './WorkRecordDialog'
import type { WorkRecord } from '../types'
import CalendarAddDialog from './CalendarAddDialog'
import { calendarItemStyle, schoolEventStyle, lessonLabelStyle } from '../calendarAppearance'
import { useRef, useState } from 'react'
import type { AppData, CalendarFilter, CalendarRange, PersonalBlock, Session } from '../types'
import { coversDate, dateKey, effectiveLessonIds, sessionLabel, todayKey } from '../schedule'
import { linkedEvaluation } from '../evaluation'
import { holidayName } from '../holidays'
import { makeId } from '../storage'
import { exportVisibleCalendarXlsx, printCurrentView } from '../exportPrint'

import { calendarDates, calendarPeriodLabel, deskCalendarItems, shiftCalendar } from '../workspace'

type Props = {
  context?: 'home' | 'schedule' | 'work' | 'school'
  onDateSelect?: (date: string) => void
  onTaskSelect?: (id: string) => void
  onOpenArea?: (area: '담임' | '업무' | '동아리', reference?:string) => void
  data: AppData
  sessions: Session[]
  month: Date
  setMonth: (value: Date) => void
  onSelect: (id: string) => void
  update: (change: Partial<AppData>) => void
}

export default function CalendarView({ data, sessions, month, setMonth, onSelect, update, context = 'schedule', onOpenArea, onDateSelect, onTaskSelect }: Props) {
  const [recordDraft,setRecordDraft]=useState<WorkRecord|null>(null)
  const [add,setAdd]=useState<{date:string;mode:'menu'|'work'|'homeroom'}|null>(null)
  const [noteDate, setNoteDate] = useState<string | null>(null)
  const [extraDate, setExtraDate] = useState<string | null>(null)
  const [editBlock, setEditBlock] = useState<PersonalBlock | null>(null)

  const preferenceKey = context === 'home' ? 'homeCalendar' : context === 'work' ? 'workCalendar' : 'scheduleCalendar'
  const preferences = context === 'home' ? data.workspacePreferences.homeCalendar : context === 'work' ? { ...data.workspacePreferences.workCalendar, filter: 'work' as const } : { ...data.workspacePreferences.scheduleCalendar, filter: 'teaching' as const }
  const homeMode=preferences.homeMode||'weeks'
  const range=context==='home'?(homeMode==='month'?'month':'week'):preferences.range
  const disabledFilter=(preferences.filter==='homeroom'&&!data.settings.features.homeroom)||(preferences.filter==='teaching'&&!data.settings.features.teaching)||(preferences.filter==='work'&&!data.settings.features.work)||(preferences.filter==='club'&&!data.settings.features.clubs)
  const filter=context==='school'?'teaching':disabledFilter?'all':preferences.filter
  const showCompleted=context==='work'||preferences.showCompleted
  const shownPreferences={...preferences,filter,showCompleted}
  const teaching = context!=='school' && data.settings.features.teaching && (filter === 'all' || filter === 'teaching')
  const weeks = context==='home' ? homeMode==='month'?undefined:homeMode==='week'?1:homeMode==='fortnight'?2:4 : context==='work'&&range!=='month'?Math.min(5,preferences.weekCount||(range==='fortnight'?2:1)):undefined
  const showWeekends=preferences.showWeekends!==false
  const cells = calendarDates(month, range, weeks).filter(date=>showWeekends||(date.getDay()!==0&&date.getDay()!==6))
  const columns=showWeekends?7:5
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const today = todayKey()
  const changePreferences = (values: Partial<typeof preferences>) => update({
    workspacePreferences: { ...data.workspacePreferences, [preferenceKey]: { ...preferences, ...values } },
  })
  const taskDialog=useRef<HTMLDialogElement>(null)
  const [taskDetail,setTaskDetail]=useState<{id:string;kind:'tasks'|'notices'}|null>(null)
  const detailTask=taskDetail?data.teacherDesk[taskDetail.kind].find(task=>task.id===taskDetail.id):undefined
  const settingsDialog=useRef<HTMLDialogElement>(null)
  const shift = (step: number) => setMonth(shiftCalendar(month, range, step, weeks))
  const rangeUnit = weeks ? `${weeks}주` : range === 'month' ? '달' : range === 'week' ? '주' : '2주'

  return (
    <section className={`panel calendar-panel ${context==='home'?'home-calendar':''}`} data-weeks={weeks} data-home-mode={context==='home'?homeMode:undefined}>
      <div className="toolbar calendar-toolbar">
        <button className="ghost-button" onClick={() => shift(-1)}>‹ 이전 {rangeUnit}</button>
        <h2>{!showWeekends&&range!=='month'?`${dateKey(cells[0])} ~ ${dateKey(cells.at(-1)!)}`:calendarPeriodLabel(month, range, weeks)}</h2>
        <button className="ghost-button" onClick={() => shift(1)}>다음 {rangeUnit} ›</button>
        <button className="ghost-button" onClick={() => setMonth(new Date())}>오늘</button>
        {context==='home'&&<label className="calendar-completed-toggle no-print"><input type="checkbox" checked={showCompleted} onChange={e=>changePreferences({showCompleted:e.target.checked})}/> 완료 포함</label>}
        <button className="ghost-button no-print" onClick={()=>settingsDialog.current?.showModal()}>설정</button>
      </div>
      <dialog className="calendar-options-dialog no-print" ref={settingsDialog}><div className="desk-heading"><h2>달력 설정</h2><button className="ghost-button" onClick={()=>settingsDialog.current?.close()}>닫기</button></div>
      <div className="calendar-controls no-print">
        {context === 'schedule' && <label>보기 기간 <select aria-label="달력 보기 기간" value={range} onChange={event => { changePreferences({ range: event.target.value as CalendarRange }); setMonth(new Date()) }}>
          <option value="month">한 달</option><option value="week">이번 주 · 1주</option><option value="fortnight">이번 주 + 다음 주 · 2주</option>
        </select></label>}
        {context==='work'&&<><label>달력 형태<select aria-label="업무 달력 형태" value={range==='month'?'month':'weeks'} onChange={e=>changePreferences({range:e.target.value==='month'?'month':'week'})}><option value="month">월별 달력</option><option value="weeks">주간 달력 · 이어보기</option></select></label>{range!=='month'&&<label>이어볼 주<select aria-label="업무 달력 주 수" value={weeks} onChange={e=>changePreferences({weekCount:Number(e.target.value)})}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}주</option>)}</select></label>}</>}
        {context === 'home' && <><label>달력 형태<select aria-label="메인화면 달력 형태" value={homeMode} onChange={event=>{changePreferences({homeMode:event.target.value as 'month'|'week'|'fortnight'|'weeks'});setMonth(new Date())}}><option value="month">월별 달력</option><option value="week">주간 달력</option><option value="fortnight">2주 달력</option><option value="weeks">주간 달력(연속)</option></select></label><label>표시할 일정 <select aria-label="달력 일정 구분" value={filter} onChange={event => changePreferences({ filter: event.target.value as CalendarFilter })}>
          <option value="all">전체</option>{data.settings.features.teaching&&<option value="teaching">교과</option>}{data.settings.features.homeroom&&<option value="homeroom">담임</option>}{data.settings.features.work&&<option value="work">업무</option>}{data.settings.features.clubs&&<option value="club">동아리</option>}
        </select></label>
        </>}
        <label>주말<select aria-label="달력 주말 표시" value={showWeekends?'include':'exclude'} onChange={e=>changePreferences({showWeekends:e.target.value==='include'})}><option value="include">주말 포함</option><option value="exclude">주말 제외</option></select></label>

      </div>
        <div className="toolbar-actions no-print">
          <button className="ghost-button" onClick={() => exportVisibleCalendarXlsx(context==='school'?{...data,dayNotes:{},personalBlocks:[]}:data, sessions, cells, shownPreferences, context === 'work')}>엑셀로 내보내기</button>
          <button className="ghost-button" onClick={()=>{settingsDialog.current?.close();printCurrentView()}}>인쇄</button>
        </div>
      </dialog>

      {recordDraft&&<WorkRecordDialog key={recordDraft.id||'new-record'} data={data} initial={recordDraft} update={update} onClose={()=>setRecordDraft(null)}/>}
      <dialog ref={taskDialog} className="calendar-task-dialog no-print" onClose={()=>setTaskDetail(null)} aria-label="일정 내용">{detailTask&&<><div className="desk-heading"><h2>{detailTask.title}</h2><button className="ghost-button" onClick={()=>taskDialog.current?.close()}>닫기</button></div><p className="hint">{taskDateLabel(detailTask,taskDetail?.kind==='notices')}</p>{detailTask.category&&<p>{detailTask.category}</p>}<p className="desk-pre">{detailTask.note||'추가 내용이 없습니다.'}</p>{taskDetail?.kind==='tasks'&&<section className="task-linked-records"><div className="desk-heading"><h3>관련 업무 기록</h3><button type="button" className="ghost-button" onClick={()=>setRecordDraft({id:'',date:today,title:detailTask.title,category:detailTask.category||'',content:'',link:'',taskId:detailTask.id,taskTitle:detailTask.title})}>+ 기록 추가</button></div>{(data.teacherDesk.workRecords||[]).filter(record=>record.taskId===detailTask.id).sort((a,b)=>b.date.localeCompare(a.date)).map(record=><button type="button" className="task-record-preview" key={record.id} onClick={()=>setRecordDraft({...record})}><strong>{record.date} · {record.title}</strong><span>{record.content||'내용 없음'}</span></button>)}</section>}<div className="calendar-task-footer"><span className="hint">{detailTask.done?'완료한 업무입니다.':'내용 확인만으로 완료 처리되지 않습니다.'}</span><button type="button" className={detailTask.done?'ghost-button':'primary-button'} onClick={()=>{if(!taskDetail)return;update({teacherDesk:{...data.teacherDesk,[taskDetail.kind]:data.teacherDesk[taskDetail.kind].map(task=>task.id===taskDetail.id?{...task,done:!task.done}:task)}})}}>{detailTask.done?'미완료로 변경':'완료 처리'}</button></div></>}</dialog>
      <div className="calendar-scroll"><div className="calendar-content">
      <div className="calendar-grid weekday-row" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}}>
        {(showWeekends?['일', '월', '화', '수', '목', '금', '토']:['월','화','수','목','금']).map(day => <b key={day}>{day}</b>)}
      </div>

      <div className="calendar-grid calendar-dates" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`,...(weeks?{gridTemplateRows:`repeat(${weeks},minmax(92.8px,auto))`}:{})}}>
        {cells.map(date => {
          const key = dateKey(date)
          const outside = !weeks && range === 'month' && !key.startsWith(monthPrefix)
          const holiday = data.settings.useHolidays !== false ? holidayName(key) : undefined
          const weekday = date.getDay()
          const classNames = ['calendar-day']
          if (outside) classNames.push('outside')
          if (key === today) classNames.push('today')
          if (holiday || weekday === 0) classNames.push('holiday')
          if (weekday === 6) classNames.push('saturday')
          const dayEvents = filter==='all' || teaching || context === 'work' || context === 'school' ? data.events.filter(event => coversDate(event, key)) : []
          const daySessions = sessions
            .filter(item => teaching && item.date === key && !item.cancelled && !item.hidden)
            .sort((left, right) => left.period - right.period)
          const notes = context==='school'?[]:data.dayNotes[key] || []
          const blocks = data.personalBlocks.filter(item => teaching && item.date === key).sort((left, right) => left.period - right.period)

          return (
            <div className={classNames.join(' ')} key={key} style={key===today&&data.settings.calendarTodayColor?{backgroundColor:data.settings.calendarTodayColor}:undefined}>
              <div className="calendar-day-head">
                <span className="calendar-day-date">
                  {onDateSelect ? <button className="calendar-date-button" onClick={() => onDateSelect(key)} title={context==='school'?'이 날짜에 학사일정 등록':'이 날짜에 업무 등록'}>{date.getDate()}</button> : <strong><span className="calendar-day-number">{date.getDate()}</span><span className="compact-date-label">{date.getMonth()+1}/{date.getDate()} {'일월화수목금토'[date.getDay()]}</span></strong>}
                  {teaching && <button
                    className="day-note-add adjustment-add no-print"
                    title="수업 시간표 변경"
                    onClick={() => setExtraDate(key)}
                  >
                    ⇆
                  </button>}
                </span>
                <button className="day-note-add no-print" title="이 날짜에 일정 추가" aria-label={`${key} 일정 추가`} onClick={()=>context==='school'?onDateSelect?.(key):setAdd({date:key,mode:'menu'})}>+</button>
              </div>
              {holiday && <div className="calendar-event holiday-tag" style={calendarItemStyle(data,'holiday')}>{holiday}</div>}
              {dayEvents.map(event => (
                <div className={`calendar-event ${event.type}`} key={event.id} style={schoolEventStyle(data,event)}>
                  {event.type === 'swap' && event.sourceDay ? `${event.sourceDay}요일 시간표` : event.title}
                </div>
              ))}
              {notes.map(note => (
                <button className="day-note-chip" style={calendarItemStyle(data,'school')} key={note.id} onClick={() => setNoteDate(key)}>
                  📌 {note.text}
                </button>
              ))}
              {daySessions.map(item => {
                const classroom = data.classes.find(value => value.id === item.classId)
                const subject = data.subjects.find(value => value.id === item.subjectId)
                const lessons = effectiveLessonIds(item)
                  .map(id => data.lessons.find(value => value.id === id))
                  .filter(Boolean)
                const marked = lessons.some(lesson => data.types.find(value => value.id === lesson!.typeId)?.emphasis)
                const hasEvaluation = Boolean(linkedEvaluation(data, item))
                // 진도표를 쓰지 않는 과목(CA·HR 등)은 체크할 진도 자체가 없다.
                // 지난 날짜는 자동으로 완료(회색)처럼 보이게 한다.
                const done = subject?.usesProgress === false
                  ? item.date < today
                  : lessons.length > 0 && lessons.every(lesson => data.progress[`${item.classId}:${lesson!.id}`]?.done)
                return (
                  <button
                    className={['calendar-lesson', done ? 'done' : '', marked ? 'marked' : ''].filter(Boolean).join(' ')}
                    key={item.id}
                    style={{...calendarItemStyle(data,'teaching',marked),}}
                    onClick={() => onSelect(item.id)}
                  >
                    <span className="cl-left" style={{...lessonLabelStyle(data,marked),...(done?{color:'inherit'}:{})}}>
                      {item.period}교시 {classroom?.name}
                      {item.swappedFrom && <em className="swap-tag">대체</em>}
                      {item.extra && (
                        <em className="swap-tag" title={item.extraNote}>
                          {item.extraOrigin === 'moved' ? '이동' : item.extraOrigin === 'swapped' ? '교체' : '보강'}
                        </em>
                      )}
                    </span>
                    <span className="cl-right">{hasEvaluation && '🎯 '}{sessionLabel(data, item)}</span>
                  </button>
                )
              })}
              {(context==='school'?[]:deskCalendarItems(data, key, shownPreferences, context==='work')).map(item => (
                <div key={item.id} className={`calendar-desk-item ${item.area} ${item.done ? 'done' : ''} ${item.important?'important-item':''}`} style={{...calendarItemStyle(data,item.area,item.important),...(item.done?{backgroundColor:data.settings.appearance.themeId==='night'?'#35383d':'#f0f1f2',color:'#969ba3',borderColor:'#d3d6da',fontWeight:400}:{})}}>
                  <button type="button" className="calendar-item-title" onClick={event => {event.stopPropagation();if(item.recordId){const record=data.teacherDesk.workRecords?.find(record=>record.id===item.recordId);if(record)setRecordDraft({...record});return}const kind=item.area==='work'?'tasks':'notices';if(data.teacherDesk[kind].some(task=>task.id===item.id)){setTaskDetail({id:item.id,kind});taskDialog.current?.showModal()}else if(context==='work'&&onTaskSelect)onTaskSelect(item.id);else onOpenArea?.(item.area==='homeroom'?'담임':item.area==='club'?'동아리':'업무',item.clubId)}}>{item.title}</button>

                </div>
              ))}
              {blocks.map(block => (
                <button
                  className={['calendar-lesson', block.date < today ? 'done' : ''].filter(Boolean).join(' ')}
                  key={block.id}
                  style={calendarItemStyle(data,'cover')}
                  onClick={() => setEditBlock(block)}
                >
                  <span className="cl-left" style={{fontWeight:data.settings.calendarLessonLabelBold!==false?600:400}}>
                    {block.period}교시
                    <em className="swap-tag">대체</em>
                  </span>
                  <span className="cl-right">{block.title}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>

      </div></div>

      {add&&<CalendarAddDialog data={data} date={add.date} mode={add.mode} onMode={mode=>setAdd({...add,mode})} onMemo={()=>{setNoteDate(add.date);setAdd(null)}} onClose={()=>setAdd(null)} update={update}/>}
      {noteDate && (
        <DayNoteModal
          date={noteDate}
          notes={data.dayNotes[noteDate] || []}
          onClose={() => setNoteDate(null)}
          onChange={next => update({ dayNotes: { ...data.dayNotes, [noteDate]: next } })}
        />
      )}

      {extraDate && (
        <AdjustmentModal
          date={extraDate}
          data={data}
          todaySessions={sessions.filter(item => item.date === extraDate && !item.cancelled && item.mode !== 'none')}
          update={update}
          onClose={() => setExtraDate(null)}
          onCreated={id => { setExtraDate(null); onSelect(id) }}
        />
      )}

      {editBlock && (
        <AdjustmentModal
          date={editBlock.date}
          data={data}
          todaySessions={[]}
          update={update}
          editBlock={editBlock}
          onClose={() => setEditBlock(null)}
          onCreated={() => setEditBlock(null)}
        />
      )}
    </section>
  )
}

type AdjustmentKind = 'makeup' | 'covering' | 'moved' | 'swapped'

const KIND_OPTIONS: { id: AdjustmentKind; label: string }[] = [
  { id: 'makeup', label: '보강' },
  { id: 'covering', label: '대강' },
  { id: 'moved', label: '이동' },
  { id: 'swapped', label: '교체' },
]

function sessionOptionLabel(data: AppData, session: Session) {
  const classroom = data.classes.find(item => item.id === session.classId)
  const subject = data.subjects.find(item => item.id === session.subjectId)
  return `${session.period}교시 · ${subject?.name ? `${subject.name} ` : ''}${classroom?.name || ''}`
}

function AdjustmentModal({
  date,
  data,
  todaySessions,
  update,
  onClose,
  onCreated,
  editBlock,
}: {
  date: string
  data: AppData
  todaySessions: Session[]
  update: (change: Partial<AppData>) => void
  onClose: () => void
  onCreated: (id: string) => void
  editBlock?: PersonalBlock
}) {
  const active = data.classes.filter(item => !item.archived)
  // 대강(개인 일정) 수정 화면에서는 유형을 고를 필요가 없다 — 항상 대강이다.
  const [kind, setKind] = useState<AdjustmentKind>('makeup')
  const [classId, setClassId] = useState(active[0]?.id || '')
  const [period, setPeriod] = useState(editBlock?.period ?? 1)
  const [note, setNote] = useState(editBlock?.note ?? '')
  const [title, setTitle] = useState(editBlock?.title ?? '')
  const [sourceId, setSourceId] = useState(todaySessions[0]?.id || '')
  const [newPeriod, setNewPeriod] = useState(1)
  const [sessionAId, setSessionAId] = useState(todaySessions[0]?.id || '')
  const [sessionBId, setSessionBId] = useState(todaySessions[1]?.id || '')

  const create = () => {
    if (editBlock) {
      if (!title.trim()) return
      update({
        personalBlocks: data.personalBlocks.map(item =>
          item.id === editBlock.id ? { ...item, period, title: title.trim(), note: note.trim() || undefined } : item,
        ),
      })
      onClose()
      return
    }

    if (kind === 'makeup') {
      if (!classId) return
      const id = makeId('extra')
      update({ extraSessions: [...data.extraSessions, { id, date, classId, period, note: note.trim() || undefined }] })
      onCreated(id)
      return
    }

    if (kind === 'covering') {
      if (!title.trim()) return
      const id = makeId('block')
      update({ personalBlocks: [...data.personalBlocks, { id, date, period, title: title.trim(), note: note.trim() || undefined }] })
      onClose()
      return
    }

    if (kind === 'moved') {
      const source = todaySessions.find(item => item.id === sourceId)
      if (!source || !newPeriod) return
      const groupId = makeId('adj')
      const overrides = {
        ...data.overrides,
        [source.id]: {
          ...(data.overrides[source.id] || {}),
          mode: 'none' as const,
          label: note.trim() || `${newPeriod}교시로 이동`,
          silent: true,
          groupId,
        },
      }
      const extra = {
        id: makeId('extra'),
        date,
        classId: source.classId,
        period: newPeriod,
        note: note.trim() || `${source.period}교시에서 이동`,
        origin: 'moved' as const,
        groupId,
      }
      update({ overrides, extraSessions: [...data.extraSessions, extra] })
      onClose()
      return
    }

    // kind === 'swapped'
    const a = todaySessions.find(item => item.id === sessionAId)
    const b = todaySessions.find(item => item.id === sessionBId)
    if (!a || !b || a.id === b.id) return
    const groupId = makeId('adj')
    const overrides = {
      ...data.overrides,
      [a.id]: { ...(data.overrides[a.id] || {}), mode: 'none' as const, label: note.trim() || `${b.period}교시와 교체`, silent: true, groupId },
      [b.id]: { ...(data.overrides[b.id] || {}), mode: 'none' as const, label: note.trim() || `${a.period}교시와 교체`, silent: true, groupId },
    }
    const extraSessions = [
      ...data.extraSessions,
      { id: makeId('extra'), date, classId: a.classId, period: b.period, note: note.trim() || `${a.period}교시와 교체`, origin: 'swapped' as const, groupId },
      { id: makeId('extra'), date, classId: b.classId, period: a.period, note: note.trim() || `${b.period}교시와 교체`, origin: 'swapped' as const, groupId },
    ]
    update({ overrides, extraSessions })
    onClose()
  }

  const remove = () => {
    if (!editBlock) return
    if (!window.confirm(`"${editBlock.title}"(${editBlock.period}교시) 일정을 삭제할까요?`)) return
    update({ personalBlocks: data.personalBlocks.filter(item => item.id !== editBlock.id) })
    onClose()
  }

  const disabled = editBlock
    ? !title.trim()
    : kind === 'makeup'
      ? !classId
      : kind === 'covering'
        ? !title.trim()
        : kind === 'moved'
          ? !sourceId || !newPeriod
          : !sessionAId || !sessionBId || sessionAId === sessionBId

  const primaryLabel = editBlock
    ? '저장'
    : kind === 'makeup'
      ? '추가하고 채점표·진도 열기'
      : kind === 'covering'
        ? '추가'
        : kind === 'moved'
          ? '이동 적용'
          : '교체 적용'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal narrow" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">{editBlock ? '대강 일정 수정' : '수업조정'}</p>
            <h2>{date}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>닫기</button>
        </header>
        <div className="modal-body">
          {!editBlock && (
            <>
              <p className="hint">
                정규 시간표와 다른 수업이 있는 경우 해당 날짜의 시간표를 변경합니다.<br />
                보강 수업을 추가하거나, 다른 교시로 이동한 수업을 등록할 수 있습니다.
              </p>
              <label className="adjustment-kind-picker">
                유형
                <select value={kind} onChange={event => setKind(event.target.value as AdjustmentKind)}>
                  {KIND_OPTIONS.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {!editBlock && kind === 'makeup' && (
            <div className="field-grid">
              {!active.length && <p className="hint">등록된 학급이 없습니다.</p>}
              {active.length > 0 && (
                <label>
                  학급
                  <select value={classId} onChange={event => setClassId(event.target.value)}>
                    {active.map(classroom => {
                      const subject = data.subjects.find(item => item.id === classroom.subjectId)
                      return (
                        <option key={classroom.id} value={classroom.id}>
                          {subject?.name} {classroom.name}
                        </option>
                      )
                    })}
                  </select>
                </label>
              )}
              <label>
                교시
                <input type="number" min={1} max={12} value={period} onChange={event => setPeriod(Number(event.target.value) || 1)} />
              </label>
              <label>
                사유
                <input value={note} placeholder="예: 보강" onChange={event => setNote(event.target.value)} />
              </label>
            </div>
          )}

          {(editBlock || kind === 'covering') && (
            <div className="field-grid">
              <label>
                제목
                <input value={title} placeholder="예: 2-1 대강 (김○○T)" onChange={event => setTitle(event.target.value)} />
              </label>
              <label>
                교시
                <input type="number" min={1} max={12} value={period} onChange={event => setPeriod(Number(event.target.value) || 1)} />
              </label>
              <label>
                메모
                <input value={note} placeholder="예: 김○○T 병결로 인한 수업 대체" onChange={event => setNote(event.target.value)} />
              </label>
            </div>
          )}

          {!editBlock && kind === 'moved' && (
            <div className="field-grid">
              {!todaySessions.length && <p className="hint">이 날짜에 옮길 수 있는 수업이 없습니다.</p>}
              {todaySessions.length > 0 && (
                <>
                  <label>
                    이동할 수업
                    <select value={sourceId} onChange={event => setSourceId(event.target.value)}>
                      {todaySessions.map(session => (
                        <option key={session.id} value={session.id}>{sessionOptionLabel(data, session)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    새 교시
                    <input type="number" min={1} max={12} value={newPeriod} onChange={event => setNewPeriod(Number(event.target.value) || 1)} />
                  </label>
                  <label>
                    메모
                    <input value={note} placeholder="선택" onChange={event => setNote(event.target.value)} />
                  </label>
                </>
              )}
            </div>
          )}

          {!editBlock && kind === 'swapped' && (
            <div className="field-grid">
              {todaySessions.length < 2 && <p className="hint">이 날짜에 서로 바꿀 수업이 2개 이상 있어야 합니다.</p>}
              {todaySessions.length >= 2 && (
                <>
                  <label>
                    수업 A
                    <select value={sessionAId} onChange={event => setSessionAId(event.target.value)}>
                      {todaySessions.map(session => (
                        <option key={session.id} value={session.id}>{sessionOptionLabel(data, session)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    수업 B
                    <select value={sessionBId} onChange={event => setSessionBId(event.target.value)}>
                      {todaySessions.map(session => (
                        <option key={session.id} value={session.id}>{sessionOptionLabel(data, session)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    메모
                    <input value={note} placeholder="선택" onChange={event => setNote(event.target.value)} />
                  </label>
                </>
              )}
            </div>
          )}
        </div>
        <footer className="modal-foot">
          {editBlock && <button className="ghost-button danger-button" onClick={remove}>삭제</button>}
          <button className="ghost-button" onClick={onClose}>취소</button>
          <button className="primary-button" onClick={create} disabled={disabled}>{primaryLabel}</button>
        </footer>
      </section>
    </div>
  )
}

function DayNoteModal({
  date,
  notes,
  onChange,
  onClose,
}: {
  date: string
  notes: { id: string; text: string }[]
  onChange: (next: { id: string; text: string }[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    if (!draft.trim()) return
    onChange([...notes, { id: makeId('note'), text: draft.trim() }])
    setDraft('')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal narrow" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">날짜 메모</p>
            <h2>{date}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>닫기</button>
        </header>
        <div className="modal-body">
          <p className="hint">
            수업·학사일정과 무관한 개인 메모입니다. 특정 학생 수행평가, 챙길 일 등을 적어두세요.
          </p>
          {notes.map(note => (
            <div className="day-note-row" key={note.id}>
              <span>{note.text}</span>
              <button className="ghost-button" onClick={() => onChange(notes.filter(item => item.id !== note.id))}>삭제</button>
            </div>
          ))}
          {!notes.length && <p className="hint">등록된 메모가 없습니다.</p>}
          <div className="inline-form">
            <input
              value={draft}
              placeholder="예: 평가 계획 제출"
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') add() }}
            />
            <button className="primary-button" onClick={add}>+ 추가</button>
          </div>
        </div>
      </section>
    </div>
  )
}
