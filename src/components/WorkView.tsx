import { useState } from 'react'
import type { AppData, Session, TeacherTask } from '../types'
import CalendarView from './CalendarView'
import TaskList from './TaskList'
import { blankTask } from '../taskDates'
import { todayKey } from '../schedule'

type Props={data:AppData;sessions:Session[];update:(change:Partial<AppData>)=>void}
export default function WorkView({data,sessions,update}:Props){
  const [anchor,setAnchor]=useState(()=>new Date())
  const [editor,setEditor]=useState<{request:number;draft:TeacherTask}>(()=>({request:0,draft:blankTask()}))
  const [feedback,setFeedback]=useState('')
  const open=(draft:TeacherTask)=>{setEditor(current=>({request:current.request+1,draft}));setFeedback('오른쪽 등록 화면에서 확인하세요.')}
  return <div className="work-layout"><div className="work-calendar"><CalendarView context="work" data={data} sessions={sessions} month={anchor} setMonth={setAnchor} update={update} onSelect={()=>{}} onDateSelect={date=>open({...blankTask(),scheduleType:'dated',date})} onTaskSelect={id=>{const item=data.teacherDesk.tasks.find(item=>item.id===id);if(item)open({...item})}}/>{feedback&&<p role="status" className="hint">{feedback}</p>}</div><div className="work-editor"><TaskList key={editor.request} title="업무·일정" initialDraft={editor.draft} items={data.teacherDesk.tasks} today={todayKey()} onChange={tasks=>update({teacherDesk:{...data.teacherDesk,tasks}})}/></div></div>
}
