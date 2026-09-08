import { useState } from 'react'
import type { AppData, AttendanceStatus, Session } from '../types'
import { formatShort, sessionLabel, todayKey } from '../schedule'

type Props = {
  data: AppData
  sessions: Session[]
  update: (change: Partial<AppData>) => void
}

const statuses: AttendanceStatus[] = ['출석', '지각', '조퇴', '결석', '기타']
const weekdayNames = ['일', '월', '화', '수', '목', '금', '토']

function weekdayOf(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return weekdayNames[new Date(year, month - 1, day).getDay()]
}

export default function AttendanceView({ data, sessions, update }: Props) {
  const active = data.classes.filter(item => !item.archived)
  const [classId, setClassId] = useState(active[0]?.id || '')
  const [date, setDate] = useState(todayKey())

  const classroom = active.find(item => item.id === classId) || active[0]
  if (!classroom) {
    return (
      <section className="panel empty-panel">
        등록된 학급이 없습니다. <b>설정 &gt; 학급·시간표</b>에서 먼저 학급을 추가해 주세요.
      </section>
    )
  }

  const own = sessions
    .filter(item => item.classId === classroom.id && item.mode !== 'none' && !item.cancelled)
    .sort((left, right) => (left.date + String(left.period)).localeCompare(right.date + String(right.period)))

  const todaySessions = own.filter(item => item.date === date)
  const previous = [...own].reverse().find(item => item.date < date)
  const next = own.find(item => item.date > date)

  const countFor = (studentId: string, status: AttendanceStatus) =>
    own.filter(item => data.attendance[`${item.id}:${studentId}`] === status).length

  return (
    <section className="panel">
      <div className="toolbar">
        <label>
          학급{' '}
          <select value={classroom.id} onChange={event => setClassId(event.target.value)}>
            {active.map(item => {
              const subject = data.subjects.find(value => value.id === item.subjectId)
              return <option key={item.id} value={item.id}>{subject?.name} {item.name}</option>
            })}
          </select>
        </label>
        <span className="hint">학생 {classroom.students.length}명 · 학기 중 수업 {own.length}회</span>
      </div>

      <div className="date-nav">
        <button className="ghost-button" disabled={!previous} onClick={() => previous && setDate(previous.date)}>
          ‹ 이전 수업
        </button>
        <input type="date" value={date} onChange={event => setDate(event.target.value)} />
        <span className="weekday">{weekdayOf(date)}요일</span>
        <button className="ghost-button" disabled={!next} onClick={() => next && setDate(next.date)}>
          다음 수업 ›
        </button>
        <button className="ghost-button" onClick={() => setDate(todayKey())}>오늘</button>
      </div>

      {!todaySessions.length && (
        <p className="banner">
          이 날은 {classroom.name} 수업이 없습니다. 위 화살표로 가장 가까운 수업일로 이동하거나, 날짜를 직접 고르세요.
        </p>
      )}

      {todaySessions.map(current => (
        <div className="session-block" key={current.id}>
          <h3 className="session-title">
            {current.period}교시
            {current.swappedFrom && <em className="swap-tag">{current.swappedFrom}요일 대체</em>}
            {' — '}{sessionLabel(data, current)}
          </h3>

          {!classroom.students.length && <p className="hint">학생 명단이 비어 있습니다.</p>}

          {classroom.students.length > 0 && (
            <div className="table-wrap">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>이름</th>
                    <th>출결</th>
                    <th>수업 중 특이사항</th>
                    <th>누계</th>
                  </tr>
                </thead>
                <tbody>
                  {classroom.students.map(student => {
                    const key = `${current.id}:${student.id}`
                    const value = data.attendance[key]
                    const late = countFor(student.id, '지각')
                    const absent = countFor(student.id, '결석')
                    return (
                      <tr key={student.id}>
                        <td>{student.number}</td>
                        <td>{student.name}</td>
                        <td className="status-cell">
                          {statuses.map(status => (
                            <button
                              className={value === status ? 'slot on' : 'slot'}
                              key={status}
                              onClick={() => {
                                const attendance = { ...data.attendance }
                                if (value === status) delete attendance[key]
                                else attendance[key] = status
                                update({ attendance })
                              }}
                            >
                              {status}
                            </button>
                          ))}
                        </td>
                        <td>
                          <input
                            value={data.activities[key] || ''}
                            placeholder="관찰 내용, 활동 특이사항"
                            onChange={event => update({ activities: { ...data.activities, [key]: event.target.value } })}
                          />
                        </td>
                        <td className="tally">
                          {absent > 0 && <span className="warn">결석 {absent}</span>}
                          {late > 0 && <span>지각 {late}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {todaySessions.length > 0 && (
        <p className="hint">체크하지 않은 학생은 출석으로 봅니다.</p>
      )}

      <StudentDigest data={data} sessions={own} classId={classroom.id} />
    </section>
  )
}

function StudentDigest({ data, sessions, classId }: { data: AppData; sessions: Session[]; classId: string }) {
  const classroom = data.classes.find(item => item.id === classId)
  const [studentId, setStudentId] = useState('')
  if (!classroom) return null
  const student = classroom.students.find(item => item.id === studentId)

  const notes = student
    ? sessions
        .map(item => ({
          session: item,
          note: data.activities[`${item.id}:${student.id}`] || '',
          status: data.attendance[`${item.id}:${student.id}`],
        }))
        .filter(item => item.note || (item.status && item.status !== '출석'))
    : []

  return (
    <div className="block">
      <h3>학생별 기록 모아 보기</h3>
      <p className="hint">한 학생의 학기 전체 기록을 모아 봅니다. 세특 쓰실 때 근거로 쓰세요.</p>
      <select value={studentId} onChange={event => setStudentId(event.target.value)}>
        <option value="">학생 선택</option>
        {classroom.students.map(item => (
          <option key={item.id} value={item.id}>{item.number}. {item.name}</option>
        ))}
      </select>
      {student && !notes.length && <p className="hint">쌓인 기록이 없습니다.</p>}
      {notes.map(item => (
        <div className="digest-row" key={item.session.id}>
          <b>{formatShort(item.session.date)}</b>
          <span className="digest-lesson">{sessionLabel(data, item.session)}</span>
          {item.status && item.status !== '출석' && <span className="warn">{item.status}</span>}
          <span>{item.note}</span>
        </div>
      ))}
    </div>
  )
}
