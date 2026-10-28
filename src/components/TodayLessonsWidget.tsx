import { useEffect,useRef,useState } from 'react'
import type {AppData,Session,TodayLessonFields} from '../types'
import {incomingLessonMemos} from '../lessonJournal'
import {calendarLessonMemoText} from '../lessonMemo'
import {sessionLabel,todayKey} from '../schedule'
import {sessionChangeLabel} from './MiniTimetable'
const labels:Record<keyof TodayLessonFields,string>={period:'교시',className:'학급',subject:'과목명',content:'수업 내용',memo:'메모'}
const defaults:TodayLessonFields={period:true,className:true,subject:true,content:true,memo:true}
type Props={title?:string;data:AppData;sessions:Session[];update:(change:Partial<AppData>)=>void;onSelect:(id:string)=>void}
function DisplaySettings({data,update,onClose}:Pick<Props,'data'|'update'>&{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{dialog.current?.showModal()},[])
 const fields={...defaults,...data.workspacePreferences.todayLessonFields}
 return <dialog ref={dialog} className="modal narrow today-lessons-settings" aria-label="오늘의 수업 위젯 설정" onCancel={onClose}><header className="modal-head"><h2>오늘의 수업 표시 항목</h2><button className="ghost-button" onClick={onClose}>닫기</button></header><div className="modal-body"><p className="hint">위젯에 표시할 정보를 선택하세요. 변경 즉시 저장됩니다.</p>{(Object.keys(labels) as (keyof TodayLessonFields)[]).map(key=><label className="today-lessons-field" key={key}><input type="checkbox" checked={fields[key]} onChange={e=>update({workspacePreferences:{...data.workspacePreferences,todayLessonFields:{...fields,[key]:e.target.checked}}})}/>{labels[key]}</label>)}<p className="hint">메모는 둘째 줄에 표시합니다.</p></div></dialog>
}
export default function TodayLessonsWidget({data,sessions,update,onSelect,title}:Props){
 const [settingsOpen,setSettingsOpen]=useState(false)
 const fields={...defaults,...data.workspacePreferences.todayLessonFields}
 const today=sessions.filter(item=>item.date===todayKey()&&!item.cancelled&&!item.hidden).sort((a,b)=>a.period-b.period)
 const anyField=Object.values(fields).some(Boolean)
 return <section className="desk-card home-info-widget"><div className="desk-heading widget-heading"><h2>{title||'오늘의 수업'}</h2><button className="link-button widget-manage-link" onClick={()=>setSettingsOpen(true)}>관리</button></div>
 {settingsOpen&&<DisplaySettings data={data} update={update} onClose={()=>setSettingsOpen(false)}/>}
 {!anyField?<p className="hint">관리에서 표시할 항목을 선택하세요.</p>:today.map(item=>{
 const className=data.classes.find(c=>c.id===item.classId)?.name||''
 const subject=data.subjects.find(s=>s.id===item.subjectId)?.name||''
 const heading=[fields.className&&className,fields.subject&&subject].filter(Boolean).join(' · ')
 const content=fields.content?sessionLabel(data,item):''
 const memo=fields.memo?[...incomingLessonMemos(data,item,sessions).map(e=>e.nextMemo),calendarLessonMemoText(data,item)].filter(Boolean).join(' · '):''
 const tag=sessionChangeLabel(item)
 const firstLine=fields.period||heading||content
 if(!firstLine&&!memo)return null
 return <button className="desk-session" key={item.id} onClick={()=>onSelect(item.id)}>
 {firstLine&&<span className="desk-session-first-line" title={[fields.period&&`${item.period}교시`,heading,tag,content].filter(Boolean).join(' · ')}>{fields.period&&<b>{item.period}교시</b>}{heading&&<span className="desk-session-class">{heading}</span>}{tag&&<em className="swap-tag">{tag}</em>}{content&&<span className="desk-session-content">{content}</span>}</span>}
 {memo&&<span className="desk-session-memo"><span className="lesson-memo-dash" aria-hidden="true">-</span><span>{memo}</span></span>}
 </button>
 })}
 {!today.length&&<p className="hint">오늘 수업이 없습니다.</p>}
 </section>
}
