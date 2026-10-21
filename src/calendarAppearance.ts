import type { CSSProperties } from 'react'
import type { AppData, CalendarArea, EventType, SchoolEvent } from './types'
import { autoTextColor } from './colors'
export const calendarAreaNames:Record<CalendarArea,string>={teaching:'교과',school:'학사일정',homeroom:'담임',work:'업무',club:'동아리',swap:'요일 대체',cover:'수업 대체·대강',holiday:'공휴일'}
export function blendCalendarColor(base:string,tint:string,amount:number){return '#'+[0,2,4].map(i=>Math.round(parseInt(base.slice(1+i,3+i),16)*(1-amount)+parseInt(tint.slice(1+i,3+i),16)*amount).toString(16).padStart(2,'0')).join('')}
function legacyThemedColors(themeId:string){const colors=defaultCalendarColors();const tints:Record<string,string>={beige:'#9e8470',blue:'#5477ab',green:'#729047',purple:'#866986',night:'#242b36'};const tint=tints[themeId];return tint?Object.fromEntries(Object.entries(colors).map(([key,color])=>[key,blendCalendarColor(color,tint,themeId==='night'?.72:.2)])):colors}
export function defaultCalendarColors(themeId='default'):Record<CalendarArea,string>{const colors=['#e7e8ea','#e2ead7','#d7dfea','#eadfd7','#ead7ea','#ddf3f3','#fff9db'];const lead:Record<string,number>={default:0,beige:3,blue:2,green:1,purple:4,night:0};const color=(n:number)=>colors[(n+(lead[themeId]||0))%colors.length];return {teaching:color(0),school:color(6),homeroom:color(1),work:color(2),club:color(3),swap:color(4),cover:color(5),holiday:'#ffe5e5'}}
export function normalizeCalendarTextColors(saved:AppData['settings']['calendarTextColors']={}){return Object.fromEntries(Object.entries(saved).filter(([key,value])=>Object.hasOwn(calendarAreaNames,key)&&/^#[0-9a-f]{6}$/i.test(value)))}
export function normalizeCalendarFonts(saved:AppData['settings']['calendarFonts']={}){return Object.fromEntries(Object.entries(saved).filter(([key,value])=>Object.hasOwn(calendarAreaNames,key)&&['normal','bold','italic'].includes(value)))}
export function normalizeCalendarCustom(saved:CalendarArea[]|undefined,colors:Partial<Record<CalendarArea,string>>={},themeId='default'):CalendarArea[]{const keys=Object.keys(calendarAreaNames) as CalendarArea[];if(saved)return saved.filter(key=>keys.includes(key));const defaults=defaultCalendarColors(),themed=defaultCalendarColors(themeId),legacy=legacyThemedColors(themeId);return keys.filter(key=>/^#[0-9a-f]{6}$/i.test(colors[key]||'')&&![defaults[key],themed[key],legacy[key]].includes(colors[key]!))}
export function normalizeCalendarColors(saved?:Partial<Record<CalendarArea,string>>,themeId='default',custom?:CalendarArea[]){const colors=defaultCalendarColors(themeId);for(const key of normalizeCalendarCustom(custom,saved,themeId)){if(/^#[0-9a-f]{6}$/i.test(saved?.[key]||''))colors[key]=saved![key]!}return colors}
export function themedCalendarColors(data:AppData,themeId:string){return normalizeCalendarColors(data.settings.calendarColors,themeId,data.settings.calendarColorCustom)}
export function normalizeCalendarMarkers(saved:AppData['settings']['calendarMarkers']={}){return Object.fromEntries(Object.entries(saved).filter(([key,v])=>Object.hasOwn(calendarAreaNames,key) && v && /^#[0-9a-f]{6}$/i.test(v.color)&&['solid','dashed','dotted','double','none'].includes(v.style)))}
export function darkerCalendarColor(hex:string){return '#'+hex.slice(1).match(/../g)!.map(part=>Math.round(parseInt(part,16)*.85).toString(16).padStart(2,'0')).join('')}
export function normalizeCalendarBorders(saved:AppData['settings']['calendarBorders']={}){return Object.fromEntries(Object.entries(saved).filter(([key,v])=>Object.hasOwn(calendarAreaNames,key)&&v&&typeof v.visible==='boolean').map(([key,v])=>[key,{visible:v.visible,...(/^#[0-9a-f]{6}$/i.test(v.color||'')?{color:v.color}:{})}]))}
export const defaultCalendarTextColors:Record<CalendarArea,string>={teaching:'#1f2733',school:'#475569',homeroom:'#365c35',work:'#315a86',club:'#75503b',swap:'#6b4a8c',cover:'#566173',holiday:'#b42318'}
export const defaultSchoolTextColors:Record<EventType,string>={closed:'#b42318',blocked:'#9a6317',swap:'#6b4a8c',note:'#475569'}
export function lessonLabelStyle(data:AppData,important=false):CSSProperties {
 return {fontWeight:important||data.settings.calendarFonts?.teaching==='bold'?700:data.settings.calendarLessonLabelBold!==false?600:400,
 ...(!important&&!data.settings.calendarTextColors?.teaching&&!data.settings.calendarColorCustom.includes('teaching')?{color:data.settings.appearance.themeId==='night'?'#cbd5e1':'#64748b'}:{})}
}
export function calendarItemStyle(data:AppData,area:CalendarArea,important=false,backgroundOverride?:string):CSSProperties{
 const night=data.settings.appearance.themeId==='night'
 const white=['teaching','swap','cover'].includes(area)
 const base=backgroundOverride||data.settings.calendarColors[area]
 const customBackground=!!backgroundOverride||data.settings.calendarColorCustom.includes(area)
 const defaultWhite=white&&!customBackground
 const transparent=night&&!customBackground
 const background=transparent?'transparent':defaultWhite?'#ffffff':important?darkerCalendarColor(base):base
 const marker=data.settings.calendarMarkers?.[area]
 const border=data.settings.calendarBorders?.[area]
 const borderColor=border?.color||(defaultWhite||transparent?base:darkerCalendarColor(background))
 const markerStyle=marker?.style||(['school','holiday'].includes(area)?'none':'solid')
 const font=data.settings.calendarFonts?.[area]||'normal'
 return{backgroundColor:background,color:data.settings.calendarTextColors?.[area]||(transparent?'#ffffff':customBackground||autoTextColor(background)==='#ffffff'?autoTextColor(background):defaultCalendarTextColors[area]),borderTop:border?.visible===false?'none':`1px solid ${borderColor}`,borderRight:border?.visible===false?'none':`1px solid ${borderColor}`,borderBottom:border?.visible===false?'none':`1px solid ${borderColor}`,borderLeftColor:markerStyle==='none'?borderColor:marker?.color||darkerCalendarColor(base),borderLeftStyle:markerStyle==='none'?'solid':markerStyle,borderLeftWidth:markerStyle==='none'?(border?.visible===false?0:1):3,fontWeight:important||font==='bold'?700:area==='holiday'?600:400,fontStyle:font==='italic'?'italic':'normal'}
}

export const schoolEventTypeNames:Record<EventType,string>={closed:'휴업',blocked:'수업 불가',swap:'요일 변경',note:'일반 안내'}
export function schoolEventColor(data:AppData,event:Pick<SchoolEvent,'type'|'color'>){const area=event.type==='swap'?'swap':'school';return event.color||data.settings.schoolEventColors[event.type]||(area==='swap'&&!data.settings.calendarColorCustom.includes(area)?'#ffffff':data.settings.calendarColors[area])}
export function schoolEventStyle(data:AppData,event:SchoolEvent):CSSProperties{
 const area=event.type==='swap'?'swap':'school'
 const style=calendarItemStyle(data,area,false,event.color||data.settings.schoolEventColors[event.type])
 const customText=event.textColor||data.settings.schoolEventTextColors?.[event.type]||data.settings.calendarTextColors?.[area]
 return {...style,color:customText||((event.color||data.settings.schoolEventColors[event.type]||data.settings.calendarColorCustom.includes(area))?style.color:data.settings.appearance.themeId==='night'?'#ffffff':defaultSchoolTextColors[event.type])}
}

/** 마감일 표시는 업무 분류·완료 상태와 관계없이 별도 색을 사용합니다. */
export function deadlineLabelStyle(data:AppData):CSSProperties{return {color:data.settings.calendarDeadlineColor||'#b42318',backgroundColor:'transparent'}}
