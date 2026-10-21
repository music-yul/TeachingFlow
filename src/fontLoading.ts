import {ensureFontLoaded} from './theme'
import type {FontOption} from './theme'
const failedFonts=new Set<string>()
const fallback="'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif"
export function displayFontStack(font:FontOption){return failedFonts.has(font.id)?fallback:font.stack}

/** Keep the app hidden until its actual first-screen glyphs and weights are ready. */
export async function prepareScreenFont(font:FontOption,text:string,timeoutMs=8000):Promise<boolean>{
 if(!font.href)return true
 failedFonts.delete(font.id)
 let timer:ReturnType<typeof setTimeout>|undefined
 let cleanup=()=>{}
 const ready=(async()=>{
  ensureFontLoaded(font)
  const link=document.getElementById(`webfont-${font.id}`) as HTMLLinkElement|null
  if(!link||!document.fonts)return false
  if(!link.sheet)await new Promise<void>((resolve,reject)=>{
   const loaded=()=>{cleanup();resolve()}
   const error=()=>{cleanup();reject(new Error('Font stylesheet unavailable'))}
   cleanup=()=>{link.removeEventListener('load',loaded);link.removeEventListener('error',error)}
   link.addEventListener('load',loaded,{once:true});link.addEventListener('error',error,{once:true})
  })
  const family=font.stack.split(',')[0].trim()
  const glyphs=[...new Set(text)].join('')||'티칭플로 0123456789'
  const requests=[400,500,600,700].map(weight=>document.fonts.load(`${weight} 16px ${family}`,glyphs))
  const faces=await Promise.all(requests)
  await document.fonts.ready
  return faces.every(list=>list.length>0&&list.every(face=>face.status==='loaded'))
 })().catch(()=>false)
 try{
  const loaded=await Promise.race([ready,new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs)})])
  if(!loaded)failedFonts.add(font.id)
  return loaded
 }finally{if(timer)clearTimeout(timer);cleanup()}
}
