import type {AppData,CalendarPreferences,CalendarSource} from './types'
export const calendarSourceLabels:Record<CalendarSource,string>={teaching:'교과',homeroom:'담임',work:'업무',club:'동아리',school:'학사일정',memo:'메모'}
export const allCalendarSources=Object.keys(calendarSourceLabels) as CalendarSource[]
/** Preserve old single-filter behaviour until a user explicitly chooses sources. [] means show none. */
export function calendarSources(preferences:CalendarPreferences):CalendarSource[]{
 if(Array.isArray(preferences.sources))return [...new Set(preferences.sources.filter(source=>allCalendarSources.includes(source)))]
 if(preferences.filter==='all')return [...allCalendarSources]
 return preferences.filter==='teaching'?['teaching','school','memo']:[preferences.filter,'memo']
}
export function availableCalendarSources(data:AppData){return allCalendarSources.filter(source=>source==='school'||source==='memo'||data.settings.features[source==='teaching'?'teaching':source==='homeroom'?'homeroom':source==='work'?'work':'clubs'])}
