import ClubScheduleSettings from './ClubScheduleSettings'
import { clubMeetingDates, preferredClubDate, normalizeClubSchedule } from '../clubSchedule'
import { useState } from 'react'
import type { AppData, Club, ClubActivity } from '../types'
import { makeId } from '../storage'
import { todayKey } from '../schedule'
import HomeroomRoster from './HomeroomRoster'

type Props={onManageRoster?:()=>void;data:AppData;update:(change:Partial<AppData>)=>void;initialClubId?:string}
export default function ClubView({data,update,initialClubId,onManageRoster}:Props){
 const [selected,setSelected]=useState(initialClubId||data.clubs[0]?.id||'')
 const [student,setStudent]=useState('')
 const [draft,setDraft]=useState<ClubActivity|null>(null)
 const club=data.clubs.find(c=>c.id===selected)||data.clubs[0]
 const dates=club?clubMeetingDates(data,club,todayKey()):[]
 const attendanceDate=preferredClubDate(dates,todayKey())
 const patch=(values:Partial<Club>)=>{if(club)update({clubs:data.clubs.map(c=>c.id===club.id?{...c,...values}:c)})}
 const blankActivity=():ClubActivity=>({id:'',date:todayKey(),title:'',record:'',nextPlan:''})
 return <div className="teacher-desk"><div className="desk-heading club-toolbar">{club&&<><label>동아리 선택<select aria-label="관리할 동아리" value={club.id} onChange={e=>{setSelected(e.target.value);setDraft(null);setStudent('')}}>{data.clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><span className="hint">{normalizeClubSchedule(club.schedule).kind==='autonomous'?'자율 동아리':'정규 동아리'}</span></>}</div>
 {!club?<p className="banner">환경설정 → 기능 설정에서 동아리와 초기 명단을 등록하세요.</p>:<>
 <ClubScheduleSettings key={club.id} data={data} club={club} onChange={patch}/>
 <div className="homeroom-layout"><HomeroomRoster onManage={onManageRoster} memberKind="club" key={`${club.id}:${attendanceDate}`} initialDate={attendanceDate} dateOptions={dates} data={{...data,teacherDesk:{...data.teacherDesk,className:club.name,students:club.students,homeroomAttendance:club.attendance,attendanceReasons:club.attendanceReasons||{},attendanceMemos:club.attendanceMemos||{}}}} selected={student} onSelect={setStudent} update={change=>{if(change.teacherDesk)patch({students:change.teacherDesk.students,attendance:change.teacherDesk.homeroomAttendance,attendanceReasons:change.teacherDesk.attendanceReasons,attendanceMemos:change.teacherDesk.attendanceMemos})}}/><div className="homeroom-main">
 <section className="desk-card"><div className="desk-heading"><h2>활동 계획·기록</h2><button className="primary-button" onClick={()=>setDraft(blankActivity())}>+ 활동 추가</button></div>{draft&&<form className="desk-form" onSubmit={e=>{e.preventDefault();if(!draft.title.trim())return;const item={...draft,id:draft.id||makeId('club-activity'),title:draft.title.trim()};patch({activities:draft.id?club.activities.map(a=>a.id===item.id?item:a):[...club.activities,item]});setDraft(null)}}><label className="inline-check"><input type="checkbox" checked={Boolean(draft.important)} onChange={e=>setDraft({...draft,important:e.target.checked})}/> 중요 일정</label><label>활동일<input type="date" required value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label><label>활동 주제<input required value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>활동 내용·관찰 기록<textarea value={draft.record} onChange={e=>setDraft({...draft,record:e.target.value})}/></label><label>다음 활동 계획<textarea value={draft.nextPlan} onChange={e=>setDraft({...draft,nextPlan:e.target.value})}/></label><div className="desk-actions"><button className="primary-button">저장</button><button type="button" className="ghost-button" onClick={()=>setDraft(null)}>취소</button></div></form>}{[...club.activities].sort((a,b)=>b.date.localeCompare(a.date)).map(a=><article className="desk-item" key={a.id}><strong>{a.important?'★ ':''}{a.date} · {a.title}</strong>{a.record&&<p className="desk-pre">{a.record}</p>}{a.nextPlan&&<p className="desk-pre">다음 활동: {a.nextPlan}</p>}<div className="desk-actions"><button className="link-button" onClick={()=>setDraft({...a})}>수정</button><button className="link-button" onClick={()=>{if(window.confirm('이 활동 기록을 삭제할까요?'))patch({activities:club.activities.filter(old=>old.id!==a.id)})}}>삭제</button></div></article>)}{!club.activities.length&&<p className="hint">등록된 활동이 없습니다.</p>}</section>
 </div></div></>}
 </div>
}
