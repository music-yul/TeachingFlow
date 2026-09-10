import { useEffect, useRef, useState } from 'react'
import type { AppData, Evaluation, EvaluationItem, Session } from '../types'
import { makeId } from '../storage'
import {
  attendanceKey,
  classFillRate,
  clampScore,
  evalCounts,
  evaluationClasses,
  maxTotal,
  noteKey,
  rawTotal,
  scoreKey,
  weightedScore,
} from '../evaluation'
import { exportEvaluationXlsx, printCurrentView } from '../exportPrint'

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
  sessions: Session[]
  jumpTo: { evaluationId: string; classId: string } | null
  onJumpHandled: () => void
  onOpenSession: (sessionId: string) => void
}

export default function EvaluationsView({ data, update, sessions, jumpTo, onJumpHandled, onOpenSession }: Props) {
  const usable = data.subjects.filter(item => item.usesProgress !== false)
  const [subjectId, setSubjectId] = useState(usable[0]?.id || '')
  const [openId, setOpenId] = useState<string | null>(null)
  const [jumpClassId, setJumpClassId] = useState<string | undefined>(undefined)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!jumpTo) return
    const target = data.evaluations.find(item => item.id === jumpTo.evaluationId)
    if (target) {
      setSubjectId(target.subjectId)
      setOpenId(target.id)
      setJumpClassId(jumpTo.classId)
    }
    onJumpHandled()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo])

  const subject = usable.find(item => item.id === subjectId) || usable[0]
  if (!subject) {
    return (
      <section className="panel empty-panel">
        평가를 만들 과목이 없습니다. <b>설정 &gt; 학급·시간표</b>에서 과목을 먼저 등록해 주세요.
      </section>
    )
  }

  const evaluations = data.evaluations.filter(item => item.subjectId === subject.id)
  const openEvaluation = evaluations.find(item => item.id === openId)

  if (openEvaluation) {
    return (
      <EvaluationEntry
        key={openEvaluation.id}
        data={data}
        evaluation={openEvaluation}
        update={update}
        sessions={sessions}
        initialClassId={jumpClassId}
        onOpenSession={onOpenSession}
        onBack={() => setOpenId(null)}
      />
    )
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
        <button className="primary-button" onClick={() => setCreating(true)}>+ 새 평가 만들기</button>
      </div>

      {!evaluations.length && !creating && <p className="hint">등록된 평가가 없습니다.</p>}

      <div className="eval-list">
        {evaluations.map(evaluation => {
          const classes = evaluationClasses(data, evaluation)
          const overallFill = classes.length
            ? Math.round(classes.reduce((sum, c) => sum + classFillRate(data, evaluation, c.students), 0) / classes.length)
            : 0
          const type = data.evaluationTypes.find(item => item.id === evaluation.typeId)
          return (
            <button className="eval-row" key={evaluation.id} onClick={() => setOpenId(evaluation.id)}>
              <div className="eval-row-main">
                <b>{evaluation.name}</b>
                <span className="eval-meta">
                  {type?.name} · {evaluation.weight}% · {evaluation.date || '날짜 미정'} ·{' '}
                  {classes.length ? classes.map(c => c.name).join(', ') : '대상 없음'}
                </span>
              </div>
              <div className="eval-row-fill">
                <div className="eval-fill-bar"><span style={{ width: `${overallFill}%` }} /></div>
                <small>{overallFill}%</small>
              </div>
            </button>
          )
        })}
      </div>

      {creating && (
        <EvaluationCreateModal
          data={data}
          subjectId={subject.id}
          update={update}
          onClose={() => setCreating(false)}
          onCreated={id => { setCreating(false); setOpenId(id) }}
        />
      )}
    </section>
  )
}

