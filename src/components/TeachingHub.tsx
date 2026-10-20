import type { AppData, Session } from '../types'
import ClassesView from './ClassesView'
import GroupsView from './GroupsView'
import SeatingView from './SeatingView'
import AttendanceView from './AttendanceView'
import EvaluationsView from './EvaluationsView'
import ProgressHub from './ProgressHub'
import MiniTimetable from './MiniTimetable'

const teachingTabs=['진도 관리','출결 관리','평가·성적','자리 배치','모둠 뽑기','학급 설정'] as const
export type TeachingTab=typeof teachingTabs[number]
type Props={onFiles?:(files:File[])=>void;data:AppData;sessions:Session[];update:(change:Partial<AppData>)=>void;tab:TeachingTab;setTab:(tab:TeachingTab)=>void;onSelect:(id:string)=>void;onOpenEvaluation:(evaluationId:string,classId:string)=>void;evalJump:{evaluationId:string;classId:string}|null;onJumpHandled:()=>void}
export default function TeachingHub({data,sessions,update,tab,setTab,onSelect,onOpenEvaluation,evalJump,onJumpHandled,onFiles=()=>{}}:Props){
 return <div><div className="subtabs">{teachingTabs.map(item=><button className={tab===item?'subtab active':'subtab'} key={item} onClick={()=>setTab(item)}>{item}</button>)}</div>
 {tab==='학급 설정'&&<ClassesView data={data} update={update} onFiles={onFiles}/>}
 {tab==='진도 관리'&&<div className="timetable-layout"><MiniTimetable data={data} sessions={sessions}/><ProgressHub data={data} sessions={sessions} update={update} onSelect={onSelect} onOpenEvaluation={onOpenEvaluation}/></div>}
 {tab==='출결 관리'&&<AttendanceView data={data} sessions={sessions} update={update}/>}
 {tab==='모둠 뽑기'&&<GroupsView data={data} update={update}/>}
 {tab==='자리 배치'&&<SeatingView data={data} update={update} scope="teaching"/>}
 {tab==='평가·성적'&&<EvaluationsView data={data} sessions={sessions} update={update} jumpTo={evalJump} onJumpHandled={onJumpHandled} onOpenSession={onSelect}/>}
 </div>
}
