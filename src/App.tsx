import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from 'react'
import AppLogo from './components/AppLogo'
import {DashboardToolbarContext} from './dashboardToolbar'
import type { AppData, Classroom } from './types'
import { APP_VERSION, emptyData, exportData, importData, makeId, nextSubjectColor, readData, writeData } from './storage'
import { ensureFontLoaded, fonts, fontSizes, fontSizeOptions, normalizeFontSize, uiThemeVars, themes } from './theme'
import { displayFontStack } from './fontLoading'
import { buildSessions } from './schedule'
import { parseWorkbooks, type ImportedClass } from './naesAttendanceParser'
import SettingsHub from './components/SettingsHub'
import SessionModal from './components/SessionModal'
import ImportModal from './components/ImportModal'
import TeacherDeskView from './components/TeacherDeskView'
import ClubView from './components/ClubView'
import UpdateNotice from './components/UpdateNotice'
import TeachingHub from './components/TeachingHub'
import type { TeachingTab } from './components/TeachingHub'
import './App.css'

const allTabs = ['오늘', '담임', '교과', '동아리', '업무', '환경설정'] as const
type Tab = (typeof allTabs)[number]

const isLegacyTeachingFlowUrl = typeof window !== 'undefined'
  && window.location.hostname === 'music-yul.github.io'
  && window.location.pathname.startsWith('/TeachingFlow')

export default function App() {
  return isLegacyTeachingFlowUrl ? <MigrationNotice /> : <TeachingFlowApp />
}

