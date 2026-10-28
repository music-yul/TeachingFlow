import {useEffect,useRef,useState} from 'react'
import type {ReactNode,PointerEvent} from 'react'
import type {DashboardItem} from './FlexibleDashboard'
import type {WidgetPreview} from '../widgetPreview'
export function widgetIsCompact(item:DashboardItem,width:number,height:number){
 if(item.kind==='summary')return width<320
 if(item.kind==='calendar')return width<340||height<250
 if(item.kind==='timetable')return width<220||height<200
 return width<180||height<108
}
type Props={item:DashboardItem;label:string;editing:boolean;preview:WidgetPreview;children:ReactNode;onOpen:()=>void;onSettings:()=>void;onRemove:()=>void;onBegin:(event:PointerEvent<HTMLButtonElement>,mode:'move'|'resize')=>void;onMove:(event:PointerEvent<HTMLButtonElement>)=>void;onFinish:()=>void;onCancel:()=>void}
export default function AdaptiveWidget({item,label,editing,preview,children,onOpen,onSettings,onRemove,onBegin,onMove,onFinish,onCancel}:Props){
 const element=useRef<HTMLElement>(null),[size,setSize]=useState({width:Math.max(1,item.w)*100,height:Math.max(1,item.h)*64-12})
 useEffect(()=>{const observer=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;setSize({width,height})});observer.observe(element.current!);return()=>observer.disconnect()},[])
 const compact=widgetIsCompact(item,size.width,size.height)
 return <section ref={element} aria-label={label} data-kind={item.kind} data-size={compact?'compact':'full'} className={`fd-widget ${compact?'fd-compact':''} ${item.kind==='summary'&&!compact?'fd-summary':''} ${editing?'fd-editing':''}`} style={{gridColumn:`${item.x+1}/span ${item.w}`,gridRow:`${item.y+1}/span ${item.h}`}}>
 <div className="fd-heading">{editing&&<button aria-label={`${label} 이동`} className="fd-move" onPointerDown={e=>onBegin(e,'move')} onPointerMove={onMove} onPointerUp={onFinish} onPointerCancel={onCancel}>⠿</button>}{!compact&&item.kind!=='summary'&&<strong title={label}>{label}</strong>}<button aria-label={`${label} 설정`} onClick={onSettings}>⚙</button>{editing&&!compact&&<button aria-label={`${label} 제거`} onClick={onRemove}>×</button>}</div>
 {compact?<button type="button" className="fd-compact-preview" aria-label={`${label} 상세 열기: ${preview.value} ${preview.label}. ${preview.detail}`} onClick={onOpen}><strong title={preview.value}>{preview.value}</strong><span title={label}>{item.title||preview.label}</span>{size.height>=110&&<small>{preview.detail}</small>}</button>:children}
 {editing&&<button aria-label={`${label} 크기 조절`} className="fd-resize" onPointerDown={e=>onBegin(e,'resize')} onPointerMove={onMove} onPointerUp={onFinish} onPointerCancel={onCancel}>↘</button>}
 </section>
}
