import type { AppData, Session } from '../types'
import { coversDate, dateKey, sessionLabel, todayKey } from '../schedule'

type Props = {
  data: AppData
  sessions: Session[]
  month: Date
  setMonth: (value: Date) => void
  onSelect: (id: string) => void
}

export default function CalendarView({ data, sessions, month, setMonth, onSelect }: Props) {
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
    <section className="panel">
      <div className="toolbar">
        <button className="ghost-button" onClick={() => shift(-1)}>‹ 이전 달</button>
        <h2>{month.getFullYear()}년 {month.getMonth() + 1}월</h2>
        <button className="ghost-button" onClick={() => shift(1)}>다음 달 ›</button>
        <button className="ghost-button" onClick={() => setMonth(new Date())}>오늘</button>
      </div>

      <div className="calendar-grid weekday-row">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => <b key={day}>{day}</b>)}
      </div>

      <div className="calendar-grid">
        {cells.map(date => {
          const key = dateKey(date)
          const outside = !key.startsWith(monthPrefix)
          const classNames = ['calendar-day']
          if (outside) classNames.push('outside')
          if (key === today) classNames.push('today')
          const dayEvents = data.events.filter(event => coversDate(event, key))
          const daySessions = sessions
            .filter(item => item.date === key && !item.cancelled)
            .sort((left, right) => left.period - right.period)
          return (
            <div className={classNames.join(' ')} key={key}>
              <strong>{date.getDate()}</strong>
              {dayEvents.map(event => (
                <div className={`calendar-event ${event.type}`} key={event.id}>
                  {event.type === 'swap' && event.sourceDay ? `${event.sourceDay}요일 시간표` : event.title}
                </div>
              ))}
              {daySessions.map(item => {
                const classroom = data.classes.find(value => value.id === item.classId)
                const lessons = item.lessonIds
                  .map(id => data.lessons.find(value => value.id === id))
                  .filter(Boolean)
                const type = data.types.find(value => value.id === lessons[0]?.typeId)
                const marked = lessons.some(lesson => data.types.find(value => value.id === lesson!.typeId)?.emphasis)
                const done = lessons.length > 0
                  && lessons.every(lesson => data.progress[`${item.classId}:${lesson!.id}`]?.done)
                return (
                  <button
                    className={['calendar-lesson', done ? 'done' : '', marked ? 'marked' : ''].filter(Boolean).join(' ')}
                    key={item.id}
                    style={{ borderLeftColor: type?.color || '#c7ccd6' }}
                    onClick={() => onSelect(item.id)}
                  >
                    <b>
                      {item.period}교시 {classroom?.name}
                      {item.swappedFrom && <em className="swap-tag">대체</em>}
                    </b>
                    <span>{sessionLabel(data, item)}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}
