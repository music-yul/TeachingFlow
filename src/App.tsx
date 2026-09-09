import { useEffect, useMemo, useState } from 'react'
import type { AppData, Classroom } from './types'
import { APP_VERSION, emptyData, importData, makeId, nextSubjectColor, readData, writeData } from './storage'
import { ensureFontLoaded, fonts, fontSizes, themes } from './theme'
import { buildSessions } from './schedule'
import { parseWorkbooks, type ImportedClass } from './naesAttendanceParser'
import CalendarView from './components/CalendarView'
import ProgressView from './components/ProgressView'
import AttendanceView from './components/AttendanceView'
import SettingsHub from './components/SettingsHub'
import SessionModal from './components/SessionModal'
import ImportModal from './components/ImportModal'
import MiniTimetable from './components/MiniTimetable'
import './App.css'

const tabs = ['달력', '진도표', '반별 출석부', '설정'] as const
type Tab = (typeof tabs)[number]

export default function App() {
  const [data, setData] = useState<AppData>(readData)
  const [tab, setTab] = useState<Tab>('달력')
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState<{ classes: ImportedClass[]; failed: string[] } | null>(null)
  const [saveError, setSaveError] = useState(false)

  const sessions = useMemo(() => buildSessions(data), [data])
  const session = sessions.find(item => item.id === selected && !item.cancelled)

  useEffect(() => {
    setSaveError(!writeData(data))
  }, [data])

  const appearance = data.settings.appearance

  useEffect(() => {
    const root = document.documentElement
    const theme = themes.find(item => item.id === appearance.themeId) || themes[0]
    Object.entries(theme.vars).forEach(([key, value]) => root.style.setProperty(key, value))
    root.style.setProperty('--accent', appearance.accent)
    root.style.fontSize = fontSizes[appearance.fontSize] || fontSizes.normal
    const font = fonts.find(item => item.id === appearance.fontId) || fonts[0]
    ensureFontLoaded(font)
    document.body.style.fontFamily = font.stack
  }, [appearance])

  const update = (change: Partial<AppData>) => setData(current => ({ ...current, ...change }))

  const openFiles = async (files: File[]) => {
    const result = await parseWorkbooks(files)
    if (!result.classes.length) {
      window.alert(
        '파일에서 명단을 찾지 못했습니다.\n설정 > 학급·시간표에서 학급을 만든 뒤 "명단 붙여넣기"로 넣으실 수 있습니다.',
      )
      return
    }
    setPending(result)
  }

  const mergeImport = (incomingList: ImportedClass[]) => {
    const subjects = [...data.subjects]
    const classes: Classroom[] = data.classes.map(item => ({
      ...item,
      slots: [...item.slots],
      students: item.students.map(student => ({ ...student })),
    }))
    const settings = { ...data.settings }

    incomingList.forEach(incoming => {
      if (!settings.schoolName && incoming.school) settings.schoolName = incoming.school
      if (!settings.teacherName && incoming.teacher) settings.teacherName = incoming.teacher

      let subject = subjects.find(item => item.name === incoming.subject)
      if (!subject) {
        subject = { id: makeId('subject'), name: incoming.subject, color: nextSubjectColor(subjects, data.settings.appearance.themeId), usesProgress: true }
        subjects.push(subject)
      }

      const existing = classes.find(item => item.subjectId === subject.id && item.name === incoming.className)
      if (!existing) {
        classes.push({
          id: makeId('class'),
          subjectId: subject.id,
          name: incoming.className,
          slots: incoming.slots,
          students: incoming.students.map(student => ({ id: makeId('student'), ...student })),
        })
        return
      }
      existing.archived = false
      incoming.slots.forEach(slot => {
        if (!existing.slots.some(item => item.day === slot.day && item.period === slot.period)) existing.slots.push(slot)
      })
      incoming.students.forEach(student => {
        const old = existing.students.find(item => item.number === student.number)
        if (old) old.name = student.name
        else existing.students.push({ id: makeId('student'), ...student })
      })
      existing.students.sort((left, right) => left.number - right.number)
    })

    update({ subjects, classes, settings })
    setPending(null)
  }

  const loadBackup = async (file: File) => {
    try {
      const next = await importData(file)
      if (!window.confirm('현재 내용을 불러온 파일로 모두 바꿉니다. 계속할까요?')) return
      setData(next)
      window.alert('불러왔습니다.')
    } catch {
      window.alert('불러오지 못했습니다. 이 프로그램에서 내보낸 .json 파일인지 확인해 주세요.')
    }
  }

  const reset = () => {
    if (!window.confirm('모든 내용을 지웁니다. 먼저 내보내기를 하셨나요?')) return
    setData(emptyData())
  }

  const started = data.subjects.length > 0 || data.classes.length > 0

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" role="img" aria-label="티칭플로">🏫</span>
          <div className="brand-text">
            <span className="brand-title">
              <strong>티칭플로</strong>
              <span className="version-badge">{APP_VERSION}</span>
            </span>
            <small>TEACHING FLOW ― 수업의 흐름을 한눈에</small>
          </div>
        </div>
        <div className="topbar-right">
          <label className="font-control">
            폰트 크기
            <select
              value={appearance.fontSize}
              onChange={event => update({ settings: { ...data.settings, appearance: { ...appearance, fontSize: event.target.value } } })}
            >
              <option value="small">작게</option>
              <option value="normal">기본</option>
              <option value="large">크게</option>
              <option value="xlarge">아주 크게</option>
            </select>
          </label>
        </div>
      </header>

      {saveError && <p className="banner warn">저장 공간이 가득 찼습니다. 백업을 내보낸 뒤 기록을 정리해 주세요.</p>}

      <main className="workspace">
        <aside className="sidebar">
          <nav>
            {tabs.map((item, index) => (
              <button className={tab === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setTab(item)}>
                <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>{item}
              </button>
            ))}
          </nav>
          <MiniTimetable data={data} />
          <p className="sidebar-foot">© 2026 율쌤 ｜ 무단 배포 및 수정 금지</p>
        </aside>

        <section className="content">
          {!started && tab !== '설정' && (
            <p className="banner">
              먼저 <b>설정 &gt; 학급·시간표</b>에서 출석부를 올리거나 과목·학급을 등록해 주세요.
              그다음 <b>설정 &gt; 학기·백업</b>에서 학기 기간을 맞추면 진도표가 만들어집니다.
            </p>
          )}

          {tab === '달력' && (
            <CalendarView data={data} sessions={sessions} month={month} setMonth={setMonth} onSelect={setSelected} update={update} />
          )}
          {tab === '진도표' && <ProgressView data={data} sessions={sessions} update={update} onSelect={setSelected} />}
          {tab === '반별 출석부' && <AttendanceView data={data} sessions={sessions} update={update} />}
          {tab === '설정' && (
            <SettingsHub data={data} update={update} onFiles={openFiles} onImport={loadBackup} onReset={reset} />
          )}
        </section>
      </main>

      {session && <SessionModal data={data} session={session} update={update} onClose={() => setSelected(null)} />}
      {pending && (
        <ImportModal
          initial={pending.classes}
          failed={pending.failed}
          onCancel={() => setPending(null)}
          onConfirm={mergeImport}
        />
      )}
    </div>
  )
}
