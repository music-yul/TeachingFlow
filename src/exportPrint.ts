import * as XLSX from 'xlsx'
import type { AppData, Evaluation, Session } from './types'
import { coverage, sessionLabel } from './schedule'
import {
  evaluationClasses,
  evaluationTasks,
  isLockedStatus,
  noteKey,
  rawTotal,
  scoreKey,
  taskScore,
  taskStatusOf,
  weightedScore,
} from './evaluation'

/** 진도표를 엑셀 파일로 내려받는다. */
export function exportProgressXlsx(data: AppData, sessions: Session[], subjectId: string) {
  const subject = data.subjects.find(item => item.id === subjectId)
  if (!subject) return

  const classes = data.classes.filter(item => !item.archived && item.subjectId === subjectId)
  const lessons = data.lessons.filter(item => item.subjectId === subjectId)

  const header = ['차시', '수업 내용', '유형', ...classes.map(item => item.name)]
  const rows: (string | number)[][] = [header]

  lessons.forEach((lesson, index) => {
    const type = data.types.find(item => item.id === lesson.typeId)
    const row: (string | number)[] = [index + 1, lesson.title, type?.name || '']
    classes.forEach(classroom => {
      const session = sessions.find(item => item.classId === classroom.id && item.lessonIds.includes(lesson.id))
      const record = session ? data.progress[`${classroom.id}:${lesson.id}`] : undefined
      if (!session) row.push('')
      else row.push(`${session.date} ${session.period}교시${record?.done ? ' (완료)' : ''}${record?.memo ? ` - ${record.memo}` : ''}`)
    })
    rows.push(row)
  })

  rows.push([])
  rows.push(['학급', '학기 중 수업 시간', '등록된 차시', '여유'])
  coverage(data, sessions)
    .filter(stat => classes.some(item => item.id === stat.classId))
    .forEach(stat => {
      const classroom = classes.find(item => item.id === stat.classId)
      rows.push([classroom?.name || '', stat.total, stat.lessonCount, stat.spare])
    })

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 10 }, ...classes.map(() => ({ wch: 24 }))]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '진도표')

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `진도표_${subject.name}_${stamp}.xlsx`)
}

/** 특정 달의 배정 결과를 엑셀로 내려받는다. */
export function exportCalendarXlsx(data: AppData, sessions: Session[], month: Date) {
  const year = month.getFullYear()
  const monthNumber = month.getMonth() + 1
  const prefix = `${year}-${String(monthNumber).padStart(2, '0')}`
  const monthSessions = sessions
    .filter(item => item.date.startsWith(prefix) && !item.cancelled)
    .sort((left, right) => (left.date + String(left.period)).localeCompare(right.date + String(right.period)))

  const rows: (string | number)[][] = [['날짜', '교시', '학급', '내용']]
  monthSessions.forEach(session => {
    const classroom = data.classes.find(item => item.id === session.classId)
    rows.push([session.date, session.period, classroom?.name || '', sessionLabel(data, session)])
  })

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 28 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, `${monthNumber}월`)
  XLSX.writeFile(workbook, `달력_${year}년${monthNumber}월.xlsx`)
}

/** 한 학급 전체 학생의 출결·특이사항 기록을 한 시트로 내려받는다. */
export function exportClassDigestXlsx(data: AppData, sessions: Session[], classId: string) {
  const classroom = data.classes.find(item => item.id === classId)
  if (!classroom) return

  const own = sessions
    .filter(item => item.classId === classId && item.mode !== 'none' && !item.cancelled)
    .sort((left, right) => (left.date + String(left.period)).localeCompare(right.date + String(right.period)))

  const rows: (string | number)[][] = [['학번', '성명', '날짜', '교시', '수업 내용', '출결', '특이사항']]
  classroom.students.forEach(student => {
    own.forEach(session => {
      const key = `${session.id}:${student.id}`
      const status = data.attendance[key] || '출석'
      const note = data.activities[key] || ''
      if (status === '출석' && !note) return
      rows.push([student.number, student.name, session.date, session.period, sessionLabel(data, session), status, note])
    })
  })

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 20 }, { wch: 8 }, { wch: 34 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, classroom.name)

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `출결기록_${classroom.name}_${stamp}.xlsx`)
}

/** 평가 점수를 학급별 시트로 내려받는다. 학교 평가표와 비슷한 형태(학번·성명·요소별 점수·합계·비고). */
export function exportEvaluationXlsx(data: AppData, evaluation: Evaluation) {
  const classes = evaluationClasses(data, evaluation)
  if (!classes.length) return

  const tasks = evaluationTasks(evaluation)
  const workbook = XLSX.utils.book_new()
  classes.forEach(classroom => {
    // 과제 행 → 요소 행 순서로 두 줄짜리 머리글을 만든다(학교 채점표와 같은 모양).
    const taskRow: (string | number)[] = ['', '']
    const itemRow: (string | number)[] = ['학번', '성명']
    tasks.forEach(task => {
      taskRow.push(task.name, ...task.items.map(() => ''))
      itemRow.push('응시', ...task.items.map(item => `${item.name}(${item.maxScore})`))
    })
    taskRow.push('', '', '')
    itemRow.push('원점수', '반영점수', '비고')

    const rows: (string | number)[][] = [
      [`${evaluation.name} (${evaluation.weight}% 반영)`],
      taskRow,
      itemRow,
    ]
    classroom.students.forEach(student => {
      const row: (string | number)[] = [student.number, student.name]
      tasks.forEach(task => {
        const status = taskStatusOf(data, evaluation.id, task.id, student.id)
        row.push(status === 'absent' ? '미응시' : status === 'missing' ? '미제출' : status === 'present' ? '응시' : '')
        if (isLockedStatus(status)) {
          // 미응시·미제출이면 요소별 칸은 비우고 과제 점수만 첫 칸에 적는다.
          task.items.forEach((_, index) => row.push(index === 0 ? taskScore(data, evaluation, task, student.id) : ''))
        } else {
          task.items.forEach(item => row.push(data.scores[scoreKey(evaluation.id, item.id, student.id)] ?? ''))
        }
      })
      row.push(
        rawTotal(data, evaluation, student.id),
        Math.round(weightedScore(data, evaluation, student.id) * 10) / 10,
        data.evaluationNotes[noteKey(evaluation.id, student.id)] || '',
      )
      rows.push(row)
    })
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = [
      { wch: 8 }, { wch: 9 },
      ...tasks.flatMap(task => [{ wch: 7 }, ...task.items.map(() => ({ wch: 11 }))]),
      { wch: 8 }, { wch: 9 }, { wch: 24 },
    ]
    XLSX.utils.book_append_sheet(workbook, sheet, classroom.name.slice(0, 31))
  })

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `평가_${evaluation.name}_${stamp}.xlsx`)
}

/** 현재 화면(.content 안쪽)만 인쇄한다. 메뉴·버튼은 인쇄 스타일로 숨긴다. */
export function printCurrentView() {
  window.print()
}
