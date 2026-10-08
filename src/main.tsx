import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { readData } from './storage'
import { ensureFontLoaded, fonts, fontSizes, themes } from './theme'

async function startApp() {
  const data = readData()
  const appearance = data.settings.appearance
  const root = document.documentElement
  const theme = themes.find(item => item.id === appearance.themeId) || themes[0]
  Object.entries(theme.vars).forEach(([key, value]) => root.style.setProperty(key, value))
  root.style.setProperty('--accent', appearance.accent)
  root.style.fontSize = fontSizes[appearance.fontSize] || fontSizes.normal
  const font = fonts.find(item => item.id === appearance.fontId) || fonts[0]
  document.body.style.fontFamily = font.stack

  if (font.href) {
    // 화면을 그리기 전에 선택한 글꼴을 준비한다. 연결 실패 시에도 앱은 열린다.
    const ready = new Promise<void>(resolve => {
      ensureFontLoaded(font)
      const link = document.getElementById(`webfont-${font.id}`) as HTMLLinkElement | null
      if (!link) { resolve(); return }
      const load = async () => {
        try {
          const family = font.stack.split(',')[0].trim()
          const text = '티칭플로 수업 일정 진도 관리 출결 평가 성적 환경 설정 변경한 수업 원래대로 0123456789'
            + data.classes.map(item => item.name).join('')
            + data.lessons.map(item => item.title).join('')
          await Promise.all([400, 500, 600, 700].map(weight => document.fonts.load(`${weight} 16px ${family}`, text)))
        } catch { /* 설치된 대체 글꼴로 계속한다. */ }
        resolve()
      }
      if (link.sheet) void load()
      else {
        link.addEventListener('load', () => void load(), { once: true })
        link.addEventListener('error', () => resolve(), { once: true })
      }
    })
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([ready, new Promise<void>(resolve => { timer = setTimeout(resolve, 2500) })])
    if (timer) clearTimeout(timer)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void startApp()
