import type { AppData, Session } from '../types'
import { DAYS } from '../types'
import { readableOn } from '../theme'
import { todayKey } from '../schedule'

type TodayRow = {
  key: string
  period: number
  text: string
  tag?: string
  color?: string
}

/** 오늘 실제로 있는 수업(요일 변경·보강·이동·취소가 전부 반영된 값)을 교시 순서로 정리한다. */
function todayRows(data: AppData, sessions: Session[]): TodayRow[] {
  const today = todayKey()

  const fromSessions: TodayRow[] = sessions
    .filter(item => item.date === today && !item.cancelled && !item.hidden)
    .map(item => {
      const classroom = data.classes.find(value => value.id === item.classId)
      const subject = data.subjects.find(value => value.id === item.subjectId)
      const tag = item.mode === 'none'
        ? '휴강'
        : item.extra
          ? (item.extraOrigin === 'moved' ? '이동' : item.extraOrigin === 'swapped' ? '교체' : (item.extraNote || '보강'))
          : item.swappedFrom
            ? '요일대체'
            : item.mode === 'extend'
              ? '이어서'
              : item.mode === 'merge'
                ? '합반'
                : undefined
      return {
        key: item.id,
        period: item.period,
        text: `${subject?.name ? `${subject.name} ` : ''}${classroom?.name || ''}`.trim() || '(학급 없음)',
        tag,
        color: subject?.color,
      }
    })

  const fromBlocks: TodayRow[] = data.personalBlocks
    .filter(item => item.date === today)
    .map(item => ({ key: item.id, period: item.period, text: item.title, tag: '대강' }))

  return [...fromSessions, ...fromBlocks].sort((left, right) => left.period - right.period)
}

export default function MiniTimetable({ data, sessions }: { data: AppData; sessions: Session[] }) {
  const active = data.classes.filter(item => !item.archived)
  const used = active.flatMap(item => item.slots.map(slot => slot.period))
  const maxPeriod = used.length ? Math.max(...used) : 7
  const periods = Array.from({ length: Math.max(maxPeriod, 4) }, (_, index) => index + 1)
  const today = todayRows(data, sessions)

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

      <div className="mini-today">
        <p className="mini-today-title">오늘 수업</p>
        {!today.length && <p className="hint">오늘 등록된 수업이 없습니다.</p>}
        {today.length > 0 && (
          <ul className="mini-today-list">
            {today.map(row => (
              <li key={row.key}>
                <span className="mini-today-period">{row.period}교시</span>
                <span className="mini-today-text" style={row.color ? { borderLeftColor: row.color } : undefined}>
                  {row.text}
                </span>
                {row.tag && <em className="swap-tag">{row.tag}</em>}
              </li>
            ))}
          </ul>
        )}
      </div>

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
