import * as XLSX from 'xlsx'
import type { AppData, Session, Student, TeacherTask } from './types'
import { buildSessions, sessionLabel } from './schedule'
import { evaluationClasses } from './evaluation'
import { evaluationSheetRows } from './exportPrint'
import { homeroomEntries } from './homeroomAttendance'
import { homeroomRecordRows } from './homeroomExport'
import { taskKind, taskDeadline } from './taskDates'

type Cell = string | number
type SheetSpec = { name: string; rows: Cell[][]; cols: number[]; note?: string; count: number }

const DAY_ORDER = ['월', '화', '수', '목', '금']
const yesNo = (value: unknown) => (value ? 'O' : '')
const safeSheetName = (name: string) => name.replace(/[[\]:*?/\\]/g, '_').trim().slice(0, 31) || '시트'

function uniqueName(name: string, used: Set<string>) {
  let base = safeSheetName(name), candidate = base, index = 2
  while (used.has(candidate)) {
    const suffix = ` (${index++})`
    candidate = base.slice(0, 31 - suffix.length) + suffix
  }
  used.add(candidate)
  return candidate
}

function studentCells(student: Student | undefined, fallbackId = ''): Cell[] {
  return student ? [student.number, student.name] : ['', fallbackId ? '(명단에 없음)' : '']
}

const sortSessions = (list: Session[]) => list.slice().sort((a, b) => (a.date + String(a.period).padStart(2, '0') + a.classId).localeCompare(b.date + String(b.period).padStart(2, '0') + b.classId))

function taskRows(tasks: TeacherTask[], withDaily: boolean): Cell[][] {
  const kindLabel = { todo: '날짜 미정', dated: '하루', period: '기간', deadline: '마감' } as const
  const header: Cell[] = ['업무명', '분류', '유형', '시작일', '종료일', '마감일', '중요', '완료', ...(withDaily ? ['매일 체크한 날'] : []), '메모', '링크']
  return [header, ...tasks.slice().sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title, 'ko')).map(task => {
    const kind = taskKind(task)
    return [task.title, task.category || '', kindLabel[kind] || '', task.date || '', kind === 'period' ? task.endDate || '' : '', kind === 'deadline' || task.showDeadline ? taskDeadline(task) || '' : '', yesNo(task.important), yesNo(task.done),
      ...(withDaily ? [(task.doneDates || []).join(', ')] : []), task.note || '', task.link || '']
  })]
}

