export type ThemeVars = Record<string, string>

export type Theme = {
  id: string
  name: string
  swatch: string
  vars: ThemeVars
}

export const themes: Theme[] = [
  {
    id: 'default',
    name: '기본',
    swatch: '#3b6ea8',
    vars: {
      '--ink': '#1f2733',
      '--muted': '#6b7484',
      '--line': '#dde2ea',
      '--bg': '#f4f6fa',
      '--card': '#ffffff',
      '--subtle': '#fafbfd',
      '--chip': '#f0f2f6',
      '--ghost': '#f4f5f8',
      '--on-accent': '#ffffff',
      '--accent-soft': '#e8effa',
      '--done': '#e9f5ec',
      '--week': '#fff6e0',
    },
  },
  {
    id: 'paper',
    name: '종이',
    swatch: '#a2764a',
    vars: {
      '--ink': '#33291f',
      '--muted': '#7d6f5e',
      '--line': '#e2d9cb',
      '--bg': '#f7f3ec',
      '--card': '#fffdf9',
      '--subtle': '#faf6ef',
      '--chip': '#f0e9dd',
      '--ghost': '#f3ede3',
      '--on-accent': '#ffffff',
      '--accent-soft': '#f3e7d6',
      '--done': '#e8f0e2',
      '--week': '#fbeed2',
    },
  },
  {
    id: 'mint',
    name: '민트',
    swatch: '#2d8c7b',
    vars: {
      '--ink': '#1c2f2c',
      '--muted': '#5f7b76',
      '--line': '#d4e4e0',
      '--bg': '#f1f7f5',
      '--card': '#ffffff',
      '--subtle': '#f7fbfa',
      '--chip': '#e6f0ed',
      '--ghost': '#eef5f3',
      '--on-accent': '#ffffff',
      '--accent-soft': '#dcefe9',
      '--done': '#e2f2e6',
      '--week': '#fdf1d8',
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
      '--done': '#263a2f',
      '--week': '#3d3524',
    },
  },
]

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
    stack: `'Gowun Batang', 'Nanum Myeongjo', serif`,
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
