import { useState } from 'react'
import type { AppData, Session } from '../types'
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
            .filter(item => item.date === key && !item.cancelled)
            .sort((left, right) => left.period - right.period)
          const notes = data.dayNotes[key] || []
          const blocks = data.personalBlocks.filter(item => item.date === key).sort((left, right) => left.period - right.period)

          return (
            <div className={classNames.join(' ')} key={key}>
              <div className="calendar-day-head">
                <strong>{date.getDate()}</strong>
                <div className="calendar-day-actions">
                  <button
                    className="day-note-add no-print"
                    title="수업 시간표 변경"
                    onClick={() => setExtraDate(key)}
                  >
                    🔄
                  </button>
                  <button className="day-note-add no-print" title="이 날짜에 메모 추가" onClick={() => setNoteDate(key)}>📝</button>
                </div>
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
                      {item.swappedFrom && <em className="swap-tag">대체</em>}
                      {item.extra && <em className="swap-tag" title={item.extraNote}>{item.extraNote || '추가'}</em>}
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
                  onClick={() => {
                    if (!window.confirm(`"${block.title}"(${block.period}교시) 개인 일정을 삭제할까요?`)) return
                    update({ personalBlocks: data.personalBlocks.filter(item => item.id !== block.id) })
                  }}
                >
                  <span className="cl-left">
                    {block.period}교시
                    <em className="swap-tag">개인 일정</em>
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
        <AddExtraSessionModal
          date={extraDate}
          data={data}
          update={update}
          onClose={() => setExtraDate(null)}
          onCreated={id => { setExtraDate(null); onSelect(id) }}
        />
      )}
    </section>
  )
}

function AddExtraSessionModal({
  date,
  data,
  update,
  onClose,
  onCreated,
}: {
  date: string
  data: AppData
  update: (change: Partial<AppData>) => void
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const active = data.classes.filter(item => !item.archived)
  const [kind, setKind] = useState<'class' | 'personal'>('class')
  const [classId, setClassId] = useState(active[0]?.id || '')
  const [period, setPeriod] = useState(1)
  const [note, setNote] = useState('보강')
  const [title, setTitle] = useState('')

  const create = () => {
    if (kind === 'class') {
      if (!classId) return
      const id = makeId('extra')
      update({ extraSessions: [...data.extraSessions, { id, date, classId, period, note: note.trim() || undefined }] })
      onCreated(id)
      return
    }
    if (!title.trim()) return
    const id = makeId('block')
    update({ personalBlocks: [...data.personalBlocks, { id, date, period, title: title.trim(), note: note.trim() || undefined }] })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal narrow" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">수업 시간표 변경</p>
            <h2>{date}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>닫기</button>
        </header>
        <div className="modal-body">
          <p className="hint">
            정규 시간표와 다른 수업이 있는 경우 해당 날짜의 시간표를 변경합니다.<br />
            보강 수업을 추가하거나, 다른 교시로 이동한 수업을 등록할 수 있습니다.
          </p>
          <p className="hint">
            💡 수업을 다른 교시로 옮긴 경우<br />
            이동한 교시에 수업을 추가하고, 원래 교시는 &lsquo;수업 없음&rsquo;으로 변경해 주세요.
          </p>
          <div className="mode-picker">
            <button className={kind === 'class' ? 'mode on' : 'mode'} onClick={() => setKind('class')}>
              <b>내 학급 수업</b>
              <small>등록된 학급 중 하나를 골라 진도·채점까지 이어서 기록</small>
            </button>
            <button className={kind === 'personal' ? 'mode on' : 'mode'} onClick={() => setKind('personal')}>
              <b>개인 일정</b>
              <small>다른 선생님 수업 보강, 회의 등 학급에 속하지 않는 일정</small>
            </button>
          </div>

          {kind === 'class' && (
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
                <input value={note} placeholder="예: 보강, 2교시로 이동" onChange={event => setNote(event.target.value)} />
              </label>
            </div>
          )}

          {kind === 'personal' && (
            <div className="field-grid">
              <label>
                제목
                <input value={title} placeholder="예: 2학년 3반 보강(김OO 선생님)" onChange={event => setTitle(event.target.value)} />
              </label>
              <label>
                교시
                <input type="number" min={1} max={12} value={period} onChange={event => setPeriod(Number(event.target.value) || 1)} />
              </label>
              <label>
                메모
                <input value={note} placeholder="선택" onChange={event => setNote(event.target.value)} />
              </label>
            </div>
          )}
        </div>
        <footer className="modal-foot">
          <button className="ghost-button" onClick={onClose}>취소</button>
          <button
            className="primary-button"
            onClick={create}
            disabled={kind === 'class' ? !classId : !title.trim()}
          >
            {kind === 'class' ? '추가하고 채점표·진도 열기' : '추가'}
          </button>
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
