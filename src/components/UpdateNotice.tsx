import { useEffect, useState } from 'react'
import { markReleaseSeen, releaseHighlights, shouldShowRelease } from '../releaseNotes'
export default function UpdateNotice(){
 const [open,setOpen]=useState(()=>{try{return shouldShowRelease(localStorage)}catch{return true}})
 const close=()=>{try{markReleaseSeen(localStorage)}catch{};setOpen(false)}
 useEffect(()=>{if(!open)return;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[open])
 if(!open)return null
 return <div className="release-backdrop"><section className="release-dialog" role="dialog" aria-modal="true" aria-labelledby="release-title" onKeyDown={event=>{if(event.key==='Tab'){event.preventDefault();event.currentTarget.querySelector('button')?.focus()}}}><h2 id="release-title">티칭플로 위젯 업데이트</h2><ul>{releaseHighlights.map(text=><li key={text}>{text}</li>)}</ul><p className="hint">확인하면 이 브라우저에서는 다시 표시하지 않습니다.</p><button autoFocus className="primary-button" onClick={close}>확인</button></section></div>
}
