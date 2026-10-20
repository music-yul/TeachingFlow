import type { SeatingPlan, Student } from './types'
const xml=(value:string)=>value.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]!))
export function seatingSvg(plan:SeatingPlan,students:Student[],title:string){
 const cellW=160,cellH=100,gap=14,margin=35,top=125
 const aisleCount=plan.aisles.length,width=margin*2+plan.columns*(cellW+gap)-gap+aisleCount*24,height=top+plan.rows*(cellH+gap)+35
 const seats=Array.from({length:plan.rows*plan.columns},(_,i)=>i).filter(i=>!plan.disabled.includes(i)).map(seat=>{
  const row=Math.floor(seat/plan.columns),col=seat%plan.columns,x=margin+col*(cellW+gap)+plan.aisles.filter(a=>a<col).length*24,y=top+row*(cellH+gap)
  const student=students.find(s=>s.id===plan.assignments[seat])
  return `<g><rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="8" fill="#fff" stroke="#687684" stroke-width="2"/><text x="${x+12}" y="${y+22}" font-size="14" fill="#64748b">${seat+1}${plan.locked.includes(seat)?' · 고정':''}</text><text x="${x+cellW/2}" y="${y+56}" text-anchor="middle" font-size="24" font-weight="700">${xml((plan.empty||[]).includes(seat)?'빈자리':student?.name||'미배정')}</text><text x="${x+cellW/2}" y="${y+82}" text-anchor="middle" font-size="17" fill="#475569">${xml(String(student?.number||''))}</text></g>`
 }).join('')
 return{width,height,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="Malgun Gothic,Apple SD Gothic Neo,sans-serif" fill="#18212c"><text x="${width/2}" y="38" text-anchor="middle" font-size="27" font-weight="700">${xml(title)}</text><rect x="${margin}" y="60" width="${width-2*margin}" height="42" rx="6" fill="#edf1f5"/><text x="${width/2}" y="88" text-anchor="middle" font-size="21">칠판 · 교탁</text>${seats}</g></svg>`}
}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function seatingCanvas(plan:SeatingPlan,students:Student[],title:string){const {svg,width,height}=seatingSvg(plan,students,title);const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));try{const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('이미지 생성에 실패했습니다.'));img.src=url});const scale=Math.min(2,4096/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);const ctx=canvas.getContext('2d');if(!ctx)throw new Error('이미지 저장을 지원하지 않는 브라우저입니다.');ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas}finally{URL.revokeObjectURL(url)}}
export function jpegPdf(jpeg:Uint8Array,pixelWidth:number,pixelHeight:number):Uint8Array{
 const encoder=new TextEncoder(),encode=(s:string)=>encoder.encode(s)
 const pageW=842,pageH=595,scale=Math.min((pageW-40)/pixelWidth,(pageH-40)/pixelHeight),w=pixelWidth*scale,h=pixelHeight*scale
 const stream=`q ${w.toFixed(3)} 0 0 ${h.toFixed(3)} ${((pageW-w)/2).toFixed(3)} ${((pageH-h)/2).toFixed(3)} cm /Im0 Do Q`
 const chunks:Uint8Array[]=[encode('%PDF-1.4\n')],offsets=[0];let length=chunks[0].length
 const add=(n:number,parts:(string|Uint8Array)[])=>{offsets[n]=length;for(const part of [`${n} 0 obj\n`,...parts,'\nendobj\n']){const bytes=typeof part==='string'?encode(part):part;chunks.push(bytes);length+=bytes.length}}
 add(1,['<< /Type /Catalog /Pages 2 0 R >>']);add(2,['<< /Type /Pages /Count 1 /Kids [3 0 R] >>'])
 add(3,[`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`])
 add(4,[`<< /Length ${encode(stream).length} >>\nstream\n${stream}\nendstream`])
 add(5,[`<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,jpeg,'\nendstream'])
 const xref=length,tail=encode(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
 chunks.push(tail);const result=new Uint8Array(length+tail.length);let cursor=0;for(const chunk of chunks){result.set(chunk,cursor);cursor+=chunk.length}return result
}
export async function exportSeating(plan:SeatingPlan,students:Student[],title:string,format:'png'|'pdf'){
 const canvas=await seatingCanvas(plan,students,title),name=title.replace(/[\\/:*?"<>|]/g,'_')
 if(format==='png'){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('이미지 저장에 실패했습니다.');download(blob,`${name}.png`)}
 else{const jpeg=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.95).split(',')[1]),c=>c.charCodeAt(0));download(new Blob([jpegPdf(jpeg,canvas.width,canvas.height).buffer as ArrayBuffer],{type:'application/pdf'}),`${name}.pdf`)}
}
export function printSeating(plan:SeatingPlan,students:Student[],title:string){const popup=window.open('','_blank');if(!popup)throw new Error('인쇄 창을 열 수 없습니다. 이 사이트의 팝업을 허용해 주세요.');const {svg}=seatingSvg(plan,students,title);popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${xml(title)}</title><style>@page{size:A4 landscape;margin:8mm}body{margin:0}svg{width:100%;height:185mm;object-fit:contain}</style></head><body>${svg}</body></html>`);popup.document.close();popup.focus();popup.print()}
