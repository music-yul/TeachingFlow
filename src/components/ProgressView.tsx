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
  const usable = data.subjects.filter(item => item.usesProgress !== false)
  const [subjectId, setSubjectId] = useState(usable[0]?.id || '')
  const [memoTarget, setMemoTarget] = useState<{ key: string; title: string } | null>(null)

  const subject = usable.find(item => item.id === subjectId) || usable[0]
  if (!subject) {
    return (
      <section className="panel empty-panel">
        진도표를 쓰는 과목이 없습니다. <b>설정 &gt; 학급·시간표</b>에서 과목을 추가하거나, 과목의 <b>진도표</b> 체크를 켜 주세요.
      </section>
    )
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
            {usable.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
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
                  <tr className={type?.emphasis ? 'marked-row' : ''} key={lesson.id}>
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
                                    {session.swappedFrom && <em className="swap-tag">대체</em>}
                                  </button>
                                </label>
                              </div>
                              <button
                                className={record.memo ? 'memo-button filled' : 'memo-button'}
                                title={record.memo || '메모 추가'}
                                onClick={() => setMemoTarget({ key, title: `${classroom.name} · ${index + 1}. ${lesson.title}` })}
                              >
                                {record.memo || '+ 메모'}
                              </button>
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
      {memoTarget && (
        <MemoModal
          title={memoTarget.title}
          value={data.progress[memoTarget.key]?.memo || ''}
          onChange={value => setProgress(memoTarget.key, { memo: value })}
          onClose={() => setMemoTarget(null)}
        />
      )}
    </section>
  )
}

function MemoModal({ title, value, onChange, onClose }: { title: string; value: string; onChange: (value: string) => void; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal narrow" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">수업 메모</p>
            <h2>{title}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>닫기</button>
        </header>
        <div className="modal-body">
          <textarea
            autoFocus
            className="memo-editor"
            value={value}
            placeholder="이 반 이 차시에 있었던 일, 다음 시간에 이어갈 내용 등"
            onChange={event => onChange(event.target.value)}
          />
        </div>
      </section>
    </div>
  )
}
