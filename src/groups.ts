import type { GroupConstraints, GroupPlan, Student } from './types'
export function defaultGroupConstraints():GroupConstraints{return{together:[],separated:[],balanceScores:false,balanceTags:false,profiles:{}}}
export function groupConstraints(plan:GroupPlan):GroupConstraints{return{...defaultGroupConstraints(),...plan.constraints}}
export function groupConditionViolations(plan:GroupPlan){const c=groupConstraints(plan),errors:string[]=[];for(const [a,b] of c.together)if(plan.assignments[a]&&plan.assignments[b]&&plan.assignments[a]!==plan.assignments[b])errors.push('함께 배치 조건과 다른 모둠이 있습니다.');for(const [a,b] of c.separated)if(plan.assignments[a]&&plan.assignments[a]===plan.assignments[b])errors.push('분리 배치 조건과 같은 모둠이 있습니다.');return [...new Set(errors)]}
function shuffle<T>(items:T[],random:()=>number){const next=[...items];for(let i=next.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[next[i],next[j]]=[next[j],next[i]]}return next}
export function groupBalanceCost(plan:GroupPlan,students:Student[]){const c=groupConstraints(plan);const known=students.map(s=>c.profiles[s.id]?.score).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n));const mean=known.length?known.reduce((a,b)=>a+b,0)/known.length:50;const score=(id:string)=>c.profiles[id]?.score??mean;const groups=Array.from({length:plan.count},(_,i)=>students.filter(s=>plan.assignments[s.id]===i+1));let cost=0;if(c.balanceScores)groups.forEach(group=>{if(group.length)cost+=(group.reduce((sum,s)=>sum+score(s.id),0)/group.length-mean)**2/100});if(c.balanceTags)groups.forEach(group=>{const counts:Record<string,number>={};group.forEach(s=>(c.profiles[s.id]?.tags||'').split(',').map(tag=>tag.trim()).filter(Boolean).forEach(tag=>{counts[tag]=(counts[tag]||0)+1}));cost+=Object.values(counts).reduce((sum,n)=>sum+n*(n-1),0)*4});return cost}
export function drawGroups(students:Student[],count:number,random:()=>number=Math.random,constraints?:GroupConstraints):GroupPlan{
 if(!Number.isInteger(count)||count<1||count>Math.max(1,students.length))throw new Error('모둠 수는 1부터 학생 수 사이로 정하세요.')
 const c={...defaultGroupConstraints(),...constraints},active=new Set(students.map(s=>s.id)),parent=new Map(students.map(s=>[s.id,s.id]))
 const root=(id:string):string=>{const p=parent.get(id)!;if(p===id)return id;const result=root(p);parent.set(id,result);return result}
 c.together.forEach(([a,b])=>{if(active.has(a)&&active.has(b))parent.set(root(a),root(b))})
 const components=new Map<string,string[]>();students.forEach(s=>components.set(root(s.id),[...(components.get(root(s.id))||[]),s.id]))
 const separated=c.separated.filter(([a,b])=>active.has(a)&&active.has(b));if(separated.some(([a,b])=>root(a)===root(b)))throw new Error('함께 배치와 분리 배치 조건이 충돌합니다.')
 const capacities=Array.from({length:count},(_,i)=>Math.floor(students.length/count)+(i<students.length%count?1:0)),units=[...components.values()]
 if(units.some(unit=>unit.length>Math.max(...capacities)))throw new Error('함께 배치할 학생 수가 한 모둠의 정원을 넘습니다. 모둠 수나 조건을 조정하세요.')
 const known=students.map(s=>c.profiles[s.id]?.score).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n)),mean=known.length?known.reduce((a,b)=>a+b,0)/known.length:50
 const score=(id:string)=>c.profiles[id]?.score??mean
 let best:GroupPlan|null=null,bestCost=Infinity,nodes=0;const deadline=Date.now()+1800
 for(let attempt=0;attempt<(c.balanceScores||c.balanceTags?90:16);attempt++){
  const caps=shuffle(capacities,random),ordered=shuffle(units,random).sort((a,b)=>b.length-a.length||(c.balanceScores?b.reduce((sum,id)=>sum+score(id),0)/b.length-a.reduce((sum,id)=>sum+score(id),0)/a.length:0)),assignments:Record<string,number>={},members:string[][]=Array.from({length:count},()=>[])
  const search=(index:number):boolean=>{
   if(++nodes>140000||Date.now()>deadline)return false
   if(index===ordered.length)return true
   const unit=ordered[index]
   const options=shuffle(Array.from({length:count},(_,i)=>i),random).filter(g=>members[g].length+unit.length<=caps[g]&&!separated.some(([a,b])=>unit.includes(a)&&members[g].includes(b)||unit.includes(b)&&members[g].includes(a)))
   options.sort((a,b)=>{const penalty=(g:number)=>{const people=[...members[g],...unit];let value=0;if(c.balanceScores)value+=(people.reduce((sum,id)=>sum+score(id),0)/people.length-mean)**2/100;if(c.balanceTags){const tags:Record<string,number>={};people.forEach(id=>(c.profiles[id]?.tags||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(tag=>{tags[tag]=(tags[tag]||0)+1}));value+=Object.values(tags).reduce((sum,n)=>sum+n*(n-1),0)*4}return value};return penalty(a)-penalty(b)})
   for(const g of options){members[g].push(...unit);unit.forEach(id=>{assignments[id]=g+1});if(search(index+1))return true;members[g].splice(members[g].length-unit.length);unit.forEach(id=>delete assignments[id])}return false
  }
  if(search(0)){const plan:GroupPlan={count,assignments:{...assignments},...(constraints?{constraints:c}:{})},cost=groupBalanceCost({...plan,constraints:c},students);if(cost<bestCost){best=plan;bestCost=cost}if(cost===0)break}
  if(nodes>140000||Date.now()>deadline)break
 }
 if(!best)throw new Error('조건을 만족하는 모둠을 찾지 못했습니다. 함께·분리 조건과 모둠 수를 조정하거나 다시 뽑아 주세요.')
 return best
}
export function normalizeGroupPlan(saved:GroupPlan|undefined,students:Student[]):GroupPlan{const count=Math.max(1,Math.min(students.length||1,Math.round(saved?.count||Math.ceil(students.length/4))));const active=new Set(students.map(s=>s.id));return{...(saved?.constraints?{constraints:saved.constraints}:{}),count,assignments:Object.fromEntries(Object.entries(saved?.assignments||{}).filter(([id,group])=>active.has(id)&&Number.isInteger(group)&&group>=1&&group<=count))}}
