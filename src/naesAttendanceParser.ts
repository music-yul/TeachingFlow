import * as XLSX from 'xlsx'
import type { Day, Slot } from './types'

export type ImportedStudent = { number: number; name: string }

export type ImportedClass = {
  subject: string
  className: string
  slots: Slot[]
  students: ImportedStudent[]
  teacher: string
  school: string
  fileName: string
  /** 자동으로 못 읽어 사용자가 채워야 하는 항목 */
  missing: ('subject' | 'className' | 'slots' | 'students')[]
}

type Row = unknown[]

const text = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const isHangulName = (value: string) => /^[가-힣]{2,5}$/.test(value) && !/학년|학과|번호|성명|이름|합계|총원|담임|교사|과목|교과/.test(value)

/** `교과 : 음악 1학년  1-1` 같은 머리글. 학교마다 표기가 달라 여러 형태를 시도한다. */
function readHeading(value: string) {
  const patterns = [
    /교과\s*[:：]?\s*(.+?)\s*(\d+)\s*학년\s+(\d+)\s*[-－]\s*(\d+)/,
    /과목\s*[:：]?\s*(.+?)\s*(\d+)\s*학년\s+(\d+)\s*[-－]\s*(\d+)/,
  ]
  for (const pattern of patterns) {
    const matched = value.match(pattern)
    if (matched) return { subject: matched[1].trim(), className: `${matched[3]}-${matched[4]}` }
  }
  const loose = value.match(/(?:교과|과목)\s*[:：]?\s*(.+?)\s*(\d+)\s*학년\s*(\d+)\s*반/)
  if (loose) return { subject: loose[1].trim(), className: `${loose[2]}-${loose[3]}` }
  return null
}

/** 머리글이 없을 때 `2학년 3반`, `3-5` 같은 표기만이라도 건진다. */
function readClassOnly(value: string) {
  const full = value.match(/(\d+)\s*학년\s*(\d+)\s*반/)
  if (full) return `${full[1]}-${full[2]}`
  const dashed = value.match(/(?:^|\s)([1-3])\s*[-－]\s*(\d{1,2})(?:\s*반)?(?:$|\s)/)
  if (dashed) return `${dashed[1]}-${dashed[2]}`
  return ''
}

/** `[월 4], [화 6]` / `월4 화6` / `월요일 4교시` 모두 허용 */
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
  const matched = value.match(/(?:담당\s*교사|교과\s*담당|담임)\s*[:：]\s*(.+)$/)
  return matched ? matched[1].trim() : ''
}

/**
 * 1순위: `학번`/`번호`/`No.` + `성명`/`이름` 머리글을 찾는다.
 * NEIS 출석부는 열이 'No.'(반 출석번호)와 '학번'(전체 학번)으로 나뉘어 있는 경우가 많다.
 * 동명이인 구분에는 학번이 필요하므로 '학번' 열이 있으면 그쪽을 우선한다.
 */
function findHeaderColumns(rows: Row[]) {
  const index = rows.findIndex(row => {
    const values = row.map(text)
    return values.some(value => /번호|^No\.?$/i.test(value)) && values.some(value => /성\s*명|이름/.test(value))
  })
  if (index < 0) return null
  const header = rows[index].map(text)
  const nameIndex = header.findIndex(value => /^성\s*명$|^이름$|성명/.test(value))
  if (nameIndex < 0) return null
  const studentNoIndex = header.findIndex(value => /^학번$|학생\s*번호/.test(value))
  const classNoIndex = header.findIndex(value => /^No\.?$|^번호$|출석\s*번호/i.test(value))
  const numberIndex = studentNoIndex >= 0 ? studentNoIndex : classNoIndex
  if (numberIndex < 0) return null
  return { index, numberIndex, nameIndex }
}

/**
 * 2순위: 머리글이 없거나 형식이 달라도, 한글 이름이 가장 많이 모인 열을 명단으로 본다.
 * 번호 열은 이름 왼쪽 몇 칸 안에서 찾는데, 학번(보통 4~5자리)이 있으면 그 열을 우선한다.
 * 반 출석번호(1~2자리)뿐이면 그걸 대신 쓴다.
 */
