import type { AppData, Evaluation, EvaluationItem, EvaluationTask, LessonType, EvaluationType, Subject, TaskStatus } from './types'
import { subjectColorsForTheme } from './theme'

export const APP_VERSION = 'v4.0'
export const APP_NAME = '티칭플로'
export const APP_TAGLINE = 'TEACHING FLOW ― 수업의 흐름을 한눈에'
export const STORAGE_KEY = 'class-schedule-planner-data'

export const defaultTypes: LessonType[] = [
  { id: 'sing', name: '가창', color: '#2d8c7b' },
  { id: 'play', name: '연주', color: '#4f7db8' },
  { id: 'listen', name: '감상', color: '#9a72b0' },
  { id: 'create', name: '창작', color: '#d08043' },
  { id: 'korean', name: '국악', color: '#b36a50' },
  { id: 'assessment', name: '수행평가', color: '#d04f5d', emphasis: true },
]

export const defaultEvaluationTypes: EvaluationType[] = [
  { id: 'performance', name: '수행평가' },
  { id: 'written', name: '지필평가' },
  { id: 'observation', name: '관찰평가' },
  { id: 'etc', name: '기타' },
]


export function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function thisYear() {
  return String(new Date().getFullYear())
}

export function emptyData(): AppData {
  return {
    version: 2,
    settings: {
      appearance: { themeId: 'default', accent: '#7c8794', fontId: 'pretendard', fontSize: 'normal' },
      schoolName: '',
      teacherName: '',
      year: thisYear(),
      termName: '1학기',
      termStart: `${thisYear()}-03-02`,
      termEnd: `${thisYear()}-07-17`,
      useHolidays: true,
    },
    subjects: [],
    classes: [],
    lessons: [],
    types: defaultTypes,
    events: [],
    progress: {},
    overrides: {},
    attendance: {},
    activities: {},
    dayNotes: {},
    evaluationTypes: defaultEvaluationTypes,
    evaluations: [],
    scores: {},
    evaluationNotes: {},
    taskStatus: {},
  }
}

/**
 * 채점기준 자동 생성.
 * 만점 20 / 기준 5개 / 급간 4 → 20, 16, 12, 8, 4.
 * 이미 써둔 설명은 같은 순번끼리 그대로 옮겨 담는다.
 */
export function buildLevels(item: EvaluationItem): EvaluationItem['levels'] {
  const count = item.levelCount ?? item.levels?.length ?? 0
  if (!count) return item.levels
  const step = item.step ?? 0
  const old = item.levels || []
  return Array.from({ length: count }, (_, index) => ({
    id: old[index]?.id || makeId('level'),
    score: item.maxScore - index * step,
    description: old[index]?.description || '',
  }))
}

/** 예전 요소(수동으로 점수를 적던 형태)에서 기준 개수·급간을 추정해 채워준다. */
function migrateItem(item: EvaluationItem): EvaluationItem {
  const levels = (item.levels || []).slice().sort((a, b) => b.score - a.score)
  if (!levels.length) return { ...item, levels: undefined }
  const levelCount = item.levelCount ?? levels.length
  const step = item.step ?? (levels.length > 1 ? Math.max(0, levels[0].score - levels[1].score) : 0)
  return { ...item, levels, levelCount, step }
}

/** 평가 바로 아래 items 만 있던 예전 데이터를 "평가 과제" 한 개로 감싼다. */
function migrateEvaluation(evaluation: Evaluation): Evaluation {
  const rawTasks: EvaluationTask[] = evaluation.tasks?.length
    ? evaluation.tasks
    : [{
        id: `${evaluation.id}-task`,
        name: evaluation.name || '평가 과제',
        items: evaluation.items || [],
        // 예전엔 요소별 basicScore 로 관리했다. 합계를 과제 미응시 점수로 옮긴다.
        absentScore: (evaluation.items || []).reduce((sum, item) => sum + (item.basicScore ?? 0), 0) || undefined,
      }]
  return {
    ...evaluation,
    classIds: evaluation.classIds || [],
    tasks: rawTasks.map(task => ({ ...task, items: (task.items || []).map(migrateItem) })),
    items: undefined,
  }
}

/** 평가 단위였던 응시 여부를 과제 단위로 펼친다. */
function migrateTaskStatus(
  evaluations: Evaluation[],
  saved: Record<string, TaskStatus> | undefined,
  legacy: Record<string, 'present' | 'absent'> | undefined,
): Record<string, TaskStatus> {
  const next: Record<string, TaskStatus> = { ...(saved || {}) }
  if (!legacy) return next
  Object.entries(legacy).forEach(([key, status]) => {
    const divider = key.indexOf(':')
    if (divider < 0) return
    const evaluationId = key.slice(0, divider)
    const studentId = key.slice(divider + 1)
    const evaluation = evaluations.find(item => item.id === evaluationId)
    if (!evaluation) return
    evaluation.tasks.forEach(task => {
      const nextKey = `${evaluationId}:${task.id}:${studentId}`
      if (next[nextKey] === undefined) next[nextKey] = status
    })
  })
  return next
}

/** 저장된 값이 일부만 있어도 빈 구조로 채워서 돌려준다. */
function normalize(saved: Partial<AppData>): AppData {
  const base = emptyData()
  const evaluations = (saved.evaluations || []).map(migrateEvaluation)
  return {
    version: 2,
    settings: {
      ...base.settings,
      ...(saved.settings || {}),
      appearance: { ...base.settings.appearance, ...(saved.settings?.appearance || {}) },
    },
    subjects: (saved.subjects || []).map(item => ({ ...item, usesProgress: item.usesProgress !== false })),
    classes: (saved.classes || []).map(item => ({ ...item, slots: item.slots || [], students: item.students || [] })),
    lessons: (saved.lessons || []).map(item => ({ ...item, note: item.note || '' })),
    types: saved.types?.length ? saved.types : base.types,
    events: (saved.events || []).map(item => ({ ...item, periods: item.periods || [], classIds: item.classIds || [] })),
    progress: saved.progress || {},
    overrides: saved.overrides || {},
    attendance: saved.attendance || {},
    activities: saved.activities || {},
    dayNotes: saved.dayNotes || {},
    evaluationTypes: saved.evaluationTypes?.length ? saved.evaluationTypes : defaultEvaluationTypes,
    evaluations,
    scores: saved.scores || {},
    evaluationNotes: saved.evaluationNotes || {},
    taskStatus: migrateTaskStatus(evaluations, saved.taskStatus, saved.evalAttendance),
  }
}

export function readData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    return normalize(JSON.parse(raw) as Partial<AppData>)
  } catch {
    return emptyData()
  }
}

export function writeData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function exportData(data: AppData) {
  const stamp = new Date().toISOString().slice(0, 10)
  const name = `수업플래너_${data.settings.year}_${data.settings.termName}_${stamp}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export async function importData(file: File): Promise<AppData> {
  const parsed = JSON.parse(await file.text()) as Partial<AppData>
  if (!parsed || typeof parsed !== 'object' || !('settings' in parsed || 'classes' in parsed)) {
    throw new Error('형식이 맞지 않는 파일입니다.')
  }
  return normalize(parsed)
}

export function nextSubjectColor(subjects: Subject[], themeId: string = 'default') {
  const colors = subjectColorsForTheme(themeId)
  return colors[subjects.length % colors.length]
}
