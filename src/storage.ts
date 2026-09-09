import type { AppData, LessonType, Subject } from './types'

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

export const subjectColors = ['#86AEB8', '#9AA6B8', '#A3AF91', '#BDA18C', '#C49B9D', '#A895A8']

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
      appearance: { themeId: 'default', accent: '#7c8794', fontId: 'pretendard', fontSize: 'normal', timetablePaletteId: 'default' },
      schoolName: '',
      schoolShort: '',
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
  }
}

/** 저장된 값이 일부만 있어도 빈 구조로 채워서 돌려준다. */
function normalize(saved: Partial<AppData>): AppData {
  const base = emptyData()
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

export function nextSubjectColor(subjects: Subject[]) {
  return subjectColors[subjects.length % subjectColors.length]
}
