import {useEffect,useRef} from 'react'
import type {AppData,TodayLessonFields} from '../types'
import type {DashboardItem} from './FlexibleDashboard'
import {dashboardLabels} from './FlexibleDashboard'
import {widgetData,widgetOptions} from '../widgetPreferences'
import CalendarSourcePicker from './CalendarSourcePicker'
export default function WidgetOptionsDialog({data,item,cols,change,onClose}:{data:AppData;item:DashboardItem;cols:number;change:(patch:Partial<DashboardItem>)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{dialog.current?.showModal()},[])
 const prefs=widgetData(data,item.options).workspacePreferences
 const options=widgetOptions(prefs)
 const setOptions=(patch:Partial<typeof options>)=>change({options:{...options,...patch}})
 return <dialog className="modal fd-options-dialog" ref={dialog} aria-label="위젯 설정" onCancel={onClose}>
 <header className="modal-head"><h2>{dashboardLabels[item.kind]} 설정</h2><button className="ghost-button" onClick={onClose}>닫기</button></header>
 <div className="modal-body"><p className="hint">이 위젯에만 적용되며 변경 즉시 저장됩니다.</p><label>위젯 이름<input aria-label="위젯 이름" placeholder={dashboardLabels[item.kind]} value={item.title||''} onChange={e=>change({title:e.target.value})}/></label>
 <div className="fd-dimensions">{(['x','y','w','h'] as const).map((field,i)=><label key={field}>{['가로 위치','세로 위치','너비','높이'][i]}<input type="number" aria-label={['가로 위치','세로 위치','너비','높이'][i]} min={field==='w'?1:field==='h'?(item.kind==='summary'?1:2):0} max={field==='w'?cols:field==='x'?cols-1:field==='h'?24:10000} value={item[field]} onChange={e=>change({[field]:Number(e.target.value)})}/></label>)}</div>
 {['progress','journal','lessons'].includes(item.kind)&&<label>표시 학급<select aria-label="표시 학급" value={item.classId||''} onChange={e=>change({classId:e.target.value})}><option value="">전체 학급</option>{data.classes.filter(c=>!c.archived).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
 {item.kind==='calendar'&&<><label>달력 형태<select aria-label="위젯 달력 형태" value={options.homeCalendar.homeMode||'weeks'} onChange={e=>setOptions({homeCalendar:{...options.homeCalendar,homeMode:e.target.value as 'month'|'week'|'fortnight'|'weeks'}})}><option value="month">월간</option><option value="week">주간</option><option value="fortnight">2주</option><option value="weeks">연속 4주</option></select></label><CalendarSourcePicker data={data} preferences={options.homeCalendar} onChange={sources=>setOptions({homeCalendar:{...options.homeCalendar,sources}})}/><label className="inline-check"><input type="checkbox" checked={options.homeCalendar.showWeekends!==false} onChange={e=>setOptions({homeCalendar:{...options.homeCalendar,showWeekends:e.target.checked}})}/>주말 포함</label><label className="inline-check"><input type="checkbox" checked={options.homeCalendar.showCompleted} onChange={e=>setOptions({homeCalendar:{...options.homeCalendar,showCompleted:e.target.checked}})}/>완료한 일정 포함</label></>}
 {item.kind==='timetable'&&<><label>시간표 형태<select aria-label="위젯 시간표 형태" value={options.homeTimetableMode} onChange={e=>setOptions({homeTimetableMode:e.target.value as 'timetable'|'both'})}><option value="timetable">주간 시간표</option><option value="both">오늘 수업과 주간 시간표</option></select></label><label>과목명 표시<select aria-label="과목명 표시" value={options.homeTimetableSubject===null?'auto':options.homeTimetableSubject?'show':'hide'} onChange={e=>setOptions({homeTimetableSubject:e.target.value==='auto'?null:e.target.value==='show'})}><option value="auto">크기에 따라 자동</option><option value="show">항상 표시</option><option value="hide">숨기기</option></select></label><label className="inline-check"><input type="checkbox" checked={options.homeTimetableRoom} onChange={e=>setOptions({homeTimetableRoom:e.target.checked})}/>교실 표시</label></>}
 {item.kind==='lessons'&&<fieldset><legend>표시할 수업 정보</legend>{(Object.entries({period:'교시',className:'학급',subject:'과목명',content:'수업 내용',memo:'메모'}) as [keyof TodayLessonFields,string][]).map(([key,label])=><label className="inline-check" key={key}><input type="checkbox" checked={options.todayLessonFields?.[key]!==false} onChange={e=>setOptions({todayLessonFields:{...options.todayLessonFields!,[key]:e.target.checked}})}/>{label}</label>)}</fieldset>}
 </div></dialog>
}
