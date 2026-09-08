import { useState } from 'react'
import type { AppData, Progress, Session } from '../types'
import { coverage, formatShort, progressKey, todayKey, weekKeys } from '../schedule'

type Props = {
  data: AppData
  sessions: Session[]
  update: (change: Partial<AppData>) => void
  onSelect: (id: string) => void
}

export default function ProgressView({ data, sessions, update, onSelect }: Props) {
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id || '')
  const [memoTarget, setMemoTarget] = useState<string | null>(null)

  const subject = data.subjects.find(item => item.id === subjectId) || data.subjects[0]
  if (!subject) {
    return <section className="panel empty-panel">과목이 없습니다. 먼저 <b>학급 관리</b>에서 출석부를 올리거나 과목을 추가해 주세요.</section>
  }

  const classes = data.classes.filter(item => !item.archived && item.subjectId === subject.id)
  const lessons = data.lessons.filter(item => item.subjectId === subject.id)
  const week = weekKeys()
  const today = todayKey()
  const stats = coverage(data, sessions)

  const setProgress = (key: string, change: Progress) => {
    update({ progress: { ...data.progress, [key]: { ...data.progress[key], ...change } } })
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <label>
          과목{' '}
          <select value={subject.id} onChange={event => setSubjectId(event.target.value)}>
            {data.subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <span className="legend"><i className="dot week" /> 이번 주 <i className="dot done" /> 완료</span>
      </div>

      {!classes.length && <p className="hint">이 과목에 등록된 학급이 없습니다.</p>}
      {!lessons.length && <p className="hint">수업 목록이 비어 있습니다. <b>수업 목록</b> 탭에서 진도를 먼저 등록해 주세요.</p>}

      {classes.length > 0 && lessons.length > 0 && (
        <div className="table-wrap">
          <table className="progress-table">
            <thead>
              <tr>
                <th className="sticky-col">차시 / 수업 내용</th>
                {classes.map(item => {
                  const stat = stats.find(value => value.classId === item.id)
                  return (
                    <th key={item.id}>
                      {item.name}
                      <small>{stat ? `${stat.total}시간` : ''}</small>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson, index) => {
                const type = data.types.find(item => item.id === lesson.typeId)
                return (
                  <tr key={lesson.id}>
                    <th className="sticky-col">
                      <span className="type-chip" style={{ background: type?.color || '#8b93a2' }}>{type?.name || '기타'}</span>
                      <b>{index + 1}. {lesson.title}</b>
                      {lesson.note && <small className="lesson-note">{lesson.note}</small>}
                    </th>
                    {classes.map(classroom => {
                      const session = sessions.find(
                        item => item.classId === classroom.id && item.lessonIds.includes(lesson.id),
                      )
                      const key = progressKey(classroom.id, lesson.id)
                      const record = data.progress[key] || {}
                      const inWeek = session ? week.includes(session.date) : false
                      const isToday = session ? session.date === today : false
                      const cellClass = ['progress-cell']
                      if (record.done) cellClass.push('done')
                      if (inWeek) cellClass.push('week')
                      if (isToday) cellClass.push('today')
                      return (
                        <td className={cellClass.join(' ')} key={classroom.id}>
                          {session ? (
                            <>
                              <div className="cell-top">
                                <label className="check">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(record.done)}
                                    onChange={event => setProgress(key, { done: event.target.checked })}
                                  />
                                  <button className="link-button" onClick={() => onSelect(session.id)}>
                                    {formatShort(session.date)} · {session.period}교시
                                  </button>
                                </label>
                              </div>
                              {memoTarget === key ? (
                                <textarea
                                  autoFocus
                                  value={record.memo || ''}
                                  placeholder="이 반 이 차시 메모"
                                  onChange={event => setProgress(key, { memo: event.target.value })}
                                  onBlur={() => setMemoTarget(null)}
                                />
                              ) : (
                                <button className="memo-button" onClick={() => setMemoTarget(key)}>
                                  {record.memo ? record.memo : '+ 메모'}
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="cell-empty">시간 부족</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {classes.length > 0 && (
        <div className="coverage">
          <h3>수업 시간 대비 진도 분량</h3>
          <table>
            <thead>
              <tr><th>학급</th><th>학기 중 수업 시간</th><th>등록된 차시</th><th>여유</th></tr>
            </thead>
            <tbody>
              {classes.map(classroom => {
                const stat = stats.find(item => item.classId === classroom.id)
                if (!stat) return null
                return (
                  <tr key={classroom.id}>
                    <td>{classroom.name}</td>
                    <td>{stat.total}</td>
                    <td>{stat.lessonCount}</td>
                    <td className={stat.spare < 0 ? 'warn' : ''}>
                      {stat.spare >= 0 ? `${stat.spare}시간 남음` : `${-stat.spare}시간 부족`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
