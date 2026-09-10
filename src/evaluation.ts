import type { AppData, Evaluation, EvaluationTask, Session, Student, TaskStatus } from './types'
import { effectiveLessonIds } from './schedule'

export function scoreKey(evaluationId: string, itemId: string, studentId: string) {
  return `${evaluationId}:${itemId}:${studentId}`
}

export function noteKey(evaluationId: string, studentId: string) {
  return `${evaluationId}:${studentId}`
}

/** 과제별 응시 상태 키. */
export function taskStatusKey(evaluationId: string, taskId: string, studentId: string) {
  return `${evaluationId}:${taskId}:${studentId}`
}

/**
 * 이 평가의 평가 과제 목록.
 * 예전 데이터(평가 바로 아래 items 만 있던 형태)는 과제 하나짜리로 감싸서 돌려준다.
 */
export function evaluationTasks(evaluation: Evaluation): EvaluationTask[] {
  if (evaluation.tasks?.length) return evaluation.tasks
  if (evaluation.items?.length) {
    return [{ id: `${evaluation.id}-task`, name: evaluation.name, items: evaluation.items }]
  }
  return []
}

/** 모든 과제의 평가 요소를 한 줄로 편다. 엑셀·집계용. */
export function allItems(evaluation: Evaluation) {
  return evaluationTasks(evaluation).flatMap(task => task.items)
}

/** 한 과제의 배점 합. */
export function taskMax(task: EvaluationTask) {
  return task.items.reduce((sum, item) => sum + (item.maxScore || 0), 0)
}

/** 평가 요소 배점의 합. 원점수의 만점 기준이 된다. */
export function maxTotal(evaluation: Evaluation) {
  return evaluationTasks(evaluation).reduce((sum, task) => sum + taskMax(task), 0)
}

export function taskStatusOf(
  data: AppData,
  evaluationId: string,
  taskId: string,
  studentId: string,
): TaskStatus | undefined {
  return data.taskStatus[taskStatusKey(evaluationId, taskId, studentId)]
}

/** 미응시면 채점을 막고 과제 단위 대체 점수를 쓴다. */
export function isAbsent(data: AppData, evaluationId: string, taskId: string, studentId: string) {
  return taskStatusOf(data, evaluationId, taskId, studentId) === 'absent'
}

/** 학생이 이 평가에서 한 과제라도 미응시로 표시됐는지. */
export function isAbsentAnywhere(data: AppData, evaluation: Evaluation, studentId: string) {
  return evaluationTasks(evaluation).some(task => isAbsent(data, evaluation.id, task.id, studentId))
}

/** 과제 하나에서 학생이 받는 점수. 미응시면 과제에 등록해둔 대체 점수. */
export function taskScore(data: AppData, evaluation: Evaluation, task: EvaluationTask, studentId: string) {
  if (isAbsent(data, evaluation.id, task.id, studentId)) return task.absentScore ?? 0
  return task.items.reduce((sum, item) => {
    const value = data.scores[scoreKey(evaluation.id, item.id, studentId)]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
}

/** 학생 한 명의 원점수 합. 아직 안 채운 요소는 0으로 본다. */
export function rawTotal(data: AppData, evaluation: Evaluation, studentId: string) {
  return evaluationTasks(evaluation).reduce((sum, task) => sum + taskScore(data, evaluation, task, studentId), 0)
}

/** 반영점수 = 원점수 / 만점 × 반영비율. 만점이 0이면 계산하지 않는다. */
export function weightedScore(data: AppData, evaluation: Evaluation, studentId: string) {
  const max = maxTotal(evaluation)
  if (!max) return 0
  return (rawTotal(data, evaluation, studentId) / max) * evaluation.weight
}

/** 이 평가에서 학생이 뭐라도 입력됐는지(미응시 표시 포함). */
export function hasAnyScore(data: AppData, evaluation: Evaluation, studentId: string) {
  return evaluationTasks(evaluation).some(task => {
    if (isAbsent(data, evaluation.id, task.id, studentId)) return true
    return task.items.some(item => data.scores[scoreKey(evaluation.id, item.id, studentId)] !== undefined)
  })
}

/** 과제 하나가 마감됐는지. 미응시이거나, 요소가 전부 채워졌으면 완료. */
export function isTaskComplete(data: AppData, evaluation: Evaluation, task: EvaluationTask, studentId: string) {
  if (isAbsent(data, evaluation.id, task.id, studentId)) return true
  if (!task.items.length) return false
  return task.items.every(item => data.scores[scoreKey(evaluation.id, item.id, studentId)] !== undefined)
}

/** 이 평가에서 학생의 모든 과제가 마감됐는지. */
export function isComplete(data: AppData, evaluation: Evaluation, studentId: string) {
  const tasks = evaluationTasks(evaluation)
  if (!tasks.length) return false
  return tasks.every(task => isTaskComplete(data, evaluation, task, studentId))
}

/** 학급 하나의 입력 완료율(%). */
export function classFillRate(data: AppData, evaluation: Evaluation, students: Student[]) {
  if (!students.length || !evaluationTasks(evaluation).length) return 0
  const filled = students.filter(student => isComplete(data, evaluation, student.id)).length
  return Math.round((filled / students.length) * 100)
}

/** 이 평가의 대상 학급들. classIds 가 비어 있으면 그 과목 전체 학급. */
export function evaluationClasses(data: AppData, evaluation: Evaluation) {
  const own = data.classes.filter(item => !item.archived && item.subjectId === evaluation.subjectId)
  if (!evaluation.classIds.length) return own
  return own.filter(item => evaluation.classIds.includes(item.id))
}

/** 값을 0 이상, 배점 이하로 자른다. */
export function clampScore(value: number, maxScore: number) {
  return Math.max(0, Math.min(maxScore, value))
}

export type EvalCounts = {
  total: number
  /** 모든 과제가 마감된 학생 수 */
  graded: number
  /** 아직 마감이 안 된 학생 수 */
  remaining: number
  /** 한 과제라도 미응시로 표시된 학생 수 */
  absent: number
  /** 채점이 시작됐는지(누구 하나라도 입력이 있는지) */
  started: boolean
}

export function evalCounts(data: AppData, evaluation: Evaluation, students: Student[]): EvalCounts {
  let graded = 0
  let absent = 0
  let started = false
  students.forEach(student => {
    if (isComplete(data, evaluation, student.id)) graded += 1
    if (hasAnyScore(data, evaluation, student.id)) started = true
    if (isAbsentAnywhere(data, evaluation, student.id)) absent += 1
  })
  return { total: students.length, graded, remaining: students.length - graded, absent, started }
}

/** 이 세션의 차시가 평가와 연결돼 있으면 그 평가를 돌려준다(이어서 모드도 원래 차시 기준으로 따라간다). */
export function linkedEvaluation(data: AppData, session: Session): Evaluation | undefined {
  const lessonIds = effectiveLessonIds(session)
  for (const lessonId of lessonIds) {
    const lesson = data.lessons.find(item => item.id === lessonId)
    if (!lesson?.evaluationId) continue
    const evaluation = data.evaluations.find(item => item.id === lesson.evaluationId)
    if (!evaluation) continue
    if (!evaluation.classIds.length || evaluation.classIds.includes(session.classId)) return evaluation
  }
  return undefined
}
