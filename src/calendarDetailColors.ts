import type {AppData,CalendarDetailColors,CalendarDetailPaint,Session} from './types'
import type {DeskCalendarItem} from './workspace'
import {calendarItemStyle} from './calendarAppearance'
import {autoTextColor} from './colors'
const valid=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)
function paints(saved:unknown):Record<string,CalendarDetailPaint>{
 if(!saved||typeof saved!=='object'||Array.isArray(saved))return {}
 return Object.fromEntries(Object.entries(saved).filter(([,v])=>v&&typeof v==='object').map(([key,value])=>{const v=value as CalendarDetailPaint;return [key,{...(valid(v.background)?{background:v.background}:{}),...(valid(v.color)?{color:v.color}:{})}]}))
}
export function normalizeCalendarDetailColors(saved?:Partial<CalendarDetailColors>):CalendarDetailColors{
 return {teachingMode:saved?.teachingMode==='subject'||saved?.teachingMode==='class'?saved.teachingMode:'default',workMode:saved?.workMode==='category'||saved?.workMode==='kind'?saved.workMode:'default',subjects:paints(saved?.subjects),classes:paints(saved?.classes),workCategories:paints(saved?.workCategories),workKinds:paints(saved?.workKinds)}
}
const palette=['#dce8f5','#e4edda','#f5e4d4','#eadff3','#d9eeeb','#f4dfe7','#eee9cb']
export function categoryColor(key:string){let n=0;for(const char of key)n=(n*31+char.charCodeAt(0))>>>0;return palette[n%palette.length]}
export function teachingPaint(data:AppData,session:Pick<Session,'subjectId'|'classId'>):CalendarDetailPaint|undefined{
 const prefs=data.settings.calendarDetailColors
 if(!prefs||prefs.teachingMode==='default')return undefined
 const subject=data.subjects.find(s=>s.id===session.subjectId)
 if(prefs.teachingMode==='subject')return {background:subject?.color||categoryColor(session.subjectId),...prefs.subjects?.[session.subjectId]}
 return {background:categoryColor(session.classId),...prefs.classes?.[session.classId]}
}
export function workPaint(data:AppData,item:Pick<DeskCalendarItem,'category'|'workKind'>):CalendarDetailPaint|undefined{
 const prefs=data.settings.calendarDetailColors
 if(!prefs||prefs.workMode==='default')return undefined
 if(prefs.workMode==='kind'){const kind=item.workKind||'task';return {background:kind==='task'?data.settings.calendarColors.work:'#e4edda',...prefs.workKinds?.[kind]}}
 const category=(item.category||'').trim()
 return {background:categoryColor(category),...prefs.workCategories?.[category]}
}
export function teachingCalendarStyle(data:AppData,session:Pick<Session,'subjectId'|'classId'>,important=false){
 const paint=teachingPaint(data,session)
 const base=calendarItemStyle(data,'teaching',important,paint?.background)
 return paint?{...base,color:paint.color||autoTextColor(String(base.backgroundColor))}:base
}
export function workCalendarStyle(data:AppData,item:Pick<DeskCalendarItem,'category'|'workKind'|'important'|'done'>){
 const paint=workPaint(data,item)
 const base=calendarItemStyle(data,'work',item.important,paint?.background)
 return paint?{...base,color:paint.color||autoTextColor(String(base.backgroundColor)),...(item.done?{opacity:.75,fontWeight:400}:{})}:base
}
