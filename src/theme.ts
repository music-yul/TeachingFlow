export type ThemeVars = Record<string, string>

export type Theme = {
  id: string
  name: string
  swatch: string
  vars: ThemeVars
}

/** 화면 배경·글자색 테마. 시간표 색과는 완전히 별개다. */
export const themes: Theme[] = [
  {
    id: 'default',
    name: '기본',
    swatch: '#7c8794',
    vars: {
      '--ink': '#232730',
      '--muted': '#6b7280',
      '--line': '#e0e2e6',
      '--bg': '#f5f5f6',
      '--card': '#ffffff',
      '--subtle': '#fafafa',
      '--chip': '#eeeff1',
      '--ghost': '#f2f3f4',
      '--on-accent': '#ffffff',
      '--accent-soft': '#e7e8ea',
      '--done': '#eceef1',
      '--done-ink': '#96a0ae',
      '--mark': '#f0f0f0',
      '--mark-line': '#b7bcc4',
      '--today': '#fff3c4',
    },
  },
  {
    id: 'beige',
    name: '베이지',
    // 시간표 기본 팔레트의 탠/베이지(#BDA18C, H26) 와 같은 색상(Hue)으로 맞췄다.
    swatch: '#ab7a54',
    vars: {
      '--ink': '#3b322b',
      '--muted': '#81746a',
      '--line': '#e2ddd9',
      '--bg': '#f6f5f4',
      '--card': '#fdfcfc',
      '--subtle': '#f9f9f8',
      '--chip': '#f0edeb',
      '--ghost': '#f4f2f1',
      '--on-accent': '#ffffff',
      '--accent-soft': '#eadfd7',
      '--done': '#eceae9',
      '--done-ink': '#ada59f',
      '--mark': '#f4e1e4',
      '--mark-line': '#d49ba5',
      '--today': '#f4e2af',
    },
  },
  {
    id: 'blue',
    name: '블루',
    // 시간표 기본 팔레트의 블루그레이(#9AA6B8, H216) 와 같은 색상으로 맞췄다.
    swatch: '#5477ab',
    vars: {
      '--ink': '#2b313b',
      '--muted': '#6a7381',
      '--line': '#d9dde2',
      '--bg': '#f4f5f6',
      '--card': '#fcfcfd',
      '--subtle': '#f8f9f9',
      '--chip': '#ebedf0',
      '--ghost': '#f1f2f4',
      '--on-accent': '#ffffff',
      '--accent-soft': '#d7dfea',
      '--done': '#e9eaec',
      '--done-ink': '#9fa4ad',
      '--mark': '#f4e1e4',
      '--mark-line': '#d49ba5',
      '--today': '#f4e2af',
    },
  },
  {
    id: 'green',
    name: '그린',
    // 시간표 기본 팔레트의 올리브그린(#A3AF91, H84) 과 같은 색상으로 맞췄다.
    swatch: '#729047',
    vars: {
      '--ink': '#353b2b',
      '--muted': '#78816a',
      '--line': '#dfe2d9',
      '--bg': '#f5f6f4',
      '--card': '#fdfdfc',
      '--subtle': '#f9f9f8',
      '--chip': '#eef0eb',
      '--ghost': '#f3f4f1',
      '--on-accent': '#ffffff',
      '--accent-soft': '#e2ead7',
      '--done': '#ebece9',
      '--done-ink': '#a7ad9f',
      '--mark': '#f4e1e4',
      '--mark-line': '#d49ba5',
      '--today': '#f4e2af',
    },
  },
  {
    id: 'purple',
    name: '퍼플',
    // 시간표 기본 팔레트의 모브/퍼플(#A895A8, H300) 과 같은 색상으로 맞췄다.
    swatch: '#ab54ab',
    vars: {
      '--ink': '#3b2b3b',
      '--muted': '#816a81',
      '--line': '#e2d9e2',
      '--bg': '#f6f4f6',
      '--card': '#fdfcfd',
      '--subtle': '#f9f8f9',
      '--chip': '#f0ebf0',
      '--ghost': '#f4f1f4',
      '--on-accent': '#ffffff',
      '--accent-soft': '#ead7ea',
      '--done': '#ece9ec',
      '--done-ink': '#ad9fad',
      '--mark': '#f4e1e4',
      '--mark-line': '#d49ba5',
      '--today': '#f4e2af',
    },
  },
  {
    id: 'night',
    name: '어두운',
    swatch: '#6f9bd1',
    vars: {
      '--ink': '#e7ebf2',
      '--muted': '#9aa5b5',
      '--line': '#3a4453',
      '--bg': '#1b2029',
      '--card': '#242b36',
      '--subtle': '#2a323e',
      '--chip': '#323b48',
      '--ghost': '#2e3641',
      '--on-accent': '#0f141b',
      '--accent-soft': '#2c3d52',
      '--done': '#2b313a',
      '--done-ink': '#707c8c',
      '--mark': '#3a3320',
      '--mark-line': '#8c7a4a',
      '--today': '#4a4326',
    },
  },
]

