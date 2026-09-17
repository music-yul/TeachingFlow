import type { AppData } from '../types'
import { DAYS } from '../types'
import { readableOn } from '../theme'
import { coversDate, dateKey } from '../schedule'
import { holidayName } from '../holidays'

const eventTypeLabel: Record<string, string> = {
  closed: '휴업',
  blocked: '수업 불가',
  swap: '요일 변경',
}

/** 이번 주(월~금)에 이 시간표(기본 요일별 슬롯)와 다르게 운영되는 날이 있으면 알려준다. */
function thisWeekChanges(data: AppData) {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const weekdays = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date
  })

  return weekdays.flatMap(date => {
    const key = dateKey(date)
    const label = `${date.getMonth() + 1}/${date.getDate()}(${DAYS[date.getDay() - 1] || ''})`
    const holiday = data.settings.useHolidays !== false ? holidayName(key) : undefined
    if (holiday) return [{ key, label, text: holiday }]
    const events = data.events.filter(event => coversDate(event, key) && event.type !== 'note')
    return events.map(event => ({
      key: `${key}-${event.id}`,
      label,
      text: event.type === 'swap' && event.sourceDay
        ? `${event.sourceDay}요일 시간표로 운영`
        : `${eventTypeLabel[event.type] || event.type}${event.title ? ` · ${event.title}` : ''}`,
    }))
  })
}

export default function MiniTimetable({ data }: { data: AppData }) {
  const active = data.classes.filter(item => !item.archived)
  const used = active.flatMap(item => item.slots.map(slot => slot.period))
  const maxPeriod = used.length ? Math.max(...used) : 7
  const periods = Array.from({ length: Math.max(maxPeriod, 4) }, (_, index) => index + 1)
  const changes = thisWeekChanges(data)

  return (
    <div className="mini-timetable">
      <p className="mini-title">
        <span>
          {[
            data.settings.year && `${data.settings.year}학년도`,
            data.settings.termName,
            data.settings.schoolName,
          ]
            .filter(Boolean)
            .join(' ')}
        </span>
        {data.settings.teacherName && <span className="mini-teacher">{data.settings.teacherName}</span>}
      </p>
      <p className="hint mini-note">
        이 표는 기본 주간 시간표입니다. 요일 변경·휴업 등 날짜별 변경사항은 아래 달력에서 확인하세요.
      </p>
      {changes.length > 0 && (
        <ul className="mini-week-changes">
          {changes.map(item => (
            <li key={item.key}><b>{item.label}</b> {item.text}</li>
          ))}
        </ul>
      )}
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
                            style={{
                              background: subject?.color || '#4f7db8',
                              color: subject?.textColor || readableOn(subject?.color || '#4f7db8'),
                            }}
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
