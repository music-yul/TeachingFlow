import { lunarToSolar, shiftDate, weekdayOfKey } from './lunar'

/**
 * 대한민국 공휴일을 해마다 계산한다.
 *
 * 음력 명절은 lunar.ts 가 계산하고, 여기서는 「관공서의 공휴일에 관한 규정」의
 * 대체공휴일 규칙을 적용한다.
 *
 * 대체공휴일 대상: 삼일절·어린이날·부처님오신날·광복절·개천절·한글날·성탄절과
 * 설날·추석 연휴. 신정·현충일·제헌절은 대상이 아니다.
 */

type Entry = { date: string; name: string }

type Rule = {
  days: string[]
  name: string
  /** 대체공휴일 대상인지 */
  substitute: boolean
  /** 토요일에도 대체가 붙는지 (설날·추석은 일요일만 해당) */
  includeSaturday: boolean
}

function fixed(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function rulesFor(year: number): Rule[] {
  const rules: Rule[] = [
    { days: [fixed(year, 1, 1)], name: '신정', substitute: false, includeSaturday: false },
    { days: [fixed(year, 3, 1)], name: '삼일절', substitute: true, includeSaturday: true },
    { days: [fixed(year, 5, 5)], name: '어린이날', substitute: true, includeSaturday: true },
    { days: [fixed(year, 6, 6)], name: '현충일', substitute: false, includeSaturday: false },
    { days: [fixed(year, 8, 15)], name: '광복절', substitute: true, includeSaturday: true },
    { days: [fixed(year, 10, 3)], name: '개천절', substitute: true, includeSaturday: true },
    { days: [fixed(year, 10, 9)], name: '한글날', substitute: true, includeSaturday: true },
    { days: [fixed(year, 12, 25)], name: '성탄절', substitute: true, includeSaturday: true },
  ]

  // 제헌절은 2026년부터 다시 공휴일이다. 대체공휴일 대상은 아니다.
  if (year >= 2026) {
    rules.push({ days: [fixed(year, 7, 17)], name: '제헌절', substitute: false, includeSaturday: false })
  }

  const seollal = lunarToSolar(year, 1, 1)
  if (seollal) {
    rules.push({
      days: [shiftDate(seollal, -1), seollal, shiftDate(seollal, 1)],
      name: '설날',
      substitute: true,
      includeSaturday: false,
    })
  }

  const chuseok = lunarToSolar(year, 8, 15)
  if (chuseok) {
    rules.push({
      days: [shiftDate(chuseok, -1), chuseok, shiftDate(chuseok, 1)],
      name: '추석',
      substitute: true,
      includeSaturday: false,
    })
  }

  const buddha = lunarToSolar(year, 4, 8)
  if (buddha) {
    rules.push({ days: [buddha], name: '부처님오신날', substitute: true, includeSaturday: true })
  }

  return rules
}

function buildYear(year: number): Record<string, string> {
  const rules = rulesFor(year)
  const base = new Map<string, string>()

  // 먼저 본래 공휴일을 모두 채운다. 겹치면 이름을 나란히 적는다.
  rules.forEach(rule => {
    rule.days.forEach((day, index) => {
      const label = rule.days.length > 1 ? (index === 1 ? rule.name : `${rule.name} 연휴`) : rule.name
      const existing = base.get(day)
      base.set(day, existing ? `${existing} · ${label}` : label)
    })
  })

  const result = new Map(base)

  // 대체공휴일: 잃어버린 날 수만큼 뒤쪽 평일에 붙인다.
  rules.forEach(rule => {
    if (!rule.substitute) return
    let lost = 0
    rule.days.forEach(day => {
      const weekday = weekdayOfKey(day)
      const clash = (base.get(day) || '').includes('·')
      if (weekday === 0 || (rule.includeSaturday && weekday === 6) || clash) lost += 1
    })
    if (!lost) return

    let cursor = rule.days[rule.days.length - 1]
    while (lost > 0) {
      cursor = shiftDate(cursor, 1)
      const weekday = weekdayOfKey(cursor)
      if (weekday === 0 || weekday === 6) continue
      if (result.has(cursor)) continue
      result.set(cursor, `${rule.name} 대체`)
      lost -= 1
    }
  })

  return Object.fromEntries(result)
}

const cache = new Map<number, Record<string, string>>()

function yearTable(year: number) {
  const hit = cache.get(year)
  if (hit) return hit
  const value = buildYear(year)
  cache.set(year, value)
  return value
}

export function holidayName(date: string) {
  const year = Number(date.slice(0, 4))
  if (!year || year < 1900 || year > 2100) return undefined
  return yearTable(year)[date]
}

/** 특정 해의 공휴일 전체 (설정 화면 확인용) */
export function holidaysOfYear(year: number): Entry[] {
  return Object.entries(yearTable(year))
    .map(([date, name]) => ({ date, name }))
    .sort((left, right) => left.date.localeCompare(right.date))
}