function MigrationNotice() {
  const storageKey = 'class-schedule-planner-data'
  const [hasData] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return false
      const saved = JSON.parse(raw)
      return Boolean(saved && typeof saved === 'object' && ('settings' in saved || 'classes' in saved))
    } catch {
      return false
    }
  })
  const [status, setStatus] = useState(
    hasData
      ? '이 브라우저에서 기존 티칭플로 자료를 찾았습니다. 먼저 백업 파일을 내려받아 주세요.'
      : '이 브라우저에서 저장된 자료를 찾지 못했습니다. 자료를 사용하던 브라우저와 기기에서 다시 접속해 주세요.',
  )

  useEffect(() => {
    const removeOldOfflineCopy = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map(registration => registration.unregister()))
        }
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys
            .filter(key => key.startsWith('teachingflow-'))
            .map(key => caches.delete(key)))
        }
      } catch {
        // Keep the migration screen available even if browser cleanup is unavailable.
      }
    }
    void removeOldOfflineCopy()
  }, [])

  const handleBackup = () => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) {
        setStatus('백업할 자료가 없습니다. 자료를 사용하던 브라우저와 기기에서 접속해 주세요.')
        return
      }
      // Use the same export format as the app's Settings > Data Management backup.
      exportData(readData())
      setStatus('백업 파일을 다운로드했습니다. 새 주소에서 불러와 주세요.')
    } catch {
      setStatus('백업에 실패했습니다. 브라우저 저장공간을 확인한 뒤 다시 시도해 주세요.')
    }
  }

  const page: CSSProperties = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '28px 16px',
    boxSizing: 'border-box',
    background: '#f3f6fa',
    color: '#263346',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  }
  const card: CSSProperties = {
    width: 'min(100%, 620px)',
    padding: 'clamp(24px, 6vw, 42px)',
    boxSizing: 'border-box',
    background: '#fff',
    border: '1px solid #dbe2ea',
    borderRadius: 20,
    boxShadow: '0 12px 36px rgba(24,39,60,.08)',
  }
  const button: CSSProperties = {
    display: 'inline-flex',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    border: 0,
    borderRadius: 10,
    font: 'inherit',
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={page}>
      <main style={card}>
        <p style={{ margin: '0 0 10px', color: '#354d70', fontSize: 13, fontWeight: 700, letterSpacing: '.04em' }}>
          TEACHING FLOW
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(23px, 5vw, 30px)', lineHeight: 1.35 }}>
          티칭플로 주소가 변경되었습니다
        </h1>
        <p style={{ margin: '14px 0 22px', color: '#64748b', lineHeight: 1.7 }}>
          기존 주소에서는 티칭플로를 더 이상 사용할 수 없습니다. 새 주소에서 계속 이용해 주세요.
        </p>
        <section style={{ padding: '16px 18px', borderRadius: 12, background: '#f0f4f9', lineHeight: 1.65 }}>
          <strong style={{ display: 'block', marginBottom: 5 }}>기존 자료를 옮겨서 계속 사용할 수 있어요.</strong>
          자료는 이 브라우저에 저장되어 있습니다. 먼저 백업 파일을 내려받고, 새 주소에서 불러와 주세요.
        </section>
        <ol style={{ margin: '22px 0', paddingLeft: 22, lineHeight: 1.8 }}>
          <li><b>기존 자료 백업하기</b>를 눌러 JSON 파일을 저장합니다.</li>
          <li><b>새 티칭플로 열기</b>를 누릅니다.</li>
          <li>새 주소의 <b>환경설정 → 데이터 관리 → 불러오기</b>에서 저장한 파일을 선택합니다.</li>
          <li>자료가 잘 들어왔는지 확인할 때까지 백업 파일을 보관해 주세요.</li>
        </ol>
        <p role="status" aria-live="polite" style={{ margin: '18px 0 0', padding: '12px 14px', borderRadius: 10, background: '#f8fafc', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
          {status}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
          <button
            type="button"
            disabled={!hasData}
            onClick={handleBackup}
            style={{ ...button, flex: '1 1 220px', background: '#e9eef5', color: '#263346', opacity: hasData ? 1 : .5 }}
          >
            기존 자료 백업하기 (.json)
          </button>
          <a
            href="https://teaching-flow-gamma.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...button, flex: '1 1 220px', background: '#354d70', color: '#fff' }}
          >
            새 티칭플로 열기
          </a>
        </div>
        <p style={{ margin: '18px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
          자료가 저장된 브라우저와 기기에서 이 페이지를 열어야 백업할 수 있습니다. 새 주소에서 가져오기를 확인하기 전에는 브라우저 저장 자료를 삭제하지 마세요.
        </p>
      </main>
    </div>
  )
}

function TeachingFlowApp() {
  const [dashboardToolbar,setDashboardToolbar]=useState<HTMLDivElement|null>(null)
  const [data, setData] = useState<AppData>(readData)
  const [storedTab, setTab] = useState<Tab>('오늘')
  const tabs=allTabs.filter(item=>item!=='담임'||data.settings.features.homeroom).filter(item=>item!=='동아리'||data.settings.features.clubs).filter(item=>item!=='교과'||data.settings.features.teaching).filter(item=>item!=='업무'||data.settings.features.work)
  const tab=tabs.includes(storedTab)?storedTab:'오늘'
  const [teachingTab,setTeachingTab]=useState<TeachingTab>('진도 관리')
  const [settingsStart,setSettingsStart]=useState<'학사일정'|'기능 설정'>('기능 설정')
  const manageRoster=()=>{setSettingsStart('기능 설정');setTab('환경설정')}
  const [clubJump,setClubJump]=useState<string|null>(null)
  const [evalJump, setEvalJump] = useState<{ evaluationId: string; classId: string } | null>(null)
  const openEvaluation = (evaluationId: string, classId: string) => {
    setSelected(null)
    setEvalJump({ evaluationId, classId })
    setTeachingTab('평가·성적')
    setTab('교과')
  }
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, setPending] = useState<{ classes: ImportedClass[]; failed: string[] } | null>(null)
  const [saveError, setSaveError] = useState(false)

  const sessions = useMemo(() => buildSessions(data), [data])
  const session = sessions.find(item => item.id === selected && !item.cancelled)

  useEffect(() => {
    setSaveError(!writeData(data))
  }, [data])

  const appearance = data.settings.appearance

  // useLayoutEffect: 화면에 그려지기 전에(paint 전에) 동기로 실행해야 저장해둔 테마색이
  // 나오기 전에 App.css 기본값(파란 강조색)이 잠깐 보이는 깜빡임이 없다.
  useLayoutEffect(() => {
    const root = document.documentElement
    const theme = themes.find(item => item.id === appearance.themeId) || themes[0]
    Object.entries(uiThemeVars(theme,appearance)).forEach(([key, value]) => root.style.setProperty(key, value))
    root.style.setProperty('--accent', appearance.accent)
    root.style.fontSize = fontSizes[normalizeFontSize(appearance.fontSize)] || fontSizes.normal
    const font = fonts.find(item => item.id === appearance.fontId) || fonts[0]
    ensureFontLoaded(font)
    document.body.style.fontFamily = displayFontStack(font)
  }, [appearance])

  const update = (change: Partial<AppData>) => setData(current => ({ ...current, ...change }))

  const openSetup = (target:'학급 설정'|'동아리'|'업무'|'오늘') => {
    if(target==='오늘'){setTab('오늘');return}
    const enabled=target==='학급 설정'?data.settings.features.teaching:target==='동아리'?data.settings.features.clubs:data.settings.features.work
    if(!enabled){window.alert('기능 설정에서 해당 기능을 먼저 켜 주세요.');return}
    if(target==='학급 설정'){setTeachingTab('학급 설정');setTab('교과')}
    else if(target==='동아리'){setClubJump(null);setTab('동아리')}
    else setTab('업무')
  }

  const openFiles = async (files: File[]) => {
    const result = await parseWorkbooks(files)
    if (!result.classes.length) {
      window.alert(
        '파일에서 명단을 찾지 못했습니다.\n교과 > 학급 설정에서 학급을 만든 뒤 "명단 붙여넣기"로 넣으실 수 있습니다.',
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
          students: incoming.students.map(student => ({ id: makeId('student'), number: student.number, name: student.name })),
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
        else existing.students.push({ id: makeId('student'), number: student.number, name: student.name })
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
    <DashboardToolbarContext.Provider value={dashboardToolbar}><div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" role="img" aria-label="티칭플로"><AppLogo /></span>
          <div className="brand-text">
            <span className="brand-title">
              <strong>티칭플로</strong>
              <span className="version-badge">{APP_VERSION}</span>
            </span>
            <small>TEACHING FLOW ― 수업과 학교생활을 한눈에</small>
          </div>
        </div>
        <div className="topbar-right">
          <label className="font-control">
            폰트 크기
            <select
              value={normalizeFontSize(appearance.fontSize)}
              onChange={event => update({ settings: { ...data.settings, appearance: { ...appearance, fontSize: event.target.value } } })}
            >
              {fontSizeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </header>

      <nav className="tabbar">
        <div className="tabbar-links">{tabs.map((item, index) => (
          <button className={tab === item ? 'tab-item active' : 'tab-item'} key={item} onClick={() => {if(item==='동아리')setClubJump(null);if(item==='교과')setTeachingTab('진도 관리');setTab(item)}}>
            <span className="tab-index">{String(index + 1).padStart(2, '0')}</span>{item}
          </button>
        ))}</div>
        <div className="dashboard-toolbar-slot" ref={setDashboardToolbar} hidden={tab!=='오늘'}/>
      </nav>

      {saveError && <p className="banner warn">저장 공간이 가득 찼습니다. 백업을 내보낸 뒤 기록을 정리해 주세요.</p>}

      <main className="workspace">
        <section className="content">
          {!started && tab === '교과' && (
            <p className="banner">
              먼저 <b>교과 &gt; 학급 설정</b>에서 출석부를 올리거나 과목·학급을 등록해 주세요.
              학기 기간은 <b>환경설정 &gt; 학사일정</b>에서 맞춰 주세요. 교과 외 기능의 시작 방법은 <b>환경설정 &gt; 기능 설정</b>에서 확인할 수 있습니다.
            </p>
          )}

          {(tab === '오늘' || tab === '담임' || tab === '업무') && <TeacherDeskView key={tab} mode={tab} onManageRoster={manageRoster} data={data} sessions={sessions} update={update} onSelect={setSelected} onNavigate={(next,reference)=>{if(next==='교과')setTeachingTab(reference==='classes'?'학급 설정':'진도 관리');if(next==='동아리')setClubJump(reference||null);setTab(next)}} />}
          {tab === '동아리' && data.settings.features.clubs && <ClubView onManageRoster={manageRoster} key={clubJump||'club-default'} initialClubId={clubJump||undefined} data={data} update={update} />}
          {tab === '교과' && <TeachingHub onFiles={openFiles} data={data} sessions={sessions} update={update} tab={teachingTab} setTab={setTeachingTab} onSelect={setSelected} onOpenEvaluation={openEvaluation} evalJump={evalJump} onJumpHandled={() => setEvalJump(null)} />}
          {tab === '환경설정' && (
            <SettingsHub initialSub={settingsStart} data={data} update={update} onFiles={openFiles} onImport={loadBackup} onReset={reset} onSetupNavigate={openSetup} />
          )}
          <p className="app-foot">© 2026 율쌤 ｜ 무단 배포 및 수정 금지</p>
        </section>
      </main>

      {session && (
        <SessionModal
          data={data}
          session={session}
          update={update}
          onClose={() => setSelected(null)}
          onOpenEvaluation={openEvaluation}
        />
      )}
      <UpdateNotice />
      {pending && (
        <ImportModal
          initial={pending.classes}
          failed={pending.failed}
          onCancel={() => setPending(null)}
          onConfirm={mergeImport}
        />
      )}
    </div></DashboardToolbarContext.Provider>
  )
}
