import { useState } from 'react'
import type { AppData, TeacherTask, WorkRecord } from '../types'
import { makeId } from '../storage'
import { todayKey } from '../schedule'
import { workHistoryEntries } from '../workHistory'
import { TaskCategoryField } from './TaskList'

type Props={data:AppData;update:(change:Partial<AppData>)=>void;onEditTask:(task:TeacherTask)=>void}
export default function WorkHistoryView({data,update,onEditTask}:Props){
 const [draft,setDraft]=useState<WorkRecord|null>(null)
 const [search,setSearch]=useState(''),[category,setCategory]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('')
 const [kind,setKind]=useState('all')
 const records=data.teacherDesk.workRecords||[]
 const entries=workHistoryEntries(data)
 const categories=[...new Set([...entries.map(entry=>entry.category),...data.teacherDesk.tasks.map(task=>task.category)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'))
 const visible=entries.filter(entry=>(kind==='all'||entry.kind===kind)&&(!category||entry.category===category)&&(!from||entry.date>=from)&&(!to||(entry.date&&entry.date<=to))&&(!search||[entry.title,entry.category,entry.content].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())))
 const save=(next:WorkRecord[])=>update({teacherDesk:{...data.teacherDesk,workRecords:next}})
 return <section className="panel work-history">
  <div className="desk-heading"><h2>업무 히스토리</h2><button className="primary-button" onClick={()=>setDraft({id:'',date:todayKey(),title:'',category:'',content:'',link:''})}>+ 지난 업무 기록</button></div>
  {draft&&<form className="desk-form work-task-form" onSubmit={event=>{event.preventDefault();if(!draft.title.trim())return;const record={...draft,id:draft.id||makeId('workrecord'),title:draft.title.trim(),category:draft.category.trim(),content:draft.content.trim(),link:draft.link.trim()};save(draft.id?records.map(old=>old.id===draft.id?record:old):[...records,record]);setDraft(null)}}>
   <div className="desk-fields"><label>업무일<input type="date" required value={draft.date} onChange={event=>setDraft({...draft,date:event.target.value})}/></label><label>업무명<input required value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})}/></label></div>
   <div className="desk-fields"><label>분류<TaskCategoryField key={draft.id||'new-history'} value={draft.category} categories={categories} onChange={category=>setDraft({...draft,category})}/></label><label>자료 링크<input type="url" placeholder="https://" value={draft.link} onChange={event=>setDraft({...draft,link:event.target.value})}/></label></div>
   <label>기록·처리 결과<textarea rows={4} placeholder="진행한 내용, 처리 결과, 다음에 참고할 사항" value={draft.content} onChange={event=>setDraft({...draft,content:event.target.value})}/></label>
   <div className="desk-actions"><button className="primary-button" type="submit">저장</button><button className="ghost-button" type="button" onClick={()=>setDraft(null)}>취소</button></div>
  </form>}
  <div className="work-history-filters"><label>검색<input type="search" placeholder="업무명·분류·기록 검색" value={search} onChange={event=>setSearch(event.target.value)}/></label><label>종류<select value={kind} onChange={event=>setKind(event.target.value)}><option value="all">전체</option><option value="record">지난 업무 기록</option><option value="completed">완료한 업무</option></select></label><label>분류<select value={category} onChange={event=>setCategory(event.target.value)}><option value="">전체 분류</option>{categories.map(name=><option key={name}>{name}</option>)}</select></label><label>시작일<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label>종료일<input type="date" value={to} onChange={event=>setTo(event.target.value)}/></label></div>
  <p className="hint">{visible.length}건 · 완료한 업무는 기존 업무에서 완료 표시한 항목이며, 날짜는 업무 일정일 기준입니다.</p>
  {!visible.length&&<p className="hint">표시할 업무 기록이 없습니다.</p>}
  <div className="work-history-list">{visible.map(entry=><article className="work-history-entry" key={`${entry.kind}:${entry.id}`}><div className="work-history-caption"><span>{entry.date||'날짜 미지정'}</span><span>{entry.category||'미분류'} · {entry.kind==='record'?'업무 기록':'완료한 업무'}</span></div><h3>{entry.title}</h3>{entry.content&&<p className="desk-pre">{entry.content}</p>}<div className="desk-actions">{/^https?:\/\//i.test(entry.link)&&<a href={entry.link} target="_blank" rel="noreferrer">자료 열기 ↗</a>}{entry.kind==='record'?<><button className="link-button" onClick={()=>setDraft(records.find(record=>record.id===entry.id)||null)}>수정</button><button className="link-button" onClick={()=>{if(window.confirm('이 업무 기록을 삭제할까요?'))save(records.filter(record=>record.id!==entry.id))}}>삭제</button></>:<button className="link-button" onClick={()=>{const task=data.teacherDesk.tasks.find(task=>task.id===entry.id);if(task)onEditTask(task)}}>원래 업무 수정</button>}</div></article>)}</div>
 </section>
}
