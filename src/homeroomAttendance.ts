import type { AttendanceReason, AttendanceStatus, TeacherDesk } from './types'
export type HomeroomEntry={id:string;date:string;studentId:string;status:AttendanceStatus;reason?:AttendanceReason;memo:string;extra:boolean;counted?:boolean}
export function homeroomEntries(desk:TeacherDesk):HomeroomEntry[]{
 const daily=Object.entries(desk.homeroomAttendance).map(([key,status])=>({id:key,date:key.slice(0,10),studentId:key.slice(11),status,reason:desk.attendanceReasons[key],memo:desk.attendanceMemos[key]||'',extra:false}))
 const entries=[...daily,...(desk.attendanceExtra||[]).map(item=>({...item,extra:true}))].sort((a,b)=>a.date.localeCompare(b.date)||a.studentId.localeCompare(b.studentId))
 const groups=new Map<string,HomeroomEntry[]>()
 entries.filter(e=>['지각','조퇴','결과'].includes(e.status)).forEach(e=>{const key=`${e.date}:${e.studentId}`;groups.set(key,[...(groups.get(key)||[]),e])})
 groups.forEach((items,key)=>{const chosen=items.find(e=>e.id===desk.attendanceChoices?.[key])||items.find(e=>!e.extra)||items[0];items.forEach(e=>{e.counted=e.id===chosen.id})})
 return entries
}
export function summarizeHomeroom(entries:HomeroomEntry[],studentId:string,from:string,to:string){
 const own=entries.filter(e=>e.studentId===studentId&&(!from||e.date>=from)&&(!to||e.date<=to))
 const absenceEntries=own.filter(e=>e.status==='결석'&&e.counted!==false)
 const absenceByReason=Object.fromEntries(['인정','질병','미인정','기타','미분류'].map(reason=>[reason,new Set(absenceEntries.filter(e=>reason==='미분류'?!e.reason:e.reason===reason).map(e=>e.date)).size])) as Record<string,number>
 const allAbsences=new Set(absenceEntries.map(e=>e.date)).size
 const unapproved=own.filter(e=>e.reason==='미인정'&&e.counted!==false)
 const absences=new Set(unapproved.filter(e=>e.status==='결석').map(e=>e.date)).size
 const count=(status:AttendanceStatus)=>new Set(unapproved.filter(e=>e.status===status).map(e=>e.date)).size
 const late=count('지각'),early=count('조퇴'),missed=count('결과')
 const partial=late+early+missed,converted=Math.floor(partial/3)
 return{entries:own,absenceByReason,allAbsences,absences,late,early,missed,partial,converted,remainder:partial%3,total:absences+converted}
}

export function attendanceConflicts(desk:TeacherDesk){const groups=new Map<string,HomeroomEntry[]>();homeroomEntries(desk).filter(e=>['지각','조퇴','결과'].includes(e.status)).forEach(e=>{const key=`${e.date}:${e.studentId}`;groups.set(key,[...(groups.get(key)||[]),e])});return [...groups.entries()].filter(([,entries])=>entries.length>1)}

export function attendanceMemoChange(desk:TeacherDesk,entry:HomeroomEntry,text:string):Partial<TeacherDesk>{if(entry.extra)return{attendanceExtra:desk.attendanceExtra.map(item=>item.id===entry.id?{...item,memo:text}:item)};const memos={...desk.attendanceMemos};if(text.trim())memos[entry.id]=text;else delete memos[entry.id];return{attendanceMemos:memos}}
