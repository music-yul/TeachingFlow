import { useState } from 'react'
import type { AppData, Club } from '../types'
import { makeId } from '../storage'
import RosterSettings from './RosterSettings'
import StartGuide from './StartGuide'
import type { SetupTarget } from './StartGuide'
type Props={data:AppData;update:(change:Partial<AppData>)=>void;onSetupNavigate?:(target:SetupTarget)=>void}
export default function FeatureSettings({data,update,onSetupNavigate}:Props){
 const [editing,setEditing]=useState<'homeroom'|'club'|null>(null)
 const [name,setName]=useState('')
 const [clubId,setClubId]=useState(data.clubs[0]?.id||'')
 const features=data.settings.features
 const club=data.clubs.find(c=>c.id===clubId)||data.clubs[0]
 const toggle=(key:keyof typeof features,value:boolean)=>update({settings:{...data.settings,features:{...features,[key]:value}}})
 const editClub=(change:Partial<Club>)=>{if(club)update({clubs:data.clubs.map(c=>c.id===club.id?{...c,...change}:c)})}
 return <section className="panel feature-settings-layout"><div className="feature-settings-menu"><div className="block"><h2>기능 설정</h2><label className="switch-row"><input type="checkbox" checked={features.teaching} onChange={e=>toggle('teaching',e.target.checked)}/> 교과 관리 사용</label><label className="switch-row"><input type="checkbox" checked={features.work} onChange={e=>toggle('work',e.target.checked)}/> 업무 관리 사용</label></div><div className="block"><h2>담임 설정</h2><label className="switch-row"><input type="checkbox" checked={features.homeroom} onChange={e=>toggle('homeroom',e.target.checked)}/> 담임 관리 사용</label>{features.homeroom&&<button className="ghost-button" onClick={()=>setEditing(editing==='homeroom'?null:'homeroom')}>담임 명단 설정</button>}</div>
 <div className="block"><h2>동아리 설정</h2><label className="switch-row"><input type="checkbox" checked={features.clubs} onChange={e=>toggle('clubs',e.target.checked)}/> 동아리 관리 사용</label>{features.clubs&&<button className="ghost-button" onClick={()=>setEditing(editing==='club'?null:'club')}>동아리·명단 설정</button>}
 <p className="hint">기능을 꺼도 입력 기록은 보관됩니다.</p></div></div><aside className="feature-settings-editor">{editing==='homeroom'&&features.homeroom&&<><label className="feature-name">담임 학급명<input value={data.teacherDesk.className} placeholder="예: 2학년 3반" onChange={e=>update({teacherDesk:{...data.teacherDesk,className:e.target.value}})}/></label><RosterSettings data={data} title="담임 명단" students={data.teacherDesk.students} onChange={students=>update({teacherDesk:{...data.teacherDesk,students}})}/></>}{editing==='club'&&features.clubs&&<><form className="desk-toolbar" onSubmit={e=>{e.preventDefault();if(!name.trim())return;const item:Club={id:makeId('club'),name:name.trim(),students:[],attendance:{},attendanceReasons:{},attendanceMemos:{},activities:[]};update({clubs:[...data.clubs,item]});setClubId(item.id);setName('')}}><input required aria-label="새 동아리 이름" value={name} placeholder="동아리 이름" onChange={e=>setName(e.target.value)}/><button className="primary-button">동아리 추가</button></form>{club&&<><div className="desk-toolbar"><select aria-label="설정할 동아리" value={club.id} onChange={e=>setClubId(e.target.value)}>{data.clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label>이름<input value={club.name} onChange={e=>editClub({name:e.target.value})}/></label><button className="danger-button" onClick={()=>{if(window.confirm(`${club.name}의 명단·출결·활동 기록을 삭제할까요?`)){update({clubs:data.clubs.filter(c=>c.id!==club.id)});setClubId('')}}}>동아리 삭제</button></div><RosterSettings key={club.id} data={data} title={`${club.name} 명단`} students={club.students} onChange={students=>editClub({students})}/></>}</>}{!editing&&<StartGuide onNavigate={onSetupNavigate}/>}</aside></section>
}
