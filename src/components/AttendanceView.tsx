import { useState } from 'react'
import type { AppData, AttendanceStatus, Session } from '../types'
import { dateKey, formatShort, sessionLabel, todayKey } from '../schedule'
import { exportClassDigestXlsx, exportStudentDigestXlsx } from '../exportPrint'
import { studentLabel } from '../students'

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

function shiftDay(key: string, delta: number) {
  const [year, month, day] = key.split('-').map(Number)
  return dateKey(new Date(year, month - 1, day + delta))
}

export default function AttendanceView({ data, sessions, update }: Props) {
  const active = data.classes.filter(item => !item.archived)
  const [date, setDate] = useState(todayKey())
  const [classFilter, setClassFilter] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [digestStudentId, setDigestStudentId] = useState<string | null>(null)
  const [showDownload, setShowDownload] = useState(false)

  if (!active.length) {
    return (
      <section className="panel empty-panel">
        등록된 학급이 없습니다. <b>설정 &gt; 학급·시간표</b>에서 먼저 학급을 추가해 주세요.
      </section>
    )
  }

  const daySessions = sessions
    .filter(item => item.date === date && item.mode !== 'none' && !item.cancelled)
    .filter(item => !classFilter || item.classId === classFilter)
    .sort((left, right) => {
      if (left.period !== right.period) return left.period - right.period
      const leftName = data.classes.find(value => value.id === left.classId)?.name || ''
      const rightName = data.classes.find(value => value.id === right.classId)?.name || ''
      return leftName.localeCompare(rightName)
    })

  // 날짜·학급을 바꾸면 이전에 고른 교시가 목록에 없을 수 있다. 그럴 땐 가장 이른 수업으로 되돌아간다.
  const current = daySessions.find(item => item.id === activeId) || daySessions[0]

  const countFor = (classId: string, studentId: string, status: AttendanceStatus) => {
    const own = sessions.filter(item => item.classId === classId && item.mode !== 'none' && !item.cancelled)
    return own.filter(item => data.attendance[`${item.id}:${studentId}`] === status).length
  }

  return (
    <section className="panel">
      <div className="date-nav">
        <button className="ghost-button" onClick={() => setDate(shiftDay(date, -1))}>‹ 하루 전</button>
        <input type="date" value={date} onChange={event => setDate(event.target.value)} />
        <span className="weekday">{weekdayOf(date)}요일</span>
        <button className="ghost-button" onClick={() => setDate(shiftDay(date, 1))}>다음 날 ›</button>
        <button className="ghost-button" onClick={() => setDate(todayKey())}>오늘</button>
        <label className="class-filter">
          학급
          <select value={classFilter} onChange={event => setClassFilter(event.target.value)}>
            <option value="">전체</option>
            {active.map(item => {
              const subject = data.subjects.find(value => value.id === item.subjectId)
              return <option key={item.id} value={item.id}>{subject?.name} {item.name}</option>
            })}
          </select>
        </label>
      </div>

      {!daySessions.length && (
        <p className="banner">
          {classFilter ? '이 날은 이 학급 수업이 없습니다.' : '이 날은 등록된 수업이 없습니다.'} 위 화살표나 날짜로 다른 날을 확인하세요.
        </p>
      )}

      {daySessions.length > 0 && (
        <div className="period-tabs">
          {daySessions.map(item => {
            const classroom = data.classes.find(value => value.id === item.classId)
            return (
              <button
                className={current?.id === item.id ? 'period-tab on' : 'period-tab'}
                key={item.id}
                onClick={() => setActiveId(item.id)}
              >
                {item.period}교시 {classroom?.name}
                {item.swappedFrom && <em className="swap-tag">대체</em>}
              </button>
            )
          })}
        </div>
      )}

      {current && (() => {
        const classroom = data.classes.find(item => item.id === current.classId)
        if (!classroom) return null
        return (
          <div className="session-block">
            <h3 className="session-title">
              {current.period}교시 {classroom.name}
              {current.swappedFrom && <em className="swap-tag">{current.swappedFrom}요일 대체</em>}
              {' — '}{sessionLabel(data, current)}
              <button className="ghost-button digest-download-open" onClick={() => setShowDownload(true)}>누가기록 다운로드</button>
            </h3>

            {!classroom.students.length && <p className="hint">학생 명단이 비어 있습니다.</p>}

            {classroom.students.length > 0 && (
              <>
                <p className="hint">체크하지 않은 학생은 출석으로 봅니다.</p>
                <div className="table-wrap">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>학번</th>
                      <th>성명</th>
                      <th>출결</th>
                      <th>수업 중 특기사항</th>
                      <th>누계</th>
                      <th>누가기록</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classroom.students.map(student => {
                      const key = `${current.id}:${student.id}`
                      const value = data.attendance[key]
                      const late = countFor(classroom.id, student.id, '지각')
                      const absent = countFor(classroom.id, student.id, '결석')
                      return (
                        <tr key={student.id}>
                          <td className="att-no">{student.number}</td>
                          <td className="att-name">{student.name}</td>
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
                              placeholder="관찰 내용, 활동 특기사항"
                              onChange={event => update({ activities: { ...data.activities, [key]: event.target.value } })}
                            />
                          </td>
                          <td className="tally">
                            {absent > 0 && <span className="warn">결석 {absent}</span>}
                            {late > 0 && <span>지각 {late}</span>}
                          </td>
                          <td>
                            <button className="ghost-button" onClick={() => setDigestStudentId(student.id)}>보기</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {digestStudentId && current && (() => {
        const classroom = data.classes.find(item => item.id === current.classId)
        const student = classroom?.students.find(item => item.id === digestStudentId)
        if (!classroom || !student) return null
        return (
          <StudentDigestModal
            data={data}
            sessions={sessions}
            classroom={classroom}
            student={student}
            onClose={() => setDigestStudentId(null)}
          />
        )
      })()}

      {showDownload && current && (() => {
        const classroom = data.classes.find(item => item.id === current.classId)
        if (!classroom) return null
        return (
          <DigestDownloadModal
            classroom={classroom}
            onClose={() => setShowDownload(false)}
            onDownload={studentId => {
              if (studentId) exportStudentDigestXlsx(data, sessions, classroom.id, studentId)
              else exportClassDigestXlsx(data, sessions, classroom.id)
              setShowDownload(false)
            }}
          />
        )
      })()}
    </section>
  )
}

/** 학생 한 명의 학기 전체 출결·특기사항을 모아 보여주는 창. 세특 쓸 때 근거로 쓴다. */
function StudentDigestModal({
  data,
  sessions,
  classroom,
  student,
  onClose,
}: {
  data: AppData
  sessions: Session[]
  classroom: AppData['classes'][number]
  student: AppData['classes'][number]['students'][number]
  onClose: () => void
}) {
  const own = sessions
    .filter(item => item.classId === classroom.id && item.mode !== 'none' && !item.cancelled)
    .sort((left, right) => (left.date + String(left.period)).localeCompare(right.date + String(right.period)))

  const notes = own
    .map(item => ({
      session: item,
      note: data.activities[`${item.id}:${student.id}`] || '',
      status: data.attendance[`${item.id}:${student.id}`],
    }))
    .filter(item => item.note || (item.status && item.status !== '출석'))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">누가기록</p>
            <h2>{classroom.name} · {studentLabel(student)}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>닫기</button>
        </header>
        <div className="modal-body">
          {!notes.length && <p className="hint">쌓인 기록이 없습니다.</p>}
          {notes.map(item => (
            <div className="digest-row" key={item.session.id}>
              <b>{formatShort(item.session.date)}</b>
              <span className="digest-lesson">{sessionLabel(data, item.session)}</span>
              {item.status && item.status !== '출석' && <span className="warn">{item.status}</span>}
              <span>{item.note}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/** 누가기록을 엑셀로 내려받을 대상(반 전체 / 학생 한 명)을 고르는 창. */
function DigestDownloadModal({
  classroom,
  onClose,
  onDownload,
}: {
  classroom: AppData['classes'][number]
  onClose: () => void
  onDownload: (studentId: string | null) => void
}) {
  const [studentId, setStudentId] = useState('')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal narrow" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">누가기록 다운로드</p>
            <h2>{classroom.name}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>닫기</button>
        </header>
        <div className="modal-body">
          <p className="hint">반 전체를 한 시트로 받거나, 학생 한 명만 골라 받을 수 있습니다.</p>
          <div className="field-grid">
            <label>
              대상 학생 (선택 안 하면 반 전체)
              <select value={studentId} onChange={event => setStudentId(event.target.value)}>
                <option value="">전체 학생</option>
                {classroom.students.map(item => (
                  <option key={item.id} value={item.id}>{studentLabel(item)}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <footer className="modal-foot">
          <button className="ghost-button" onClick={onClose}>취소</button>
          <button className="primary-button" onClick={() => onDownload(studentId || null)}>엑셀로 내려받기</button>
        </footer>
      </section>
    </div>
  )
}
