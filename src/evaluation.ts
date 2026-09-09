import type { AppData, Evaluation, Student } from './types'

export function scoreKey(evaluationId: string, itemId: string, studentId: string) {
  return `${evaluationId}:${itemId}:${studentId}`
}

export function noteKey(evaluationId: string, studentId: string) {
  return `${evaluationId}:${studentId}`
}

/** 평가 요소 배점의 합. 원점수의 만점 기준이 된다. */
export function maxTotal(evaluation: Evaluation) {
  return evaluation.items.reduce((sum, item) => sum + item.maxScore, 0)
}

/** 학생 한 명의 원점수 합. 아직 하나도 안 채운 요소는 0으로 본다. */
export function rawTotal(data: AppData, evaluation: Evaluation, studentId: string) {
  return evaluation.items.reduce((sum, item) => {
    const value = data.scores[scoreKey(evaluation.id, item.id, studentId)]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
}

/** 반영점수 = 원점수 / 만점 × 반영비율. 만점이 0이면 계산하지 않는다. */
export function weightedScore(data: AppData, evaluation: Evaluation, studentId: string) {
  const max = maxTotal(evaluation)
  if (!max) return 0
  return (rawTotal(data, evaluation, studentId) / max) * evaluation.weight
}

/** 이 평가에서 학생이 요소를 하나라도 입력했는지. */
export function hasAnyScore(data: AppData, evaluation: Evaluation, studentId: string) {
  return evaluation.items.some(item => data.scores[scoreKey(evaluation.id, item.id, studentId)] !== undefined)
}

/** 이 평가에서 학생의 모든 요소가 채워졌는지. */
export function isComplete(data: AppData, evaluation: Evaluation, studentId: string) {
  if (!evaluation.items.length) return false
  return evaluation.items.every(item => data.scores[scoreKey(evaluation.id, item.id, studentId)] !== undefined)
}

/** 학급 하나의 입력 완료율(%). */
export function classFillRate(data: AppData, evaluation: Evaluation, students: Student[]) {
  if (!students.length || !evaluation.items.length) return 0
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
