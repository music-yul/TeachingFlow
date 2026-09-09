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

          return (
            <div className={classNames.join(' ')} key={key}>
              <div className="calendar-day-head">
                <strong>{date.getDate()}</strong>
                <button className="day-note-add no-print" title="이 날짜에 메모 추가" onClick={() => setNoteDate(key)}>+</button>
              </div>
              {holiday && <div className="calendar-event holiday-tag">{holiday}</div>}
              {dayEvents.map(event => (
                <div className={`calendar-event ${event.type}`} key={event.id}>
                  {event.type === 'swap' && event.sourceDay ? `${event.sourceDay}요일 시간표` : event.title}
                </div>
              ))}
              {notes.length > 0 && (
                <button className="day-note-chip" onClick={() => setNoteDate(key)}>
                  📌 {notes.length > 1 ? `메모 ${notes.length}건` : notes[0].text}
                </button>
              )}
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
                    </span>
                    <span className="cl-right">{hasEvaluation && '🎯 '}{sessionLabel(data, item)}</span>
                  </button>
                )
              })}
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
    </section>
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
              placeholder="예: 민준 수행평가 재응시"
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
