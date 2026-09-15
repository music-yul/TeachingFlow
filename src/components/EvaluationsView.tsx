import { Fragment, useEffect, useRef, useState } from 'react'
import type { AppData, EvalColumn, Evaluation, EvaluationItem, EvaluationTask, Session, TaskStatus } from '../types'
import { buildLevels, makeId } from '../storage'
import {
  classFillRate,
  clampScore,
  columnKey,
  evalCounts,
  evaluationClasses,
  evaluationColumns,
  evaluationTasks,
  groupKey,
  isAbsent,
  isAbsentAnywhere,
  maxTotal,
  noteKey,
  rawTotal,
  scoreKey,
  studentGroup,
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
    if (!window.confirm('이 평가 영역을 삭제합니다. 여기에 입력한 점수·비고·추가 열·응시 기록도 함께 지워지며 되돌릴 수 없습니다. 계속할까요?')) return
    const prefix = `${evaluationId}:`
    const scores = Object.fromEntries(Object.entries(data.scores).filter(([key]) => !key.startsWith(prefix)))
    const evaluationNotes = Object.fromEntries(Object.entries(data.evaluationNotes).filter(([key]) => !key.startsWith(prefix)))
    const columnValues = Object.fromEntries(Object.entries(data.columnValues).filter(([key]) => !key.startsWith(prefix)))
    const evaluationGroups = Object.fromEntries(Object.entries(data.evaluationGroups).filter(([key]) => !key.startsWith(prefix)))
    const taskStatus = Object.fromEntries(Object.entries(data.taskStatus).filter(([key]) => !key.startsWith(prefix)))
    const lessons = data.lessons.map(item => (item.evaluationId === evaluationId ? { ...item, evaluationId: undefined } : item))
    update({
      evaluations: data.evaluations.filter(item => item.id !== evaluationId),
      scores,
      evaluationNotes,
      columnValues,
      evaluationGroups,
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
  const [groupView, setGroupView] = useState(false)
  const [groupSync, setGroupSync] = useState(false)
  const classroom = classes.find(item => item.id === classId) || classes[0]
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const tasks = evaluationTasks(evaluation)
  const columns = evaluationColumns(evaluation)
  const frontColumns = columns.filter(column => column.position === 'front')
  const endColumns = columns.filter(column => column.position === 'end')
  const middleColumns = columns.filter(column => column.position !== 'front' && column.position !== 'end')
  const isGroupActivity = !!evaluation.groupActivity
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

  const collapsedTaskIds = evaluation.collapsedTaskIds || []
  const isTaskCollapsed = (taskId: string) => collapsedTaskIds.includes(taskId)
  const toggleTaskCollapse = (taskId: string) => {
    updateEvaluation({
      collapsedTaskIds: isTaskCollapsed(taskId)
        ? collapsedTaskIds.filter(id => id !== taskId)
        : [...collapsedTaskIds, taskId],
    })
  }

  const setScore = (itemId: string, maxScore: number, studentId: string, raw: string) => {
    const scores = { ...data.scores }
    const applyTo = (id: string) => {
      const cellKey = scoreKey(evaluation.id, itemId, id)
      if (raw.trim() === '') {
        delete scores[cellKey]
        return
      }
      const num = Number(raw)
      if (Number.isNaN(num)) return
      scores[cellKey] = clampScore(num, maxScore)
    }
    applyTo(studentId)
    if (groupSync) {
      const group = studentGroup(data, evaluation, students.find(item => item.id === studentId)!)
      if (group) {
        students.filter(item => item.id !== studentId && studentGroup(data, evaluation, item) === group)
          .forEach(item => applyTo(item.id))
      }
    }
    update({ scores })
  }

  const toggleScore = (itemId: string, studentId: string, value: number) => {
    const key = scoreKey(evaluation.id, itemId, studentId)
    const turningOff = data.scores[key] === value
    const scores = { ...data.scores }
    const applyTo = (id: string) => {
      const cellKey = scoreKey(evaluation.id, itemId, id)
      if (turningOff) delete scores[cellKey]
      else scores[cellKey] = value
    }
    applyTo(studentId)
    if (groupSync) {
      const group = studentGroup(data, evaluation, students.find(item => item.id === studentId)!)
      if (group) {
        students.filter(item => item.id !== studentId && studentGroup(data, evaluation, item) === group)
          .forEach(item => applyTo(item.id))
      }
    }
    update({ scores })
  }

  const setNote = (studentId: string, value: string) => {
    update({ evaluationNotes: { ...data.evaluationNotes, [noteKey(evaluation.id, studentId)]: value } })
  }

  const setColumnValue = (columnId: string, studentId: string, value: string) => {
    update({ columnValues: { ...data.columnValues, [columnKey(evaluation.id, columnId, studentId)]: value } })
  }

  const setGroup = (studentId: string, value: string) => {
    update({ evaluationGroups: { ...data.evaluationGroups, [groupKey(evaluation.id, studentId)]: value } })
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

  /** 모둠별로 묶어 볼 때만 정렬한다. 모둠 없는 학생은 뒤로 보낸다. */
  const orderedStudents = groupView
    ? [...visibleStudents].sort((left, right) => {
        const groupLeft = studentGroup(data, evaluation, left)
        const groupRight = studentGroup(data, evaluation, right)
        if (groupLeft === groupRight) return left.number - right.number
        if (!groupLeft) return 1
        if (!groupRight) return -1
        return groupLeft.localeCompare(groupRight, 'ko')
      })
    : visibleStudents

  // 요소 칸에 몇 번째 열인지 붙여 키보드 이동을 만든다.
  let columnCursor = 0
  const columnIndex: Record<string, number> = {}
  tasks.forEach(task => task.items.forEach(item => { columnIndex[item.id] = columnCursor++ }))

  // 모둠 구분줄에 쓸 전체 열 개수(학번·성명(+모둠) + 과제 칸들 + 합계·반영 + 커스텀 열 + 비고). 접은 과제는 1칸으로 친다.
  const totalColumnCount = (isGroupActivity ? 3 : 2)
    + tasks.reduce((sum, task) => sum + (isTaskCollapsed(task.id) ? 1 : task.items.length + 1), 0)
    + 2 + columns.length + 1

  const renderColumnTh = (column: EvalColumn) => (
    <th className="eg-custom-col" rowSpan={2} key={column.id}>{column.label || '(이름 없음)'}</th>
  )

  const renderColumnTd = (column: EvalColumn, studentId: string) => (
    <td className="eg-custom-col" key={column.id}>
      {column.options?.length ? (
        <ColumnDropdownCell
          options={column.options}
          value={data.columnValues[columnKey(evaluation.id, column.id, studentId)] || ''}
          onChange={value => setColumnValue(column.id, studentId, value)}
        />
      ) : (
        <input
          className="eval-note-input"
          value={data.columnValues[columnKey(evaluation.id, column.id, studentId)] || ''}
          placeholder=""
          onChange={event => setColumnValue(column.id, studentId, event.target.value)}
        />
      )}
    </td>
  )

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
            {tasks.map(task => {
              if (!task.items.length) return null
              const collapsed = isTaskCollapsed(task.id)
              return (
                <div className="eval-rubric-task" key={task.id}>
                  <button className="eval-rubric-task-toggle" onClick={() => toggleTaskCollapse(task.id)}>
                    <span className="eval-fold-icon">{collapsed ? '▸' : '▾'}</span>
                    <b>{task.name || '(과제명 미입력)'} <small>{taskMax(task)}점</small></b>
                  </button>
                  {!collapsed && task.items.map(item => (
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
              )
            })}
            {!tasks.some(task => task.items.length) && (
              <p className="hint">평가 설정 탭에서 요소·채점기준을 추가하면 여기 표시됩니다.</p>
            )}
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
              {isGroupActivity && (
                <>
                  <label className="eval-only-absent">
                    <input type="checkbox" checked={groupView} onChange={event => setGroupView(event.target.checked)} />
                    모둠별로 묶어 보기
                  </label>
                  <label className="eval-only-absent" title="켜두면 한 학생 점수를 입력할 때 같은 모둠 학생 전원에게도 똑같이 들어갑니다.">
                    <input type="checkbox" checked={groupSync} onChange={event => setGroupSync(event.target.checked)} />
                    모둠 전체 동일 점수 적용
                  </label>
                </>
              )}
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
                    {isGroupActivity && <th className="eg-sticky eg-group" rowSpan={2}>모둠</th>}
                    {frontColumns.map(renderColumnTh)}
                    {tasks.map(task => {
                      const collapsed = isTaskCollapsed(task.id)
                      return collapsed ? (
                        <th
                          className="eg-task eg-task-collapsed"
                          rowSpan={2}
                          key={task.id}
                          onClick={() => toggleTaskCollapse(task.id)}
                          title={`${task.name || '(과제명 미입력)'} — 펼치기`}
                        >
                          ▸ {task.name || '(과제명 미입력)'}
                        </th>
                      ) : (
                        <th
                          className="eg-task"
                          colSpan={task.items.length + 1}
                          key={task.id}
                          onClick={() => toggleTaskCollapse(task.id)}
                          title="클릭하면 이 과제를 접습니다"
                        >
                          ▾ {task.name || '(과제명 미입력)'} <small>{taskMax(task)}</small>
                        </th>
                      )
                    })}
                    <th className="eg-total" rowSpan={2}>합계<small>/{max}</small></th>
                    <th className="eg-total" rowSpan={2}>반영<small>/{evaluation.weight}</small></th>
                    {middleColumns.map(renderColumnTh)}
                    <th className="eg-note" rowSpan={2}>비고</th>
                    {endColumns.map(renderColumnTh)}
                  </tr>
                  <tr>
                    {tasks.map(task => {
                      if (isTaskCollapsed(task.id)) return null
                      return (
                        <Fragment key={task.id}>
                          <th className="eg-status">미응시</th>
                          {task.items.map(item => (
                            <th key={item.id}>{item.name}<small>{item.maxScore}</small></th>
                          ))}
                        </Fragment>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {orderedStudents.map((student, rowIndex) => {
                    const group = studentGroup(data, evaluation, student)
                    const previousGroup = rowIndex > 0 ? studentGroup(data, evaluation, orderedStudents[rowIndex - 1]) : undefined
                    const showGroupHeader = groupView && group && group !== previousGroup
                    return (
                    <Fragment key={student.id}>
                    {showGroupHeader && (
                      <tr className="eg-group-row">
                        <td colSpan={totalColumnCount}>{group}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="eg-sticky eg-no">{student.number}</td>
                      <td className="eg-sticky eg-name">{student.name}</td>
                      {isGroupActivity && (
                        <td className="eg-sticky eg-group">
                          <input
                            className="eval-note-input"
                            value={group}
                            placeholder=""
                            onChange={event => setGroup(student.id, event.target.value)}
                          />
                        </td>
                      )}
                      {frontColumns.map(column => renderColumnTd(column, student.id))}
                      {tasks.map(task => {
                        if (isTaskCollapsed(task.id)) {
                          const absentCollapsed = isAbsent(data, evaluation.id, task.id, student.id)
                          return (
                            <td className="eg-cell eg-task-collapsed-cell" key={task.id}>
                              {absentCollapsed ? '미응시' : `${taskScore(data, evaluation, task, student.id)}/${taskMax(task)}`}
                            </td>
                          )
                        }
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
                      {middleColumns.map(column => renderColumnTd(column, student.id))}
                      <td className="eg-note">
                        <input
                          className="eval-note-input"
                          value={data.evaluationNotes[noteKey(evaluation.id, student.id)] || ''}
                          placeholder=""
                          onChange={event => setNote(student.id, event.target.value)}
                        />
                      </td>
                      {endColumns.map(column => renderColumnTd(column, student.id))}
                    </tr>
                    </Fragment>
                    )
                  })}
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
        <label className="eval-checkbox-field">
          <input
            type="checkbox"
            checked={!!evaluation.groupActivity}
            onChange={event => update({ groupActivity: event.target.checked })}
          />
          모둠활동입니다
        </label>
      </div>
      {evaluation.groupActivity && (
        <p className="hint">
          채점표에 모둠 열과 &quot;모둠별로 묶어 보기&quot;, &quot;모둠 전체 동일 점수 적용&quot; 기능이 나타납니다.
        </p>
      )}

      <EvalColumnsEditor evaluation={evaluation} update={update} />

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

/**
 * 채점표에 붙는 커스텀 열(연주 악기, 연주곡 등) 관리.
 * 값은 학생별 자유 텍스트이고, 여기서는 열 자체(이름)만 추가·수정·삭제한다.
 */
function EvalColumnsEditor({
  evaluation,
  update,
}: {
  evaluation: Evaluation
  update: (change: Partial<Evaluation>) => void
}) {
  const columns = evaluationColumns(evaluation)
  const [label, setLabel] = useState('')

  const addColumn = () => {
    if (!label.trim()) return
    const column: EvalColumn = { id: makeId('col'), label: label.trim() }
    update({ columns: [...columns, column] })
    setLabel('')
  }

  const editColumn = (id: string, value: string) => {
    update({ columns: columns.map(item => (item.id === id ? { ...item, label: value } : item)) })
  }

  const editOptions = (id: string, raw: string) => {
    const options = raw.split(',').map(value => value.trim()).filter(Boolean)
    update({ columns: columns.map(item => (item.id === id ? { ...item, options: options.length ? options : undefined } : item)) })
  }

  const editPosition = (id: string, position: EvalColumn['position']) => {
    update({ columns: columns.map(item => (item.id === id ? { ...item, position } : item)) })
  }

  const removeColumn = (id: string) => {
    if (!window.confirm('이 열을 지웁니다. 학생별로 적어둔 내용도 함께 지워지며 되돌릴 수 없습니다. 계속할까요?')) return
    update({ columns: columns.filter(item => item.id !== id) })
  }

  return (
    <div className="block">
      <h3>채점표 추가 열</h3>
      <p className="hint">
        연주 악기·연주곡처럼 학생마다 다르게 적어둘 정보를 채점표에 열로 추가합니다. 점수에는 들어가지 않는 참고용 칸입니다.
        선택지를 넣으면 드롭다운으로, 비워두면 자유 입력 칸으로 나옵니다.
      </p>
      {columns.map(column => (
        <div className="eval-column-editor" key={column.id}>
          <div className="inline-form">
            <input value={column.label} placeholder="열 이름 (예: 연주 악기)" onChange={event => editColumn(column.id, event.target.value)} />
            <select value={column.position || 'middle'} onChange={event => editPosition(column.id, event.target.value as EvalColumn['position'])}>
              <option value="front">앞쪽(학번·모둠 옆)</option>
              <option value="middle">점수 뒤(합계 옆) — 기본</option>
              <option value="end">맨 끝(비고 뒤)</option>
            </select>
            <button className="ghost-button danger-button" onClick={() => removeColumn(column.id)}>열 삭제</button>
          </div>
          <OptionsInput column={column} editOptions={editOptions} />
        </div>
      ))}
      <div className="inline-form">
        <input
          value={label}
          placeholder="새 열 이름 (예: 연주곡)"
          onChange={event => setLabel(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') addColumn() }}
        />
        <button className="primary-button" onClick={addColumn}>+ 열 추가</button>
      </div>
    </div>
  )
}

/** 드롭다운 열의 셀. 목록에 없는 값이 이미 들어있으면(또는 "기타"를 고르면) 옆에 직접 입력 칸이 뜬다. */
function ColumnDropdownCell({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  const [customMode, setCustomMode] = useState(value !== '' && !options.includes(value))

  return (
    <div className="eval-column-dropdown">
      <select
        value={customMode ? '__custom__' : value}
        onChange={event => {
          if (event.target.value === '__custom__') {
            setCustomMode(true)
            return
          }
          setCustomMode(false)
          onChange(event.target.value)
        }}
      >
        <option value="">선택</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
        <option value="__custom__">기타(직접 입력)</option>
      </select>
      {customMode && (
        <input
          className="eval-note-input"
          value={value}
          placeholder="직접 입력"
          onChange={event => onChange(event.target.value)}
        />
      )}
    </div>
  )
}

/**
 * 선택지 입력 칸. 저장된 값(콤마로 합쳐 다시 보여주는 형태)을 그대로 value 로 쓰면
 * 쉼표를 치는 순간 빈 항목이 걸러지면서 방금 친 쉼표가 사라져 버린다.
 * 그래서 화면에 보이는 글자는 따로 갖고 있다가, 저장은 매 입력마다 그 글자로 한다.
 */
function OptionsInput({
  column,
  editOptions,
}: {
  column: EvalColumn
  editOptions: (id: string, raw: string) => void
}) {
  const [text, setText] = useState((column.options || []).join(', '))

  return (
    <input
      className="eval-column-options-input"
      value={text}
      placeholder="선택지(쉼표로 구분, 비우면 자유 입력) — 예: 피아노, 바이올린, 우쿨렐레"
      onChange={event => {
        setText(event.target.value)
        editOptions(column.id, event.target.value)
      }}
    />
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
