import CalendarColorTable from './CalendarColorTable'
import type {CalendarColorRow} from './CalendarColorTable'
import type {AppData,CalendarDetailColors,CalendarDetailPaint} from '../types'
import {normalizeCalendarDetailColors,categoryColor,teachingCalendarStyle,workCalendarStyle} from '../calendarDetailColors'
import {calendarDecorationFromStyle} from '../calendarAppearance'
type Props={data:AppData;update:(change:Partial<AppData>)=>void;section?:'teaching'|'work'}
type Group='subjects'|'classes'|'workCategories'|'workKinds'
export function calendarDetailRows({data,update,section}:Props):CalendarColorRow[]{
 const prefs=normalizeCalendarDetailColors(data.settings.calendarDetailColors)
 const categories=[...new Set([...data.teacherDesk.tasks.map(t=>(t.category||'').trim()),...(data.teacherDesk.workRecords||[]).map(r=>(r.category||'').trim()),...Object.keys(prefs.workCategories)])].sort((a,b)=>a.localeCompare(b,'ko'))
 const groups:{group:Group;title:string;section:string;rows:{key:string;label:string;background:string}[]}[]=[
  {group:'subjects',title:'과목별',section:'teaching',rows:data.subjects.map(s=>({key:s.id,label:s.name,background:s.color||categoryColor(s.id)}))},
  {group:'classes',title:'학급별 · 과목별 설정보다 우선',section:'teaching',rows:data.classes.map(c=>({key:c.id,label:`${data.subjects.find(s=>s.id===c.subjectId)?.name||''} · ${c.name}${c.archived?' · 보관':''}`,background:categoryColor(c.id)}))},
  {group:'workKinds',title:'일정·결과별',section:'work',rows:[{key:'task',label:'일정등록 · 할 일',background:data.settings.calendarColors.work},{key:'record',label:'결과등록 · 업무 결과',background:'#e4edda'}]},
  {group:'workCategories',title:'업무 분류별 · 일정·결과별 설정보다 우선',section:'work',rows:categories.map(category=>({key:category,label:category||'미분류',background:categoryColor(category)}))}
 ]
 const enabled=(group:Group,key:string)=>{
  if((group==='subjects'||group==='classes')&&prefs.teachingMode==='individual'||(group==='workKinds'||group==='workCategories')&&prefs.workMode==='individual')return prefs[group][key]?.enabled===true
  return group==='subjects'?prefs.teachingMode==='subject':group==='classes'?prefs.teachingMode==='class':group==='workKinds'?prefs.workMode==='kind':prefs.workMode==='category'
 }
 const individual=():CalendarDetailColors=>{const next={...prefs,teachingMode:'individual' as const,workMode:'individual' as const};for(const g of groups)next[g.group]=Object.fromEntries([...Object.entries(prefs[g.group]),...g.rows.map(row=>[row.key,{background:row.background,...prefs[g.group][row.key],enabled:enabled(g.group,row.key)}])]);return next}
 const change=(group:Group,key:string,value:CalendarDetailPaint)=>{const next=individual();next[group]={...next[group],[key]:{...next[group][key],...value}};update({settings:{...data.settings,calendarDetailColors:next}})}
 return groups.filter(g=>!section||g.section===section).flatMap(g=>g.rows.map(row=>{
  const paint=prefs[g.group][row.key]||{},active=enabled(g.group,row.key)
  // Render this row in isolation: a higher-priority row must not mask its preview.
  const isolated=individual()
  if(g.group==='subjects')isolated.classes={}
  if(g.group==='workKinds')isolated.workCategories={}
  const context={...data,settings:{...data.settings,calendarDetailColors:isolated}}
  const style=g.group==='subjects'?teachingCalendarStyle(context,{subjectId:row.key,classId:''}):g.group==='classes'?teachingCalendarStyle(context,{classId:row.key,subjectId:data.classes.find(c=>c.id===row.key)?.subjectId||''}):workCalendarStyle(context,g.group==='workKinds'?{workKind:row.key as 'task'|'record',done:false}:{category:row.key,done:false})
  const background=style.backgroundColor==='transparent'?(data.settings.appearance.cardBackground||'#242b36'):String(style.backgroundColor)
  const apply=(value:CalendarDetailPaint)=>change(g.group,row.key,{...(!active?{background,color:value.background?undefined:String(style.color)}:{}),...value,enabled:true})
  return {key:row.key,group:g.title,label:row.label,background,color:String(style.color),preview:style,enabled:active,onEnabled:(checked:boolean)=>change(g.group,row.key,{enabled:checked}),onChange:apply,decoration:calendarDecorationFromStyle(style,active?paint:undefined),onDecoration:apply,automatic:!active||!paint.color,onAutomatic:()=>change(g.group,row.key,{color:undefined}),onReset:()=>{const next=individual();next[g.group]={...next[g.group],[row.key]:{enabled:false}};update({settings:{...data.settings,calendarDetailColors:next}})}}
 }))
}
export default function CalendarDetailColorSettings(props:Props){return <CalendarColorTable rows={calendarDetailRows(props)}/>}
