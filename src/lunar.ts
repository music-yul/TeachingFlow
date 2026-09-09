/**
 * 음력(태음태양력) 계산.
 *
 * 설날·추석·부처님오신날은 음력이라 해마다 양력 날짜가 달라진다.
 * 표를 몇 년치 적어두는 대신 삭(합삭)과 절기를 직접 계산해서
 * 어느 해든 구할 수 있게 한다. 계산식은 Meeus, Astronomical Algorithms 를 따른다.
 */

const RAD = Math.PI / 180
const sin = (degrees: number) => Math.sin(degrees * RAD)

/** 율리우스일 정수값 → 양력 날짜 */
function fromJdn(jdn: number) {
  let a = jdn + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  a -= Math.floor((146097 * b) / 4)
  const c = Math.floor((4 * a + 3) / 1461)
  a -= Math.floor((1461 * c) / 4)
  const d = Math.floor((5 * a + 2) / 153)
  const day = a - Math.floor((153 * d + 2) / 5) + 1
  const month = d + 3 - 12 * Math.floor(d / 10)
  const year = 100 * b + c - 4800 + Math.floor(d / 10)
  return { year, month, day }
}

/** 지구 자전 지연(ΔT) 근사. 2005~2050년 구간용, 단위는 일. */
function deltaTDays(year: number) {
  const t = year - 2000
  return (62.92 + 0.32217 * t + 0.005589 * t * t) / 86400
}

/** k번째 합삭의 율리우스일(역학시) */
function newMoonJde(k: number) {
  const t = k / 1236.85
  const t2 = t * t
  const t3 = t2 * t
  const t4 = t3 * t

  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * t2 - 0.00000015 * t3 + 0.00000000073 * t4

  const e = 1 - 0.002516 * t - 0.0000074 * t2
  const m = 2.5534 + 29.1053567 * k - 0.0000014 * t2 - 0.00000011 * t3
  const mp = 201.5643 + 385.81693528 * k + 0.0107582 * t2 + 0.00001238 * t3 - 0.000000058 * t4
  const f = 160.7108 + 390.67050284 * k - 0.0016118 * t2 - 0.00000227 * t3 + 0.000000011 * t4
  const omega = 124.7746 - 1.56375588 * k + 0.0020672 * t2 + 0.00000215 * t3

  jde += -0.4072 * sin(mp)
    + 0.17241 * e * sin(m)
    + 0.01608 * sin(2 * mp)
    + 0.01039 * sin(2 * f)
    + 0.00739 * e * sin(mp - m)
    - 0.00514 * e * sin(mp + m)
    + 0.00208 * e * e * sin(2 * m)
    - 0.00111 * sin(mp - 2 * f)
    - 0.00057 * sin(mp + 2 * f)
    + 0.00056 * e * sin(2 * mp + m)
    - 0.00042 * sin(3 * mp)
    + 0.00042 * e * sin(m + 2 * f)
    + 0.00038 * e * sin(m - 2 * f)
    - 0.00024 * e * sin(2 * mp - m)
    - 0.00017 * sin(omega)
    - 0.00007 * sin(mp + 2 * m)
    + 0.00004 * sin(2 * mp - 2 * f)
    + 0.00004 * sin(3 * m)
    + 0.00003 * sin(mp + m - 2 * f)
    + 0.00003 * sin(2 * mp + 2 * f)
    - 0.00003 * sin(mp + m + 2 * f)
    + 0.00003 * sin(mp - m + 2 * f)
    - 0.00002 * sin(mp - m - 2 * f)
    - 0.00002 * sin(3 * mp + m)
    + 0.00002 * sin(4 * mp)

  return jde
}

/** 태양의 겉보기 황경(도) */
function sunLongitude(jde: number) {
  const t = (jde - 2451545) / 36525
  const t2 = t * t
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t2
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t2
  const c = (1.914602 - 0.004817 * t - 0.000014 * t2) * sin(m)
    + (0.019993 - 0.000101 * t) * sin(2 * m)
    + 0.000289 * sin(3 * m)
  const omega = 125.04 - 1934.136 * t
  const value = (l0 + c - 0.00569 - 0.00478 * sin(omega)) % 360
  return value < 0 ? value + 360 : value
}

/** 역학시 율리우스일 → 한국 표준시 기준 날짜 정수(JDN) */
function toKstJdn(jde: number, year: number) {
  return Math.floor(jde - deltaTDays(year) + 0.5 + 9 / 24)
}

