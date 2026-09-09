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
      '--done': '#efe9e0',
      '--done-ink': '#a8968a',
      '--mark': '#f8e6df',
      '--mark-line': '#d0a08c',
      '--today': '#fbeed2',
    },
  },
  {
    id: 'blue',
    name: '블루',
    swatch: '#4f7db8',
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
      '--done': '#eceef1',
      '--done-ink': '#96a0ae',
      '--mark': '#eaf1fb',
      '--mark-line': '#a9c3e0',
      '--today': '#fff6e0',
    },
  },
  {
    id: 'green',
    name: '그린',
    swatch: '#5f9c7d',
    vars: {
      '--ink': '#1c2f24',
      '--muted': '#5f7b6c',
      '--line': '#d4e4da',
      '--bg': '#f1f7f3',
      '--card': '#ffffff',
      '--subtle': '#f7fbf9',
      '--chip': '#e6f0ea',
      '--ghost': '#eef5f1',
      '--on-accent': '#ffffff',
      '--accent-soft': '#dcefe4',
      '--done': '#e9eded',
      '--done-ink': '#8fa39a',
      '--mark': '#eaf3e3',
      '--mark-line': '#a9c99a',
      '--today': '#fdf1d8',
    },
  },
  {
    id: 'purple',
    name: '퍼플',
    swatch: '#8a76b0',
    vars: {
      '--ink': '#28223a',
      '--muted': '#726a8a',
      '--line': '#ded7ec',
      '--bg': '#f6f4fa',
      '--card': '#ffffff',
      '--subtle': '#faf9fc',
      '--chip': '#ede8f4',
      '--ghost': '#f2eff7',
      '--on-accent': '#ffffff',
      '--accent-soft': '#e6e0f2',
      '--done': '#edecf0',
      '--done-ink': '#9d97ac',
      '--mark': '#efe9f6',
      '--mark-line': '#bcaad4',
      '--today': '#fdf0d3',
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
 * 테마마다 그 테마의 강조색과 같은 색 계열(색상)로 6개를 새로 만들어서,
 * 강조색은 선명한데 시간표 색은 칙칙해 따로 노는 일이 없게 한다.
 * 채도·명도는 원래 기본 팔레트와 비슷하게 맞춰서 톤 자체는 차분함을 유지한다.
 */
export const baseSubjectColors = ['#86AEB8', '#9AA6B8', '#A3AF91', '#BDA18C', '#C49B9D', '#A895A8']

const themedSubjectColors: Record<string, string[]> = {
  beige: ['#B79685', '#BDAC93', '#B7B18F', '#B68B7C', '#B6919D', '#A4B08D'],
  blue: ['#8BABBB', '#8197B1', '#959DBB', '#89ACB3', '#9491B6', '#87ABAB'],
  green: ['#87B596', '#78B096', '#8FB7AF', '#83AF86', '#91B6B6', '#95B08D'],
  purple: ['#988DB9', '#967EB4', '#AF95BB', '#8C89B3', '#B291B6', '#8D92B0'],
  night: ['#8BABBB', '#8197B1', '#959DBB', '#89ACB3', '#9491B6', '#87ABAB'],
}

/** 화면 테마에 어울리는 과목 색 6개. 기본·매핑 없는 테마는 원래의 다색 팔레트를 쓴다. */
export function subjectColorsForTheme(themeId: string): string[] {
  return themedSubjectColors[themeId] || baseSubjectColors
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
