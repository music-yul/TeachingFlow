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
  /** 학번. 선택과목 반은 원적반 학번(예: 2104)을 그대로 쓴다. 동명이인 구분의 기준이 된다. */
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
   * 평가 과제별 응시 상태. 키는 `${evaluationId}:${taskId}:${studentId}`.
   * 키가 없으면 "미확인", 'present' 응시, 'absent' 미응시, 'missing' 미제출.
   */
  taskStatus: Record<string, TaskStatus>
  /** @deprecated taskStatus 로 옮겼다. 예전 데이터를 읽을 때만 쓴다. */
  evalAttendance?: Record<string, 'present' | 'absent'>
}

export type EvaluationType = {
  id: string
  name: string
}

export type RubricLevel = {
  id: string
  score: number
  description: string
}

export type EvaluationItem = {
  id: string
  name: string
  maxScore: number
  /** 평가 기준·성취 수준 메모. 지금은 자유 텍스트 한 칸. */
  description?: string
  /** 채점기준(레벨). 있으면 채점표에서 숫자 입력 대신 이 버튼들로 클릭 입력한다. */
  levels?: RubricLevel[]
  /** 채점기준 자동 생성용 - 기준 칸 수(예: 5) */
  levelCount?: number
  /** 채점기준 자동 생성용 - 급간(예: 4). 점수는 만점에서 급간만큼 내려가며 자동으로 매겨진다. */
  step?: number
  /** @deprecated 미응시·미제출 점수는 평가 과제(EvaluationTask) 단위로 옮겼다. */
  basicScore?: number
}

/**
 * 평가 과제. 평가 영역(Evaluation) 아래, 평가 요소(EvaluationItem) 위 단계다.
 * 예: 평가 영역 "악기 탐색 및 연주" → 평가 과제 "악기 탐색", "악기 연주".
 * 미응시·미제출 점수는 과제 단위로 준다. 요소별 채점 자체가 불가능한 상황이기 때문이다.
 */
export type EvaluationTask = {
  id: string
  name: string
  /** 미응시로 표시했을 때 이 과제에 자동으로 넣을 점수. 비우면 0점. */
  absentScore?: number
  /** 미제출로 표시했을 때 이 과제에 자동으로 넣을 점수. 비우면 0점. */
  missingScore?: number
  items: EvaluationItem[]
}

/** 과제별 응시 상태. 키가 없으면 "미확인"(아직 안 봄)이다. */
export type TaskStatus = 'present' | 'absent' | 'missing'

export type Evaluation = {
  id: string
  subjectId: string
  /** 평가 영역명. 예: "악기 탐색 및 연주" */
  name: string
  typeId: string
  /** 반영 비율(%). 예: 30 */
  weight: number
  /** @deprecated 진도에 따라 여러 날에 걸쳐 하므로 더 이상 입력받지 않는다. 예전 데이터 호환용. */
  date?: string
  /** 대상 학급. 비어 있으면 그 과목의 모든 학급. */
  classIds: string[]
  tasks: EvaluationTask[]
  /** @deprecated tasks 로 옮겨졌다. 예전 데이터를 읽을 때만 쓴다. */
  items?: EvaluationItem[]
  /** 이 채점기준을 만든 원본 파일 이름(참고용 표시만, 파일 자체는 저장하지 않는다). */
  sourceFileName?: string
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
