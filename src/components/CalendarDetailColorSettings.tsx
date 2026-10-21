import CalendarColorTable from './CalendarColorTable'
import type {AppData,CalendarDetailColors,CalendarDetailPaint} from '../types'
import {normalizeCalendarDetailColors,categoryColor} from '../calendarDetailColors'
import {autoTextColor} from '../colors'
type Props={data:AppData;update:(change:Partial<AppData>)=>void}
type Group='subjects'|'classes'|'workCategories'|'workKinds'
type Row={key:string;label:string;background:string}
export default function CalendarDetailColorSettings({data,update}:Props){
 const prefs=normalizeCalendarDetailColors(data.settings.calendarDetailColors)
 const categories=[...new Set([...data.teacherDesk.tasks.map(t=>(t.category||'').trim()),...(data.teacherDesk.workRecords||[]).map(r=>(r.category||'').trim()),...Object.keys(prefs.workCategories)])].sort((a,b)=>a.localeCompare(b,'ko'))
 const groups:{group:Group;title:string;rows:Row[]}[]=[
 {group:'subjects',title:'과목별',rows:data.subjects.map(s=>({key:s.id,label:s.name,background:s.color||categoryColor(s.id)}))},
 {group:'classes',title:'학급별',rows:data.classes.map(c=>({key:c.id,label:`${data.subjects.find(s=>s.id===c.subjectId)?.name||''} · ${c.name}${c.archived?' · 보관':''}`,background:categoryColor(c.id)}))},
 {group:'workKinds',title:'일정·결과별',rows:[{key:'task',label:'일정등록 · 할 일',background:data.settings.calendarColors.work},{key:'record',label:'결과등록 · 업무 결과',background:'#e4edda'}]},
 {group:'workCategories',title:'업무 분류별',rows:categories.map(category=>({key:category,label:category||'미분류',background:categoryColor(category)}))}]
 const enabled=(group:Group,key:string)=>{
  if((group==='subjects'||group==='classes')&&prefs.teachingMode==='individual'||(group==='workKinds'||group==='workCategories')&&prefs.workMode==='individual')return prefs[group][key]?.enabled===true
  return group==='subjects'?prefs.teachingMode==='subject':group==='classes'?prefs.teachingMode==='class':group==='workKinds'?prefs.workMode==='kind':prefs.workMode==='category'
 }
 const individual=():CalendarDetailColors=>{const next={...prefs,teachingMode:'individual' as const,workMode:'individual' as const};for(const g of groups)next[g.group]=Object.fromEntries([...Object.entries(prefs[g.group]),...g.rows.map(row=>[row.key,{background:row.background,...prefs[g.group][row.key],enabled:enabled(g.group,row.key)}])]);return next}
 const change=(group:Group,key:string,value:CalendarDetailPaint)=>{const next=individual();next[group]={...next[group],[key]:{...next[group][key],...value}};update({settings:{...data.settings,calendarDetailColors:next}})}
 return <>{[{title:'교과수업 세부 색상',keys:['subjects','classes'],hint:'학급 색 → 과목 색 → 교과 공통 색 순서로 적용합니다.'},{title:'업무 세부 색상',keys:['workKinds','workCategories'],hint:'업무 분류 색 → 일정·결과 색 → 업무 공통 색 순서로 적용합니다.'}].map(section=><details className="feature-details" key={section.title}><summary>{section.title}</summary><p className="hint">원하는 항목만 개별 색 적용을 켜세요. 색을 고르면 자동 적용됩니다. {section.hint}</p>{groups.filter(g=>section.keys.includes(g.group)).map(g=><section className="calendar-detail-color-group" key={g.group}><h3>{g.title}</h3><CalendarColorTable rows={g.rows.map(row=>{const paint=prefs[g.group][row.key]||{},background=paint.background||row.background;return {key:row.key,label:row.label,background,color:paint.color||autoTextColor(background),enabled:enabled(g.group,row.key),onEnabled:(checked:boolean)=>change(g.group,row.key,{enabled:checked}),onChange:(value:CalendarDetailPaint)=>change(g.group,row.key,value),onReset:()=>change(g.group,row.key,{background:undefined,color:undefined,enabled:false})}})}/></section>)}</details>)}</>
}
