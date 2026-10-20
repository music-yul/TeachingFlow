import { useEffect, useRef, useState } from 'react'
import type { AppData, CalendarFilter, HomeWidget, HomeWidgetPlacement } from '../types'
import { addHomeWidget, availableHomeWidgets, defaultHomeLayout, homeWidgetLabels, orderedHomeLayout, placeHomeWidget, normalizeHomeLayout, homeWidgetPlacementError, homeWidgetDropPosition } from '../workspace'
import './HomeLayoutSettings.css'

type Props = { data: AppData; update: (change: Partial<AppData>) => void }
export default function HomeLayoutSettings({ data, update }: Props) {
  const prefs = data.workspacePreferences
  const [selected, setSelected] = useState<HomeWidget | null>(prefs.homeLayout[0]?.id || null)
  const [scrollTarget,setScrollTarget]=useState<{id:HomeWidget;request:number}|null>(null)
  const [message,setMessage]=useState('')
  const [preview, setPreview] = useState<HomeWidgetPlacement[] | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const resizing = useRef<{ x: number; y: number; cellWidth: number; item: HomeWidgetPlacement; layout: HomeWidgetPlacement[]; next: HomeWidgetPlacement[] } | null>(null)
  const activeLayout=prefs.homeLayout
  const dragOffset=useRef({row:0,column:0})
  const layout = preview || activeLayout
  const active = layout.find(item => item.id === selected)
  const rows = 10
  const save = (homeLayout: HomeWidgetPlacement[], resetCalendar=false) => { const merged=normalizeHomeLayout(homeLayout); update({ workspacePreferences: { ...prefs, ...(resetCalendar?{homeCalendar:{...prefs.homeCalendar,homeMode:'weeks' as const}}:{}), homeLayout: orderedHomeLayout(merged), homeWidgets: orderedHomeLayout(merged).map(item => item.id) } }) }
  const place = (item: HomeWidgetPlacement) => { const next=placeHomeWidget(activeLayout,item,false); if(next===activeLayout){setMessage(homeWidgetPlacementError(activeLayout,item)||'이 위치에 배치할 수 없습니다.');return} setMessage('');save(next) }
  const changeCalendar = (change: Partial<typeof prefs.homeCalendar>) => update({ workspacePreferences: { ...prefs, homeCalendar: { ...prefs.homeCalendar, ...change } } })
  useEffect(()=>{if(!scrollTarget)return;const tile=gridRef.current?.querySelector<HTMLElement>(`[data-widget-id="${scrollTarget.id}"]`);tile?.scrollIntoView({block:'nearest',inline:'nearest'})},[scrollTarget])
  const add = (id: HomeWidget) => {
    const next=addHomeWidget(prefs.homeLayout,id)
    if(next===prefs.homeLayout){setMessage('이 크기로 추가할 빈 공간이 없습니다. 다른 위젯을 줄이거나 빼 주세요.');return}
    setMessage('');save(next);setSelected(id);setScrollTarget(old=>({id,request:(old?.request||0)+1}))
  }
  const remove = (id: HomeWidget) => { save(layout.filter(item => item.id!==id)); if(selected===id) setSelected(null) }
  const drop = (id:string,clientX:number,clientY:number) => {
    const item=prefs.homeLayout.find(item=>item.id===id),bounds=gridRef.current?.getBoundingClientRect()
    if(!item||!bounds)return
    const column=Math.floor((clientX-bounds.left)/((bounds.width+8)/10)),row=Math.floor((clientY-bounds.top)/80)
    place({...item,...homeWidgetDropPosition(row,column,dragOffset.current)});setSelected(item.id)
  }
  const finishResize = () => {
    const state = resizing.current
    if (state) { if(state.next===state.layout)setMessage('다른 위젯과 겹치거나 범위를 벗어나 크기를 변경하지 않았습니다.');else{setMessage('');save(state.next)} }
    resizing.current = null; setPreview(null)
  }
  return <section className="panel home-layout-settings">
    <div className="desk-heading"><div><h2>메인화면 위젯 배치</h2><p className="hint">위젯을 끌어 옮기거나, 선택한 뒤 원하는 빈칸을 누르세요. 오른쪽 아래 모서리를 끌면 크기가 바뀝니다.</p></div><button className="ghost-button" onClick={() => { if (window.confirm('메인화면 배치를 기본 구성으로 되돌릴까요?')) { save(defaultHomeLayout(),true); setSelected(null) } }}>기본 배치로</button></div>
    {message&&<p role="status" className="banner">{message}</p>}
    <div className="layout-palette">{availableHomeWidgets(data).map(id => <button className="ghost-button" disabled={layout.some(item => item.id===id)} key={id} onClick={() => add(id)}>+ {homeWidgetLabels[id]}</button>)}</div>
    <div className="layout-editor">
      <div className="layout-canvas-scroll"><div className="layout-canvas" ref={gridRef} style={{ gridTemplateRows: `repeat(${rows}, 72px)` }} aria-label="메인화면 10×10 배치판">
        {Array.from({length:rows*10},(_,index) => { const row = Math.floor(index/10); const column = index%10; return <button className="layout-slot" key={`slot-${index}`} style={{gridColumn:column+1,gridRow:row+1}} aria-label={`${row+1}행 ${column+1}열로 이동`} onClick={() => { if(active) place({...active,row,column}) }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect='move' }} onDrop={event => { event.preventDefault(); event.stopPropagation(); drop(event.dataTransfer.getData('text/plain'),event.clientX,event.clientY) }}>{row+1} · {column+1}</button> })}
        {layout.map(item => <div key={item.id} data-widget-id={item.id} className={`layout-tile ${selected===item.id?'selected':''} ${availableHomeWidgets(data).includes(item.id)?'':'inactive'}`} role="button" tabIndex={0} aria-label={`${homeWidgetLabels[item.id]}, ${item.row+1}행 ${item.column+1}열, ${item.width}칸 너비 ${item.height}칸 높이`} aria-pressed={selected===item.id} onClick={() => setSelected(item.id)} onKeyDown={event => { if(event.key==='Enter'||event.key===' ') { event.preventDefault(); setSelected(item.id) } }} style={{gridColumn:`${item.column+1} / span ${item.width}`,gridRow:`${item.row+1} / span ${item.height}`}} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); event.stopPropagation(); drop(event.dataTransfer.getData('text/plain'),event.clientX,event.clientY) }}>
          <div className="layout-tile-title" draggable onDragStart={event => { const bounds=event.currentTarget.closest('.layout-tile')!.getBoundingClientRect();const cell=(gridRef.current!.getBoundingClientRect().width+8)/10;dragOffset.current={row:Math.min(item.height-1,Math.floor((event.clientY-bounds.top)/80)),column:Math.min(item.width-1,Math.floor((event.clientX-bounds.left)/cell))};event.dataTransfer.setData('text/plain',item.id); event.dataTransfer.effectAllowed='move'; setSelected(item.id) }}><span>⠿ {homeWidgetLabels[item.id]}{!availableHomeWidgets(data).includes(item.id)&&' · 기능 꺼짐'}</span><button aria-label={`${homeWidgetLabels[item.id]} 제거`} onClick={event => { event.stopPropagation(); remove(item.id) }}>×</button></div>
          <span className="layout-dimensions">{item.width} × {item.height}</span>
          <button className="layout-resize" aria-label={`${homeWidgetLabels[item.id]} 크기 조절`} title="모서리를 끌어 크기 조절" onClick={event => { event.stopPropagation(); setSelected(item.id) }} onPointerDown={event => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setSelected(item.id); const width=gridRef.current!.getBoundingClientRect().width; resizing.current={x:event.clientX,y:event.clientY,cellWidth:(width+8)/10,item:{...item},layout:[...activeLayout],next:[...activeLayout]} }} onPointerMove={event => { const state=resizing.current; if(!state) return; const width=Math.max(1,Math.min(10-state.item.column,state.item.width+Math.round((event.clientX-state.x)/state.cellWidth))); const height=Math.max(1,Math.min(10-state.item.row,state.item.height+Math.round((event.clientY-state.y)/80))); state.next=placeHomeWidget(state.layout,{...state.item,width,height},false); setPreview(state.next) }} onPointerUp={finishResize} onPointerCancel={() => { resizing.current=null; setPreview(null) }}>↘</button>
        </div>)}
      </div></div>
      <aside className="layout-inspector">
        <h3>{active ? homeWidgetLabels[active.id] : '위젯을 선택하세요'}</h3>
        {active && <><div className="desk-fields"><label>시작 행<input type="number" min={1} max={active?11-active.height:10} value={active.row+1} onChange={event => { if(event.target.value) place({...active,row:Number(event.target.value)-1}) }} /></label><label>시작 열<select value={active.column} onChange={event => place({...active,column:Number(event.target.value)})}>{Array.from({length:11-active.width},(_,i)=><option key={i} value={i}>{i+1}열</option>)}</select></label><label>너비<select value={active.width} onChange={event => place({...active,width:Number(event.target.value),column:Math.min(active.column,10-Number(event.target.value))})}>{[1,2,3,4,5,6,7,8,9,10].map(value=><option key={value} value={value}>{value}칸{value===10?' · 전체 너비':value===5?' · 절반':''}</option>)}</select></label><label>높이<select value={active.height} onChange={event => place({...active,height:Number(event.target.value),row:Math.min(active.row,10-Number(event.target.value))})}>{[1,2,3,4,5,6,7,8,9,10].map(value=><option key={value} value={value}>{value}칸</option>)}</select></label></div>
        <div className="layout-nudge"><button className="ghost-button" aria-label="위로 한 칸" disabled={active.row===0} onClick={()=>place({...active,row:active.row-1})}>↑</button><button className="ghost-button" aria-label="아래로 한 칸" disabled={active.row+active.height>=10} onClick={()=>place({...active,row:active.row+1})}>↓</button><button className="ghost-button" aria-label="왼쪽으로 한 칸" disabled={active.column===0} onClick={()=>place({...active,column:active.column-1})}>←</button><button className="ghost-button" aria-label="오른쪽으로 한 칸" disabled={active.column+active.width>=10} onClick={()=>place({...active,column:active.column+1})}>→</button></div>
        <button className="link-button" onClick={()=>remove(active.id)}>메인화면에서 빼기</button></>}

        {active?.id==='calendar'  && <div className="layout-calendar-options"><h3>메인화면 달력</h3><label><input type="checkbox" checked={prefs.homeCalendar.showWeekends!==false} onChange={e=>changeCalendar({showWeekends:e.target.checked})}/> 주말 포함</label><label>달력 형태<select value={prefs.homeCalendar.homeMode||'weeks'} onChange={event=>changeCalendar({homeMode:event.target.value as 'month'|'week'|'fortnight'|'weeks'})}><option value="month">월별 달력</option><option value="week">주간 달력</option><option value="fortnight">2주 달력</option><option value="weeks">주간 달력(연속)</option></select></label><p className="hint">{prefs.homeCalendar.homeMode==='month'?'한 달 전체를 표시합니다.':prefs.homeCalendar.homeMode==='week'?'1주만 표시하며 위젯 높이만큼 날짜 칸이 늘어납니다.':prefs.homeCalendar.homeMode==='fortnight'?'2주만 표시하며 위젯 높이만큼 날짜 칸이 늘어납니다.':'4주를 연속 표시하며 위젯 크기에 맞춰 조절합니다.'}</p><label>표시할 일정<select value={prefs.homeCalendar.filter==='homeroom'&&!data.settings.features.homeroom?'all':prefs.homeCalendar.filter} onChange={event=>changeCalendar({filter:event.target.value as CalendarFilter})}><option value="all">전체</option>{data.settings.features.teaching&&<option value="teaching">교과</option>}{data.settings.features.homeroom&&<option value="homeroom">담임</option>}{data.settings.features.work&&<option value="work">업무</option>}{data.settings.features.clubs&&<option value="club">동아리</option>}</select></label></div>}
        <p className="hint">변경은 자동 저장됩니다. 다른 위젯과 겹치는 이동·크기 변경은 적용하지 않습니다. 회색 위젯은 꺼진 기능이 예약한 자리이며 ×로 배치에서 뺄 수 있습니다. 좁은 화면에서는 위에서 아래 순서로 한 열에 표시합니다.</p>
      </aside>
    </div>
  </section>
}
