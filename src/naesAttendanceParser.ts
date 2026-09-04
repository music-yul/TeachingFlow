import * as XLSX from 'xlsx'

export type ImportedStudent = { number: number; name: string }
export type ImportClass = { name: string; slots: string[]; students: ImportedStudent[] }

type SheetRow = unknown[]

const dayPattern = '(월|화|수|목|금)'
const text = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

function classFromText(value: string) {
  const normalized = text(value)
  const gradeClass = normalized.match(/(\d+)\s*학년\s*(\d+)\s*[-－]\s*(\d+)/)
  if (gradeClass) return `${gradeClass[1]}-${gradeClass[3]}반`
  const gradeAndClass = normalized.match(/(\d+)\s*학년\s*(\d+)\s*반/)
  if (gradeAndClass) return `${gradeAndClass[1]}-${gradeAndClass[2]}반`
  const separatedClass = normalized.match(/(?:^|\s)(\d+)\s*[-－]\s*(\d+)\s*반?/)
  if (separatedClass) return `${separatedClass[1]}-${separatedClass[2]}반`
  const singleClass = normalized.match(/(?:^|\s)(\d+)\s*반(?:$|\s)/)
  return singleClass ? `${singleClass[1]}반` : ''
}

function slotsFromText(value: string) {
  const slots: string[] = []
  const pattern = new RegExp(`${dayPattern}\\s*([1-7])\\s*(?:교시)?`, 'g')
  for (const match of value.matchAll(pattern)) slots.push(`${match[1]} ${match[2]}교시`)
  return slots
}

function findStudentColumns(rows: SheetRow[]) {
  const headerIndex = rows.findIndex(row => {
    const values = row.map(text)
    return values.some(value => /번호/.test(value)) && values.some(value => /성\s*명|이름|성명/.test(value))
  })
  if (headerIndex < 0) return null
  const header = rows[headerIndex].map(text)
  return {
    headerIndex,
    numberIndex: header.findIndex(value => /번호/.test(value)),
    nameIndex: header.findIndex(value => /성\s*명|이름|성명/.test(value)),
  }
}

function studentFromRow(row: SheetRow, numberIndex: number, nameIndex: number): ImportedStudent | null {
  const number = Number(text(row[numberIndex]).replace(/[^0-9]/g, ''))
  const name = text(row[nameIndex])
  if (!number || !name || /합계|계|총원|학생수/.test(name)) return null
  return { number, name }
}

function parseSheet(sheet: XLSX.WorkSheet, sheetName: string): ImportClass | null {
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, defval: '' })
  let className = classFromText(sheetName)
  const slots = new Set<string>()
  rows.forEach(row => row.forEach(cell => {
    const value = text(cell)
    className = className || classFromText(value)
    slotsFromText(value).forEach(slot => slots.add(slot))
  }))

  const columns = findStudentColumns(rows)
  const students: ImportedStudent[] = []
  if (columns) rows.slice(columns.headerIndex + 1).forEach(row => {
    const student = studentFromRow(row, columns.numberIndex, columns.nameIndex)
    if (student) students.push(student)
  })
  if (!className && !students.length && !slots.size) return null
  return { name: className || sheetName, slots: [...slots], students }
}

export async function parseAttendanceWorkbook(file: File): Promise<ImportClass[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const classes: ImportClass[] = []
  workbook.SheetNames.forEach(sheetName => {
    const incoming = parseSheet(workbook.Sheets[sheetName], sheetName)
    if (!incoming) return
    const existing = classes.find(item => item.name === incoming.name)
    if (!existing) {
      classes.push(incoming)
      return
    }
    existing.slots = [...new Set([...existing.slots, ...incoming.slots])]
    incoming.students.forEach(student => {
      const index = existing.students.findIndex(value => value.number === student.number)
      if (index >= 0) existing.students[index] = student
      else existing.students.push(student)
    })
  })
  classes.forEach(item => item.students.sort((left, right) => left.number - right.number))
  return classes
}