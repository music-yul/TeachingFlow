export default function WorkEntryTypeSelector({value,onChange}:{value:'task'|'record';onChange:(value:'task'|'record')=>void}){
 return <select className="work-entry-kind-select" aria-label="업무 등록 방식" value={value} onChange={event=>onChange(event.target.value as 'task'|'record')}><option value="task">일정등록</option><option value="record">결과등록</option></select>
}
