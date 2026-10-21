import type {ReactNode} from 'react'
import {useEffect,useRef,useState} from 'react'
import type {AppData,WorkRecord} from '../types'
import {makeId} from '../storage'
import {TaskCategoryField} from './TaskList'
type Props={data:AppData;initial:WorkRecord;update:(change:Partial<AppData>)=>void;onClose:()=>void;embedded?:boolean;heading?:ReactNode}
export function blankWorkRecord(date:string):WorkRecord{return {id:'',date,title:'',category:'',content:'',link:''}}
export function WorkRecordForm({data,initial,update,onClose,embedded=false,heading}:Props){
 const [draft,setDraft]=useState(initial)
 const records=data.teacherDesk.workRecords||[]
 const categories=[...new Set([...records.map(r=>r.category),...data.teacherDesk.tasks.map(t=>t.category)].filter(Boolean))]
 const save=()=>{if(!draft.title.trim())return;const record={...draft,id:draft.id||makeId('workrecord'),title:draft.title.trim(),content:draft.content.trim(),category:draft.category.trim(),taskTitle:data.teacherDesk.tasks.find(t=>t.id===draft.taskId)?.title||draft.taskTitle};update({teacherDesk:{...data.teacherDesk,workRecords:draft.id?records.map(r=>r.id===draft.id?record:r):[...records,record]}});onClose()}
 return <section className="desk-card work-record-panel">{heading}{!embedded&&<header className="modal-head"><h2>업무기록 · 결과등록</h2><button type="button" className="ghost-button" onClick={onClose}>닫기</button></header>}
 <form className="desk-form work-task-form" onSubmit={e=>{e.preventDefault();save()}}>
  <div className="task-title-field"><div className="task-title-caption"><span>업무·일정명</span></div><input aria-label="업무·일정명" required value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div>
  <div className="task-date-row"><label>날짜<input type="date" required value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label></div>
  <label>기록·처리 결과<textarea rows={2} value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})}/></label>
  <div className="desk-fields task-extra-fields"><label>분류<TaskCategoryField value={draft.category} categories={categories} onChange={category=>setDraft({...draft,category})}/></label><label>자료 링크<input type="url" placeholder="https://" value={draft.link} onChange={e=>setDraft({...draft,link:e.target.value})}/></label></div>
  <details className="work-record-link"><summary>관련 일정 연결 (선택){draft.taskId?' · 연결됨':''}</summary><label>연결할 할 일<select value={draft.taskId||''} onChange={e=>setDraft({...draft,taskId:e.target.value||undefined,taskTitle:undefined})}><option value="">연결 없음 · 단독 기록</option>{draft.taskId&&!data.teacherDesk.tasks.some(t=>t.id===draft.taskId)&&<option value={draft.taskId}>{draft.taskTitle||'삭제된 업무'}</option>}{data.teacherDesk.tasks.map(t=><option key={t.id} value={t.id}>{t.title}{t.done?' · 완료':''}</option>)}</select></label></details>
  <div className="desk-actions"><button type="submit" className="primary-button">저장</button><button type="button" className="ghost-button" onClick={onClose}>취소</button></div>
 </form></section>
}
export default function WorkRecordDialog(props:Props){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{dialog.current?.showModal()},[])
 return <dialog ref={dialog} className="modal narrow work-record-dialog" aria-label="업무 기록" onCancel={props.onClose}><WorkRecordForm {...props}/></dialog>
}