function EvaluationCreateModal({
  data,
  subjectId,
  update,
  onClose,
  onCreated,
}: {
  data: AppData
  subjectId: string
  update: (change: Partial<AppData>) => void
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const classes = data.classes.filter(item => !item.archived && item.subjectId === subjectId)
  const [name, setName] = useState('')
  const [typeId, setTypeId] = useState(data.evaluationTypes[0]?.id || '')
  const [weight, setWeight] = useState(30)
  const [date, setDate] = useState('')
  const [classIds, setClassIds] = useState<string[]>([])
  const [newTypeName, setNewTypeName] = useState('')

  const toggleClass = (id: string) => {
    setClassIds(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]))
  }

  const addType = () => {
    if (!newTypeName.trim()) return
    const type = { id: makeId('evtype'), name: newTypeName.trim() }
    update({ evaluationTypes: [...data.evaluationTypes, type] })
    setTypeId(type.id)
    setNewTypeName('')
  }

  const create = () => {
    if (!name.trim()) return
    const evaluation: Evaluation = {
      id: makeId('eval'),
      subjectId,
      name: name.trim(),
      typeId,
      weight,
      date,
      classIds,
      items: [],
    }
    update({ evaluations: [...data.evaluations, evaluation] })
    onCreated(evaluation.id)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <h2>새 평가 만들기</h2>
          <button className="ghost-button" onClick={onClose}>닫기</button>
        </header>
        <div className="modal-body">
          <div className="field-grid">
            <label>평가명<input value={name} placeholder="예: 다양한 악기 탐색 및 연주" onChange={event => setName(event.target.value)} /></label>
            <label>
              평가 유형
              <select value={typeId} onChange={event => setTypeId(event.target.value)}>
                {data.evaluationTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>반영 비율(%)<input type="number" min={0} max={100} value={weight} onChange={event => setWeight(Number(event.target.value))} /></label>
            <label>평가일<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
          </div>

          <div className="inline-form">
            <input value={newTypeName} placeholder="유형 직접 추가 (예: 자기평가)" onChange={event => setNewTypeName(event.target.value)} />
            <button className="ghost-button" onClick={addType}>+ 유형 추가</button>
          </div>

          <div className="block">
            <h3>대상 학급</h3>
            <p className="hint">아무것도 안 고르면 이 과목의 모든 학급이 대상입니다.</p>
            <div className="eval-class-picker">
              {classes.map(item => (
                <label className={classIds.includes(item.id) ? 'class-check on' : 'class-check'} key={item.id}>
                  <input type="checkbox" checked={classIds.includes(item.id)} onChange={() => toggleClass(item.id)} />
                  {item.name}
                </label>
              ))}
              {!classes.length && <p className="hint">이 과목에 등록된 학급이 없습니다.</p>}
            </div>
          </div>
        </div>
        <footer className="modal-foot">
          <button className="ghost-button" onClick={onClose}>취소</button>
          <button className="primary-button" onClick={create} disabled={!name.trim()}>만들고 평가 요소 설정하기</button>
        </footer>
      </section>
    </div>
  )
}

