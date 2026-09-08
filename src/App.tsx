import { useEffect, useMemo, useState } from 'react'
import type { AppData, Classroom } from './types'
import { APP_VERSION, FONT_KEY, emptyData, exportData, importData, makeId, nextSubjectColor, readData, writeData } from './storage'
import { buildSessions } from './schedule'
import { parseWorkbooks, type ImportedClass } from './naesAttendanceParser'
import CalendarView from './components/CalendarView'
import ProgressView from './components/ProgressView'
import TimetableView from './components/TimetableView'
import ClassesView from './components/ClassesView'
import LessonsView from './components/LessonsView'
import EventsView from './components/EventsView'
import SettingsView from './components/SettingsView'
import SessionModal from './components/SessionModal'
import ImportModal from './components/ImportModal'
import './App.css'

const tabs = ['달력', '진도표', '시간표', '학급 관리', '수업 목록', '학사일정', '설정'] as const
type Tab = (typeof tabs)[number]

const fontSizes: Record<string, string> = { small: '14px', normal: '16px', large: '18px', xlarge: '21px' }

export default function App() {
  const [data, setData] = useState<AppData>(readData)
  const [font, setFont] = useState(() => localStorage.getItem(FONT_KEY) || 'normal')
  const [tab, setTab] = useState<Tab>('달력')
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState<{ classes: ImportedClass[]; failed: string[] } | null>(null)
  const [saveError, setSaveError] = useState(false)

  const sessions = useMemo(() => buildSessions(data), [data])
  const session = sessions.find(item => item.id === selected)

  useEffect(() => {
    setSaveError(!writeData(data))
  }, [data])

  useEffect(() => {
    localStorage.setItem(FONT_KEY, font)
    document.documentElement.style.fontSize = fontSizes[font] || fontSizes.normal
  }, [font])

  const update = (change: Partial<AppData>) => setData(current => ({ ...current, ...change }))

  const openFiles = async (files: File[]) => {
    const result = await parseWorkbooks(files)
    if (!result.classes.length) {
      window.alert('출석부 내용을 읽지 못했습니다. 나이스 교과시간별출석부 원본 파일인지 확인해 주세요.')
      return
    }
    setPending(result)
  }

  const mergeImport = () => {
    if (!pending) return
    const subjects = [...data.subjects]
    const classes: Classroom[] = data.classes.map(item => ({
      ...item,
      slots: [...item.slots],
      students: item.students.map(student => ({ ...student })),
    }))
    const settings = { ...data.settings }

    pending.classes.forEach(incoming => {
      if (!settings.schoolName && incoming.school) settings.schoolName = incoming.school
      if (!settings.teacherName && incoming.teacher) settings.teacherName = incoming.teacher

      let subject = subjects.find(item => item.name === incoming.subject)
      if (!subject) {
        subject = { id: makeId('subject'), name: incoming.subject, color: nextSubjectColor(subjects) }
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
          <span className="brand-mark">시수</span>
          <div className="brand-text">
            <strong>수업시수 플래너</strong>
            <small>{APP_VERSION} · © {data.settings.year} {data.settings.teacherName || '음악과'}</small>
          </div>
        </div>
        <div className="topbar-right">
          <button className="ghost-button" onClick={() => exportData(data)}>백업 내보내기</button>
          <label className="font-control">
            글씨
            <select value={font} onChange={event => setFont(event.target.value)}>
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
          {tabs.map((item, index) => (
            <button className={tab === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setTab(item)}>
              <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>{item}
            </button>
          ))}
        </aside>

        <section className="content">
          <div className="page-heading">
            <p className="eyebrow">
              {data.settings.year}학년도 {data.settings.termName}
              {data.settings.schoolName ? ` · ${data.settings.schoolName}` : ''}
            </p>
            <h1>{tab}</h1>
          </div>

          {!started && tab !== '설정' && tab !== '학급 관리' && (
            <p className="banner">
              먼저 <b>학급 관리</b>에서 나이스 출석부를 올리거나 과목·학급을 등록해 주세요.
              그다음 <b>설정</b>에서 학기 기간을 맞추면 진도표가 만들어집니다.
            </p>
          )}

          {tab === '달력' && (
            <CalendarView data={data} sessions={sessions} month={month} setMonth={setMonth} onSelect={setSelected} />
          )}
          {tab === '진도표' && <ProgressView data={data} sessions={sessions} update={update} onSelect={setSelected} />}
          {tab === '시간표' && <TimetableView data={data} sessions={sessions} onSelect={setSelected} />}
          {tab === '학급 관리' && <ClassesView data={data} update={update} onFiles={openFiles} />}
          {tab === '수업 목록' && <LessonsView data={data} update={update} />}
          {tab === '학사일정' && <EventsView data={data} update={update} />}
          {tab === '설정' && <SettingsView data={data} update={update} onImport={loadBackup} onReset={reset} />}
        </section>
      </main>

      {session && <SessionModal data={data} session={session} update={update} onClose={() => setSelected(null)} />}
      {pending && (
        <ImportModal
          classes={pending.classes}
          failed={pending.failed}
          onCancel={() => setPending(null)}
          onConfirm={mergeImport}
        />
      )}
    </div>
  )
}
