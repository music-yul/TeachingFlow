import { useLayoutEffect, useRef } from 'react'
import type { AppData, Session } from '../types'
import { timetableDisplay } from '../timetableDisplay'
import MiniTimetable from './MiniTimetable'

export default function TimetableWidget({data,sessions,height=2}:{data:AppData;sessions:Session[];height?:number}){
 const frame=useRef<HTMLElement>(null),content=useRef<HTMLDivElement>(null)
 const display=timetableDisplay(height)
 const mode=data.workspacePreferences.homeTimetableMode||'timetable'
 useLayoutEffect(()=>{
  const box=frame.current,inner=content.current
  if(!box||!inner)return
  let request=0
  const fit=()=>{
   const availableWidth=box.clientWidth-8,availableHeight=box.clientHeight-8
   if(availableWidth<=0||availableHeight<=0)return
   inner.style.width=`${availableWidth}px`
   inner.style.height=`${availableHeight}px`
   const table=inner.querySelector('table')
   if(!table)return
   const extra=Array.from(inner.querySelectorAll<HTMLElement>('.mini-title,.mini-today')).reduce((sum,e)=>{const style=getComputedStyle(e);return style.display==='none'?sum:sum+e.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0)},0)
   table.style.height=`${Math.max(1,availableHeight-extra)}px`
   const body=table.tBodies[0]
   if(body)body.style.gridTemplateRows=`repeat(${body.rows.length},minmax(0,1fr))`
  }
  const schedule=()=>{cancelAnimationFrame(request);request=requestAnimationFrame(fit)}
  fit();schedule();const observer=new ResizeObserver(schedule);observer.observe(box)
  document.fonts?.addEventListener('loadingdone',schedule)
  return()=>{cancelAnimationFrame(request);observer.disconnect();document.fonts?.removeEventListener('loadingdone',schedule)}
 },[data,sessions,display.fontPt,display.classOnly,mode])
 return <section className={`desk-card timetable-widget-card timetable-fit-frame timetable-fixed-frame timetable-mode-${mode}`} ref={frame} style={{fontSize:`${display.fontPt}pt`}}><div className="timetable-fit-content" ref={content}><MiniTimetable data={data} sessions={sessions} showToday={mode!=='timetable'} showTimetable classOnly={display.classOnly} showSubject={data.workspacePreferences.homeTimetableSubject} showRoom={data.workspacePreferences.homeTimetableRoom}/></div></section>
}
