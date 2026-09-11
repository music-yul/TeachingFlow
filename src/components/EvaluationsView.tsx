import { Fragment, useEffect, useRef, useState } from 'react'
import type { AppData, Evaluation, EvaluationItem, EvaluationTask, Session, TaskStatus } from '../types'
import { buildLevels, makeId } from '../storage'
import {
  classFillRate,
  clampScore,
  evalCounts,
  evaluationClasses,
  evaluationTasks,
  isAbsent,
  isAbsentAnywhere,
  maxTotal,
  noteKey,
  rawTotal,
  scoreKey,
  taskMax,
  taskScore,
  taskStatusKey,
  weightedScore,
} from '../evaluation'
import { linkedEvaluation } from '../evaluation'
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
  const deleteEvaluation = (evaluationId: string) => {
    if (!window.confirm('이 평가 영역을 삭제합니다. 여기에 입력한 점수·비고·응시 기록도 함께 지워지며 되돌릴 수 없습니다. 계속할까요?')) return
    const prefix = `${evaluationId}:`
    const scores = Object.fromEntries(Object.entries(data.scores).filter(([key]) => !key.startsWith(prefix)))
    const evaluationNotes = Object.fromEntries(Object.entries(data.evaluationNotes).filter(([key]) => !key.startsWith(prefix)))
    const taskStatus = Object.fromEntries(Object.entries(data.taskStatus).filter(([key]) => !key.startsWith(prefix)))
    const lessons = data.lessons.map(item => (item.evaluationId === evaluationId ? { ...item, evaluationId: undefined } : item))
    update({
      evaluations: data.evaluations.filter(item => item.id !== evaluationId),
      scores,
      evaluationNotes,
      taskStatus,
      lessons,
    })
  }
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
        평가를 만들 과목이 없습니다. <b>환경 설정 &gt; 학급·시간표</b>에서 과목을 먼저 등록해 주세요.
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
          const tasks = evaluationTasks(evaluation)
          return (
            <div className="eval-row" key={evaluation.id}>
              <button className="eval-row-open" onClick={() => setOpenId(evaluation.id)}>
                <div className="eval-row-main">
                  <div className="eval-row-title">
                    <b>{evaluation.name}</b>
                    <span className="eval-meta">
                      {type?.name} · {evaluation.weight}% · {maxTotal(evaluation)}점 ·{' '}
                      {classes.length ? classes.map(c => c.name).join(', ') : '대상 없음'}
                    </span>
                  </div>
                  <div className="eval-tree">
                    {tasks.map(task => (
                      <div className="eval-tree-task" key={task.id}>
                        <span className="eval-tree-task-name">{task.name || '(과제명 미입력)'}<em>{taskMax(task)}점</em></span>
                        <span className="eval-tree-items">
                          {task.items.length
                            ? task.items.map(item => (
                                <span className="eval-tree-item" key={item.id}>{item.name}<em>{item.maxScore}</em></span>
                              ))
                            : <span className="eval-tree-empty">요소 없음</span>}
                        </span>
                      </div>
                    ))}
                    {!tasks.length && <span className="eval-tree-empty">평가 과제 없음</span>}
                  </div>
                </div>
                <div className="eval-row-fill">
                  <div className="eval-fill-bar"><span style={{ width: `${overallFill}%` }} /></div>
                  <small>{overallFill}%</small>
                </div>
              </button>
              <button className="ghost-button eval-row-delete" title="이 평가 영역 삭제" onClick={() => deleteEvaluation(evaluation.id)}>삭제</button>
            </div>
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
  const [classIds, setClassIds] = useState<string[]>([])

  const toggleClass = (id: string) => {
    setClassIds(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]))
  }

  const create = () => {
    if (!name.trim()) return
    const evaluation: Evaluation = {
      id: makeId('eval'),
      subjectId,
      name: name.trim(),
      typeId,
      weight,
      classIds,
      // 과제명은 영역명과 다른 경우가 대부분이라 자동으로 채우지 않는다. 평가 설정 탭에서 직접 적는다.
      tasks: [{ id: makeId('task'), name: '', items: [] }],
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
          <p className="hint">
            평가 <b>영역</b>을 만듭니다. 영역 안에 평가 과제를, 과제 안에 평가 요소를 넣습니다.
            (예: 영역 &quot;악기 탐색 및 연주&quot; → 과제 &quot;악기 탐색&quot;·&quot;악기 연주&quot;)
          </p>
          <div className="field-grid">
            <label>평가 영역명<input value={name} placeholder="예: 판소리 '사랑가' 부르기" onChange={event => setName(event.target.value)} /></label>
            <label>
              평가 유형
              <select value={typeId} onChange={event => setTypeId(event.target.value)}>
                {data.evaluationTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>반영 비율(%)<input type="number" min={0} max={100} value={weight} onChange={event => setWeight(Number(event.target.value))} /></label>
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
          <button className="primary-button" onClick={create} disabled={!name.trim()}>만들고 평가 과제 설정하기</button>
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
  const [mode, setMode] = useState<'score' | 'settings'>('score')
  const [onlyAbsent, setOnlyAbsent] = useState(false)
  const classroom = classes.find(item => item.id === classId) || classes[0]
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const tasks = evaluationTasks(evaluation)
  const max = maxTotal(evaluation)
  const students = classroom?.students || []
  const counts = evalCounts(data, evaluation, students)

  // 평가일 대신, 이 평가와 연결된 차시가 배정된 수업들을 보여준다.
  const relatedSessions = sessions.filter(item =>
    !item.cancelled
    && item.subjectId === evaluation.subjectId
    && linkedEvaluation(data, item)?.id === evaluation.id,
  )

  const updateEvaluation = (change: Partial<Evaluation>) => {
    update({ evaluations: data.evaluations.map(item => (item.id === evaluation.id ? { ...item, ...change } : item)) })
  }

  const setScore = (itemId: string, maxScore: number, studentId: string, raw: string) => {
    const key = scoreKey(evaluation.id, itemId, studentId)
    const scores = { ...data.scores }
    if (raw.trim() === '') {
      delete scores[key]
    } else {
      const num = Number(raw)
      if (Number.isNaN(num)) return
      scores[key] = clampScore(num, maxScore)
    }
    update({ scores })
  }

  const toggleScore = (itemId: string, studentId: string, value: number) => {
    const key = scoreKey(evaluation.id, itemId, studentId)
    const scores = { ...data.scores }
    if (scores[key] === value) delete scores[key]
    else scores[key] = value
    update({ scores })
  }

  const setNote = (studentId: string, value: string) => {
    update({ evaluationNotes: { ...data.evaluationNotes, [noteKey(evaluation.id, studentId)]: value } })
  }

  /**
   * 미응시 표시를 켜고 끈다. 기본은 응시이므로 미응시만 관리하면 된다.
   * 미응시로 바꿀 때는 이미 넣어둔 요소 점수를 지운다(과제 점수로 대체되므로 남겨두면 헷갈린다).
   */
  const toggleAbsent = (taskId: string, studentId: string) => {
    const key = taskStatusKey(evaluation.id, taskId, studentId)
    const taskStatus = { ...data.taskStatus }
    if (taskStatus[key]) {
      delete taskStatus[key]
      update({ taskStatus })
      return
    }
    taskStatus[key] = 'absent' as TaskStatus
    const scores = { ...data.scores }
    tasks.find(task => task.id === taskId)?.items.forEach(item => {
      delete scores[scoreKey(evaluation.id, item.id, studentId)]
    })
    update({ taskStatus, scores })
  }

  const focusCell = (rowIndex: number, colIndex: number) => {
    const target = inputRefs.current[`${rowIndex}:${colIndex}`]
    target?.focus()
    target?.select()
  }

  const visibleStudents = students.filter(student => (
    onlyAbsent ? isAbsentAnywhere(data, evaluation, student.id) : true
  ))

  // 요소 칸에 몇 번째 열인지 붙여 키보드 이동을 만든다.
  let columnCursor = 0
  const columnIndex: Record<string, number> = {}
  tasks.forEach(task => task.items.forEach(item => { columnIndex[item.id] = columnCursor++ }))

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
              <h3>이 평가와 연결된 수업</h3>
              <p className="hint">진도표에서 이 평가를 연결해둔 차시가 배정된 시간입니다.</p>
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
        <div className="eval-score-layout">
          <aside className="eval-rubric-sidebar">
            <h3 className="eval-rubric-sidebar-title">채점기준</h3>
            {tasks.map(task => (
              <div className="eval-rubric-task" key={task.id}>
                <b>{task.name || '(과제명 미입력)'} <small>{taskMax(task)}점</small></b>
                {task.items.map(item => (
                  <div className="eval-rubric-item" key={item.id}>
                    <span className="eval-rubric-item-name">{item.name} ({item.maxScore})</span>
                    {item.levels?.length ? (
                      <ul className="eval-criteria-list">
                        {item.levels.map(level => (
                          <li key={level.id}><b>{level.score}점</b> {level.description || '(설명 없음)'}</li>
                        ))}
                      </ul>
                    ) : <span className="hint">채점기준 없음 · 숫자 직접 입력</span>}
                  </div>
                ))}
              </div>
            ))}
            {!tasks.some(task => task.items.length) && <p className="hint">평가 설정 탭에서 요소·채점기준을 추가하면 여기 표시됩니다.</p>}
          </aside>

          <div className="eval-score-main">
          {classes.length > 1 && (
            <div className="eval-class-tabs">
              {classes.map(item => (
                <button className={classroom?.id === item.id ? 'period-tab on' : 'period-tab'} key={item.id} onClick={() => setClassId(item.id)}>
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {classroom && (
            <div className="eval-summary-bar">
              <span>전체 {counts.total}명</span>
              <span className="on">채점 완료 {counts.graded}명</span>
              {counts.remaining > 0 && <span className="muted">미채점 {counts.remaining}명</span>}
              <span className={counts.absent > 0 ? 'off' : 'muted'}>미응시 {counts.absent}명</span>
              <label className="eval-only-absent">
                <input type="checkbox" checked={onlyAbsent} onChange={event => setOnlyAbsent(event.target.checked)} />
                미응시자 보기
              </label>
            </div>
          )}

          {!tasks.some(task => task.items.length) && (
            <p className="banner">
              아직 평가 요소가 없습니다. 위 <b>평가 설정</b> 탭에서 평가 과제와 요소를 먼저 추가해 주세요.
            </p>
          )}

          {classroom && !students.length && <p className="hint">이 학급에 학생 명단이 없습니다.</p>}

          {classroom && students.length > 0 && tasks.some(task => task.items.length) && (
            <div className="table-wrap eval-grid-wrap">
              <table className="eval-grid">
                <thead>
                  <tr>
                    <th className="eg-sticky eg-no" rowSpan={2}>학번</th>
                    <th className="eg-sticky eg-name" rowSpan={2}>성명</th>
                    {tasks.map(task => (
                      <th className="eg-task" colSpan={task.items.length + 1} key={task.id}>
                        {task.name || '(과제명 미입력)'} <small>{taskMax(task)}</small>
                      </th>
                    ))}
                    <th className="eg-total" rowSpan={2}>합계<small>/{max}</small></th>
                    <th className="eg-total" rowSpan={2}>반영<small>/{evaluation.weight}</small></th>
                    <th className="eg-note" rowSpan={2}>비고</th>
                  </tr>
                  <tr>
                    {tasks.map(task => (
                      <Fragment key={task.id}>
                        <th className="eg-status">미응시</th>
                        {task.items.map(item => (
                          <th key={item.id}>{item.name}<small>{item.maxScore}</small></th>
                        ))}
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student, rowIndex) => (
                    <tr key={student.id}>
                      <td className="eg-sticky eg-no">{student.number}</td>
                      <td className="eg-sticky eg-name">{student.name}</td>
                      {tasks.map(task => {
                        const absent = isAbsent(data, evaluation.id, task.id, student.id)
                        return (
                          <Fragment key={task.id}>
                            <td className="eg-status">
                              <input
                                type="checkbox"
                                className="eg-absent-check"
                                checked={absent}
                                title={absent ? '응시로 되돌리기' : '미응시로 표시'}
                                onChange={() => toggleAbsent(task.id, student.id)}
                              />
                            </td>
                            {absent ? (
                              <td className="eg-locked" colSpan={task.items.length}>
                                미응시 · {taskScore(data, evaluation, task, student.id)}점 자동 부여
                              </td>
                            ) : (
                              task.items.map(item => {
                                const value = data.scores[scoreKey(evaluation.id, item.id, student.id)]
                                return (
                                  <td className="eg-cell" key={item.id}>
                                    {item.levels?.length ? (
                                      <div className="eval-level-picker">
                                        {item.levels.map(level => (
                                          <button
                                            key={level.id}
                                            className={value === level.score ? 'eval-level-btn on' : 'eval-level-btn'}
                                            title={level.description}
                                            onClick={() => toggleScore(item.id, student.id, level.score)}
                                          >
                                            {level.score}
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <input
                                        ref={element => { inputRefs.current[`${rowIndex}:${columnIndex[item.id]}`] = element }}
                                        type="number"
                                        className="eval-score-input"
                                        min={0}
                                        max={item.maxScore}
                                        value={value ?? ''}
                                        onChange={event => setScore(item.id, item.maxScore, student.id, event.target.value)}
                                        onKeyDown={event => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault()
                                            focusCell(rowIndex + 1, columnIndex[item.id])
                                          }
                                        }}
                                      />
                                    )}
                                  </td>
                                )
                              })
                            )}
                          </Fragment>
                        )
                      })}
                      <td className="eval-total">{rawTotal(data, evaluation, student.id)}</td>
                      <td className="eval-total">{Math.round(weightedScore(data, evaluation, student.id) * 10) / 10}</td>
                      <td className="eg-note">
                        <input
                          className="eval-note-input"
                          value={data.evaluationNotes[noteKey(evaluation.id, student.id)] || ''}
                          placeholder=""
                          onChange={event => setNote(student.id, event.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {classroom && students.length > 0 && !visibleStudents.length && <p className="hint">남은 학생이 없습니다. 채점이 모두 끝났습니다.</p>}
          </div>
        </div>
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
  const tasks = evaluationTasks(evaluation)
  const [taskName, setTaskName] = useState('')

  const addTask = () => {
    if (!taskName.trim()) return
    update({ tasks: [...tasks, { id: makeId('task'), name: taskName.trim(), items: [] }] })
    setTaskName('')
  }

  const editTask = (id: string, change: Partial<EvaluationTask>) => {
    update({ tasks: tasks.map(task => (task.id === id ? { ...task, ...change } : task)) })
  }

  const removeTask = (id: string) => {
    if (!window.confirm('이 평가 과제와 그 안의 요소·채점기준을 모두 지웁니다. 계속할까요?')) return
    update({ tasks: tasks.filter(task => task.id !== id) })
  }

  return (
    <div className="block">
      <h3>평가 정보</h3>
      <div className="field-grid">
        <label>평가 영역명<input value={evaluation.name} onChange={event => update({ name: event.target.value })} /></label>
        <label>
          평가 유형
          <select value={evaluation.typeId} onChange={event => update({ typeId: event.target.value })}>
            {data.evaluationTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>반영 비율(%)<input type="number" min={0} max={100} value={evaluation.weight} onChange={event => update({ weight: Number(event.target.value) })} /></label>
      </div>

      <h3 className="eval-task-heading">평가 과제 <small>배점 합 {maxTotal(evaluation)}점</small></h3>
      <p className="hint">
        평가 영역 → <b>평가 과제</b> → 평가 요소 → 채점기준 순서입니다.
        미응시·미제출 점수는 과제 단위로 줍니다.
      </p>

      {tasks.map((task, index) => (
        <TaskEditor
          key={task.id}
          index={index}
          task={task}
          editTask={editTask}
          removeTask={removeTask}
        />
      ))}

      <div className="inline-form">
        <input
          value={taskName}
          placeholder="과제명 (예: 발림의 표현)"
          onChange={event => setTaskName(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') addTask() }}
        />
        <button className="primary-button" onClick={addTask}>+ 평가 과제 추가</button>
      </div>
      {!tasks.length && <p className="hint">평가 과제를 하나 이상 추가해야 점수를 입력할 수 있습니다.</p>}
    </div>
  )
}

function TaskEditor({
  index,
  task,
  editTask,
  removeTask,
}: {
  index: number
  task: EvaluationTask
  editTask: (id: string, change: Partial<EvaluationTask>) => void
  removeTask: (id: string) => void
}) {
  const [itemName, setItemName] = useState('')

  const addItem = () => {
    if (!itemName.trim()) return
    const draft: EvaluationItem = { id: makeId('item'), name: itemName.trim(), maxScore: 20, levelCount: 4, step: 4 }
    const item = { ...draft, levels: buildLevels(draft) }
    editTask(task.id, { items: [...task.items, item] })
    setItemName('')
  }

  const editItem = (id: string, change: Partial<EvaluationItem>) => {
    editTask(task.id, { items: task.items.map(item => (item.id === id ? { ...item, ...change } : item)) })
  }

  const removeItem = (id: string) => {
    editTask(task.id, { items: task.items.filter(item => item.id !== id) })
  }

  return (
    <div className="eval-task-editor">
      <div className="eval-task-head">
        <span className="eval-task-index">과제 {index + 1}</span>
        <input
          className="eval-task-name"
          value={task.name}
          placeholder="예: 시김새 및 창법"
          onChange={event => editTask(task.id, { name: event.target.value })}
        />
        <span className="hint">{taskMax(task)}점</span>
        <button className="ghost-button" onClick={() => removeTask(task.id)}>과제 삭제</button>
      </div>

      <div className="eval-task-fallback">
        <label>
          미응시 점수
          <input
            type="number"
            min={0}
            value={task.absentScore ?? ''}
            placeholder="0"
            onChange={event => editTask(task.id, { absentScore: event.target.value === '' ? undefined : Number(event.target.value) })}
          />
        </label>
        <span className="hint">채점표에서 미응시로 표시하면 이 과제 점수가 자동으로 이 값이 됩니다. 미제출도 미응시로 처리합니다.</span>
      </div>

      {task.items.map(item => (
        <EvalItemEditor key={item.id} item={item} editItem={editItem} removeItem={removeItem} />
      ))}

      <div className="inline-form">
        <input
          value={itemName}
          placeholder="요소명 (예: 발림의 적절성)"
          onChange={event => setItemName(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') addItem() }}
        />
        <button className="ghost-button" onClick={addItem}>+ 평가 요소 추가</button>
      </div>
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
  const levels = item.levels || []
  const count = item.levelCount ?? levels.length
  const step = item.step ?? 0

  /** 만점·기준 개수·급간 중 하나만 바뀌어도 칸을 다시 만든다. 써둔 설명은 순번대로 남는다. */
  const rebuild = (change: Partial<EvaluationItem>) => {
    const next = { ...item, ...change }
    editItem(item.id, { ...change, levels: buildLevels(next) })
  }

  const lowest = count > 0 ? item.maxScore - (count - 1) * step : item.maxScore
  const warn = count > 1 && lowest < 0

  return (
    <div className="eval-item-editor">
      <div className="eval-item-row">
        <input value={item.name} onChange={event => editItem(item.id, { name: event.target.value })} />
        <label className="eval-num">
          만점
          <input type="number" min={0} value={item.maxScore} onChange={event => rebuild({ maxScore: Number(event.target.value) })} />
        </label>
        <label className="eval-num">
          기준 개수
          <input type="number" min={0} max={10} value={count} onChange={event => rebuild({ levelCount: Number(event.target.value) })} />
        </label>
        <label className="eval-num">
          급간
          <input type="number" min={0} value={step} onChange={event => rebuild({ step: Number(event.target.value) })} />
        </label>
        <button className="ghost-button" onClick={() => setOpen(!open)}>
          {open ? '기준 접기' : `기준 ${levels.length}개 쓰기`}
        </button>
        <button
          className="ghost-button danger-button"
          title="이 평가 요소와 채점기준을 지웁니다"
          onClick={() => {
            if (window.confirm(`평가 요소 "${item.name}"과 채점기준을 지웁니다. 계속할까요?`)) removeItem(item.id)
          }}
        >
          요소 삭제
        </button>
      </div>

      {warn && (
        <p className="eval-warn">
          최저 기준이 {lowest}점이 됩니다. 만점·기준 개수·급간을 다시 확인해 주세요.
        </p>
      )}

      {open && (
        <div className="eval-rubric-editor">
          <p className="hint">
            점수 칸은 <b>만점 − 급간 × 순번</b>으로 자동 계산됩니다. 설명만 적으시면 됩니다.
            {levels.length > 0 && ` (현재: ${levels.map(level => level.score).join(', ')})`}
          </p>
          {levels.map((level, index) => (
            <div className="eval-level-row" key={level.id}>
              <span className="eval-level-score">{level.score}점</span>
              <input
                className="eval-level-desc"
                placeholder={index === 0 ? '가장 높은 수준의 기준 (예: 시김새를 정확하게 표현하고...)' : '이 점수를 주는 기준'}
                value={level.description}
                onChange={event => editItem(item.id, {
                  levels: levels.map(value => (value.id === level.id ? { ...value, description: event.target.value } : value)),
                })}
              />
            </div>
          ))}
          {!levels.length && <p className="hint">기준 개수를 1 이상으로 두면 칸이 생깁니다.</p>}
        </div>
      )}
    </div>
  )
}