/** 티칭플로의 모든 기록을 기능별 시트로 나눈 엑셀 통합문서를 만든다. 보기·보관용이며 복원은 JSON 백업으로 한다. */
export function fullWorkbook(data: AppData, now = new Date()) {
  const sessions = buildSessions(data)
  const specs: SheetSpec[] = []
  const add = (name: string, rows: Cell[][], cols: number[], note?: string) => {
    const count = Math.max(0, rows.length - 1)
    if (count) specs.push({ name, rows, cols, note, count })
  }
  const classOf = (id: string) => data.classes.find(item => item.id === id)
  const subjectName = (id: string) => data.subjects.find(item => item.id === id)?.name || ''
  const allClassStudents = (classId: string) => classOf(classId)?.students || []

  // 1. 학급·명단
  add('학급 명단', [
    ['과목', '학급', '강의실', '수업 시간', '상태', '학번', '성명', '기본 모둠', '전입일', '전출일', '전출 사유'],
    ...data.classes.flatMap(classroom => {
      const slots = classroom.slots.slice().sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.period - b.period).map(slot => `${slot.day}${slot.period}`).join(' ')
      const base = [subjectName(classroom.subjectId), classroom.name, classroom.room || '', slots, classroom.archived ? '보관' : '사용 중']
      return classroom.students.length
        ? classroom.students.slice().sort((a, b) => a.number - b.number).map(student => [...base, student.number, student.name, student.group || '', student.joinedOn || '', student.leftOn || '', student.departureReason || ''])
        : [[...base, '', '', '', '', '', '']]
    }),
  ], [10, 10, 8, 18, 7, 8, 9, 8, 11, 11, 14])

  // 2. 진도표 (과목·차시·학급별 한 줄)
  const progressRows: Cell[][] = [['과목', '차시', '수업 내용', '유형', '연결 평가', '학급', '수업일', '교시', '완료', '진도 메모']]
  data.subjects.forEach(subject => {
    const lessons = data.lessons.filter(lesson => lesson.subjectId === subject.id)
    const classes = data.classes.filter(item => !item.archived && item.subjectId === subject.id)
    lessons.forEach((lesson, index) => {
      const type = data.types.find(item => item.id === lesson.typeId)?.name || ''
      const evaluation = data.evaluations.find(item => item.id === lesson.evaluationId)?.name || ''
      if (!classes.length) { progressRows.push([subject.name, index + 1, lesson.title, type, evaluation, '', '', '', '', lesson.note || '']); return }
      classes.forEach(classroom => {
        const session = sessions.find(item => item.classId === classroom.id && item.lessonIds.includes(lesson.id))
        const record = data.progress[`${classroom.id}:${lesson.id}`]
        progressRows.push([subject.name, index + 1, lesson.title, type, evaluation, classroom.name, session?.date || '', session?.period || '', yesNo(record?.done), record?.memo || ''])
      })
    })
  })
  add('진도표', progressRows, [10, 6, 26, 10, 14, 10, 11, 6, 6, 30])

  // 3. 수업 일정 (학기 전체 배정 결과)
  add('수업 일정', [
    ['날짜', '교시', '학급', '과목', '수업 내용', '구분', '메모'],
    ...sortSessions(sessions.filter(session => !session.hidden)).map(session => {
      const status = session.cancelled ? '수업 없음' : session.extra ? (session.extraOrigin ? '시간 이동' : '보강·추가') : session.swappedFrom ? `${session.swappedFrom}요일 시간표` : session.mode === 'none' ? '수업 없음' : session.mode === 'extend' ? '이어서' : session.mode === 'merge' ? '두 차시' : ''
      return [session.date, session.period, classOf(session.classId)?.name || '', subjectName(session.subjectId), sessionLabel(data, session), status, session.extraNote || data.overrides[session.id]?.memo || '']
    }),
  ], [11, 6, 10, 10, 28, 12, 30])

  // 4. 수업 기록 (수업 일지)
  add('수업 기록', [
    ['날짜', '교시', '학급', '과목', '차시', '수업 기록', '다음 시간 메모'],
    ...Object.values(data.lessonJournal || {}).filter(entry => entry.record?.trim() || entry.nextMemo?.trim())
      .sort((a, b) => (a.date + a.period).localeCompare(b.date + b.period))
      .map(entry => [entry.date, entry.period, classOf(entry.classId)?.name || '', subjectName(entry.subjectId), entry.lessonTitle || '', entry.record || '', entry.nextMemo || '']),
  ], [11, 6, 10, 10, 22, 50, 36])

  // 5. 교과 출결·특기사항 (누가기록)
  const digestRows: Cell[][] = [['학급', '학번', '성명', '날짜', '교시', '수업 내용', '출결', '특기사항']]
  sortSessions(sessions.filter(session => session.mode !== 'none' && !session.cancelled)).forEach(session => {
    allClassStudents(session.classId).forEach(student => {
      const key = `${session.id}:${student.id}`
      const status = data.attendance[key] || '출석'
      const note = data.activities[key] || ''
      if (status === '출석' && !note) return
      digestRows.push([classOf(session.classId)?.name || '', student.number, student.name, session.date, session.period, sessionLabel(data, session), status, note])
    })
  })
  digestRows.splice(1, digestRows.length - 1, ...digestRows.slice(1).sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'ko') || Number(a[1]) - Number(b[1]) || String(a[3]).localeCompare(String(b[3])) || Number(a[4]) - Number(b[4])))
  add('교과 출결·특기사항', digestRows, [10, 8, 9, 11, 6, 22, 7, 50], '출석이면서 특기사항이 없는 칸은 생략했습니다.')

  // 6. 평가 기준
  const criteriaRows: Cell[][] = [['평가명', '과목', '평가 유형', '반영 비율(%)', '평가일', '대상 학급', '과제', '평가 요소', '만점', '요소 설명', '채점 기준']]
  data.evaluations.forEach(evaluation => {
    const type = data.evaluationTypes.find(item => item.id === evaluation.typeId)?.name || ''
    const classes = evaluationClasses(data, evaluation).map(item => item.name).join(', ')
    const base: Cell[] = [evaluation.name, subjectName(evaluation.subjectId), type, evaluation.weight, evaluation.date || '', classes]
    const tasks = evaluation.tasks?.length ? evaluation.tasks : [{ id: '', name: '', items: evaluation.items || [] }]
    tasks.forEach(task => {
      if (!task.items.length) { criteriaRows.push([...base, task.name, '', '', '', '']); return }
      task.items.forEach(item => criteriaRows.push([...base, task.name, item.name, item.maxScore, item.description || '',
        (item.levels || []).slice().sort((a, b) => b.score - a.score).map(level => `${level.score}점: ${level.description}`).join('\n')]))
    })
  })
  add('평가 기준', criteriaRows, [16, 10, 10, 8, 11, 18, 14, 16, 6, 30, 50])

  // 7. 평가별 점수 시트 (학급별로 이어 붙임)
  data.evaluations.forEach(evaluation => {
    const classes = evaluationClasses(data, evaluation)
    if (!classes.length) return
    let rows: Cell[][] = [], cols: number[] = [], count = 0
    classes.forEach((classroom, index) => {
      const built = evaluationSheetRows(data, evaluation, classroom)
      const body = built.rows.slice(1)
      if (index === 0) rows.push(built.rows[0])
      rows.push([], [`■ ${classroom.name}`], ...body)
      count += body.length - 2
      if (built.cols.length > cols.length) cols = built.cols.map(col => col.wch ?? 10)
    })
    rows = rows.map(row => row.map(cell => (cell === undefined ? '' : cell)))
    if (count) specs.push({ name: `평가_${evaluation.name}`, rows, cols, count })
  })

  // 8. 학사일정 · 날짜 메모 · 시간표 변경
  const eventType = { closed: '휴업·수업 없음', blocked: '일부 교시 제외', swap: '요일 대체', note: '안내' } as const
  add('학사일정', [
    ['시작일', '종료일', '구분', '일정', '대상 학급', '제외 교시', '대체 요일'],
    ...data.events.slice().sort((a, b) => a.date.localeCompare(b.date)).map(event => [event.date, event.endDate || '', eventType[event.type] || event.type, event.title,
      event.classIds.length ? event.classIds.map(id => classOf(id)?.name || '').filter(Boolean).join(', ') : '전체', event.type === 'blocked' ? (event.periods.length ? event.periods.join(', ') : '전 교시') : '', event.type === 'swap' ? event.sourceDay || '' : '']),
  ], [11, 11, 14, 28, 20, 10, 8])
  add('날짜 메모', [
    ['날짜', '메모'],
    ...Object.entries(data.dayNotes || {}).sort(([a], [b]) => a.localeCompare(b)).flatMap(([date, notes]) => notes.filter(note => note.text.trim()).map(note => [date, note.text])),
  ], [11, 60])
  add('시간표 변경·개인 일정', [
    ['날짜', '교시', '구분', '학급', '내용'],
    ...[
      ...(data.extraSessions || []).map(item => [item.date, item.period, item.origin === 'moved' ? '시간 이동' : item.origin === 'swapped' ? '시간 교체' : '보강·추가', classOf(item.classId)?.name || '', item.note || ''] as Cell[]),
      ...(data.personalBlocks || []).map(item => [item.date, item.period, '개인 일정', '', [item.title, item.note].filter(Boolean).join(' - ')] as Cell[]),
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0])) || Number(a[1]) - Number(b[1])),
  ], [11, 6, 10, 10, 40])

  // 9. 업무
  const desk = data.teacherDesk
  add('업무', taskRows(desk.tasks, true), [28, 10, 9, 11, 11, 11, 5, 5, 24, 36, 30])
  add('업무 기록', [
    ['날짜', '제목', '분류', '연결된 업무', '내용', '링크'],
    ...(desk.workRecords || []).slice().sort((a, b) => a.date.localeCompare(b.date)).map(record => [record.date, record.title, record.category || '', desk.tasks.find(task => task.id === record.taskId)?.title || record.taskTitle || '', record.content || '', record.link || '']),
  ], [11, 24, 10, 20, 50, 30])

  // 10. 담임
  const homeroomName = desk.className || '담임반'
  add('담임 명단', [
    ['학급', '학번', '성명', '기본 모둠', '전입일', '전출일', '전출 사유'],
    ...desk.students.slice().sort((a, b) => a.number - b.number).map(student => [homeroomName, student.number, student.name, student.group || '', student.joinedOn || '', student.leftOn || '', student.departureReason || '']),
  ], [12, 8, 9, 8, 11, 11, 14])
  add('담임 출결', [
    ['날짜', '학번', '성명', '출결', '사유', '메모', '집계 반영'],
    ...homeroomEntries(desk).filter(entry => entry.status !== '출석' || entry.memo).map(entry => {
      const student = desk.students.find(item => item.id === entry.studentId)
      return [entry.date, ...studentCells(student, entry.studentId), entry.status, entry.reason || '', entry.memo || '', entry.counted === false ? '중복(제외)' : '']
    }),
  ], [11, 8, 9, 7, 8, 36, 10])
  add('상담·생활 기록', homeroomRecordRows(data), [12, 8, 9, 11, 11, 60, 11, 10, 9])
  add('안내·학급 할 일', taskRows(desk.notices, false), [28, 10, 9, 11, 11, 11, 5, 5, 36, 30])
  add('제출물 취합', [
    ['제출물', '기한', '대상 인원', '제출', '미제출', '미제출 학생', '중요', '지난 제출'],
    ...desk.collections.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(item => {
      const missing = item.studentIds.filter(id => !item.received.includes(id))
      const names = missing.map(id => { const s = desk.students.find(student => student.id === id); return s ? `${s.number} ${s.name}` : '(명단에 없음)' }).join(', ')
      return [item.title, item.date || '', item.studentIds.length, item.studentIds.length - missing.length, missing.length, names, yesNo(item.important), yesNo(item.archived)]
    }),
  ], [24, 11, 8, 6, 7, 50, 5, 8])

  // 11. 동아리
  add('동아리 명단', [
    ['동아리', '학번', '성명'],
    ...data.clubs.flatMap(club => club.students.slice().sort((a, b) => a.number - b.number).map(student => [club.name, student.number, student.name])),
  ], [16, 8, 9])
  add('동아리 활동', [
    ['동아리', '날짜', '활동명', '활동 기록', '다음 계획', '중요'],
    ...data.clubs.flatMap(club => club.activities.slice().sort((a, b) => a.date.localeCompare(b.date)).map(activity => [club.name, activity.date, activity.title, activity.record || '', activity.nextPlan || '', yesNo(activity.important)])),
  ], [16, 11, 20, 50, 30, 5])
  add('동아리 출결', [
    ['동아리', '날짜', '학번', '성명', '출결', '사유', '메모'],
    ...data.clubs.flatMap(club => Object.entries(club.attendance || {}).filter(([key, status]) => status !== '출석' || club.attendanceMemos?.[key])
      .map(([key, status]) => {
        const date = key.slice(0, 10), studentId = key.slice(11)
        return [club.name, date, ...studentCells(club.students.find(item => item.id === studentId), studentId), status, club.attendanceReasons?.[key] || '', club.attendanceMemos?.[key] || '']
      }).sort((a, b) => String(a[1]).localeCompare(String(b[1])) || Number(a[2]) - Number(b[2]))),
  ], [16, 11, 8, 9, 7, 8, 36])

  // 12. 모둠 편성 · 자리 배치
  add('모둠 편성', [
    ['학급', '모둠', '학번', '성명'],
    ...Object.entries(data.groupPlans || {}).flatMap(([classId, plan]) => {
      const classroom = classOf(classId)
      if (!classroom) return []
      return classroom.students.filter(student => plan.assignments?.[student.id])
        .sort((a, b) => plan.assignments[a.id] - plan.assignments[b.id] || a.number - b.number)
        .map(student => [classroom.name, `${plan.assignments[student.id]}모둠`, student.number, student.name])
    }),
  ], [10, 8, 8, 9])
  const seatRows: Cell[][] = [['자리 배치 (화면과 같은 칸 순서, 빈칸은 빈자리)']]
  let seatCount = 0
  Object.entries(data.seatingPlans || {}).forEach(([key, plan]) => {
    const students = key === 'homeroom' ? desk.students : classOf(key.replace(/^class:/, ''))?.students || []
    const title = key === 'homeroom' ? `${homeroomName} (담임)` : classOf(key.replace(/^class:/, ''))?.name
    if (!title || !Object.keys(plan.assignments || {}).length) return
    seatRows.push([], [`■ ${title}`])
    for (let row = 0; row < plan.rows; row++) {
      seatRows.push(Array.from({ length: plan.columns }, (_, column) => {
        const index = row * plan.columns + column
        if (plan.disabled?.includes(index)) return '×'
        const student = students.find(item => item.id === plan.assignments[String(index)])
        if (student) seatCount++
        return student ? `${student.number} ${student.name}` : ''
      }))
    }
  })
  if (seatCount) specs.push({ name: '자리 배치', rows: seatRows, cols: Array(20).fill(13), count: seatCount })

  // 안내 시트 + 조립
  const workbook = XLSX.utils.book_new()
  const used = new Set<string>(['안내'])
  const named = specs.map(spec => ({ ...spec, name: uniqueName(spec.name, used) }))
  const settings = data.settings
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const guide: Cell[][] = [
    ['티칭플로 전체 기록'],
    ['학교', settings.schoolName || ''], ['교사', settings.teacherName || ''], ['학년도·학기', [settings.year, settings.termName].filter(Boolean).join(' ')],
    ['학기 기간', settings.termStart && settings.termEnd ? `${settings.termStart} ~ ${settings.termEnd}` : ''], ['내보낸 시각', stamp],
    [],
    ['시트', '건수', '참고'],
    ...named.map(spec => [spec.name, spec.count, spec.note || ''] as Cell[]),
    [],
    ['※ 이 파일은 보기·보관·제출용입니다. 티칭플로에 다시 불러올 수는 없으니, 복원용으로는 환경설정 › 데이터 관리의 JSON 내보내기를 함께 해 두세요.'],
    ['※ 내용이 없는 기능은 시트를 만들지 않았습니다. 보관한 학급은 명단만 담기고 수업 일정·출결은 담기지 않습니다.'],
  ]
  const guideSheet = XLSX.utils.aoa_to_sheet(guide)
  guideSheet['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(workbook, guideSheet, '안내')
  named.forEach(spec => {
    const sheet = XLSX.utils.aoa_to_sheet(spec.rows)
    sheet['!cols'] = spec.cols.map(wch => ({ wch }))
    const header = spec.rows[0]
    if (header && header.length > 1 && !spec.name.startsWith('평가_') && spec.name !== '자리 배치') {
      sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: spec.rows.length - 1, c: header.length - 1 } }) }
    }
    XLSX.utils.book_append_sheet(workbook, sheet, spec.name)
  })
  return { workbook, sheets: named.map(spec => ({ name: spec.name, count: spec.count })) }
}

export function exportFullXlsx(data: AppData) {
  const { workbook } = fullWorkbook(data)
  const now = new Date()
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const owner = (data.settings.teacherName || '').replace(/[\\/:*?"<>|]/g, '_')
  XLSX.writeFile(workbook, `티칭플로_전체기록${owner ? `_${owner}` : ''}_${stamp}.xlsx`)
}
