import type { AppData, Classroom, Day, Session, SessionMode } from './types'
import { DAYS, DAY_NUMBER } from './types'
import { holidayName } from './holidays'

/** 로컬 시간 기준 YYYY-MM-DD. toISOString() 은 UTC 라서 하루 밀린다. */
export function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function todayKey() {
  return dateKey(new Date())
}

export function monthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

export function formatShort(key: string) {
  const [, month, day] = key.split('-')
  return `${Number(month)}/${Number(day)}`
}

/** 이번 주(월~금)의 날짜 키 목록 */
export function weekKeys(today = new Date()) {
  const monday = new Date(today)
  const shift = (today.getDay() + 6) % 7
  monday.setDate(today.getDate() - shift)
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return dateKey(date)
  })
}

export function sessionId(date: string, classId: string, period: number) {
  return `${date}-${classId}-${period}`
}

export function progressKey(classId: string, lessonId: string) {
  return `${classId}:${lessonId}`
}

/** 하루짜리 일정과 기간 일정을 함께 판정한다. */
export function coversDate(event: { date: string; endDate?: string }, date: string) {
  if (!event.endDate) return event.date === date
  const [from, to] = event.date <= event.endDate ? [event.date, event.endDate] : [event.endDate, event.date]
  return date >= from && date <= to
}

function blockedBy(data: AppData, date: string, classroom: Classroom, period: number) {
  if (data.settings.useHolidays !== false && holidayName(date)) return true
  return data.events.some(event => {
    if (!coversDate(event, date)) return false
    if (event.type === 'note' || event.type === 'swap') return false
    if (event.classIds.length && !event.classIds.includes(classroom.id)) return false
    if (event.type === 'closed') return true
    return event.periods.length === 0 || event.periods.includes(period)
  })
}

/** 그날 실제로 어느 요일 시간표로 운영하는지. 요일 변경 일정이 있으면 그쪽을 따른다. */
function effectiveDay(data: AppData, date: string, weekday: number, classroom: Classroom): { day: Day | null; swappedFrom?: Day } {
  const swap = data.events.find(event =>
    event.type === 'swap'
    && coversDate(event, date)
    && event.sourceDay
    && (!event.classIds.length || event.classIds.includes(classroom.id)),
  )
  const natural = DAYS.find(day => DAY_NUMBER[day] === weekday) || null
  if (swap?.sourceDay) return { day: swap.sourceDay, swappedFrom: natural || undefined }
  return { day: natural }
}

function readMode(override?: { mode?: SessionMode; skip?: boolean }): SessionMode {
  if (!override) return 'normal'
  if (override.mode) return override.mode
  return override.skip ? 'none' : 'normal'
}

/**
 * 학기 기간 전체를 훑어 학급별 수업 시간을 만들고, 과목별 수업 목록을 순서대로 배정한다.
 * 진도가 모자라면 lessonId 를 null 로 둔다(무한 반복하지 않는다).
 */
