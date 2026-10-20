import { useState } from 'react'
import type { AppData } from '../types'
import { DAYS } from '../types'
type Props={data:AppData;update:(change:Partial<AppData>)=>void}
export default function HomeroomTimetable({data,update}:Props){
 const desk=data.teacherDesk
 const [draft,setDraft]=useState<Record<string,string>|null>(null)
 const [count,setCount]=useState(desk.timetablePeriods)
 const editing=draft!==null
 const cells=draft||desk.timetable
 const periods=editing?count:desk.timetablePeriods
 return <section className="desk-card homeroom-timetable"><div className="desk-heading"><h2>담임반 시간표{desk.className&&` · ${desk.className}`}</h2></div>{editing&&<label>교시 수<select value={count} onChange={e=>setCount(Number(e.target.value))}>{Array.from({length:14},(_,i)=><option key={i+1} value={i+1}>{i+1}교시</option>)}</select></label>}<div className="table-wrap"><table><thead><tr><th>교시</th>{DAYS.map(day=><th key={day}>{day}</th>)}</tr></thead><tbody>{Array.from({length:periods},(_,i)=>i+1).map(period=><tr key={period}><th>{period}</th>{DAYS.map(day=>{const key=`${day}:${period}`;return <td key={day}>{editing?<input aria-label={`${day}요일 ${period}교시 과목`} value={cells[key]||''} onChange={e=>setDraft({...cells,[key]:e.target.value})}/>:cells[key]||'—'}</td>})}</tr>)}</tbody></table></div><div className="timetable-footer">{!editing&&<button className="ghost-button" onClick={()=>{setDraft({...desk.timetable});setCount(desk.timetablePeriods)}}>시간표 입력·수정</button>}</div>{editing&&<div className="desk-actions"><button className="primary-button" onClick={()=>{update({teacherDesk:{...desk,timetable:{...draft},timetablePeriods:count}});setDraft(null)}}>저장</button><button className="ghost-button" onClick={()=>setDraft(null)}>취소</button></div>}</section>
}
