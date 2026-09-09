import * as XLSX from 'xlsx'
import type { AppData, Session } from './types'
import { coverage, sessionLabel } from './schedule'

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

/** 현재 화면(.content 안쪽)만 인쇄한다. 메뉴·버튼은 인쇄 스타일로 숨긴다. */
export function printCurrentView() {
  window.print()
}