/** 목표 황경(도)에 태양이 도달하는 시각을 이분법으로 찾는다. */
function solarTermJde(startJde: number, target: number) {
  let low = startJde
  let high = startJde + 45
  const diff = (jde: number) => {
    let value = sunLongitude(jde) - target
    while (value > 180) value -= 360
    while (value < -180) value += 360
    return value
  }
  if (diff(low) > 0) low -= 40
  for (let step = 0; step < 60; step += 1) {
    const mid = (low + high) / 2
    if (diff(mid) < 0) low = mid
    else high = mid
  }
  return (low + high) / 2
}

/** 그 해 12월의 동지(황경 270도) */
function winterSolsticeJde(year: number) {
  // 12월 초에서 출발해 270도를 찾는다.
  const approx = 2451545 + 365.2422 * (year - 2000) + 355
  return solarTermJde(approx - 20, 270)
}

type LunarMonth = { startJdn: number; number: number; leap: boolean }

/**
 * 어느 해의 음력 달 목록을 만든다.
 * 동지가 든 달을 11월로 삼고, 중기(30도 배수 황경)가 없는 달을 윤달로 정한다.
 */
function monthsForYear(year: number): LunarMonth[] {
  const previousSolstice = winterSolsticeJde(year - 1)
  const currentSolstice = winterSolsticeJde(year)

  const kNear = (jde: number) => Math.floor((jde - 2451550.09766) / 29.530588861)
  const findMonthStart = (jde: number) => {
    let k = kNear(jde) + 2
    while (newMoonJde(k) > jde) k -= 1
    return k
  }

  const startK = findMonthStart(previousSolstice)
  const endK = findMonthStart(currentSolstice)
  const count = endK - startK

  const starts: number[] = []
  for (let k = startK; k <= endK + 2; k += 1) starts.push(newMoonJde(k))

  /**
   * 그 달에 중기(황경 30도 배수)가 들어 있는지 본다.
   * 시각이 아니라 한국 날짜로 따져야 한다. 중기가 다음 삭과 같은 날 몇 시간 차이로
   * 걸치는 해가 있어서(예: 2031년), 시각으로 재면 윤달이 한 달 밀린다.
   */
  const hasMajorTerm = (fromJde: number, fromJdn: number, toJdn: number) => {
    const startLongitude = sunLongitude(fromJde)
    const target = (Math.ceil(startLongitude / 30) * 30) % 360
    const termJde = solarTermJde(fromJde - 1, target)
    const termJdn = toKstJdn(termJde, year)
    return termJdn >= fromJdn && termJdn < toJdn
  }

  let leapIndex = -1
  if (count === 13) {
    for (let index = 1; index <= 12; index += 1) {
      const fromJdn = toKstJdn(starts[index], year)
      const toJdn = toKstJdn(starts[index + 1], year)
      if (!hasMajorTerm(starts[index], fromJdn, toJdn)) {
        leapIndex = index
        break
      }
    }
  }

  const months: LunarMonth[] = []
  let label = 11
  for (let index = 0; index < starts.length - 1; index += 1) {
    const leap = index === leapIndex
    months.push({
      startJdn: toKstJdn(starts[index], year),
      number: leap ? (label === 1 ? 12 : label - 1) : label,
      leap,
    })
    if (!leap) label = label === 12 ? 1 : label + 1
  }
  return months
}

const cache = new Map<number, LunarMonth[]>()

function monthsCached(year: number) {
  const hit = cache.get(year)
  if (hit) return hit
  const value = monthsForYear(year)
  cache.set(year, value)
  return value
}

/** 음력 (월, 일)에 해당하는 양력 날짜를 YYYY-MM-DD 로 돌려준다. 평달만 찾는다. */
export function lunarToSolar(year: number, lunarMonth: number, lunarDay: number): string | null {
  // 음력 1월은 그 해 초에 있고, 목록은 전년 11월부터 시작한다.
  const months = monthsCached(lunarMonth >= 11 ? year + 1 : year)
  const found = months.find(item => item.number === lunarMonth && !item.leap)
  if (!found) return null
  const date = fromJdn(found.startJdn + lunarDay - 1)
  if (date.year !== year) return null
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

/** 양력 날짜 문자열에 며칠을 더한다. */
export function shiftDate(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function weekdayOfKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}
