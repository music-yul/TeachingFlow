import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import App from './App.tsx'
import { readData } from './storage'
import { fonts, fontSizes, normalizeFontSize, themes, uiThemeVars } from './theme'
import {displayFontStack,prepareScreenFont} from './fontLoading'

async function startApp() {
 const data=readData(),appearance=data.settings.appearance
 const root=document.documentElement
 const theme=themes.find(item=>item.id===appearance.themeId)||themes[0]
 Object.entries(uiThemeVars(theme,appearance)).forEach(([key,value])=>root.style.setProperty(key,value))
 root.style.setProperty('--accent',appearance.accent)
 root.style.fontSize=fontSizes[normalizeFontSize(appearance.fontSize)]||fontSizes.normal
 const font=fonts.find(item=>item.id===appearance.fontId)||fonts[0]
 document.body.style.fontFamily=font.stack
 const container=document.getElementById('root')!
 // Visibility preserves layout/font discovery while preventing a fallback-font frame.
 container.style.visibility='hidden'
 container.setAttribute('aria-busy','true')
 const loading=document.createElement('div')
 loading.textContent='화면을 준비하고 있어요…'
 loading.setAttribute('role','status')
 Object.assign(loading.style,{position:'fixed',inset:'0',display:'grid',placeItems:'center',font:'14px system-ui, sans-serif',color:'var(--muted)',background:'var(--bg)',zIndex:'99999'})
 document.body.append(loading)
 try{
  flushSync(()=>createRoot(container).render(<StrictMode><App /></StrictMode>))
  // Include rendered UI, widget data, dialog labels and saved content (including Korean subsets).
  await prepareScreenFont(font,(container.textContent||'')+JSON.stringify(data))
  document.body.style.fontFamily=displayFontStack(font)
 }finally{
  container.style.visibility=''
  container.removeAttribute('aria-busy')
  loading.remove()
 }
}
void startApp()
// 기존 GitHub Pages 주소에서는 이전 안내 화면만 표시하므로, 오프라인 앱 캐시를 해제한다.
// Vercel 등 다른 주소에서는 기존 서비스 워커 동작을 유지한다.
const isLegacyTeachingFlowUrl = location.hostname === 'music-yul.github.io'
  && location.pathname.startsWith('/TeachingFlow')

if('serviceWorker' in navigator&&location.protocol==='https:'&&!import.meta.env.DEV){
 window.addEventListener('load',()=>{
  if(isLegacyTeachingFlowUrl){
   void navigator.serviceWorker.getRegistrations()
    .then(registrations=>Promise.all(registrations.map(registration=>registration.unregister())))
   if('caches' in window){
    void caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('teachingflow-')).map(key=>caches.delete(key))))
   }
   return
  }
  void navigator.serviceWorker.register('./sw.js').catch(()=>undefined)
 })
}
