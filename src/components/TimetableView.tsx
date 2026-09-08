import type { AppData, Session } from '../types'
import { DAYS, PERIODS } from '../types'
import { formatShort, todayKey, weekKeys } from '../schedule'

type Props = {
  data: AppData
  sessions: Session[]
  onSelect: (id: string) => void
}

export default function TimetableView({ data, sessions, onSelect }: Props) {
  const active = data.classes.filter(item => !item.archived)
  const week = weekKeys()
  const today = todayKey()

  return (
    <section className="panel">
      <h2>주간 시간표</h2>
      <p className="hint">학급 관리에 등록된 수업 시간을 모아 보여줍니다. 같은 칸에 두 학급이 겹치면 붉게 표시됩니다.</p>

      <div className="table-wrap">
        <table className="timetable">
          <thead>
            <tr><th>교시</th>{DAYS.map(day => <th key={day}>{day}</th>)}</tr>
          </thead>
          <tbody>
            {PERIODS.map(period => (
              <tr key={period}>
                <th>{period}</th>
                {DAYS.map(day => {
                  const here = active.filter(item => item.slots.some(slot => slot.day === day && slot.period === period))
                  return (
                    <td className={here.length > 1 ? 'conflict' : ''} key={day}>
                      {here.map(classroom => {
                        const subject = data.subjects.find(item => item.id === classroom.subjectId)
                        return (
                          <div className="tt-cell" key={classroom.id} style={{ borderLeftColor: subject?.color || '#c7ccd6' }}>
                            <b>{classroom.name}</b>
                            <small>{subject?.name}</small>
                          </div>
                        )
                      })}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>이번 주 수업</h2>
      <div className="week-strip">
        {week.map((key, index) => {
          const daySessions = sessions
            .filter(item => item.date === key)
            .sort((left, right) => left.period - right.period)
          return (
            <div className={key === today ? 'week-day today' : 'week-day'} key={key}>
              <header>{DAYS[index]} <span>{formatShort(key)}</span></header>
              {!daySessions.length && <p className="hint">수업 없음</p>}
              {daySessions.map(item => {
                const classroom = data.classes.find(value => value.id === item.classId)
                const lesson = data.lessons.find(value => value.id === item.lessonId)
                const done = lesson && data.progress[`${item.classId}:${lesson.id}`]?.done
                return (
                  <button className={done ? 'week-item done' : 'week-item'} key={item.id} onClick={() => onSelect(item.id)}>
                    <b>{item.period}교시 {classroom?.name}</b>
                    <span>{item.skipped ? (item.label || '수업 없음') : lesson?.title || '미배정'}</span>
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