function EvaluationEntry({
  data,
  evaluation,
  update,
  sessions,
  initialClassId,
  onOpenSession,
  onBack,
}: {
  data: AppData
  evaluation: Evaluation
  update: (change: Partial<AppData>) => void
  sessions: Session[]
  initialClassId?: string
  onOpenSession: (sessionId: string) => void
  onBack: () => void
}) {
  const classes = evaluationClasses(data, evaluation)
  const [classId, setClassId] = useState(initialClassId || classes[0]?.id || '')
  const classroom = classes.find(item => item.id === classId) || classes[0]
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const relatedSessions = sessions.filter(item =>
    item.subjectId === evaluation.subjectId
    && item.date === evaluation.date
    && !item.cancelled
    && (!evaluation.classIds.length || evaluation.classIds.includes(item.classId)),
  )

  const updateEvaluation = (change: Partial<Evaluation>) => {
    update({ evaluations: data.evaluations.map(item => (item.id === evaluation.id ? { ...item, ...change } : item)) })
  }

  const setScore = (itemId: string, studentId: string, raw: string) => {
    const key = scoreKey(evaluation.id, itemId, studentId)
    const scores = { ...data.scores }
    if (raw.trim() === '') {
      delete scores[key]
    } else {
      const num = Number(raw)
      if (Number.isNaN(num)) return
      const item = evaluation.items.find(value => value.id === itemId)
      scores[key] = clampScore(num, item?.maxScore ?? 0)
    }
    update({ scores })
  }

  const setNote = (studentId: string, value: string) => {
    update({ evaluationNotes: { ...data.evaluationNotes, [noteKey(evaluation.id, studentId)]: value } })
  }

  const setAttendance = (studentId: string, status: 'present' | 'absent') => {
    const key = attendanceKey(evaluation.id, studentId)
    const current = data.evalAttendance[key]
    const evalAttendance = { ...data.evalAttendance }
    if (current === status) delete evalAttendance[key]
    else evalAttendance[key] = status
    update({ evalAttendance })
  }

  const applyBasicScores = (studentId: string) => {
    const scores = { ...data.scores }
    evaluation.items.forEach(item => {
      if (item.basicScore !== undefined) scores[scoreKey(evaluation.id, item.id, studentId)] = item.basicScore
    })
    update({ scores, evalAttendance: { ...data.evalAttendance, [attendanceKey(evaluation.id, studentId)]: 'present' } })
  }

  const focusCell = (rowIndex: number, colIndex: number) => {
    const target = inputRefs.current[`${rowIndex}:${colIndex}`]
    target?.focus()
    target?.select()
  }

  const max = maxTotal(evaluation)
  const students = classroom?.students || []
  const counts = evalCounts(data, evaluation, students)
  const [mode, setMode] = useState<'score' | 'settings'>('score')
  const [onlyAbsent, setOnlyAbsent] = useState(false)
  const visibleStudents = students.filter(student => {
    if (!onlyAbsent) return true
    const status = data.evalAttendance[attendanceKey(evaluation.id, student.id)]
    return status !== 'present'
  })

  return (
    <section className="panel eval-entry">
      <div className="toolbar">
        <button className="ghost-button" onClick={onBack}>‹ 평가 목록</button>
        <h2>{evaluation.name}</h2>
        <div className="eval-mode-tabs">
          <button className={mode === 'score' ? 'subtab active' : 'subtab'} onClick={() => setMode('score')}>채점표</button>
          <button className={mode === 'settings' ? 'subtab active' : 'subtab'} onClick={() => setMode('settings')}>평가 설정</button>
        </div>
        {mode === 'score' && (
          <div className="toolbar-actions no-print">
            <button className="ghost-button" onClick={() => exportEvaluationXlsx(data, evaluation)}>엑셀로 내보내기</button>
            <button className="ghost-button" onClick={printCurrentView}>인쇄</button>
          </div>
        )}
      </div>

      {mode === 'settings' && (
        <>
          <EvaluationSettings data={data} evaluation={evaluation} update={updateEvaluation} />

          {relatedSessions.length > 0 && (
            <div className="block">
              <h3>관련 수업 일정</h3>
              <div className="eval-related-sessions">
                {relatedSessions.map(item => {
                  const cls = data.classes.find(value => value.id === item.classId)
                  return (
                    <button className="ghost-button" key={item.id} onClick={() => onOpenSession(item.id)}>
                      {item.date} · {item.period}교시 · {cls?.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'score' && (
        <>
          {classes.length > 1 && (
            <div className="eval-class-tabs">
              {classes.map(item => (
                <button className={classId === item.id ? 'period-tab on' : 'period-tab'} key={item.id} onClick={() => setClassId(item.id)}>
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {classroom && (
            <div className="eval-summary-bar">
              <span>전체 {counts.total}명</span>
              <span className="on">응시 {counts.present}명</span>
              <span className="off">미응시 {counts.absent}명</span>
              {counts.unmarked > 0 && <span className="muted">미확인 {counts.unmarked}명</span>}
              <span className="muted">채점 완료 {counts.graded}명</span>
              <label className="eval-only-absent">
                <input type="checkbox" checked={onlyAbsent} onChange={event => setOnlyAbsent(event.target.checked)} />
                미응시만 보기
              </label>
            </div>
          )}

          {!evaluation.items.length && (
            <p className="banner">
              아직 평가 요소가 없습니다. 위 <b>평가 설정</b> 탭에서 요소를 먼저 추가해 주세요.
            </p>
          )}

          {evaluation.items.length > 0 && classroom && (
            <>
              <div className="table-wrap">
                <table className="eval-roster-table">
                  <thead>
                    <tr>
                      <th className="eval-name-col">번호 · 이름</th>
                      <th>응시</th>
                      <th>원점수<small>/{max}</small></th>
                      <th>반영점수<small>/{evaluation.weight}</small></th>
                      <th className="eval-note-col">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map(student => {
                      const attStatus = data.evalAttendance[attendanceKey(evaluation.id, student.id)]
                      return (
                        <tr className={attStatus === 'absent' ? 'eval-row-absent' : ''} key={student.id}>
                          <th className="eval-name-col">{student.number}. {student.name}</th>
                          <td className="eval-att-cell">
                            {attStatus === 'absent' ? (
                              <>
                                <span className="eval-absent-tag">미응시</span>
                                <button className="eval-att-undo" onClick={() => setAttendance(student.id, 'present')}>응시로 변경</button>
                                {evaluation.items.some(item => item.basicScore !== undefined) && (
                                  <button className="eval-basic-apply" title="등록해둔 기본점수를 이 학생의 모든 요소에 채웁니다" onClick={() => applyBasicScores(student.id)}>
                                    기본점수 적용
                                  </button>
                                )}
                              </>
                            ) : (
                              <button className="eval-att-mark" onClick={() => setAttendance(student.id, 'absent')}>미응시로 표시</button>
                            )}
                          </td>
                          <td className="eval-total">{rawTotal(data, evaluation, student.id)}</td>
                          <td className="eval-total">{Math.round(weightedScore(data, evaluation, student.id) * 10) / 10}</td>
                          <td>
                            <input
                              className="eval-note-input"
                              value={data.evaluationNotes[noteKey(evaluation.id, student.id)] || ''}
                              placeholder="예: 9/8 리코더X"
                              onChange={event => setNote(student.id, event.target.value)}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p className="hint">아래에서 요소마다 점수를 매깁니다. 채점기준이 있으면 버튼을, 없으면 숫자 칸을 씁니다.</p>

              {evaluation.items.map((item, itemIndex) => (
                <div className="eval-item-block" key={item.id}>
                  <div className="eval-item-block-crit">
                    <b>{itemIndex + 1}. {item.name}</b>
                    <small>{item.maxScore}점 만점</small>
                    {item.levels?.length ? (
                      <ul className="eval-criteria-list">
                        {item.levels.map(level => (
                          <li key={level.id}><b>{level.score}점</b> {level.description}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="hint">등록된 채점기준이 없습니다. 오른쪽에 숫자를 직접 입력하세요.</p>
                    )}
                  </div>
                  <div className="eval-item-block-scores">
                    {visibleStudents.map((student, rowIndex) => {
                      const value = data.scores[scoreKey(evaluation.id, item.id, student.id)]
                      return (
                        <div className="eval-score-row" key={student.id}>
                          <span className="eval-score-row-name">{student.number}. {student.name}</span>
                          {item.levels?.length ? (
                            <div className="eval-level-picker">
                              {item.levels.map(level => (
                                <button
                                  key={level.id}
                                  className={value === level.score ? 'eval-level-btn on' : 'eval-level-btn'}
                                  title={level.description}
                                  onClick={() => setScore(item.id, student.id, String(level.score))}
                                >
                                  {level.score}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input
                              ref={element => { inputRefs.current[`${rowIndex}:${itemIndex}`] = element }}
                              type="number"
                              className="eval-score-input"
                              min={0}
                              max={item.maxScore}
                              value={value ?? ''}
                              onChange={event => setScore(item.id, student.id, event.target.value)}
                              onKeyDown={event => {
                                if (event.key === 'Enter') {
                                  event.preventDefault()
                                  focusCell(rowIndex + 1, itemIndex)
                                }
                              }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
          {classroom && !students.length && <p className="hint">이 학급에 학생 명단이 없습니다.</p>}
          {classroom && students.length > 0 && !visibleStudents.length && <p className="hint">미응시로 표시된 학생이 없습니다.</p>}
        </>
      )}
    </section>
  )
}


function EvaluationSettings({
  data,
  evaluation,
  update,
}: {
  data: AppData
  evaluation: Evaluation
  update: (change: Partial<Evaluation>) => void
}) {
  const [itemName, setItemName] = useState('')
  const [itemMax, setItemMax] = useState(10)

  const addItem = () => {
    if (!itemName.trim()) return
    const item: EvaluationItem = { id: makeId('item'), name: itemName.trim(), maxScore: itemMax }
    update({ items: [...evaluation.items, item] })
    setItemName('')
  }

  const editItem = (id: string, change: Partial<EvaluationItem>) => {
    update({ items: evaluation.items.map(item => (item.id === id ? { ...item, ...change } : item)) })
  }

  const removeItem = (id: string) => {
    update({ items: evaluation.items.filter(item => item.id !== id) })
  }

  return (
    <div className="block">
      <h3>평가 정보 · 평가 요소</h3>
      <>
          <div className="field-grid">
            <label>평가명<input value={evaluation.name} onChange={event => update({ name: event.target.value })} /></label>
            <label>
              평가 유형
              <select value={evaluation.typeId} onChange={event => update({ typeId: event.target.value })}>
                {data.evaluationTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>반영 비율(%)<input type="number" min={0} max={100} value={evaluation.weight} onChange={event => update({ weight: Number(event.target.value) })} /></label>
            <label>평가일<input type="date" value={evaluation.date} onChange={event => update({ date: event.target.value })} /></label>
            <label>
              출제 계획표 파일명(참고용)
              <input
                value={evaluation.sourceFileName || ''}
                placeholder="예: 2026 음악연주 수행평가 계획표.pdf"
                onChange={event => update({ sourceFileName: event.target.value || undefined })}
              />
            </label>
          </div>

          <h4>평가 요소 (배점 합 {maxTotal(evaluation)}점)</h4>
          <div className="inline-form">
            <input value={itemName} placeholder="요소명 (예: 음정)" onChange={event => setItemName(event.target.value)} />
            <input type="number" min={0} value={itemMax} onChange={event => setItemMax(Number(event.target.value))} style={{ width: '5rem' }} />
            <button className="ghost-button" onClick={addItem}>+ 요소 추가</button>
          </div>

          {evaluation.items.map(item => (
            <EvalItemEditor key={item.id} item={item} editItem={editItem} removeItem={removeItem} />
          ))}
          {!evaluation.items.length && <p className="hint">요소를 하나 이상 추가해야 점수를 입력할 수 있습니다.</p>}
        </>
    </div>
  )
}

function EvalItemEditor({
  item,
  editItem,
  removeItem,
}: {
  item: EvaluationItem
  editItem: (id: string, change: Partial<EvaluationItem>) => void
  removeItem: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [levelScore, setLevelScore] = useState(item.maxScore)
  const [levelDesc, setLevelDesc] = useState('')

  const levels = item.levels || []

  const addLevel = () => {
    if (!levelDesc.trim()) return
    const next = [...levels, { id: makeId('level'), score: levelScore, description: levelDesc.trim() }]
      .sort((a, b) => b.score - a.score)
    editItem(item.id, { levels: next })
    setLevelDesc('')
  }

  const editLevel = (id: string, change: Partial<{ score: number; description: string }>) => {
    editItem(item.id, { levels: levels.map(level => (level.id === id ? { ...level, ...change } : level)) })
  }

  const removeLevel = (id: string) => {
    editItem(item.id, { levels: levels.filter(level => level.id !== id) })
  }

  return (
    <div className="eval-item-editor">
      <div className="eval-item-row">
        <input value={item.name} onChange={event => editItem(item.id, { name: event.target.value })} />
        <input type="number" min={0} value={item.maxScore} onChange={event => editItem(item.id, { maxScore: Number(event.target.value) })} />
        <span className="hint">점</span>
        <button className="ghost-button" onClick={() => setOpen(!open)}>
          {open ? '채점기준 닫기' : levels.length ? `채점기준 ${levels.length}개` : '+ 채점기준'}
        </button>
        <button className="ghost-button" onClick={() => removeItem(item.id)}>삭제</button>
      </div>

      {open && (
        <div className="eval-rubric-editor">
          <p className="hint">
            점수·설명을 등록해두면 채점표에서 숫자를 직접 입력하는 대신 <b>버튼 클릭 한 번으로 점수가 들어갑니다.</b>
            비워두면 지금처럼 숫자를 직접 입력합니다.
          </p>
          {levels.map(level => (
            <div className="eval-level-row" key={level.id}>
              <input
                type="number"
                value={level.score}
                onChange={event => editLevel(level.id, { score: Number(event.target.value) })}
              />
              <span className="hint">점</span>
              <input
                className="eval-level-desc"
                value={level.description}
                onChange={event => editLevel(level.id, { description: event.target.value })}
              />
              <button className="ghost-button" onClick={() => removeLevel(level.id)}>삭제</button>
            </div>
          ))}
          <div className="eval-level-row">
            <input type="number" value={levelScore} onChange={event => setLevelScore(Number(event.target.value))} />
            <span className="hint">점</span>
            <input
              className="eval-level-desc"
              placeholder="이 점수를 주는 기준 (예: 기본 주법을 안정적으로 연주함)"
              value={levelDesc}
              onChange={event => setLevelDesc(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') addLevel() }}
            />
            <button className="primary-button" onClick={addLevel}>+ 추가</button>
          </div>

          <label className="eval-basic-score">
            미참여·미제출 기본점수
            <input
              type="number"
              min={0}
              value={item.basicScore ?? ''}
              placeholder="없음"
              onChange={event => editItem(item.id, { basicScore: event.target.value === '' ? undefined : Number(event.target.value) })}
            />
            <span className="hint">채점표에서 미응시로 표시한 학생에게 한 번에 채울 수 있습니다.</span>
          </label>
        </div>
      )}
    </div>
  )
}
