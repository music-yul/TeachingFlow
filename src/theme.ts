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

export const fonts = [
  { id: 'default', name: '기본 고딕', stack: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif" },
  { id: 'system', name: '시스템 기본', stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { id: 'serif', name: '명조', stack: "'Apple SD Gothic Neo', 'Nanum Myeongjo', 'Batang', serif" },
  { id: 'round', name: '둥근 고딕', stack: "'Apple SD Gothic Neo', 'Nanum Gothic', 'Malgun Gothic', sans-serif" },
]

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
