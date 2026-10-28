import {createContext,useContext} from 'react'
import {createPortal} from 'react-dom'
import type {ButtonHTMLAttributes,ReactNode} from 'react'
export const WidgetHeaderTarget=createContext<HTMLElement|null|undefined>(undefined)
export function WidgetContentActions({children}:{children:ReactNode}){
 const target=useContext(WidgetHeaderTarget)
 return target===undefined?<>{children}</>:target?createPortal(children,target):null
}
export default function WidgetManageButton({dashboardHidden,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{dashboardHidden?:boolean}){
 const target=useContext(WidgetHeaderTarget)
 if(target!==undefined&&dashboardHidden)return null
 return <WidgetContentActions><button {...props}/></WidgetContentActions>
}
