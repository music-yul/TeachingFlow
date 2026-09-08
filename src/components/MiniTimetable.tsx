import type { AppData } from '../types'
import { DAYS } from '../types'

export default function MiniTimetable({ data }: { data: AppData }) {
  const active = data.classes.filter(item => !item.archived)
  const used = active.flatMap(item => item.slots.map(slot => slot.period))
  const maxPeriod = used.length ? Math.max(...used) : 7
  const periods = Array.from({ length: Math.max(maxPeriod, 4) }, (_, index) => index + 1)

  return (
    <div className="mini-timetable">
      <p className="mini-title">주간 시간표</p>
      {!active.length && <p className="hint">학급을 등록하면 표시됩니다.</p>}
      {active.length > 0 && (
        <table>
          <thead>
            <tr><th /> {DAYS.map(day => <th key={day}>{day}</th>)}</tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period}>
                <th>{period}</th>
                {DAYS.map(day => {
                  const here = active.filter(item => item.slots.some(slot => slot.day === day && slot.period === period))
                  return (
                    <td className={here.length > 1 ? 'conflict' : ''} key={day}>
                      {here.map(classroom => {
                        const subject = data.subjects.find(item => item.id === classroom.subjectId)
                        return (
                          <div
                            className="mini-entry"
                            key={classroom.id}
                            style={{ background: subject?.color || '#4f7db8' }}
                            title={`${subject?.name || ''} ${classroom.name}`}
                          >
                            {subject?.name && <span className="mini-subject">{subject.name}</span>}
                            <span className="mini-class">{classroom.name}</span>
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
      )}
    </div>
  )
}
