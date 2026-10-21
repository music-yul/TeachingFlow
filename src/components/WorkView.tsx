import { useState } from 'react'
import type { AppData, Session, TeacherTask } from '../types'
import CalendarView from './CalendarView'
import TaskList from './TaskList'
import WorkEntryTypeSelector from './WorkEntryTypeSelector'
import {WorkRecordForm,blankWorkRecord} from './WorkRecordDialog'
import WorkHistoryView from './WorkHistoryView'
import { blankTask } from '../taskDates'
import { todayKey } from '../schedule'

type Props={data:AppData;sessions:Session[];update:(change:Partial<AppData>)=>void}
export default function WorkView({data,sessions,update}:Props){
  const [entryKind,setEntryKind]=useState<'task'|'record'>('task')
  const [recordRequest,setRecordRequest]=useState(0)
  const [anchor,setAnchor]=useState(()=>new Date())
  const [editor,setEditor]=useState<{request:number;draft:TeacherTask}>(()=>({request:0,draft:blankTask()}))
  const [feedback,setFeedback]=useState('')
  const [view,setView]=useState<'schedule'|'history'>('schedule')
  const open=(draft:TeacherTask)=>{setEntryKind('task');setEditor(current=>({request:current.request+1,draft}));setFeedback('오른쪽 등록 화면에서 확인하세요.')}
  return <><div className="subtabs"><button className={view==='schedule'?'subtab active':'subtab'} onClick={()=>setView('schedule')}>업무 기록</button><button className={view==='history'?'subtab active':'subtab'} onClick={()=>setView('history')}>히스토리</button></div>{view==='history'?<WorkHistoryView data={data} update={update} onEditTask={task=>{open({...task});setView('schedule')}}/>:<div className="work-layout"><div className="work-calendar"><CalendarView context="work" data={data} sessions={sessions} month={anchor} setMonth={setAnchor} update={update} onSelect={()=>{}} onDateSelect={date=>open({...blankTask(),scheduleType:'dated',date})} onTaskSelect={id=>{const item=data.teacherDesk.tasks.find(item=>item.id===id);if(item)open({...item})}}/>{feedback&&<p role="status" className="hint">{feedback}</p>}</div><div className="work-editor"><div hidden={entryKind!=='task'}><TaskList key={editor.request} title="업무기록" headingAddon={<WorkEntryTypeSelector value={entryKind} onChange={setEntryKind}/>} initialDraft={editor.draft} items={data.teacherDesk.tasks} categoryOptions={(data.teacherDesk.workRecords||[]).map(record=>record.category)} today={todayKey()} onChange={tasks=>update({teacherDesk:{...data.teacherDesk,tasks}})}/></div><div hidden={entryKind!=='record'}><WorkRecordForm key={`${editor.request}:${recordRequest}`} embedded heading={<div className="desk-heading"><div className="work-entry-heading"><h2>업무기록</h2><WorkEntryTypeSelector value={entryKind} onChange={setEntryKind}/></div></div>} data={data} initial={blankWorkRecord(editor.draft.date||todayKey())} update={update} onClose={()=>{setRecordRequest(n=>n+1);setEntryKind('task')}}/></div></div></div>}</>
}
