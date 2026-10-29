import {useState} from 'react'
import type {AppData,SchoolEvent,EventType,Day} from '../types'
import {DAYS,PERIODS} from '../types'
import {makeId} from '../storage'
import {schoolEventColor} from '../calendarAppearance'
const types:Record<EventType,string>={note:'표시만 (수업은 그대로)',closed:'휴업 (수업 없음)',blocked:'수업 불가 (특정 교시)',swap:'요일 변경 (다른 요일 시간표로)'}
export default function SchoolEventForm({data,date,update,onClose}:{data:AppData;date:string;update:(change:Partial<AppData>)=>void;onClose:()=>void}){
 const [draft,setDraft]=useState<Omit<SchoolEvent,'id'>>({date,title:'',type:'note',periods:[],classIds:[],sourceDay:'금',includeWeekends:false})
 const [ranged,setRanged]=useState(false)
 const change=(patch:Partial<typeof draft>)=>setDraft(old=>({...old,...patch}))
 return <form className="fd-option-panel school-quick-form" onSubmit={e=>{e.preventDefault();if(!draft.title.trim()||!draft.date||(ranged&&draft.endDate&&draft.endDate<draft.date))return;update({events:[...data.events,{...draft,id:makeId('event'),title:draft.title.trim(),endDate:ranged?(draft.endDate||draft.date):undefined,periods:draft.type==='blocked'?draft.periods:[],sourceDay:draft.type==='swap'?draft.sourceDay:undefined}]});onClose()}}>
 <label>일정 이름<input required autoFocus aria-label="학사일정 이름" value={draft.title} onChange={e=>change({title:e.target.value})}/></label>
 <label>날짜<input required type="date" aria-label="학사일정 날짜" value={draft.date} onChange={e=>change({date:e.target.value})}/></label>
 <label className="inline-check"><input type="checkbox" checked={ranged} onChange={e=>{setRanged(e.target.checked);change({endDate:''})}}/>기간으로 등록</label>
 {ranged&&<><label>종료일<input type="date" aria-label="학사일정 종료일" min={draft.date} value={draft.endDate||''} onChange={e=>change({endDate:e.target.value})}/></label><label className="inline-check"><input type="checkbox" checked={draft.includeWeekends===true} onChange={e=>change({includeWeekends:e.target.checked})}/>주말 포함</label></>}
 <label>수업 적용<select aria-label="학사일정 유형" value={draft.type} onChange={e=>change({type:e.target.value as EventType,periods:[]})}>{Object.entries(types).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 {draft.type==='swap'&&<label>적용할 요일 시간표<select aria-label="학사일정 대체 요일" value={draft.sourceDay} onChange={e=>change({sourceDay:e.target.value as Day})}>{DAYS.map(day=><option key={day} value={day}>{day}</option>)}</select></label>}
 {draft.type==='blocked'&&<fieldset><legend>수업 불가 교시 · 선택 없으면 전 교시</legend>{PERIODS.map(period=><label className="inline-check" key={period}><input type="checkbox" checked={draft.periods.includes(period)} onChange={e=>change({periods:e.target.checked?[...draft.periods,period]:draft.periods.filter(p=>p!==period)})}/>{period}교시</label>)}</fieldset>}
 <fieldset><legend>적용 학급 · 선택 없으면 전체</legend>{data.classes.filter(c=>!c.archived).map(c=><label className="inline-check" key={c.id}><input type="checkbox" checked={draft.classIds.includes(c.id)} onChange={e=>change({classIds:e.target.checked?[...draft.classIds,c.id]:draft.classIds.filter(id=>id!==c.id)})}/>{c.name}</label>)}</fieldset>
 <label>달력 배경색<input type="color" aria-label="학사일정 배경색" value={schoolEventColor(data,draft)} onChange={e=>change({color:e.target.value})}/></label>
 {draft.type!=='note'&&<p className="hint">휴업·수업 불가·요일 변경은 시간표와 진도 배정에 함께 반영됩니다.</p>}
 <div className="desk-actions"><button type="submit" className="primary-button">학사일정 저장</button><button type="button" className="ghost-button" onClick={onClose}>취소</button></div>
 </form>
}
