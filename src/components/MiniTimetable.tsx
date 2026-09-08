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
                  const subject = here[0] && data.subjects.find(item => item.id === here[0].subjectId)
                  return (
                    <td
                      className={here.length > 1 ? 'conflict' : ''}
                      key={day}
                      style={here.length ? { background: subject?.color || '#4f7db8', color: '#fff' } : undefined}
                      title={here.map(item => item.name).join(', ')}
                    >
                      {here.map(item => item.name).join('/')}
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
