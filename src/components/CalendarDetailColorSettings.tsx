import type {AppData,CalendarDetailColors,CalendarDetailPaint} from '../types'
import {normalizeCalendarDetailColors,teachingPaint,workPaint} from '../calendarDetailColors'
import {autoTextColor} from '../colors'
type Props={data:AppData;update:(change:Partial<AppData>)=>void}
type Group='subjects'|'classes'|'workCategories'|'workKinds'
export default function CalendarDetailColorSettings({data,update}:Props){
 const prefs=normalizeCalendarDetailColors(data.settings.calendarDetailColors)
 const change=(values:Partial<CalendarDetailColors>)=>update({settings:{...data.settings,calendarDetailColors:{...prefs,...values}}})
 const changePaint=(group:Group,key:string,paint:CalendarDetailPaint)=>change({[group]:{...prefs[group],[key]:{...prefs[group][key],...paint}}})
 const reset=(group:Group,key:string)=>{const next={...prefs[group]};delete next[key];change({[group]:next})}
 const previewData={...data,settings:{...data.settings,calendarDetailColors:prefs}}
 const rows=(group:Group,entries:{key:string;label:string;paint:CalendarDetailPaint}[])=><div className="calendar-detail-colors-table"><table><thead><tr><th>항목</th><th>배경색</th><th>글자색</th><th>초기화</th></tr></thead><tbody>{entries.map(entry=>{const background=entry.paint.background||'#ffffff',color=entry.paint.color||autoTextColor(background);return <tr key={entry.key}><th><span className="calendar-detail-sample" style={{background,color}}>{entry.label}</span></th><td><input type="color" aria-label={`${entry.label} 배경색`} value={background} onChange={e=>changePaint(group,entry.key,{background:e.target.value})}/></td><td><input type="color" aria-label={`${entry.label} 글자색`} value={color} onChange={e=>changePaint(group,entry.key,{color:e.target.value})}/></td><td><button className="link-button" onClick={()=>reset(group,entry.key)}>기본색</button></td></tr>})}</tbody></table>{!entries.length&&<p className="hint">등록한 항목이 없습니다.</p>}</div>
 const categories=[...new Set([...data.teacherDesk.tasks.map(t=>(t.category||'').trim()),...(data.teacherDesk.workRecords||[]).map(r=>(r.category||'').trim()),...Object.keys(prefs.workCategories)])].sort((a,b)=>a.localeCompare(b,'ko'))
 return <details className="feature-details"><summary>교과·업무 세부 색상</summary>
 <label className="calendar-color-mode">교과수업 색상 기준<select value={prefs.teachingMode} onChange={e=>change({teachingMode:e.target.value as CalendarDetailColors['teachingMode']})}><option value="default">기본 · 교과 공통 색상</option><option value="subject">과목별</option><option value="class">학급별</option></select></label>
 {prefs.teachingMode==='subject'&&rows('subjects',data.subjects.map(subject=>({key:subject.id,label:subject.name,paint:teachingPaint(previewData,{subjectId:subject.id,classId:''})!})))}
 {prefs.teachingMode==='class'&&rows('classes',data.classes.filter(c=>!c.archived).map(c=>({key:c.id,label:`${data.subjects.find(s=>s.id===c.subjectId)?.name||''} · ${c.name}`,paint:teachingPaint(previewData,{subjectId:c.subjectId,classId:c.id})!})))}
 <label className="calendar-color-mode">업무 색상 기준<select value={prefs.workMode} onChange={e=>change({workMode:e.target.value as CalendarDetailColors['workMode']})}><option value="default">기본 · 업무 공통 색상</option><option value="category">업무 분류별</option><option value="kind">일정등록 / 결과등록별</option></select></label>
 {prefs.workMode==='category'&&rows('workCategories',categories.map(category=>({key:category,label:category||'미분류',paint:workPaint(previewData,{category})!})))}
 {prefs.workMode==='kind'&&rows('workKinds',(['task','record'] as const).map(kind=>({key:kind,label:kind==='task'?'일정등록 · 할 일':'결과등록 · 업무 결과',paint:workPaint(previewData,{workKind:kind})!})))}
 <p className="hint">메인·교과·업무 캘린더에 적용합니다. 기준을 바꿔도 항목별 색 설정은 보관합니다. 완료 업무도 종류 색을 유지하며 ‘완료’로 구별합니다. 기존 학사일정 세부 색상은 아래에서 조절합니다.</p>
 </details>
}
