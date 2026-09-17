import { useState } from 'react'
import type { AppData, PersonalBlock, Session } from '../types'
import { coversDate, dateKey, effectiveLessonIds, sessionLabel, todayKey } from '../schedule'
import { linkedEvaluation } from '../evaluation'
import { holidayName } from '../holidays'
import { makeId } from '../storage'
import { exportCalendarXlsx, printCurrentView } from '../exportPrint'

type Props = {
  data: AppData
  sessions: Session[]
  month: Date
  setMonth: (value: Date) => void
  onSelect: (id: string) => void
  update: (change: Partial<AppData>) => void
}

export default function CalendarView({ data, sessions, month, setMonth, onSelect, update }: Props) {
  const [noteDate, setNoteDate] = useState<string | null>(null)
  const [extraDate, setExtraDate] = useState<string | null>(null)
  const [editBlock, setEditBlock] = useState<PersonalBlock | null>(null)

  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const today = todayKey()

  const shift = (step: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1))

  return (
    <section className="panel calendar-panel">
      <div className="toolbar">
        <button className="ghost-button" onClick={() => shift(-1)}>‹ 이전 달</button>
        <h2>{month.getFullYear()}년 {month.getMonth() + 1}월</h2>
        <button className="ghost-button" onClick={() => shift(1)}>다음 달 ›</button>
        <button className="ghost-button" onClick={() => setMonth(new Date())}>오늘</button>
        <div className="toolbar-actions no-print">
          <button className="ghost-button" onClick={() => exportCalendarXlsx(data, sessions, month)}>엑셀로 내보내기</button>
          <button className="ghost-button" onClick={printCurrentView}>인쇄</button>
        </div>
      </div>

      <div className="calendar-grid weekday-row">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => <b key={day}>{day}</b>)}
      </div>

      <div className="calendar-grid">
        {cells.map(date => {
          const key = dateKey(date)
          const outside = !key.startsWith(monthPrefix)
          const holiday = data.settings.useHolidays !== false ? holidayName(key) : undefined
          const weekday = date.getDay()
          const classNames = ['calendar-day']
          if (outside) classNames.push('outside')
          if (key === today) classNames.push('today')
          if (holiday || weekday === 0) classNames.push('holiday')
          if (weekday === 6) classNames.push('saturday')
          const dayEvents = data.events.filter(event => coversDate(event, key))
          const daySessions = sessions
            .filter(item => item.date === key && !item.cancelled && !item.hidden)
            .sort((left, right) => left.period - right.period)
          const notes = data.dayNotes[key] || []
          const blocks = data.personalBlocks.filter(item => item.date === key).sort((left, right) => left.period - right.period)

          return (
            <div className={classNames.join(' ')} key={key}>
              <div className="calendar-day-head">
                <span className="calendar-day-date">
                  <strong>{date.getDate()}</strong>
                  <button
                    className="day-note-add no-print"
                    title="수업 시간표 변경"
                    onClick={() => setExtraDate(key)}
                  >
                    ⇆
                  </button>
                </span>
                <button className="day-note-add no-print" title="이 날짜에 메모 추가" onClick={() => setNoteDate(key)}>+</button>
              </div>
              {holiday && <div className="calendar-event holiday-tag">{holiday}</div>}
              {dayEvents.map(event => (
                <div className={`calendar-event ${event.type}`} key={event.id}>
                  {event.type === 'swap' && event.sourceDay ? `${event.sourceDay}요일 시간표` : event.title}
                </div>
              ))}
              {notes.map(note => (
                <button className="day-note-chip" key={note.id} onClick={() => setNoteDate(key)}>
                  📌 {note.text}
                </button>
              ))}
              {daySessions.map(item => {
                const classroom = data.classes.find(value => value.id === item.classId)
                const subject = data.subjects.find(value => value.id === item.subjectId)
                const lessons = effectiveLessonIds(item)
                  .map(id => data.lessons.find(value => value.id === id))
                  .filter(Boolean)
                const type = data.types.find(value => value.id === lessons[0]?.typeId)
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
                    style={{ borderLeftColor: type?.color || '#c7ccd6' }}
                    onClick={() => onSelect(item.id)}
                  >
                    <span className="cl-left">
                      {item.period}교시 {classroom?.name}
                      {item.swappedFrom && <em className="swap-tag">요일대체</em>}
                      {item.extra && (
                        <em className="swap-tag" title={item.extraNote}>
                          {item.extraOrigin === 'moved' ? '이동' : item.extraOrigin === 'swapped' ? '교체' : (item.extraNote || '보강')}
                        </em>
                      )}
                    </span>
                    <span className="cl-right">{hasEvaluation && '🎯 '}{sessionLabel(data, item)}</span>
                  </button>
                )
              })}
              {blocks.map(block => (
                <button
                  className="calendar-lesson"
                  key={block.id}
                  style={{ borderLeftColor: '#8b93a2' }}
                  onClick={() => setEditBlock(block)}
                >
                  <span className="cl-left">
                    {block.period}교시
                    <em className="swap-tag">대강</em>
                  </span>
                  <span className="cl-right">{block.title}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>

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
      const overrides = {
        ...data.overrides,
        [source.id]: {
          ...(data.overrides[source.id] || {}),
          mode: 'none' as const,
          label: note.trim() || `${newPeriod}교시로 이동`,
          silent: true,
        },
      }
      const extra = {
        id: makeId('extra'),
        date,
        classId: source.classId,
        period: newPeriod,
        note: note.trim() || `${source.period}교시에서 이동`,
        origin: 'moved' as const,
      }
      update({ overrides, extraSessions: [...data.extraSessions, extra] })
      onClose()
      return
    }

    // kind === 'swapped'
    const a = todaySessions.find(item => item.id === sessionAId)
    const b = todaySessions.find(item => item.id === sessionBId)
    if (!a || !b || a.id === b.id) return
    const overrides = {
      ...data.overrides,
      [a.id]: { ...(data.overrides[a.id] || {}), mode: 'none' as const, label: note.trim() || `${b.period}교시와 교체`, silent: true },
      [b.id]: { ...(data.overrides[b.id] || {}), mode: 'none' as const, label: note.trim() || `${a.period}교시와 교체`, silent: true },
    }
    const extraSessions = [
      ...data.extraSessions,
      { id: makeId('extra'), date, classId: a.classId, period: b.period, note: note.trim() || `${a.period}교시와 교체`, origin: 'swapped' as const },
      { id: makeId('extra'), date, classId: b.classId, period: a.period, note: note.trim() || `${b.period}교시와 교체`, origin: 'swapped' as const },
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
