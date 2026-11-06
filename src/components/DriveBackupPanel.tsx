import {useEffect,useRef,useState} from 'react'
import type {AppData} from '../types'
import {importData} from '../storage'
import {DRIVE_SCOPE,GOOGLE_CLIENT_ID,DriveError,loadGoogleSdk,driveAccount,listDriveBackups,saveDriveBackup,downloadDriveBackup} from '../googleDrive'
import type {DriveAccount,DriveFile} from '../googleDrive'
export default function DriveBackupPanel({data,onImport}:{data:AppData;onImport:(file:File)=>void}){
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[account,setAccount]=useState<DriveAccount|null>(null),[files,setFiles]=useState<DriveFile[]>([]),[selected,setSelected]=useState('')
 const auth=useRef<{token:string;expires:number}|null>(null),mounted=useRef(true)
 const hosted=typeof location!=='undefined'&&['https:','http:'].includes(location.protocol)
 const enabled=!!GOOGLE_CLIENT_ID&&hosted
 const prepare=()=>{setError('');loadGoogleSdk().then(()=>{if(mounted.current)setReady(true)}).catch(e=>{if(mounted.current)setError(e.message)})}
 useEffect(()=>{mounted.current=true;if(enabled)prepare();return()=>{mounted.current=false;auth.current=null}},[enabled])
 const fail=(e:unknown)=>{if(e instanceof DriveError&&e.status===401){auth.current=null;setAccount(null);setFiles([]);setSelected('')}setError(e instanceof Error?e.message:'Drive 연결 중 문제가 생겼습니다.')}
 const requireToken=()=>{const value=auth.current;if(!value||Date.now()>=value.expires)throw new DriveError('Google 연결이 만료되었습니다. 다시 연결해 주세요.',401);return value.token}
 const refresh=async(token:string)=>{const next=await listDriveBackups(token);if(!mounted.current)return;setFiles(next);setSelected(old=>next.some(file=>file.id===old)?old:next[0]?.id||'')}
 const connect=()=>{
  if(!ready||busy||!window.google)return
  setBusy(true);setError('');setStatus('')
  const oauth=window.google.accounts.oauth2
  // No await before the request: the popup must originate from this button click.
  const client=oauth.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:DRIVE_SCOPE,callback:response=>{
   if(!mounted.current)return
   if(response.error||!response.access_token||!oauth.hasGrantedAllScopes(response,DRIVE_SCOPE)){setError('Drive 파일 접근에 동의하지 않았습니다. 다시 연결할 수 있습니다.');setBusy(false);return}
   const token=response.access_token;auth.current={token,expires:Date.now()+(Number(response.expires_in)||3600)*1000-60000}
   void (async()=>{try{const user=await driveAccount(token);await refresh(token);if(mounted.current){setAccount(user);setStatus('선택한 Google 계정에 연결했습니다.')}}catch(e){auth.current=null;fail(e)}finally{if(mounted.current)setBusy(false)}})()
  },error_callback:()=>{if(mounted.current){setBusy(false);setError('로그인 창이 닫혔거나 차단되었습니다. 팝업을 허용하고 다시 연결해 주세요. 로그인 창에 ‘액세스 차단됨’이 보였다면 그 계정은 아직 사용 허가가 되지 않은 상태이니 개인 Gmail로 다시 시도하거나 개발자에게 알려 주세요.')}}})
  try{client.requestAccessToken({prompt:'select_account'})}catch(e){setBusy(false);fail(e)}
 }
 const run=async(action:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setStatus('');try{await action()}catch(e){fail(e)}finally{if(mounted.current)setBusy(false)}}
 const disconnect=()=>{const token=auth.current?.token;auth.current=null;setAccount(null);setFiles([]);setSelected('');setStatus('Google Drive 연결을 해제했습니다. Drive 백업과 이 브라우저 기록은 유지됩니다.');if(token)window.google?.accounts.oauth2.revoke(token,()=>{})}
 const target=files.find(file=>file.id===selected)
 // 배포본에 연결 설정이 없으면 다른 선생님에게 혼란을 주지 않도록 패널 자체를 숨긴다.
 if(!GOOGLE_CLIENT_ID)return null
 return <div className="block drive-backup-panel"><h2>Google Drive 백업</h2><p className="hint">내 Google 계정의 드라이브에 티칭플로 백업 파일을 저장하고 불러옵니다. 버튼을 눌렀을 때만 전송하며 자동 동기화하지 않습니다.</p>
 <details className="drive-guide"><summary>처음 사용하시나요? (꼭 읽어 주세요)</summary><ul>
  <li><b>저장 위치</b> — 연결한 계정의 <b>내 드라이브</b>에 <code>티칭플로_백업.json</code> 파일로 저장됩니다. 다른 사람과 공유되지 않습니다.</li>
  <li><b>권한</b> — 티칭플로가 만든 백업 파일만 읽고 씁니다. 드라이브의 다른 파일은 볼 수 없습니다.</li>
  <li><b>계정</b> — 학교·교육청 계정은 관리자 설정으로 막혀 있을 수 있습니다. 연결이 안 되면 <b>개인 Gmail</b>을 사용하세요.</li>
  <li><b>로그인 창</b> — 브라우저가 팝업을 막으면 창이 뜨지 않습니다. 주소창 오른쪽의 팝업 차단 아이콘에서 허용해 주세요.</li>
  <li><b>자동 저장이 아닙니다</b> — 학교·집 등 여러 기기에서 쓴다면, 쓰기 시작할 때 <b>Drive에서 불러오기</b>, 끝날 때 <b>Drive에 백업 저장</b>을 눌러 주세요. 순서가 바뀌면 다른 기기에서 쓴 내용이 덮어써질 수 있습니다.</li>
  <li><b>연결 유지</b> — 보안을 위해 연결은 페이지를 다시 열거나 약 1시간이 지나면 풀립니다. 그때는 다시 연결하면 됩니다.</li>
 </ul></details>
 {!hosted&&<p className="hint">Google Drive 연결은 배포된 웹사이트에서 사용하세요. 다운로드한 HTML에서는 JSON 파일 내보내기·불러오기를 이용할 수 있습니다.</p>}
 {account?<><p><strong>{account.displayName||'연결한 계정'}</strong> · {account.emailAddress}</p><div className="inline-form"><button disabled={busy} onClick={disconnect}>연결 해제 / 계정 변경</button><button disabled={busy} onClick={()=>run(()=>refresh(requireToken()))}>백업 목록 새로고침</button></div><label>백업 파일<select aria-label="Drive 백업 파일" disabled={busy} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">새 백업 파일 만들기</option>{files.map(file=><option key={file.id} value={file.id}>{file.name}{file.modifiedTime?' · '+new Date(file.modifiedTime).toLocaleString('ko-KR'):''}</option>)}</select></label><div className="inline-form"><button className="primary-button" disabled={busy} onClick={()=>run(async()=>{const token=requireToken();if(target&&!window.confirm(`${account.emailAddress||'연결한 계정'}의 ${target.name}을 현재 브라우저 기록으로 덮어쓸까요?`))return;await saveDriveBackup(token,data,target);await refresh(token);setStatus('현재 기록과 위젯 설정을 Drive에 백업했습니다.')})}>Drive에 백업 저장</button><button disabled={busy||!target} onClick={()=>run(async()=>{if(!target)return;const file=await downloadDriveBackup(requireToken(),target);await importData(file);await onImport(file)})}>Drive에서 불러오기</button></div></>:<button className="primary-button" disabled={!enabled||!ready||busy} onClick={connect}>{busy?'연결 중…':enabled&&!ready?'Google 연결 준비 중…':'Google 계정 연결'}</button>}
 {enabled&&!ready&&error&&<button onClick={prepare}>연결 준비 다시 시도</button>}
 {busy&&account&&<p role="status">Drive 백업을 처리하고 있습니다…</p>}{status&&<p role="status">{status}</p>}{error&&<p className="banner warn" role="alert">{error}</p>}
 </div>
}
