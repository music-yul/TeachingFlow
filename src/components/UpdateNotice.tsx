import { useState } from 'react'
import { markReleaseSeen, releaseHighlights, releaseTitle, shouldShowRelease } from '../releaseNotes'

/** 업데이트 안내. ‘다시 보지 않기’를 체크하고 닫으면 이 버전에서는 다시 띄우지 않고, 체크하지 않으면 다음에 열 때 다시 보여준다. */
export default function UpdateNotice() {
  const [open, setOpen] = useState(() => { try { return shouldShowRelease(localStorage) } catch { return true } })
  const [dontShow, setDontShow] = useState(false)
  const close = () => { if (dontShow) { try { markReleaseSeen(localStorage) } catch { /* 저장소를 못 쓰면 다음에 다시 표시 */ } } setOpen(false) }
  if (!open) return null
  return <div className="release-backdrop">
    <section className="release-dialog" role="dialog" aria-modal="true" aria-labelledby="release-title"
      onKeyDown={event => {
        if (event.key === 'Escape') { close(); return }
        if (event.key !== 'Tab') return
        const items = [...event.currentTarget.querySelectorAll<HTMLElement>('input,button')]
        const index = items.indexOf(document.activeElement as HTMLElement)
        event.preventDefault()
        items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus()
      }}>
      <h2 id="release-title">{releaseTitle}</h2>
      <p className="hint">이번 업데이트에서 달라진 점입니다.</p>
      <ul>{releaseHighlights.map(text => {
        const split = text.indexOf(':')
        return <li key={text}>{split > 0 ? <><b>{text.slice(0, split)}</b>{text.slice(split)}</> : text}</li>
      })}</ul>
      <div className="release-actions">
        <label className="release-dont-show"><input type="checkbox" checked={dontShow} onChange={event => setDontShow(event.target.checked)} /> 다시 보지 않기</label>
        <button autoFocus className="primary-button" onClick={close}>닫기</button>
      </div>
    </section>
  </div>
}
