import { useState } from 'react'
import type { AppData, Progress, Session } from '../types'
import { coverage, formatShort, progressKey, todayKey } from '../schedule'
import { exportProgressXlsx, printCurrentView } from '../exportPrint'

type Props = {
  data: AppData
  sessions: Session[]
  update: (change: Partial<AppData>) => void
  onSelect: (id: string) => void
  onOpenEvaluation: (evaluationId: string, classId: string) => void
}

export default function ProgressView({ data, sessions, update, onSelect, onOpenEvaluation }: Props) {
  const usable = data.subjects.filter(item => item.usesProgress !== false)
  const [subjectId, setSubjectId] = useState(usable[0]?.id || '')
  const [classFilter, setClassFilter] = useState('')
  const [memoTarget, setMemoTarget] = useState<{ key: string; title: string } | null>(null)

  const subject = usable.find(item => item.id === subjectId) || usable[0]
  if (!subject) {
    return (
      <section className="panel empty-panel">
        진도표를 쓰는 과목이 없습니다. <b>환경 설정 &gt; 학급·시간표</b>에서 과목을 추가하거나, 과목의 <b>진도표</b> 체크를 켜 주세요.
      </section>
    )
  }

  const classes = data.classes.filter(item => !item.archived && item.subjectId === subject.id)
  const shownClasses = classFilter ? classes.filter(item => item.id === classFilter) : classes
  const lessons = data.lessons.filter(item => item.subjectId === subject.id)
  const today = todayKey()
  const stats = coverage(data, sessions)
  const changedSessions = sessions
    .filter(item => shownClasses.some(classroom => classroom.id === item.classId)
      && !item.cancelled && !item.hidden && !item.extra
      && !data.overrides[item.id]?.groupId && item.mode !== 'normal')
    .sort((left, right) => left.date.localeCompare(right.date) || left.period - right.period)

  const restoreSession = (session: Session) => {
    const overrides = { ...data.overrides }
    delete overrides[session.id]
    update({ overrides })
  }

  const setProgress = (key: string, change: Progress) => {
    update({ progress: { ...data.progress, [key]: { ...data.progress[key], ...change } } })
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <label>
          과목{' '}
          <select value={subject.id} onChange={event => { setSubjectId(event.target.value); setClassFilter('') }}>
            {usable.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="class-filter">
          학급
          <select value={classFilter} onChange={event => setClassFilter(event.target.value)}>
            <option value="">전체 (가로 스크롤)</option>
            {classes.map(item => <option key={item.id} value={item.id}>{item.name}만 보기</option>)}
          </select>
        </label>
        <span className="legend"><i className="dot today" /> 오늘 <i className="dot done" /> 완료</span>
        <div className="toolbar-actions no-print">
          <button className="ghost-button" onClick={() => exportProgressXlsx(data, sessions, subject.id)}>엑셀로 내보내기</button>
          <button className="ghost-button" onClick={printCurrentView}>인쇄</button>
        </div>
      </div>

      {!classes.length && <p className="hint">이 과목에 등록된 학급이 없습니다.</p>}
      {!lessons.length && <p className="hint">수업 목록이 비어 있습니다. <b>수업 목록</b> 탭에서 진도를 먼저 등록해 주세요.</p>}

      {changedSessions.length > 0 && (
        <details className="block" open>
          <summary><b>변경한 수업 ({changedSessions.length})</b></summary>
          <p className="hint">자습 등으로 진도표에서 빠진 시간도 여기서 확인할 수 있습니다. 원래대로 되돌리면 이후 진도 일정도 자동으로 다시 배정됩니다. 완료·채점·출결 기록은 유지됩니다.</p>
          <div className="table-wrap">
            <table className="progress-table">
              <thead><tr><th>날짜 · 교시</th><th>학급</th><th>변경 내용</th><th>사유</th><th>변경 취소</th></tr></thead>
              <tbody>
                {changedSessions.map(session => (
                  <tr key={session.id}>
                    <td><button className="link-button" onClick={() => onSelect(session.id)}>{session.date} · {session.period}교시</button></td>
                    <td>{classes.find(item => item.id === session.classId)?.name}</td>
                    <td>{session.mode === 'none' ? '수업 없음 · 뒤 진도 미룸' : session.mode === 'extend' ? '앞 차시 이어서 · 뒤 진도 미룸' : '두 차시 한 번에 · 뒤 진도 당김'}</td>
                    <td>{session.label || '—'}</td>
                    <td><button className="ghost-button" onClick={() => restoreSession(session)}>원래대로</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {classes.length > 0 && lessons.length > 0 && (
        <div className="table-wrap">
          <table className="progress-table">
            <thead>
              <tr>
                <th className="sticky-col">차시 / 수업 내용</th>
                {shownClasses.map(item => {
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
                      {lesson.evaluationId && <span className="progress-eval-badge" title="평가와 연결된 차시">🎯</span>}
                      <b>{index + 1}. {lesson.title}</b>
                      {lesson.note && <small className="lesson-note">{lesson.note}</small>}
                    </th>
                    {shownClasses.map(classroom => {
                      const session = sessions.find(
                        item => item.classId === classroom.id && item.lessonIds.includes(lesson.id),
                      )
                      const key = progressKey(classroom.id, lesson.id)
                      const record = data.progress[key] || {}
                      const isToday = session ? session.date === today : false
                      const cellClass = ['progress-cell']
                      if (record.done) cellClass.push('done')
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
                              {lesson.evaluationId && (
                                <button
                                  className="progress-eval-link"
                                  onClick={() => onOpenEvaluation(lesson.evaluationId!, classroom.id)}
                                >
                                  🎯 채점표
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
            <tfoot>
              <tr className="progress-total-row">
                <th className="sticky-col">총 차시</th>
                {shownClasses.map(item => {
                  const stat = stats.find(value => value.classId === item.id)
                  return <td key={item.id}>{stat ? `${stat.lessonCount}차시` : '-'}</td>
                })}
              </tr>
              <tr className="progress-total-row">
                <th className="sticky-col">여유</th>
                {shownClasses.map(item => {
                  const stat = stats.find(value => value.classId === item.id)
                  return (
                    <td className={stat && stat.spare < 0 ? 'warn' : ''} key={item.id}>
                      {stat ? `${stat.spare}시간` : '-'}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
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
