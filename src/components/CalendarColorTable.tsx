import { Fragment } from 'react'
import type { CSSProperties } from 'react'
import type {CalendarDetailPaint,CalendarDecoration} from '../types'
export type CalendarColorRow={key:string;group?:string;label:string;background:string;color:string;enabled:boolean;onEnabled:(enabled:boolean)=>void;onChange:(paint:CalendarDetailPaint)=>void;onReset:()=>void;automatic?:boolean;onAutomatic?:()=>void;preview?:CSSProperties;decoration?:CalendarDecoration;onDecoration?:(value:CalendarDecoration)=>void}
function ColorTable({rows}:{rows:CalendarColorRow[]}){
 return <div className="calendar-detail-colors-table unified-design"><table><thead><tr><th scope="col">항목 · 미리보기</th><th scope="col">배경</th><th scope="col">글자</th><th scope="col">글씨 모양</th><th scope="col">왼쪽 선</th><th scope="col">테두리</th><th scope="col">초기화</th></tr></thead><tbody>{rows.map((row,index)=>{
 const d=row.decoration||{}
 const marker=d.marker||{style:'none' as const,color:'#888888'}
 const border=d.border||{visible:true}
 return <Fragment key={row.key}>{row.group&&row.group!==rows[index-1]?.group&&<tr className="design-group"><th colSpan={7} scope="colgroup">{row.group}</th></tr>}<tr className="calendar-design-row">
 <th scope="row"><span className="calendar-detail-sample" title={row.enabled?'직접 지정한 설정':'기본 설정 사용'} style={row.preview||{background:row.background,color:row.color}}>{row.label}</span></th>
 <td><input type="color" aria-label={`${row.label} 배경색`} value={row.background} onChange={e=>row.onChange({background:e.target.value,enabled:true})}/></td>
 <td><div className="design-stack"><input type="color" aria-label={`${row.label} 글자색`} value={row.color} onChange={e=>row.onChange({color:e.target.value,enabled:true})}/>{row.onAutomatic&&<button type="button" className="link-button" title="기본 글자색으로 되돌리기" disabled={row.automatic} onClick={row.onAutomatic}>기본</button>}</div></td>
 <td>{row.onDecoration&&<select aria-label={`${row.label} 글꼴 스타일`} value={d.font||'normal'} onChange={e=>row.onDecoration?.({font:e.target.value as CalendarDecoration['font']})}><option value="normal">보통</option><option value="bold">굵게</option><option value="italic">기울임</option></select>}</td>
 <td>{row.onDecoration&&<div className="design-stack"><select aria-label={`${row.label} 왼쪽 선 모양`} value={marker.style} onChange={e=>row.onDecoration?.({marker:{...marker,style:e.target.value as typeof marker.style}})}><option value="none">없음</option><option value="solid">실선</option><option value="dashed">파선</option><option value="dotted">점선</option><option value="double">이중선</option></select><input type="color" aria-label={`${row.label} 왼쪽 선 색`} disabled={marker.style==='none'} value={marker.color} onChange={e=>row.onDecoration?.({marker:{...marker,color:e.target.value}})}/></div>}</td>
 <td>{row.onDecoration&&<div className="design-stack"><label className="inline-check"><input type="checkbox" aria-label={`${row.label} 외곽 테두리 표시`} checked={border.visible} onChange={e=>row.onDecoration?.({border:{...border,visible:e.target.checked}})}/>표시</label><input type="color" aria-label={`${row.label} 외곽 테두리 색`} disabled={!border.visible} value={border.color||String(row.preview?.borderTop||'').match(/#[0-9a-f]{6}/i)?.[0]||'#888888'} onChange={e=>row.onDecoration?.({border:{...border,color:e.target.value}})}/><button type="button" className="link-button" aria-label={`${row.label} 테두리 자동 색`} disabled={!border.visible||!border.color} onClick={()=>row.onDecoration?.({border:{visible:border.visible}})}>자동</button></div>}</td>
 <td><button type="button" className="link-button" disabled={!row.enabled} onClick={row.onReset}>되돌리기</button></td>
 </tr></Fragment>
 })}</tbody></table>{!rows.length&&<p className="hint">등록한 항목이 없습니다.</p>}</div>
}

export default function CalendarColorTable({rows}:{rows:CalendarColorRow[]}){
 const groups:{label:string;rows:CalendarColorRow[]}[]=[]
 for(const row of rows){const label=row.group||'기본 설정';let group=groups.find(item=>item.label===label);if(!group){group={label,rows:[]};groups.push(group)}group.rows.push(row)}
 return <div className="design-settings-groups">{groups.map(group=>group.label==='기본 설정'?<ColorTable key={group.label} rows={group.rows}/>:<details key={group.label} className="design-fold-group"><summary>{group.label}<small>{group.rows.length}개 항목</small></summary><ColorTable rows={group.rows.map(row=>({...row,group:undefined}))}/></details>)}</div>
}
