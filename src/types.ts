export const DAYS = ['월', '화', '수', '목', '금'] as const
export type Day = (typeof DAYS)[number]
export const DAY_NUMBER: Record<Day, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5 }
export const PERIODS = [1, 2, 3, 4, 5, 6, 7] as const

export type Slot = { day: Day; period: number }

export type Subject = {
  id: string
  name: string
  color: string
}

export type Student = {
  id: string
  number: number
  name: string
}

export type Classroom = {
  id: string
  subjectId: string
  name: string
  slots: Slot[]
  students: Student[]
  archived?: boolean
}

export type LessonType = {
  id: string
  name: string
  color: string
}

/** 진도표의 한 행. 과목별로 순서를 가진다. */
export type Lesson = {
  id: string
  subjectId: string
  title: string
  typeId: string
  note: string
}

export type EventType = 'closed' | 'blocked' | 'note'

export type SchoolEvent = {
  id: string
  date: string
  title: string
  type: EventType
  /** blocked 일 때만 사용. 비어 있으면 그날 전 교시. */
  periods: number[]
  /** 비어 있으면 전체 학급. */
  classIds: string[]
}

/** 학급별 진도 기록. 키는 `${classId}:${lessonId}` */
export type Progress = {
  done?: boolean
  memo?: string
}

/** 개별 수업 시간에 대한 예외. 키는 sessionId */
export type SessionOverride = {
  /** true 면 그 시간은 진도를 소비하지 않는다 (행사·자율 등) */
  skip?: boolean
  label?: string
}

export type AttendanceStatus = '출석' | '지각' | '조퇴' | '결석' | '기타'

export type Settings = {
  schoolName: string
  teacherName: string
  year: string
  termName: string
  termStart: string
  termEnd: string
}

export type AppData = {
  version: number
  settings: Settings
  subjects: Subject[]
  classes: Classroom[]
  lessons: Lesson[]
  types: LessonType[]
  events: SchoolEvent[]
  progress: Record<string, Progress>
  overrides: Record<string, SessionOverride>
  attendance: Record<string, AttendanceStatus>
  activities: Record<string, string>
}

/** 자동 배정된 한 번의 수업 시간 */
export type Session = {
  id: string
  date: string
  classId: string
  subjectId: string
  period: number
  /** null 이면 배정할 진도가 남지 않은 시간 */
  lessonId: string | null
  skipped: boolean
  label?: string
}