/**
 * 과목 기본 색 6개. 순서 그 자체가 배정 순서다(1번 과목 -> colors[0] ...).
 * 색 자체는 항상 이 6개 그대로 두고, 화면 테마에 따라 순서만 돌려써서
 * 그 테마와 어울리는 색이 앞으로 오게 한다(예: 그린 테마 -> 올리브그린이 1번).
 * 톤을 맞추는 건 색을 새로 만드는 대신 테마 쪽 배경·강조색을 이 팔레트의
 * 같은 색상(Hue)으로 맞추는 방식으로 해결한다.
 */
export const baseSubjectColors = ['#86AEB8', '#9AA6B8', '#A3AF91', '#BDA18C', '#C49B9D', '#A895A8']

/** 테마별로 맨 앞에 세울 색의 인덱스. 없으면 원래 순서를 그대로 쓴다. */
const themeLeadColorIndex: Record<string, number> = {
  beige: 3, // 탠/베이지
  blue: 1, // 블루그레이
  green: 2, // 올리브그린
  purple: 5, // 모브/퍼플
  night: 1, // 블루그레이
}

/** 화면 테마에 맞춰 앞뒤 순서만 돌린 과목 색 목록. */
export function subjectColorsForTheme(themeId: string): string[] {
  const lead = themeLeadColorIndex[themeId]
  if (lead === undefined) return baseSubjectColors
  return [...baseSubjectColors.slice(lead), ...baseSubjectColors.slice(0, lead)]
}


export type FontOption = {
  id: string
  name: string
  note: string
  stack: string
  /** 웹폰트 CSS 주소. 없으면 기기에 설치된 글꼴을 쓴다. */
  href?: string
}

const systemStack = "'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif"

export const fonts: FontOption[] = [
  {
    id: 'pretendard',
    name: '프리텐다드',
    note: '숫자와 표가 또렷한 현대적 고딕',
    stack: `'Pretendard', ${systemStack}`,
    href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css',
  },
  {
    id: 'noto',
    name: '본고딕',
    note: '가장 널리 쓰이는 무난한 고딕',
    stack: `'Noto Sans KR', ${systemStack}`,
    href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap',
  },
  {
    id: 'plex',
    name: '플렉스 산스',
    note: '단정하고 각진 느낌',
    stack: `'IBM Plex Sans KR', ${systemStack}`,
    href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;700&display=swap',
  },
  {
    id: 'nanum',
    name: '나눔고딕',
    note: '문서에 익숙한 고전적인 고딕',
    stack: `'Nanum Gothic', ${systemStack}`,
    href: 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap',
  },
  {
    id: 'gowun',
    name: '고운바탕',
    note: '부드러운 명조. 읽는 글이 많을 때',
    stack: "'Gowun Batang', 'Nanum Myeongjo', serif",
    href: 'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap',
  },
  {
    id: 'system',
    name: '기기 기본',
    note: '내려받지 않음. 인터넷 없이도 동일',
    stack: systemStack,
  },
]

/** 고른 글꼴의 웹폰트 CSS를 그때그때 붙인다. 한 번 붙인 것은 다시 붙이지 않는다. */
export function ensureFontLoaded(font: FontOption) {
  if (!font.href) return
  const id = `webfont-${font.id}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.crossOrigin = 'anonymous'
  link.href = font.href
  document.head.appendChild(link)
}

export const fontSizes: Record<string, string> = { small: '14px', normal: '16px', large: '18px', xlarge: '21px' }

/** 배경색이 밝은지 어두운지 보고 그 위에 올릴 글자색을 고른다. */
export function readableOn(background: string) {
  const hex = background.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map(part => part + part).join('') : hex
  if (full.length !== 6) return '#ffffff'
  const channel = (start: number) => {
    const value = parseInt(full.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return luminance > 0.45 ? '#1f2733' : '#ffffff'
}
