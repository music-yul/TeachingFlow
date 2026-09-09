export const DAYS = ['월', '화', '수', '목', '금'] as const
export type Day = (typeof DAYS)[number]
export const DAY_NUMBER: Record<Day, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5 }
export const PERIODS = [1, 2, 3, 4, 5, 6, 7] as const

export type Slot = { day: Day; period: number }

export type Subject = {
  id: string
  name: string
  color: string
  /** 비워두면 배경색에 맞춰 검정·흰색 중 자동으로 고른다. */
  textColor?: string
  /** false 면 진도표를 쓰지 않는 과목(CA·HR 등). 달력과 출석부에는 그대로 나온다. */
  usesProgress: boolean
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
  /** 비워두면 배경색에 맞춰 자동으로 고른다. */
  textColor?: string
  /** true 면 달력·진도표에서 굵게, 다른 배경으로 강조한다(수행평가 등). */
  emphasis?: boolean
}

/** 진도표의 한 행. 과목별로 순서를 가진다. */
export type Lesson = {
  id: string
  subjectId: string
  title: string
  typeId: string
  note: string
  /** 이 차시가 수행평가라면, 어떤 평가(평가 관리)와 연결되는지. */
  evaluationId?: string
}

export type EventType = 'closed' | 'blocked' | 'swap' | 'note'

export type SchoolEvent = {
  id: string
  date: string
  /** 기간 일정이면 마지막 날. 비어 있으면 하루짜리. */
  endDate?: string
  /** 기간 일정에서 주말도 포함할지. 기본은 꺼짐(주말은 자동으로 빠짐). */
  includeWeekends?: boolean
  title: string
  type: EventType
  /** blocked 일 때만 사용. 비어 있으면 그날 전 교시. */
  periods: number[]
  /** swap 일 때만 사용. 이 날 어느 요일 시간표로 운영하는지. */
  sourceDay?: Day
  /** 비어 있으면 전체 학급. */
  classIds: string[]
}

/** 학급별 진도 기록. 키는 `${classId}:${lessonId}` */
export type Progress = {
  done?: boolean
  memo?: string
}

/**
 * 개별 수업 시간을 반별로 조정한다.
 * normal  기본. 진도 1개를 소비한다.
 * extend  앞 차시를 이어서 한 시간 더. 진도를 소비하지 않아 뒤가 한 칸 밀린다.
 * none    수업 없음(행사·자습). 진도를 소비하지 않는다.
 * merge   두 차시를 한 시간에. 진도 2개를 소비해 뒤가 한 칸 당겨진다.
 */
export type SessionMode = 'normal' | 'extend' | 'none' | 'merge'

export type SessionOverride = {
  mode?: SessionMode
  label?: string
  /** 예전 형식 호환용 */
  skip?: boolean
}

export type AttendanceStatus = '출석' | '지각' | '조퇴' | '결석' | '기타'

export type Appearance = {
  themeId: string
  accent: string
  fontId: string
  fontSize: string
}

export type Settings = {
  appearance: Appearance
  schoolName: string
  teacherName: string
  year: string
  termName: string
  termStart: string
  termEnd: string
  /** true 면 대한민국 공휴일에 자동으로 수업을 빼고 달력에 표시한다. */
  useHolidays: boolean
}

export type DayNote = {
  id: string
  text: string
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
  /** 날짜별 자유 메모. 학사일정과 달리 진도·시간표에 영향을 주지 않는 개인 기록용. 키는 YYYY-MM-DD. */
  dayNotes: Record<string, DayNote[]>
  evaluationTypes: EvaluationType[]
  evaluations: Evaluation[]
  /** 평가 점수. 키는 `${evaluationId}:${itemId}:${studentId}`. */
  scores: Record<string, number>
  /** 학생별 평가 비고. 키는 `${evaluationId}:${studentId}`. */
  evaluationNotes: Record<string, string>
  /**
   * 평가 응시 여부. 점수와는 별개다. 키가 아예 없으면 "미확인"(아직 안 봄),
   * 'present' 면 응시, 'absent' 면 미응시(결석 등)로 교사가 확정한 상태다.
   */
  evalAttendance: Record<string, 'present' | 'absent'>
}

export type EvaluationType = {
  id: string
  name: string
}

export type EvaluationItem = {
  id: string
  name: string
  maxScore: number
  /** 평가 기준·성취 수준 메모. 지금은 자유 텍스트 한 칸. */
  description?: string
}

export type Evaluation = {
  id: string
  subjectId: string
  name: string
  typeId: string
  /** 반영 비율(%). 예: 30 */
  weight: number
  date: string
  /** 대상 학급. 비어 있으면 그 과목의 모든 학급. */
  classIds: string[]
  items: EvaluationItem[]
}

/** 자동 배정된 한 번의 수업 시간 */
export type Session = {
  id: string
  date: string
  classId: string
  subjectId: string
  period: number
  /** 이 시간에 다루는 진도. 비어 있으면 미배정, 2개면 두 차시를 한 번에. */
  lessonIds: string[]
  mode: SessionMode
  /** 이어서 하는 시간이면 이어받은 앞 차시 */
  continuedFrom?: string
  label?: string
  /** 요일 변경으로 들어온 시간이면 원래 그날의 요일 */
  swappedFrom?: Day
  /** 요일 변경으로 사라진 자리. 표시만 하고 진도·출석에는 넣지 않는다. */
  cancelled?: boolean
}
