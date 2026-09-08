import * as XLSX from 'xlsx'
import type { Day, Slot } from './types'

export type ImportedStudent = { number: number; name: string }

export type ImportedClass = {
  /** 파일에서 읽어낸 과목명 (예: 음악, 음악연주) */
  subject: string
  /** 학급 표시명 (예: 1-1) */
  className: string
  slots: Slot[]
  students: ImportedStudent[]
  teacher: string
  school: string
  fileName: string
}

type Row = unknown[]

const text = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

/**
 * 나이스 교과시간별출석부 머리글은 `교과 : 음악 1학년  1-1` 형태다.
 * 과목명은 학년 표기 앞부분 전체를 쓴다(음악연주처럼 두 글자가 아닐 수 있어서).
 */
function readHeading(value: string) {
  const matched = value.match(/교과\s*[:：]\s*(.+?)\s*(\d+)\s*학년\s+(\d+)\s*[-－]\s*(\d+)/)
  if (matched) return { subject: matched[1].trim(), className: `${matched[3]}-${matched[4]}` }
  const loose = value.match(/교과\s*[:：]\s*(.+?)\s*(\d+)\s*학년\s*(\d+)\s*반/)
  if (loose) return { subject: loose[1].trim(), className: `${loose[2]}-${loose[3]}` }
  return null
}

/** `[월 4], [화 6]` 형태에서 요일·교시를 뽑는다. 대괄호가 없는 변형도 허용. */
function readSlots(value: string): Slot[] {
  const found: Slot[] = []
  const pattern = /(월|화|수|목|금)\s*(?:요일)?\s*([1-9])\s*(?:교시)?/g
  for (const match of value.matchAll(pattern)) {
    const day = match[1] as Day
    const period = Number(match[2])
    if (!found.some(item => item.day === day && item.period === period)) found.push({ day, period })
  }
  return found
}

function readTeacher(value: string) {
  const matched = value.match(/담당\s*교사\s*[:：]\s*(.+)$/)
  return matched ? matched[1].trim() : ''
}

function findHeader(rows: Row[]) {
  const index = rows.findIndex(row => {
    const values = row.map(text)
    return values.some(value => /^번호$/.test(value)) && values.some(value => /^성\s*명$|^이름$/.test(value))
  })
  if (index < 0) return null
  const header = rows[index].map(text)
  return {
    index,
    numberIndex: header.findIndex(value => /^번호$/.test(value)),
    nameIndex: header.findIndex(value => /^성\s*명$|^이름$/.test(value)),
  }
}

function parseSheet(sheet: XLSX.WorkSheet, fileName: string): ImportedClass | null {
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: '' })

  let subject = ''
  let className = ''
  let teacher = ''
  let school = ''
  const slots: Slot[] = []

  rows.forEach((row, rowIndex) => {
    row.forEach(cell => {
      const value = text(cell)
      if (!value) return
      const heading = readHeading(value)
      if (heading && !className) {
        subject = heading.subject
        className = heading.className
      }
      if (!teacher) teacher = readTeacher(value)
      if (!school && /(초|중|고)등학교$/.test(value)) school = value
      // 학생 이름에 요일 글자가 섞여 오탐하지 않도록 머리글 영역만 훑는다.
      if (rowIndex < 10) {
        readSlots(value).forEach(slot => {
          if (!slots.some(item => item.day === slot.day && item.period === slot.period)) slots.push(slot)
        })
      }
    })
  })

  const header = findHeader(rows)
  const students: ImportedStudent[] = []
  if (header && header.numberIndex >= 0 && header.nameIndex >= 0) {
    rows.slice(header.index + 1).forEach(row => {
      const number = Number(text(row[header.numberIndex]).replace(/[^0-9]/g, ''))
      const name = text(row[header.nameIndex])
      if (!number || !name) return
      if (/합계|총원|학생\s*수|^계$/.test(name)) return
      if (students.some(item => item.number === number)) return
      students.push({ number, name })
    })
  }

  if (!className && !students.length) return null
  students.sort((left, right) => left.number - right.number)
  return {
    subject: subject || '과목 미상',
    className: className || fileName.replace(/\.[^.]+$/, ''),
    slots,
    students,
    teacher,
    school,
    fileName,
  }
}

export async function parseWorkbooks(files: File[]): Promise<{ classes: ImportedClass[]; failed: string[] }> {
  const classes: ImportedClass[] = []
  const failed: string[] = []
  for (const file of files) {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      let matched = false
      workbook.SheetNames.forEach(name => {
        const parsed = parseSheet(workbook.Sheets[name], file.name)
        if (!parsed) return
        matched = true
        const twin = classes.find(item => item.subject === parsed.subject && item.className === parsed.className)
        if (!twin) {
          classes.push(parsed)
          return
        }
        parsed.slots.forEach(slot => {
          if (!twin.slots.some(item => item.day === slot.day && item.period === slot.period)) twin.slots.push(slot)
        })
        parsed.students.forEach(student => {
          if (!twin.students.some(item => item.number === student.number)) twin.students.push(student)
        })
        twin.students.sort((left, right) => left.number - right.number)
      })
      if (!matched) failed.push(file.name)
    } catch {
      failed.push(file.name)
    }
  }
  classes.sort((left, right) => (left.subject + left.className).localeCompare(right.subject + right.className))
  return { classes, failed }
}
