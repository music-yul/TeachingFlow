import { constrainedSeats } from './seatConditions'
import type { SeatingPlan, Student } from './types'
export function emptySeatingPlan():SeatingPlan{return{rows:6,columns:6,disabled:[],aisles:[],assignments:{},locked:[]}}
export function normalizeSeatingPlan(saved?:Partial<SeatingPlan>):SeatingPlan{
 const rows=Math.max(1,Math.min(20,Math.round(saved?.rows||6))),columns=Math.max(1,Math.min(20,Math.round(saved?.columns||6)))
 const total=rows*columns,valid=(n:number)=>Number.isInteger(n)&&n>=0&&n<total
 const disabled=[...new Set((saved?.disabled||[]).filter(valid))]
 const empty=[...new Set((saved?.empty||[]).filter(n=>valid(n)&&!disabled.includes(n)))]
 const assignments:Record<string,string>={},seen=new Set<string>()
 Object.entries(saved?.assignments||{}).forEach(([key,id])=>{if(valid(Number(key))&&!disabled.includes(Number(key))&&!empty.includes(Number(key))&&typeof id==='string'&&!seen.has(id)){assignments[key]=id;seen.add(id)}})
 return{...(saved?.empty?{empty}:{}),...(saved?.constraints?{constraints:saved.constraints}:{}),...(saved?.previous?{previous:saved.previous}:{}),rows,columns,disabled,aisles:[...new Set((saved?.aisles||[]).filter(n=>Number.isInteger(n)&&n>=0&&n<columns-1))],assignments,locked:[...new Set((saved?.locked||[]).filter(n=>valid(n)&&Boolean(assignments[n])))]}
}
export function normalizeSeatingPlans(saved:Record<string,SeatingPlan>={}){return Object.fromEntries(Object.entries(saved).map(([key,value])=>[key,normalizeSeatingPlan(value)]))}
export function seatingShape(plan:SeatingPlan,shape:'grid'|'pairs'|'u'):SeatingPlan{
 const disabled=shape==='u'?Array.from({length:plan.rows*plan.columns},(_,i)=>i).filter(i=>Math.floor(i/plan.columns)<plan.rows-1&&i%plan.columns>0&&i%plan.columns<plan.columns-1):[]
 return normalizeSeatingPlan({...plan,disabled,aisles:shape==='pairs'?Array.from({length:plan.columns-1},(_,i)=>i).filter(i=>i%2===1):[]})
}
export function randomSeats(plan:SeatingPlan,students:Student[],random:()=>number=Math.random):SeatingPlan{
 const active=new Set(students.map(s=>s.id));const assignments=constrainedSeats(plan,students,random)
 return normalizeSeatingPlan({...plan,assignments,locked:plan.locked.filter(seat=>active.has(plan.assignments[seat]))})
}
export function assignSeat(plan:SeatingPlan,seat:number,studentId:string):SeatingPlan{
 if(plan.disabled.includes(seat)||(plan.empty||[]).includes(seat)||plan.locked.includes(seat))throw new Error('사용하지 않거나 고정한 좌석입니다.')
 const previous=Object.keys(plan.assignments).find(key=>plan.assignments[key]===studentId)
 if(previous&&plan.locked.includes(Number(previous)))throw new Error('이 학생의 기존 자리가 고정되어 있습니다.')
 const next={...plan.assignments},old=next[seat]
 if(previous){if(old)next[previous]=old;else delete next[previous]}
 if(studentId)next[seat]=studentId;else delete next[seat]
 return normalizeSeatingPlan({...plan,assignments:next})
}