export function buildSessions(data: AppData): Session[] {
  const start = parseDate(data.settings.termStart)
  const end = parseDate(data.settings.termEnd)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []

  const active = data.classes.filter(item => !item.archived)
  const queue: Record<string, string[]> = {}
  const cursorIndex: Record<string, number> = {}
  const lastLesson: Record<string, string | undefined> = {}
  active.forEach(classroom => {
    const subject = data.subjects.find(item => item.id === classroom.subjectId)
    queue[classroom.id] = subject && subject.usesProgress === false
      ? []
      : data.lessons.filter(lesson => lesson.subjectId === classroom.subjectId).map(lesson => lesson.id)
    cursorIndex[classroom.id] = 0
  })

  const sessions: Session[] = []
  const day = new Date(start)
  let guard = 0
  while (day <= end && guard < 500) {
    guard += 1
    const key = dateKey(day)
    const weekday = day.getDay()
    active.forEach(classroom => {
      const { day: runDay, swappedFrom } = effectiveDay(data, key, weekday, classroom)
      if (!runDay) return

      // 요일이 바뀐 날에는, 원래 그 요일에 있던 수업 자리를 취소 표시로 남긴다.
      if (swappedFrom && swappedFrom !== runDay) {
        classroom.slots
          .filter(slot => slot.day === swappedFrom)
          .sort((left, right) => left.period - right.period)
          .forEach(slot => {
            sessions.push({
              id: `${sessionId(key, classroom.id, slot.period)}-cancelled`,
              date: key,
              classId: classroom.id,
              subjectId: classroom.subjectId,
              period: slot.period,
              lessonIds: [],
              mode: 'none',
              swappedFrom,
              cancelled: true,
            })
          })
      }

      classroom.slots
        .filter(slot => slot.day === runDay)
        .sort((left, right) => left.period - right.period)
        .forEach(slot => {
          if (blockedBy(data, key, classroom, slot.period)) return
          const id = sessionId(key, classroom.id, slot.period)
          const override = data.overrides[id]
          const mode = readMode(override)
          const list = queue[classroom.id]
          const lessonIds: string[] = []

          if (mode === 'normal' || mode === 'merge') {
            const take = mode === 'merge' ? 2 : 1
            for (let step = 0; step < take; step += 1) {
              const index = cursorIndex[classroom.id]
              if (index < list.length) {
                lessonIds.push(list[index])
                cursorIndex[classroom.id] = index + 1
              }
            }
            if (lessonIds.length) lastLesson[classroom.id] = lessonIds[lessonIds.length - 1]
          }

          sessions.push({
            id,
            date: key,
            classId: classroom.id,
            subjectId: classroom.subjectId,
            period: slot.period,
            lessonIds,
            mode,
            continuedFrom: mode === 'extend' ? lastLesson[classroom.id] : undefined,
            label: override?.label,
            swappedFrom,
          })
        })
    })
    day.setDate(day.getDate() + 1)
  }
  return sessions
}

export type ClassCoverage = {
  classId: string
  total: number
  assigned: number
  lessonCount: number
  /** 남는 시간 수(양수) 또는 부족한 시간 수(음수) */
  spare: number
}

export function coverage(data: AppData, sessions: Session[]): ClassCoverage[] {
  return data.classes
    .filter(item => !item.archived && data.subjects.find(value => value.id === item.subjectId)?.usesProgress !== false)
    .map(classroom => {
      const own = sessions.filter(item => item.classId === classroom.id && item.mode !== 'none')
      const lessonCount = data.lessons.filter(lesson => lesson.subjectId === classroom.subjectId).length
      const assigned = own.reduce((sum, item) => sum + item.lessonIds.length, 0)
      return { classId: classroom.id, total: own.length, assigned, lessonCount, spare: own.length - lessonCount }
    })
}

/** 달력·출석부에 보여줄 그 시간의 표시 문구 */
/**
 * 진도 표시용 실제 차시 목록.
 * '이어서'(extend) 모드는 새 진도를 소비하지 않아 lessonIds 가 비어 있지만,
 * 실제로는 앞 차시(continuedFrom)를 계속 다루는 시간이다. 완료 표시·메모가
 * 그 차시와 이어지도록, 달력·상세창에서는 이 함수로 얻은 목록을 쓴다.
 */
export function effectiveLessonIds(session: Session): string[] {
  if (session.mode === 'extend' && session.continuedFrom) return [session.continuedFrom]
  return session.lessonIds
}

export function sessionLabel(data: AppData, session: Session) {
  if (session.mode === 'none') return session.label || '수업 없음'
  const subject = data.subjects.find(item => item.id === session.subjectId)
  if (subject && subject.usesProgress === false) return session.label || ''
  const titles = session.lessonIds
    .map(id => data.lessons.find(item => item.id === id)?.title)
    .filter(Boolean)
  if (session.mode === 'extend') {
    const previous = data.lessons.find(item => item.id === session.continuedFrom)
    return previous ? `${previous.title} (이어서)` : (session.label || '이어서 진행')
  }
  if (!titles.length) {
    // 수업 목록 자체가 비어 있으면 아직 계획을 안 세운 것이므로 빈칸으로 둔다.
    const registered = data.lessons.some(item => item.subjectId === session.subjectId)
    return registered ? '미배정' : ''
  }
  return titles.join(' + ')
}
