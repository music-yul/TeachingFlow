import { useState } from 'react'
import CalendarColorTable from './CalendarColorTable'
import SchoolCalendarColorSettings from './SchoolCalendarColorSettings'
import CalendarDetailColorSettings from './CalendarDetailColorSettings'
import { themes } from '../theme'
import type { AppData, CalendarArea } from '../types'
import { calendarAreaNames, calendarItemStyle, defaultCalendarColors, darkerCalendarColor } from '../calendarAppearance'
export default function CalendarDesign({data,update}:{data:AppData;update:(change:Partial<AppData>)=>void}){
 const [section,setSection]=useState('teaching')
 const areas=Object.keys(calendarAreaNames) as CalendarArea[]
 const reset=<button className="ghost-button calendar-reset" onClick={()=>update({settings:{...data.settings,calendarColors:defaultCalendarColors(data.settings.appearance.themeId),calendarColorCustom:[],calendarTodayColor:undefined,calendarDeadlineColor:undefined,calendarDetailColors:undefined,calendarTextColors:{},calendarLessonLabelBold:true,schoolEventTextColors:{},calendarFonts:{},calendarMarkers:{},calendarBorders:{},schoolEventColors:{}},events:data.events.map(event=>({...event,color:undefined,textColor:undefined}))})}>달력 색상 전체 초기화</button>
 const commonRow=(area:CalendarArea)=>{
  const style=calendarItemStyle(data,area)
  const background=style.backgroundColor==='transparent'?(data.settings.appearance.cardBackground||(themes.find(t=>t.id===data.settings.appearance.themeId)||themes[0]).vars['--card']):String(style.backgroundColor)
  const text=data.settings.calendarTextColors?.[area]
  return {
   key:area,label:calendarAreaNames[area],background,color:String(style.color),
   enabled:data.settings.calendarColorCustom.includes(area)||!!text,onEnabled:()=>{},
   onChange:(paint:import('../types').CalendarDetailPaint)=>update({settings:{...data.settings,
    ...(paint.background?{calendarColors:{...data.settings.calendarColors,[area]:paint.background},calendarColorCustom:[...new Set([...data.settings.calendarColorCustom,area])]}:{}),
    ...(paint.color?{calendarTextColors:{...data.settings.calendarTextColors,[area]:paint.color}}:{})
   }}),
   automatic:!text,
   onAutomatic:()=>{const colors={...data.settings.calendarTextColors};delete colors[area];update({settings:{...data.settings,calendarTextColors:colors}})},
   onReset:()=>{const colors={...data.settings.calendarTextColors};delete colors[area];update({settings:{...data.settings,calendarColors:{...data.settings.calendarColors,[area]:defaultCalendarColors(data.settings.appearance.themeId)[area]},calendarColorCustom:data.settings.calendarColorCustom.filter(key=>key!==area),calendarTextColors:colors}})}
  }
 }
 return <div className="block"><div className="desk-heading"><h2>달력 색상</h2>{reset}</div>
 <div className="inline-form calendar-today-color"><label>오늘 날짜 배경색<input type="color" aria-label="오늘 날짜 배경색" value={data.settings.calendarTodayColor||(themes.find(theme=>theme.id===data.settings.appearance.themeId)||themes[0]).vars['--today']} onChange={e=>update({settings:{...data.settings,calendarTodayColor:e.target.value}})}/></label><button className="ghost-button" disabled={!data.settings.calendarTodayColor} onClick={()=>update({settings:{...data.settings,calendarTodayColor:undefined}})}>테마 기본색</button></div>
 <p className="hint">바꾸려는 영역을 고른 뒤 색을 선택하세요. 글자색의 ‘자동’은 배경에 맞춰 선택하며, ‘기본색으로’는 해당 항목의 직접 지정을 해제합니다.</p>
 <div className="subtabs" role="tablist" aria-label="달력 색상 영역">{[{id:'teaching',label:'교과'},{id:'work',label:'업무'},{id:'school',label:'학사일정'},{id:'other',label:'담임·동아리·기타'}].map(item=><button type="button" role="tab" aria-selected={section===item.id} className={section===item.id?'subtab active':'subtab'} key={item.id} onClick={()=>setSection(item.id)}>{item.label}</button>)}</div>
 {([{id:'teaching',areas:['teaching','cover']},{id:'work',areas:['work']},{id:'school',areas:['school','swap','holiday']},{id:'other',areas:['homeroom','club']}] as {id:string;areas:CalendarArea[]}[]).map(group=><section key={group.id} hidden={section!==group.id}>
 <h3>기본 색상</h3>
 <CalendarColorTable rows={group.areas.map(commonRow)}/>
 {group.id==='teaching'&&<><label className="inline-form"><input type="checkbox" checked={data.settings.calendarLessonLabelBold!==false} onChange={e=>update({settings:{...data.settings,calendarLessonLabelBold:e.target.checked}})}/>수업의 교시·학급을 약간 굵게 표시</label><CalendarDetailColorSettings data={data} update={update} section="teaching"/></>}
 {group.id==='work'&&<><div className="deadline-color-settings"><h3>마감일 표시</h3><p className="hint">마감일의 ‘마감일’ 글자에 적용합니다. 업무 내용은 위에서 지정한 색을 유지합니다.</p><div className="inline-form"><span className="calendar-deadline-label" style={{color:data.settings.calendarDeadlineColor||'#b42318',background:'transparent'}}>마감일</span><input type="color" aria-label="업무 마감일 글자색" value={data.settings.calendarDeadlineColor||'#b42318'} onChange={e=>update({settings:{...data.settings,calendarDeadlineColor:e.target.value}})}/><button type="button" className="link-button" onClick={()=>update({settings:{...data.settings,calendarDeadlineColor:undefined}})}>기본 빨강으로</button></div></div><CalendarDetailColorSettings data={data} update={update} section="work"/></>}
 {group.id==='school'&&<SchoolCalendarColorSettings data={data} update={update}/>}
 </section>)}
 <details className="feature-details"><summary>고급 설정 · 글씨 스타일·선·테두리</summary>
 <p className="hint">색상은 위 표에서, 선과 테두리는 아래에서 조절하세요. 각 일정의 개별 색상이 있어도 이 스타일은 함께 적용됩니다.</p>
 <div className="calendar-design-table-wrap"><table className="calendar-design-table"><thead>
 <tr><th rowSpan={2} scope="col">일정 종류 · 미리보기</th><th rowSpan={2} scope="col">글씨 스타일</th><th colSpan={2} scope="colgroup">왼쪽 선</th><th colSpan={3} scope="colgroup">외곽 테두리</th></tr>
 <tr><th scope="col">색</th><th scope="col">모양</th><th scope="col">표시</th><th scope="col">색</th><th scope="col">자동 색</th></tr>
 </thead><tbody>{areas.map(area=>{
 const style=calendarItemStyle(data,area)
 const background=style.backgroundColor==='transparent'?data.settings.calendarColors[area]:String(style.backgroundColor)
 const marker=data.settings.calendarMarkers[area]||{color:String(style.borderLeftColor),style:(['school','holiday'].includes(area)?'none':'solid') as 'none'|'solid'}
 const border=data.settings.calendarBorders[area]||{visible:true}
 const defaultOutline=(['teaching','swap','cover'].includes(area)||data.settings.appearance.themeId==='night')&&!data.settings.calendarColorCustom.includes(area)?data.settings.calendarColors[area]:darkerCalendarColor(background)
 const changeMarker=(change:Partial<typeof marker>)=>update({settings:{...data.settings,calendarMarkers:{...data.settings.calendarMarkers,[area]:{...marker,...change}}}})
 const changeBorder=(change:Partial<typeof border>)=>update({settings:{...data.settings,calendarBorders:{...data.settings.calendarBorders,[area]:{...border,...change}}}})

 return <tr className="calendar-design-row" key={area}>
 <th scope="row"><span className="calendar-design-preview" style={style}>{calendarAreaNames[area]}</span></th>
 <td><select aria-label={`${calendarAreaNames[area]} 글꼴 스타일`} value={data.settings.calendarFonts?.[area]||'normal'} onChange={e=>update({settings:{...data.settings,calendarFonts:{...data.settings.calendarFonts,[area]:e.target.value as 'normal'|'bold'|'italic'}}})}><option value="normal">일반</option><option value="bold">볼드</option><option value="italic">이탤릭</option></select></td>
 <td><input type="color" aria-label={`${calendarAreaNames[area]} 왼쪽 선 색`} value={marker.color} onChange={e=>changeMarker({color:e.target.value})}/></td>
 <td><select aria-label={`${calendarAreaNames[area]} 왼쪽 선 모양`} value={marker.style} onChange={e=>changeMarker({style:e.target.value as typeof marker.style})}><option value="solid">실선</option><option value="dashed">파선</option><option value="dotted">점선</option><option value="double">이중선</option><option value="none">없음</option></select></td>
 <td><input type="checkbox" aria-label={`${calendarAreaNames[area]} 외곽 테두리 표시`} checked={border.visible} onChange={e=>changeBorder({visible:e.target.checked})}/></td>
 <td><input type="color" aria-label={`${calendarAreaNames[area]} 외곽 테두리 색`} disabled={!border.visible} value={border.color||defaultOutline} onChange={e=>changeBorder({color:e.target.value})}/></td>
 <td><input type="checkbox" aria-label={`${calendarAreaNames[area]} 테두리 자동 색`} disabled={!border.visible} checked={!border.color} onChange={e=>changeBorder({color:e.target.checked?undefined:defaultOutline})}/></td>
 </tr>
 })}</tbody></table></div>
 </details></div>
}
