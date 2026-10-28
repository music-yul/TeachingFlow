import type {AppData,CalendarPreferences,CalendarSource} from '../types'
import {availableCalendarSources,calendarSources,calendarSourceLabels} from '../calendarSources'
import './CalendarSourcePicker.css'
export default function CalendarSourcePicker({data,preferences,onChange}:{data:AppData;preferences:CalendarPreferences;onChange:(sources:CalendarSource[])=>void}){
 const available=availableCalendarSources(data),selected=calendarSources(preferences)
 return <fieldset className="calendar-source-picker"><legend>표시할 일정</legend><div className="calendar-source-actions"><button type="button" className="link-button" onClick={()=>onChange([...available])}>전체 선택</button><button type="button" className="link-button" onClick={()=>onChange([])}>전체 해제</button></div><div className="calendar-source-choices">{available.map(source=><label className="inline-check" key={source}><input type="checkbox" checked={selected.includes(source)} onChange={e=>onChange(e.target.checked?[...selected.filter(value=>value!==source),source]:selected.filter(value=>value!==source))}/>{calendarSourceLabels[source]}</label>)}</div></fieldset>
}
