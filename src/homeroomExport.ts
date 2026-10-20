import * as XLSX from 'xlsx'
import type { AppData } from './types'
export function homeroomRecordRows(data:AppData):(string|number)[][]{
 const desk=data.teacherDesk
 const rows:(string|number)[][]=[['학급','학번','이름','기록일','종류','상담·생활 기록','후속 확인일','후속 확인 완료','명단 상태']]
 const lookup=(record:typeof desk.records[number])=>{const student=desk.students.find(s=>s.id===record.studentId);return{number:student?.number??record.studentNumber??'',name:student?.name||record.studentName||'이전 명단 학생',state:student&&!student.leftOn?'현재':'이전'}}
 desk.records.slice().sort((a,b)=>Number(lookup(a).number)-Number(lookup(b).number)||a.date.localeCompare(b.date)).forEach(record=>{const person=lookup(record);rows.push([desk.className,person.number,person.name,record.date,record.kind,record.text,record.followDate,record.followed?'완료':'미완료',person.state])})
 return rows
}
export function homeroomRecordsWorkbook(data:AppData){const book=XLSX.utils.book_new();const sheet=XLSX.utils.aoa_to_sheet(homeroomRecordRows(data));sheet['!cols']=[{wch:14},{wch:10},{wch:12},{wch:12},{wch:14},{wch:80},{wch:12},{wch:14},{wch:12}];XLSX.utils.book_append_sheet(book,sheet,'전체 상담·생활 기록');return book}
export function exportHomeroomRecords(data:AppData){XLSX.writeFile(homeroomRecordsWorkbook(data),`상담생활기록_${(data.teacherDesk.className||'담임반').replace(/[\\/:*?"<>|]/g,'_')}.xlsx`)}
