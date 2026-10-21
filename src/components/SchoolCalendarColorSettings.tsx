import type {AppData,EventType,CalendarDetailPaint,SchoolEvent,CalendarDecoration} from '../types'
import {schoolEventTypeNames,schoolEventStyle,calendarDecorationFromStyle} from '../calendarAppearance'
import CalendarColorTable from './CalendarColorTable'
import type {CalendarColorRow} from './CalendarColorTable'
type Props={data:AppData;update:(change:Partial<AppData>)=>void}
export function schoolCalendarRows({data,update}:Props):CalendarColorRow[]{
 const resetType=(type:EventType)=>{const backgrounds={...data.settings.schoolEventColors},texts={...data.settings.schoolEventTextColors},designs={...data.settings.schoolEventDesigns};delete backgrounds[type];delete texts[type];delete designs[type];update({settings:{...data.settings,schoolEventColors:backgrounds,schoolEventTextColors:texts,schoolEventDesigns:designs}})}
 const changeType=(type:EventType,paint:CalendarDetailPaint)=>update({settings:{...data.settings,schoolEventColors:{...data.settings.schoolEventColors,...(paint.background?{[type]:paint.background}:{})},schoolEventTextColors:{...data.settings.schoolEventTextColors,...(paint.color?{[type]:paint.color}:{})}}})
 const typeRows=(Object.keys(schoolEventTypeNames) as EventType[]).map(type=>{
  const style=schoolEventStyle(data,{type} as SchoolEvent),background=style.backgroundColor==='transparent'?(data.settings.appearance.cardBackground||'#242b36'):String(style.backgroundColor),color=String(style.color)
  return {key:type,group:'학사일정 종류별',label:schoolEventTypeNames[type],background,color,preview:style,enabled:Boolean(data.settings.schoolEventColors[type]||data.settings.schoolEventTextColors?.[type]||Object.keys(data.settings.schoolEventDesigns?.[type]||{}).length),onEnabled:(checked:boolean)=>checked?changeType(type,{background,color}):resetType(type),onChange:(paint:CalendarDetailPaint)=>changeType(type,paint),decoration:calendarDecorationFromStyle(style,data.settings.schoolEventDesigns?.[type]),onDecoration:(value:CalendarDecoration)=>update({settings:{...data.settings,schoolEventDesigns:{...data.settings.schoolEventDesigns,[type]:{...data.settings.schoolEventDesigns?.[type],...value}}}}),automatic:!data.settings.schoolEventTextColors?.[type],onAutomatic:()=>{const texts={...data.settings.schoolEventTextColors};delete texts[type];update({settings:{...data.settings,schoolEventTextColors:texts}})},onReset:()=>resetType(type)}
 })
 const eventRows=data.events.map(event=>{
  const style=schoolEventStyle(data,event),background=style.backgroundColor==='transparent'?(data.settings.appearance.cardBackground||'#242b36'):String(style.backgroundColor),color=String(style.color)
  const change=(paint:CalendarDetailPaint)=>update({events:data.events.map(e=>e.id===event.id?{...e,...(paint.background?{color:paint.background}:{}),...(paint.color?{textColor:paint.color}:{})}:e)})
  const reset=()=>update({events:data.events.map(e=>e.id===event.id?{...e,color:undefined,textColor:undefined,design:undefined}:e)})
  return {key:event.id,group:'일정별 · 종류별 설정보다 우선',label:`${event.date} · ${event.title}`,background,color,preview:style,enabled:Boolean(event.color||event.textColor||Object.keys(event.design||{}).length),onEnabled:(checked:boolean)=>checked?change({background,color}):reset(),onChange:change,decoration:calendarDecorationFromStyle(style,{...data.settings.schoolEventDesigns?.[event.type],...event.design}),onDecoration:(value:CalendarDecoration)=>update({events:data.events.map(e=>e.id===event.id?{...e,design:{...e.design,...value}}:e)}),automatic:!event.textColor,onAutomatic:()=>update({events:data.events.map(e=>e.id===event.id?{...e,textColor:undefined}:e)}),onReset:reset}
 })
 return [...typeRows,...eventRows]
}
export default function SchoolCalendarColorSettings(props:Props){return <CalendarColorTable rows={schoolCalendarRows(props)}/>}
