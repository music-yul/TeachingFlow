import {useEffect,useRef} from 'react'
import type {ReactNode} from 'react'
export default function WidgetExpandedDialog({label,children,onClose,onSettings}:{label:string;children:ReactNode;onClose:()=>void;onSettings:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{dialog.current?.showModal()},[])
 return <dialog ref={dialog} className="fd-expanded-dialog" aria-label={`${label} 상세`} onCancel={onClose}><header><h2>{label}</h2><div><button onClick={onSettings}>위젯 설정</button><button onClick={onClose}>닫기</button></div></header><div className="fd-expanded-content">{children}</div></dialog>
}
