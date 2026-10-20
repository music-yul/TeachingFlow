import StudentRecords from './StudentRecords'
import HomeroomAttendanceSummary from './HomeroomAttendanceSummary'
import SeatingView from './SeatingView'
import { useState } from 'react'
import type { AppData, Session, TeacherDesk } from '../types'
import { makeId } from '../storage'
import { todayKey } from '../schedule'
import TodayView from './TodayView'
import { activeStudents, collectionMembers } from '../members'
import HomeroomTimetable from './HomeroomTimetable'
import WorkView from './WorkView'
import HomeroomRoster from './HomeroomRoster'
import TaskList from './TaskList'
import './TeacherDeskView.css'

type HomeroomTab='학급 관리'|'출결 관리'|'상담·생활 기록'|'자리 배치'
type Props = {
  onManageRoster?:()=>void
  initialHomeroomTab?: HomeroomTab
  mode: '오늘' | '담임' | '업무'
  data: AppData
  sessions: Session[]
  update: (change: Partial<AppData>) => void
  onSelect: (id: string) => void
  onNavigate: (tab: '담임' | '업무' | '교과' | '동아리', reference?:string) => void
}
const dueText = (date: string, today: string) => !date ? '기한 없음' : date < today ? `${date} · 기한 지남` : date === today ? '오늘' : date
export default function TeacherDeskView({ mode, data, sessions, update, onSelect, onNavigate, initialHomeroomTab='학급 관리', onManageRoster }: Props) {
  const desk = data.teacherDesk
  const today = todayKey()
  const patch = (change: Partial<TeacherDesk>) => update({ teacherDesk: { ...desk, ...change } })
  const [collectionDraft, setCollectionDraft] = useState<{ id: string; title: string; date: string; important?: boolean } | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [homeroomTab,setHomeroomTab]=useState<HomeroomTab>(initialHomeroomTab)
  const students = activeStudents(desk.students,today)

  return <div className="teacher-desk">

    {mode === '오늘' && <TodayView data={data} sessions={sessions} update={update} onSelect={onSelect} onNavigate={onNavigate} />}
    {mode === '업무' && <WorkView data={data} sessions={sessions} update={update} />}
    {mode === '담임' && <><div className="subtabs">{(['학급 관리','출결 관리','상담·생활 기록','자리 배치'] as HomeroomTab[]).map(item=><button key={item} className={homeroomTab===item?'subtab active':'subtab'} onClick={()=>{setHomeroomTab(item)}}>{item}</button>)}</div>
    {(homeroomTab==='학급 관리'||homeroomTab==='출결 관리')&&<div className={`homeroom-layout ${homeroomTab==='학급 관리'?'homeroom-class-layout':''}`}><HomeroomRoster onManage={onManageRoster} data={data} update={update} selected={studentId} onSelect={id=>{setStudentId(id);setHomeroomTab('출결 관리')}}/><div className="homeroom-main">
    {homeroomTab==='학급 관리'&&<><div className="desk-grid"><TaskList title="안내·학급 할 일" items={desk.notices} onChange={notices => patch({ notices })} notice today={today} />
      <section className="desk-card"><div className="desk-heading"><h2>자료 취합</h2><div className="desk-actions"><label className="inline-check"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> 지난 제출 보기</label><button className="primary-button" disabled={!students.length} onClick={() => setCollectionDraft({ id: '', title: '', date: today, important:false })}>+ 취합 추가</button></div></div>{!students.length && <p className="hint">학급·명단 설정에서 학생을 먼저 등록하세요.</p>}
        {collectionDraft && <form className="desk-form" onSubmit={e => { e.preventDefault(); if (!collectionDraft.title.trim()) return; const old = desk.collections.find(c => c.id === collectionDraft.id); const item = { ...collectionDraft, title: collectionDraft.title.trim(), id: collectionDraft.id || makeId('collection'), studentIds: old?.studentIds || students.map(s => s.id), received: old?.received || [], archived: old?.archived || false }; patch({ collections: old ? desk.collections.map(c => c.id === old.id ? item : c) : [...desk.collections, item] }); setCollectionDraft(null) }}><label className="inline-check"><input type="checkbox" checked={Boolean(collectionDraft.important)} onChange={e=>setCollectionDraft({...collectionDraft,important:e.target.checked})}/> 중요 일정</label><label>취합 항목<input autoFocus required value={collectionDraft.title} onChange={e => setCollectionDraft({ ...collectionDraft, title: e.target.value })} /></label><label>마감일<input type="date" value={collectionDraft.date} onChange={e => setCollectionDraft({ ...collectionDraft, date: e.target.value })} /></label><div className="desk-actions"><button className="primary-button">저장</button><button className="ghost-button" type="button" onClick={() => setCollectionDraft(null)}>취소</button></div></form>}
        {!desk.collections.some(c=>showArchived?c.archived:!c.archived) && <p className="hint">{showArchived?'지난 제출이 없습니다.':'등록된 취합 항목이 없습니다.'}</p>}
        {[...desk.collections].filter(c => showArchived ? c.archived : !c.archived).sort((a,b) => Number(a.archived)-Number(b.archived) || (a.date || '9999').localeCompare(b.date || '9999')).map(item => { const targets = collectionMembers(desk,item,today); const missing = targets.filter(s => !item.received.includes(s.id)); const change = (values: Partial<typeof item>) => patch({ collections: desk.collections.map(c => c.id === item.id ? { ...c, ...values } : c) }); return <details className="desk-item" key={item.id}><summary><b>{item.important?'★ ':''}{item.title}</b> · {targets.length - missing.length}/{targets.length}명 제출 {item.archived && '· 지난 제출'}<small className={item.date && item.date < today && missing.length ? 'desk-overdue' : 'hint'}>{dueText(item.date, today)}</small></summary><p className="hint">{missing.length ? `미제출: ${missing.map(s => `${s.number} ${s.name}`).join(', ')}` : targets.length ? '모두 제출했습니다.' : '현재 명단에 해당하는 대상이 없습니다.'}</p><div className="desk-student-checks">{targets.map(s => <label key={s.id}><input type="checkbox" checked={item.received.includes(s.id)} onChange={e => change({ received: e.target.checked ? [...item.received, s.id] : item.received.filter(id => id !== s.id) })} />{s.number} {s.name}</label>)}</div><div className="desk-actions"><button className="link-button" onClick={() => setCollectionDraft({ id: item.id, title: item.title, date: item.date, important:item.important })}>항목 수정</button>{students.some(s => !item.studentIds.includes(s.id)) && <button className="link-button" onClick={() => change({ studentIds: [...new Set([...item.studentIds, ...students.map(s => s.id)])] })}>새 학생 포함</button>}<button className="link-button" onClick={() => change({ archived: !item.archived })}>{item.archived ? '현재 제출로 되돌리기' : '지난 제출로 이동'}</button><button className="link-button" onClick={() => { if (window.confirm('이 취합 항목과 제출 현황을 삭제할까요?')) patch({ collections: desk.collections.filter(c => c.id !== item.id) }) }}>삭제</button></div></details> })}
      </section></div></>}
    {homeroomTab==='출결 관리'&&<HomeroomAttendanceSummary data={data} update={update} selected={studentId} onSelect={setStudentId}/>}
    </div>{homeroomTab==='학급 관리'&&<HomeroomTimetable data={data} update={update}/>}</div>}
    {homeroomTab==='상담·생활 기록'&&<StudentRecords data={data} update={update}/>}
    {homeroomTab==='자리 배치'&&<SeatingView data={data} update={update} scope="homeroom"/>}
    </>}
  </div>
}
