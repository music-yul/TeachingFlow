import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {DashboardToolbarContext} from './dashboardToolbar'
import type { AppData, Classroom } from './types'
import { APP_VERSION, emptyData, importData, makeId, nextSubjectColor, readData, writeData } from './storage'
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

export default function App() {
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
          <span className="brand-mark" role="img" aria-label="티칭플로">🏫</span>
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
