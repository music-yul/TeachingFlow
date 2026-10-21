import { clubTimetableEntries } from '../clubSchedule'
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

export function sessionChangeLabel(item: Session) {
  return item.mode === 'none'
        ? '휴강'
        : item.extra
          ? (item.extraOrigin === 'moved' ? '이동' : item.extraOrigin === 'swapped' ? '교체' : '보강')
          : item.swappedFrom
            ? '대체'
            : item.mode === 'extend'
              ? '이어서'
              : item.mode === 'merge'
                ? '합반'
                : undefined
}

/** 오늘 실제로 있는 수업(요일 변경·보강·이동·취소가 전부 반영된 값)을 교시 순서로 정리한다. */
function todayRows(data: AppData, sessions: Session[]): TodayRow[] {
  const today = todayKey()

  const fromSessions: TodayRow[] = sessions
    .filter(item => item.date === today && !item.cancelled && !item.hidden)
    .map(item => {
      const classroom = data.classes.find(value => value.id === item.classId)
      const subject = data.subjects.find(value => value.id === item.subjectId)
      const tag = sessionChangeLabel(item)
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

export default function MiniTimetable({ data, sessions, showToday=true, classOnly=false, showTimetable=true, showSubject, showRoom=false }: { data: AppData; sessions: Session[]; showToday?: boolean; classOnly?: boolean; showTimetable?: boolean; showSubject?: boolean; showRoom?: boolean }) {
  const active = data.classes.filter(item => !item.archived)
  const clubEntries=clubTimetableEntries(data)
  const used = [...clubEntries.map(item=>item.period),...active.flatMap(item => item.slots.map(slot => slot.period))]
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

      {showToday&&<div className="mini-today">
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
      </div>}

      {showTimetable && !active.length && !clubEntries.length && <p className="hint">학급을 등록하면 표시됩니다.</p>}
      {showTimetable && (active.length > 0 || clubEntries.length>0) && (
        <table>
          <colgroup><col className="timetable-period-column"/>{DAYS.map(day=><col className="timetable-weekday-column" key={day}/>)}</colgroup>
          <thead>
            <tr><th /> {DAYS.map(day => <th key={day}>{day}</th>)}</tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period}>
                <th>{period}</th>
                {DAYS.map(day => {
                  const here = active.filter(item => item.slots.some(slot => slot.day === day && slot.period === period))
                  const clubsHere=clubEntries.filter(v=>v.day===day&&v.period===period)
                  return (
                    <td className={here.length+clubsHere.length > 1 ? 'conflict' : ''} key={day}>
                      <div className="mini-cell-content">
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
                            {(showSubject??!classOnly) && subject?.name && <span className="mini-subject">{subject.name}</span>}
                            <span className="mini-class">{classroom.name}</span>
                            {showRoom&&classroom.room?.trim()&&<span className="mini-room">{classroom.room}</span>}
                          </div>
                        )
                      })}
                      {clubsHere.map(({club})=><div className="mini-entry" key={`club:${club.id}`} style={{background:data.settings.calendarColors.club,color:readableOn(data.settings.calendarColors.club)}}>{(showSubject??!classOnly)&&<span className="mini-subject">{club.schedule?.kind==='autonomous'?'자율 동아리':'동아리'}</span>}<span className="mini-class">{club.name}</span></div>)}
                      </div>
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
