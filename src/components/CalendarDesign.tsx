import { useState } from 'react'
import CalendarColorTable from './CalendarColorTable'
import type {CalendarColorRow} from './CalendarColorTable'
import {schoolCalendarRows} from './SchoolCalendarColorSettings'
import {calendarDetailRows} from './CalendarDetailColorSettings'
import { themes } from '../theme'
import type { AppData, CalendarArea, CalendarDecoration } from '../types'
import { calendarAreaNames, calendarItemStyle, defaultCalendarColors, calendarDecorationFromStyle } from '../calendarAppearance'
type Props={data:AppData;update:(change:Partial<AppData>)=>void}
export function commonCalendarRow({data,update}:Props,area:CalendarArea):CalendarColorRow {
 const style=calendarItemStyle(data,area)
 const background=style.backgroundColor==='transparent'?(data.settings.appearance.cardBackground||(themes.find(t=>t.id===data.settings.appearance.themeId)||themes[0]).vars['--card']):String(style.backgroundColor)
 const text=data.settings.calendarTextColors?.[area]
 const decoration:CalendarDecoration={font:data.settings.calendarFonts?.[area],marker:data.settings.calendarMarkers?.[area],border:data.settings.calendarBorders?.[area]}
 return {
  key:area,group:'기본 설정',label:calendarAreaNames[area],background,color:String(style.color),preview:style,
  enabled:data.settings.calendarColorCustom.includes(area)||!!text||!!decoration.font||!!decoration.marker||!!decoration.border,onEnabled:()=>{},
  onChange:paint=>update({settings:{...data.settings,
   ...(paint.background?{calendarColors:{...data.settings.calendarColors,[area]:paint.background},calendarColorCustom:[...new Set([...data.settings.calendarColorCustom,area])]}:{}),
   ...(paint.color?{calendarTextColors:{...data.settings.calendarTextColors,[area]:paint.color}}:{})
  }}),
  decoration:calendarDecorationFromStyle(style,decoration),
  onDecoration:value=>update({settings:{...data.settings,
   ...(value.font?{calendarFonts:{...data.settings.calendarFonts,[area]:value.font}}:{}),
   ...(value.marker?{calendarMarkers:{...data.settings.calendarMarkers,[area]:value.marker}}:{}),
   ...(value.border?{calendarBorders:{...data.settings.calendarBorders,[area]:value.border}}:{})
  }}),
  automatic:!text,
  onAutomatic:()=>{const colors={...data.settings.calendarTextColors};delete colors[area];update({settings:{...data.settings,calendarTextColors:colors}})},
  onReset:()=>{
   const colors={...data.settings.calendarTextColors},fonts={...data.settings.calendarFonts},markers={...data.settings.calendarMarkers},borders={...data.settings.calendarBorders}
   delete colors[area];delete fonts[area];delete markers[area];delete borders[area]
   update({settings:{...data.settings,calendarColors:{...data.settings.calendarColors,[area]:defaultCalendarColors(data.settings.appearance.themeId)[area]},calendarColorCustom:data.settings.calendarColorCustom.filter(key=>key!==area),calendarTextColors:colors,calendarFonts:fonts,calendarMarkers:markers,calendarBorders:borders}})
  }
 }
}
export default function CalendarDesign({data,update}:Props){
 const [section,setSection]=useState('teaching')
 const groups:{id:'teaching'|'work'|'school'|'other';label:string;areas:CalendarArea[]}[]=[{id:'teaching',label:'교과',areas:['teaching','cover']},{id:'work',label:'업무',areas:['work']},{id:'school',label:'학사일정',areas:['school','swap','holiday']},{id:'other',label:'담임·동아리',areas:['homeroom','club']}]
 return <div className="block"><h2>달력 디자인</h2>
 <p className="hint">한 줄에서 배경·글자·선·테두리를 모두 바꿉니다. 왼쪽 미리보기에 바로 반영됩니다. ‘되돌리기’는 그 줄의 설정만 초기화합니다.</p>
 <div className="subtabs" aria-label="달력 디자인 영역">{groups.map(group=><button type="button" aria-pressed={section===group.id} className={section===group.id?'subtab active':'subtab'} key={group.id} onClick={()=>setSection(group.id)}>{group.label}</button>)}</div>
 {groups.map(group=>{
  const rows=group.areas.map(area=>commonCalendarRow({data,update},area))
  if(group.id==='teaching'||group.id==='work')rows.push(...calendarDetailRows({data,update,section:group.id}))
  if(group.id==='school')rows.push(...schoolCalendarRows({data,update}))
  return <section key={group.id} hidden={section!==group.id}>
   <CalendarColorTable rows={rows}/>
   {group.id==='teaching'&&<label className="inline-check design-extra"><input type="checkbox" checked={data.settings.calendarLessonLabelBold!==false} onChange={e=>update({settings:{...data.settings,calendarLessonLabelBold:e.target.checked}})}/>수업의 교시·학급을 약간 굵게 표시</label>}
   {group.id==='work'&&<div className="inline-form design-extra"><b style={{color:data.settings.calendarDeadlineColor||'#b42318'}}>마감일</b><span>표시 색</span><input type="color" aria-label="업무 마감일 글자색" value={data.settings.calendarDeadlineColor||'#b42318'} onChange={e=>update({settings:{...data.settings,calendarDeadlineColor:e.target.value}})}/><button type="button" className="link-button" onClick={()=>update({settings:{...data.settings,calendarDeadlineColor:undefined}})}>기본 빨강</button></div>}
  </section>
 })}
 <div className="inline-form design-extra"><label>오늘 날짜 배경 <input type="color" aria-label="오늘 날짜 배경색" value={data.settings.calendarTodayColor||(themes.find(theme=>theme.id===data.settings.appearance.themeId)||themes[0]).vars['--today']} onChange={e=>update({settings:{...data.settings,calendarTodayColor:e.target.value}})}/></label><button type="button" className="link-button" disabled={!data.settings.calendarTodayColor} onClick={()=>update({settings:{...data.settings,calendarTodayColor:undefined}})}>테마 기본색</button></div>
 </div>
}
