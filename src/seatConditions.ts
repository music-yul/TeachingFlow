import type { SeatConstraints, SeatingPlan, SeatSnapshot, Student } from './types'
export function defaultSeatConstraints():SeatConstraints{return{frontStudents:[],frontRows:1,separated:[],separation:'row',groupRows:2,pairMode:'any',genders:{},avoidPreviousSeat:false,avoidPreviousPartner:false}}
export function seatConstraints(plan:SeatingPlan):SeatConstraints{const c={...defaultSeatConstraints(),...plan.constraints};return{...c,frontRows:Math.max(1,Math.min(plan.rows,c.frontRows))}}
export function partnerSeat(plan:Pick<SeatingPlan,'columns'|'rows'|'aisles'>,seat:number){const col=seat%plan.columns,other=col%2===0?seat+1:seat-1;if(Math.floor(other/plan.columns)!==Math.floor(seat/plan.columns)||other<0||other>=plan.rows*plan.columns||plan.aisles.includes(Math.min(col,other%plan.columns)))return undefined;return other}
export function seatGroup(plan:SeatingPlan,seat:number,groupRows:number){return Math.floor(Math.floor(seat/plan.columns)/groupRows)*Math.ceil(plan.columns/2)+Math.floor(seat%plan.columns/2)}
export function snapshotSeats(plan:SeatingPlan,label:string):SeatSnapshot{return{rows:plan.rows,columns:plan.columns,aisles:[...plan.aisles],assignments:{...plan.assignments},label}}
function shuffled<T>(items:T[],random:()=>number){const next=[...items];for(let i=next.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[next[i],next[j]]=[next[j],next[i]]}return next}
export function previousPartners(previous?:SeatSnapshot){const map=new Map<string,string>();if(previous)Object.entries(previous.assignments).forEach(([seat,id])=>{const other=partnerSeat(previous,Number(seat));if(other!==undefined&&previous.assignments[other])map.set(id,previous.assignments[other])});return map}
function allowed(plan:SeatingPlan,c:SeatConstraints,assignments:Record<string,string>,seat:number,id:string){
 const row=Math.floor(seat/plan.columns)
 if(c.frontStudents.includes(id)&&row>=c.frontRows)return false
 if(c.avoidPreviousSeat&&plan.previous){const old=Object.entries(plan.previous.assignments).find(([,person])=>person===id)?.[0];if(old!==undefined&&Math.floor(Number(old)/plan.previous.columns)===row&&Number(old)%plan.previous.columns===seat%plan.columns)return false}
 for(const [a,b] of c.separated){const target=a===id?b:b===id?a:undefined;if(!target)continue;const location=Object.keys(assignments).find(key=>assignments[key]===target);if(location===undefined)continue;const other=Number(location);if(c.separation==='row'?Math.floor(other/plan.columns)===row:seatGroup(plan,other,c.groupRows)===seatGroup(plan,seat,c.groupRows))return false}
 const partner=partnerSeat(plan,seat),otherId=partner===undefined?undefined:assignments[partner]
 if(otherId){if(c.avoidPreviousPartner&&previousPartners(plan.previous).get(id)===otherId)return false;if(c.pairMode==='mixed'&&c.genders[id]===c.genders[otherId])return false;if(c.pairMode==='same'&&c.genders[id]!==c.genders[otherId])return false}
 return true
}
export function seatConditionViolations(plan:SeatingPlan,students:Student[]){const c=seatConstraints(plan),errors=new Set<string>();const active=new Set(students.map(s=>s.id));if((c.avoidPreviousSeat||c.avoidPreviousPartner)&&!plan.previous)errors.add('직전 배치 기준을 먼저 저장하세요.');Object.entries(plan.assignments).forEach(([key,id])=>{if(!active.has(id))return;const rest={...plan.assignments};delete rest[key];if(!allowed(plan,c,rest,Number(key),id))errors.add('앞줄·분리·짝꿍·직전 자리 조건과 맞지 않는 배정이 있습니다.')});if(c.pairMode!=='any'){if(students.some(s=>!c.genders[s.id]))errors.add('성별 짝 배치를 사용하려면 모든 학생의 성별을 직접 선택하세요.');const single=Object.entries(plan.assignments).filter(([key,id])=>active.has(id)&&!plan.assignments[partnerSeat(plan,Number(key))??-1]).length;if(Object.values(plan.assignments).filter(id=>active.has(id)).length===students.length&&single>students.length%2)errors.add('성별 짝 배치에서 짝 없는 학생이 너무 많습니다. 통로·빈 좌석을 확인하세요.')}return [...errors]}
export function constrainedSeats(plan:SeatingPlan,students:Student[],random:()=>number=Math.random):Record<string,string>{
 const c=seatConstraints(plan),active=new Set(students.map(s=>s.id)),available=Array.from({length:plan.rows*plan.columns},(_,i)=>i).filter(i=>!plan.disabled.includes(i)&&!(plan.empty||[]).includes(i))
 if(available.length<students.length)throw new Error('좌석이 부족합니다. 사용 좌석 수를 늘려 주세요.')
 if((c.avoidPreviousSeat||c.avoidPreviousPartner)&&!plan.previous)throw new Error('현재 배치를 직전 배치 기준으로 먼저 저장하세요.')
 if(c.pairMode!=='any'&&students.some(s=>!c.genders[s.id]))throw new Error('모든 학생의 성별을 직접 선택하세요. 이름으로 추정하지 않습니다.')
 if(c.pairMode==='mixed'){const male=students.filter(s=>c.genders[s.id]==='남').length;if(Math.abs(male-(students.length-male))>1)throw new Error('남녀 짝 배치는 남녀 인원 차가 1명 이하여야 합니다. 다른 짝 옵션을 선택하세요.')}
 if(c.pairMode==='same'){const male=students.filter(s=>c.genders[s.id]==='남').length;if(male%2+(students.length-male)%2>students.length%2)throw new Error('남남·여여 짝을 만들 수 없는 인원 구성입니다. 다른 짝 옵션을 선택하세요.')}
 const fixed:Record<string,string>={};plan.locked.forEach(seat=>{const id=plan.assignments[seat];if(active.has(id)&&available.includes(seat))fixed[seat]=id})
 for(const [seat,id] of Object.entries(fixed)){const rest={...fixed};delete rest[seat];if(!allowed(plan,c,rest,Number(seat),id))throw new Error('고정석이 조건과 충돌합니다. 고정을 해제하거나 조건을 수정하세요.')}
 const pool=students.filter(s=>!Object.values(fixed).includes(s.id)).map(s=>s.id)
 let nodes=0;const deadline=Date.now()+1800
 for(let attempt=0;attempt<18;attempt++){
  let seats=[...available]
  if(c.pairMode!=='any'){
   const pairs=available.filter(seat=>{const p=partnerSeat(plan,seat);return p!==undefined&&p>seat&&available.includes(p)}).map(seat=>[seat,partnerSeat(plan,seat)!])
   const needed=Math.floor(students.length/2),mandatory=pairs.filter(pair=>pair.some(seat=>Boolean(fixed[seat])))
   if(pairs.length<needed)throw new Error('짝 좌석이 부족합니다. 좌석·통로 배치를 바꾸세요.')
   if(mandatory.length>needed)continue
   const chosen=[...mandatory,...shuffled(pairs.filter(pair=>!mandatory.includes(pair)),random).slice(0,needed-mandatory.length)]
   seats=chosen.flat()
   if(students.length%2){const single=available.filter(seat=>!seats.includes(seat));const forced=single.find(seat=>Boolean(fixed[seat]));const pick=forced??shuffled(single,random)[0];if(pick===undefined)continue;seats.push(pick)}
   if(Object.keys(fixed).some(seat=>!seats.includes(Number(seat))))continue
  }
  const assignments={...fixed}
  const search=(remaining:string[]):boolean=>{
   if(++nodes>90000||Date.now()>deadline)return false
   if(!remaining.length)return seatConditionViolations({...plan,assignments},students).length===0
   let person='',choices:number[]=[]
   for(const id of shuffled(remaining,random)){
    const options=seats.filter(seat=>!assignments[seat]&&allowed(plan,c,assignments,seat,id))
    if(!options.length)return false
    if(!person||options.length<choices.length){person=id;choices=options}
   }
   for(const seat of shuffled(choices,random)){assignments[seat]=person;if(search(remaining.filter(id=>id!==person)))return true;delete assignments[seat]}
   return false
  }
  if(search(pool))return assignments
  if(nodes>90000||Date.now()>deadline)break
 }
 throw new Error('조건을 모두 만족하는 배치를 찾지 못했습니다. 앞줄 수·고정석·분리·짝 조건을 확인하거나 다시 뽑아 주세요. 조건을 임의로 해제하지 않았습니다.')
}
