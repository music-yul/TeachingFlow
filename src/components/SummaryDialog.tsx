import type { AppData } from '../types'
import { getTodayActions, summaryNames } from '../todayActions'
import type { SummaryKind } from '../todayActions'
import { collectionMembers } from '../members'
import { taskDateLabel } from '../taskDates'
type Props={data:AppData;update:(change:Partial<AppData>)=>void;date:string;kind:SummaryKind;onClose:()=>void}
export default function SummaryDialog({data,update,date,kind,onClose}:Props){
 const desk=data.teacherDesk
 const actions=getTodayActions(data,date)
 const patch=(change:Partial<typeof desk>)=>update({teacherDesk:{...desk,...change}})
 return <div className="release-backdrop"><section className="release-dialog" role="dialog" aria-modal="true" aria-labelledby="summary-title" onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=e.currentTarget.querySelectorAll<HTMLElement>('button,input:not([disabled]),select,textarea');const first=nodes[0],last=nodes[nodes.length-1];if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}}}}><div className="desk-heading"><h2 id="summary-title">{date} · {summaryNames[kind]}</h2><button autoFocus className="ghost-button" onClick={onClose}>닫기</button></div>
 {!actions[kind].length&&<p>오늘 확인할 항목이 없습니다.</p>}
 {(kind==='tasks'||kind==='notices')&&actions[kind].map(item=><label className={`desk-summary ${item.important?'important-item':''}`} key={item.id}><input type="checkbox" checked={item.done} onChange={e=>{const field=kind==='tasks'?'tasks':'notices';patch({[field]:desk[field].map(old=>old.id===item.id?{...old,done:e.target.checked}:old)})}}/><span><strong>{item.important?'★ ':''}{item.title}</strong><small>{taskDateLabel(item,kind==='notices')}</small>{item.note&&<span className="desk-pre summary-task-note">{item.note}</span>}</span></label>)}
 {kind==='collections'&&actions.collections.map(item=>{const targets=collectionMembers(desk,item,date);return <section className="desk-item" key={item.id}><strong>{item.important?'★ ':''}{item.title} · {targets.filter(s=>item.received.includes(s.id)).length}/{targets.length}명 제출</strong><div className="desk-student-checks">{targets.map(s=><label key={s.id}><input type="checkbox" checked={item.received.includes(s.id)} onChange={e=>patch({collections:desk.collections.map(old=>old.id===item.id?{...old,received:e.target.checked?[...new Set([...old.received,s.id])]:old.received.filter(id=>id!==s.id)}:old)})}/>{s.number} {s.name}</label>)}</div></section>})}
 {kind==='followups'&&actions.followups.map(item=><label className="desk-summary" key={item.id}><input type="checkbox" checked={item.followed} onChange={e=>patch({records:desk.records.map(old=>old.id===item.id?{...old,followed:e.target.checked}:old)})}/><span>{desk.students.find(s=>s.id===item.studentId)?.name||item.studentName||'이전 학생'} · 후속 확인<small>확인을 마쳤으면 체크하세요. 상담 내용은 담임 기록에서 확인합니다.</small></span></label>)}
 </section></div>
}
