import type { ReactNode } from 'react'
import { useState } from 'react'
import type { TeacherTask } from '../types'
import { makeId } from '../storage'
import { blankTask, isTaskOverdue, taskDateLabel, taskDeadline, taskKind, taskForEditing } from '../taskDates'


export function TaskCategoryField({value,categories,onChange}:{value:string;categories:string[];onChange:(value:string)=>void}) {
 const [newMode,setNewMode]=useState(Boolean(value)&&!categories.includes(value))
 return <div className="task-category-field"><select aria-label="분류 선택" value={newMode?'new':value?'value:'+value:''} onChange={e=>{const next=e.target.value;if(next==='new'){setNewMode(true);onChange('')}else{setNewMode(false);onChange(next.slice(6))}}}><option value="">분류 없음</option>{categories.map(name=><option key={name} value={'value:'+name}>{name}</option>)}<option value="new">+ 새 분류 입력</option></select>{newMode&&<input aria-label="새 분류명" placeholder="새 분류명" value={value} onChange={e=>onChange(e.target.value)}/>}</div>
}

function safeLink(value: string) { try { const url=new URL(value); return ['https:','http:'].includes(url.protocol)?url.href:undefined } catch { return undefined } }
type Props = { headingAddon?:ReactNode; title: string; items: TeacherTask[]; onChange: (items: TeacherTask[]) => void; notice?: boolean; today: string; initialDraft?: TeacherTask; editorOnly?:boolean; categoryOptions?:string[]; onCancel?:()=>void }
export default function TaskList({ title, items, onChange, notice=false, today, initialDraft, editorOnly=false, onCancel, categoryOptions=[], headingAddon }: Props) {
  const [draft,setDraft]=useState<TeacherTask|null>(initialDraft ? (notice ? initialDraft : taskForEditing(initialDraft)) : null)
  const [showDone,setShowDone]=useState(false)
  const [category,setCategory]=useState('')
  const categories=[...new Set([...items.map(item=>item.category),...categoryOptions].map(value=>(value||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'))
  const save = () => {
    if(!draft?.title.trim()) return
    const item={...draft,title:draft.title.trim(),category:(draft.category||'').trim(),id:draft.id||makeId('task')}
    if(!notice){ item.scheduleType=item.endDate?'period':item.date?'dated':'todo';item.deadlineDate='';if(item.scheduleType!=='period')item.excludeWeekends=false }
    onChange(draft.id?items.map(old=>old.id===item.id?item:old):[...items,item]); setDraft(null)
  }
  const visible=[...items].filter(item=>(showDone||!item.done)&&(!category||item.category===category)).sort((a,b)=>Number(a.done)-Number(b.done)||(taskDeadline(a,notice)||a.date||'9999').localeCompare(taskDeadline(b,notice)||b.date||'9999'))
  return <section className="desk-card">
    {!editorOnly&&<div className="desk-heading"><div className="work-entry-heading"><h2>{title}</h2>{headingAddon}</div><div className="desk-actions"><label className="inline-check"><input type="checkbox" checked={showDone} onChange={event=>setShowDone(event.target.checked)}/> 완료 표시</label><button className="primary-button" onClick={()=>setDraft(blankTask(notice))}>+ {notice?'안내':'업무·일정'} 추가</button></div></div>}
    {draft && <form className={`desk-form ${!notice?'work-task-form':''}`} onSubmit={event=>{event.preventDefault();save()}}>
      <div className="task-title-field"><div className="task-title-caption"><span>{notice?'안내·할 일':'업무·일정명'}</span><label className="inline-check"><input type="checkbox" checked={Boolean(draft.important)} onChange={event=>setDraft({...draft,important:event.target.checked})}/> 중요 일정</label></div><input aria-label={notice?'안내·할 일':'업무·일정명'} autoFocus required value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})}/></div>
      <div className="task-date-row"><label>{notice?'안내일':taskKind(draft)==='period'?'시작일':'날짜'}<input type="date" required={notice||taskKind(draft)!=='todo'||Boolean(draft.showDeadline)} value={draft.date} onChange={event=>setDraft({...draft,date:event.target.value,scheduleType:notice?draft.scheduleType:draft.endDate?'period':event.target.value?'dated':'todo'})}/></label>
      {!notice&&<div className="task-date-options"><label className="inline-check"><input type="checkbox" checked={taskKind(draft)==='period'} onChange={event=>setDraft({...draft,scheduleType:event.target.checked?'period':'dated',endDate:event.target.checked?draft.endDate||draft.date||today:'',date:draft.date||today})}/> 기간으로 등록</label><label className="inline-check"><input type="checkbox" checked={Boolean(draft.showDeadline)} onChange={event=>setDraft({...draft,showDeadline:event.target.checked,date:event.target.checked?draft.date||today:draft.date,deadlineDate:''})}/> 마감일 표시</label>{taskKind(draft)==='period'&&<label className="inline-check"><input type="checkbox" checked={Boolean(draft.excludeWeekends)} onChange={event=>setDraft({...draft,excludeWeekends:event.target.checked})}/> 주말 제외</label>}</div>}</div>
      {(notice||taskKind(draft)==='period')&&<div className="desk-fields">
        {(notice||taskKind(draft)==='period')&&<label>{notice?'마감일 (선택)':'종료일'}<input type="date" required={!notice} min={draft.date||undefined} value={draft.endDate||''} onChange={event=>setDraft({...draft,endDate:event.target.value})}/></label>}
      </div>}
      {!notice&&taskKind(draft)==='period'&&draft.excludeWeekends&&<p className="hint">기간 중 토·일에는 표시하지 않습니다. 마감일은 주말이어도 표시합니다.</p>}
      <label>메모<textarea rows={2} value={draft.note} onChange={event=>setDraft({...draft,note:event.target.value})}/></label>
      {!notice&&<div className="desk-fields task-extra-fields"><label>분류<TaskCategoryField key={draft.id||'new'} value={draft.category||''} categories={categories} onChange={category=>setDraft({...draft,category})}/></label><label>자료 링크<input type="url" placeholder="https://" value={draft.link} onChange={event=>setDraft({...draft,link:event.target.value})}/></label></div>}
      <div className="desk-actions"><button className="primary-button" type="submit">저장</button><button className="ghost-button" type="button" onClick={()=>{setDraft(null);onCancel?.()}}>취소</button></div>
    </form>}
    {!editorOnly&&<div className="desk-toolbar">{!notice&&<select aria-label="업무 분류 필터" value={category} onChange={event=>setCategory(event.target.value)}><option value="">모든 분류</option>{categories.map(value=><option key={value}>{value}</option>)}</select>}</div>}
    {!editorOnly&&<>
    {!visible.length&&<p className="hint">{items.length?'조건에 맞는 항목이 없습니다.':`등록된 ${notice?'안내':'업무·일정'}가 없습니다.`}</p>}
    <div className="task-visible-list">{visible.map(item=><article className={`desk-item ${!notice?'work-task-row':''} ${item.done?'desk-done':''}`} key={item.id}><label className="desk-check"><input type="checkbox" aria-label={`${item.title} 완료`} checked={item.done} onChange={event=>onChange(items.map(old=>old.id===item.id?{...old,done:event.target.checked}:old))}/><strong title={item.title}>{item.important?'★ ':''}{item.title}</strong></label><span className={isTaskOverdue(item,today,notice)?'desk-overdue':'hint'}>{taskDateLabel(item,notice)}{isTaskOverdue(item,today,notice)&&' · 기한 지남'}{item.category&&` · ${item.category}`}</span>{item.note&&(notice?<p className="desk-pre">{item.note}</p>:<span className="task-note" title={item.note}>{item.note}</span>)}<div className="desk-actions">{safeLink(item.link)&&<a href={safeLink(item.link)} target="_blank" rel="noreferrer">자료 열기 ↗</a>}<button className="link-button" onClick={()=>setDraft(notice?{...item}:taskForEditing(item))}>수정</button><button className="link-button" onClick={()=>{if(window.confirm('이 항목을 삭제할까요?'))onChange(items.filter(old=>old.id!==item.id))}}>삭제</button></div></article>)}
    </div></>}
  </section>
}