function guessColumns(rows: Row[]) {
  const score: Record<number, number> = {}
  rows.forEach(row => {
    row.forEach((cell, column) => {
      if (isHangulName(text(cell))) score[column] = (score[column] || 0) + 1
    })
  })
  const best = Object.entries(score).sort((left, right) => right[1] - left[1])[0]
  if (!best || Number(best[1]) < 3) return null
  const nameIndex = Number(best[0])

  const countMatching = (column: number, pattern: RegExp) => rows.filter(row => {
    const value = text(row[column]).replace(/\.0$/, '')
    return value !== '' && pattern.test(value)
  }).length

  const candidates: number[] = []
  for (let column = nameIndex - 1; column >= 0 && column >= nameIndex - 4; column -= 1) candidates.push(column)

  const studentNoColumn = candidates.find(column => countMatching(column, /^\d{4,5}$/) >= 3)
  const classNoColumn = candidates.find(column => countMatching(column, /^\d{1,3}$/) >= 3)
  const numberIndex = studentNoColumn ?? classNoColumn ?? -1

  const firstNameRow = rows.findIndex(row => isHangulName(text(row[nameIndex])))
  return { index: firstNameRow - 1, numberIndex, nameIndex }
}

function collectStudents(rows: Row[], start: number, numberIndex: number, nameIndex: number) {
  const students: ImportedStudent[] = []
  rows.slice(start + 1).forEach(row => {
    const name = text(row[nameIndex])
    if (!name || !isHangulName(name)) return
    const raw = numberIndex >= 0 ? text(row[numberIndex]).replace(/[^0-9]/g, '') : ''
    const number = Number(raw) || students.length + 1
    if (students.some(item => item.number === number)) return
    students.push({ number, name })
  })
  return students.sort((left, right) => left.number - right.number)
}

function parseSheet(sheet: XLSX.WorkSheet, fileName: string, sheetName: string): ImportedClass | null {
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: '' })
  if (!rows.length) return null

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
      if (rowIndex < 12) {
        readSlots(value).forEach(slot => {
          if (!slots.some(item => item.day === slot.day && item.period === slot.period)) slots.push(slot)
        })
      }
    })
  })

  if (!className) {
    for (const row of rows.slice(0, 12)) {
      for (const cell of row) {
        const guess = readClassOnly(text(cell))
        if (guess) {
          className = guess
          break
        }
      }
      if (className) break
    }
  }
  if (!className) className = readClassOnly(sheetName) || readClassOnly(fileName)

  const columns = findHeaderColumns(rows) || guessColumns(rows)
  const students = columns ? collectStudents(rows, columns.index, columns.numberIndex, columns.nameIndex) : []

  if (!className && !students.length && !slots.length) return null

  const missing: ImportedClass['missing'] = []
  if (!subject) missing.push('subject')
  if (!className) missing.push('className')
  if (!slots.length) missing.push('slots')
  if (!students.length) missing.push('students')

  return {
    subject,
    className,
    slots,
    students,
    teacher,
    school,
    fileName,
    missing,
  }
}

export async function parseWorkbooks(files: File[]): Promise<{ classes: ImportedClass[]; failed: string[] }> {
  const classes: ImportedClass[] = []
  const failed: string[] = []
  for (const file of files) {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      let matched = false
      workbook.SheetNames.forEach(sheetName => {
        const parsed = parseSheet(workbook.Sheets[sheetName], file.name, sheetName)
        if (!parsed) return
        matched = true
        const twin = parsed.className
          ? classes.find(item => item.subject === parsed.subject && item.className === parsed.className)
          : undefined
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
  return classes.length || failed.length ? { classes, failed } : { classes: [], failed: files.map(file => file.name) }
}

/**
 * 아무 표에서나 복사해 붙여넣은 명단을 읽는다.
 * `2104 홍길동` / `1<tab>홍길동` / `홍길동` 모두 허용한다.
 * 앞 칸이 숫자면 학번으로 본다(선택과목 반은 원적반 학번 2104 같은 4자리를 쓴다).
 */
export function parsePastedRoster(input: string): ImportedStudent[] {
  const students: ImportedStudent[] = []
  input.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return
    const parts = trimmed.split(/[\t,;]+|\s{1,}/).filter(Boolean)
    let number = 0
    let name = ''
    if (parts.length >= 2 && /^\d{1,5}$/.test(parts[0])) {
      number = Number(parts[0])
      name = parts.slice(1).join(' ')
    } else {
      name = parts.join(' ')
    }
    if (!name || !/[가-힣A-Za-z]/.test(name)) return
    if (!number) number = students.length + 1
    if (students.some(item => item.number === number)) number = Math.max(...students.map(item => item.number)) + 1
    students.push({ number, name })
  })
  return students.sort((left, right) => left.number - right.number)
}

/** `월4, 화6` / `월 4교시 화 6교시` 형태를 슬롯으로 바꾼다. */
export function parseSlotText(input: string): Slot[] {
  return readSlots(input)
}

export function formatSlots(slots: Slot[]) {
  return slots.map(slot => `${slot.day}${slot.period}`).join(', ')
}
