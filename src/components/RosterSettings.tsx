import { useState } from 'react'
import type { AppData, Student } from '../types'
import { makeId } from '../storage'
import { todayKey } from '../schedule'
import { activeStudents, addStudent, mergeRoster } from '../members'
type Props={data:AppData;students:Student[];onChange:(students:Student[])=>void;title:string}
export default function RosterSettings({data,students,onChange,title}:Props){
 const [text,setText]=useState<string|null>(null)
 const [date,setDate]=useState(students.length?todayKey():data.settings.termStart||todayKey())
 const [source,setSource]=useState('')
 const [error,setError]=useState('')
 const [showPast,setShowPast]=useState(false)
 const current=activeStudents(students,todayKey())
 return <div className="roster-settings"><div className="desk-heading"><h3>{title}</h3><button className="ghost-button" onClick={()=>{setText(activeStudents(students,date).map(s=>`${s.number} ${s.name}`).join('\n'));setError('')}}>명단 입력·일괄 편집</button></div>
 {text!==null&&<form className="desk-form" onSubmit={e=>{e.preventDefault();try{const next=mergeRoster(students,text,date,()=>makeId('member'));const removed=activeStudents(students,date).filter(s=>!activeStudents(next,date).some(item=>item.id===s.id));if(removed.length&&!window.confirm(`${removed.length}명을 ${date}부터 명단에서 제외합니다. 과거 기록은 남습니다. 계속할까요?`))return;onChange(next);setText(null);setError('')}catch(error){setError((error as Error).message)}}}><label>명단 기준일<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><div className="desk-toolbar"><select value={source} onChange={e=>setSource(e.target.value)} aria-label="복사할 수업 명단"><option value="">기존 수업 명단</option>{data.classes.filter(c=>!c.archived).map(c=><option key={c.id} value={c.id}>{c.name} · {data.subjects.find(s=>s.id===c.subjectId)?.name}</option>)}</select><button type="button" className="ghost-button" disabled={!source} onClick={()=>{const c=data.classes.find(c=>c.id===source);if(c)setText(c.students.map(s=>`${s.number} ${s.name}`).join('\n'))}}>명단 복사</button></div><label>학번 이름 · 한 줄에 한 명<textarea rows={8} value={text} onChange={e=>setText(e.target.value)} placeholder={'1101 김학생\n1102 이학생'}/></label><div className="desk-actions"><button className="primary-button">저장</button><button type="button" className="ghost-button" onClick={()=>setText(null)}>취소</button></div></form>}
 {error&&<p role="alert" className="desk-overdue">{error}</p>}<label className="inline-check"><input type="checkbox" checked={showPast} onChange={e=>setShowPast(e.target.checked)}/> 전출·이전 명단 보기</label>
 <div className="settings-member-list">{(showPast?students.filter(s=>s.leftOn):current).sort((a,b)=>a.number-b.number).map(s=><div key={s.id}><span>{s.number} {s.name}{s.joinedOn&&` · 전입/추가 ${s.joinedOn}`}{s.leftOn&&` · ${s.departureReason||'제외'} ${s.leftOn}`}</span>{s.leftOn&&<button className="link-button" onClick={()=>{try{addStudent(students.filter(old=>old.id!==s.id),{...s,leftOn:undefined,departureReason:undefined});onChange(students.map(old=>old.id===s.id?{...old,leftOn:undefined,departureReason:undefined}:old));setError('')}catch(error){setError((error as Error).message)}}}>현재 명단으로 복원</button>}</div>)}</div><p className="hint">명단 입력·일괄 편집에서 학생을 추가하거나 제외할 수 있습니다. 기준일 이전 기록은 보존합니다.</p>
 </div>
}
