import type { AppData, WorkspacePreferences, TodayLessonFields, CalendarPreferences } from './types'
export type WidgetOptions = {homeCalendar:CalendarPreferences;todayLessonFields:TodayLessonFields;homeTimetableMode:'timetable'|'both';homeTimetableSubject:boolean|null;homeTimetableRoom:boolean}
export function widgetOptions(preferences:WorkspacePreferences):WidgetOptions {
 return {
  homeCalendar:{...preferences.homeCalendar},
  todayLessonFields:{period:true,className:true,subject:true,content:true,memo:true,...preferences.todayLessonFields},
  homeTimetableMode:preferences.homeTimetableMode||'timetable',
  homeTimetableSubject:preferences.homeTimetableSubject??null,
  homeTimetableRoom:preferences.homeTimetableRoom===true,
 }
}
export function widgetData(data:AppData,options?:Partial<WidgetOptions>):AppData {
 const base=widgetOptions(data.workspacePreferences)
 return {...data,workspacePreferences:{...data.workspacePreferences,...base,...options,homeTimetableSubject:options?.homeTimetableSubject===null?undefined:options?.homeTimetableSubject??data.workspacePreferences.homeTimetableSubject,homeCalendar:{...base.homeCalendar,...options?.homeCalendar},todayLessonFields:{...base.todayLessonFields,...options?.todayLessonFields}}}
}
