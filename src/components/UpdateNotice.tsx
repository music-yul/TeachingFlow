import { useEffect, useState } from 'react'
import { APP_VERSION } from '../storage'
import { markReleaseSeen, releaseHighlights, shouldShowRelease } from '../releaseNotes'
export default function UpdateNotice(){
 const [open,setOpen]=useState(()=>{try{return shouldShowRelease(localStorage)}catch{return true}})
 useEffect(()=>{if(!open)return;try{markReleaseSeen(localStorage)}catch{};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[open])
 if(!open)return null
 return <div className="release-backdrop"><section className="release-dialog" role="dialog" aria-modal="true" aria-labelledby="release-title" onKeyDown={event=>{if(event.key==='Tab'){event.preventDefault();event.currentTarget.querySelector('button')?.focus()}}}><h2 id="release-title">티칭플로 {APP_VERSION} 업데이트</h2><ul>{releaseHighlights.map(text=><li key={text}>{text}</li>)}</ul><p className="hint">이 안내는 이 브라우저에서 버전당 한 번 표시됩니다.</p><button autoFocus className="primary-button" onClick={()=>setOpen(false)}>확인</button></section></div>
}
