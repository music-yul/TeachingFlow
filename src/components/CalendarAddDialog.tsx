import {useEffect,useState} from 'react'
import type {AppData} from '../types'
import {appendCalendarTask,calendarTaskDraft} from '../calendarActions'
import TaskList from './TaskList'
import WorkEntryTypeSelector from './WorkEntryTypeSelector'
import {WorkRecordForm,blankWorkRecord} from './WorkRecordDialog'
type Props={data:AppData;date:string;mode:'menu'|'work'|'homeroom';onMode:(mode:'work'|'homeroom')=>void;onMemo:()=>void;onClose:()=>void;update:(change:Partial<AppData>)=>void}
export default function CalendarAddDialog({data,date,mode,onMode,onMemo,onClose,update}:Props){
 const [kind,setKind]=useState<'task'|'record'>('task')
 useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[onClose])
 return <div className="release-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose()}}><section className="release-dialog" role="dialog" aria-modal="true" aria-label={`${date} 일정 추가`}><div className="desk-heading"><div className="work-entry-heading"><h2>{date} · {mode==='menu'?'추가할 기능 선택':mode==='work'?'업무기록':'담임 안내·할 일 추가'}</h2>{mode==='work'&&<WorkEntryTypeSelector value={kind} onChange={setKind}/>}</div><button className="ghost-button" onClick={onClose}>닫기</button></div>
 {mode==='menu'?<div className="desk-actions"><button className="ghost-button" onClick={onMemo}>메모 추가</button>{data.settings.features.work&&<button className="ghost-button" onClick={()=>onMode('work')}>업무 추가</button>}{data.settings.features.homeroom&&<button className="ghost-button" onClick={()=>onMode('homeroom')}>담임 안내·할 일 추가</button>}</div>:<>
 <div hidden={mode==='work'&&kind==='record'}><TaskList key={`${date}:${mode}`} title="일정 추가" editorOnly onCancel={onClose} initialDraft={calendarTaskDraft(date,mode==='homeroom')} notice={mode==='homeroom'} today={date} categoryOptions={[...data.teacherDesk.tasks.map(item=>item.category),...(data.teacherDesk.workRecords||[]).map(record=>record.category)]} items={[]} onChange={items=>{if(items[0]){update(appendCalendarTask(data,mode,items[0]));onClose()}}}/></div>
 {mode==='work'&&<div hidden={kind!=='record'}><WorkRecordForm key={date} embedded data={data} initial={blankWorkRecord(date)} update={update} onClose={onClose}/></div>}
 </>}
 </section></div>
}
