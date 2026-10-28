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
  },error_callback:()=>{if(mounted.current){setBusy(false);setError('로그인 창이 닫혔거나 차단되었습니다. 팝업을 허용하고 다시 연결해 주세요.')}}})
  try{client.requestAccessToken({prompt:'select_account'})}catch(e){setBusy(false);fail(e)}
 }
 const run=async(action:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setStatus('');try{await action()}catch(e){fail(e)}finally{if(mounted.current)setBusy(false)}}
 const disconnect=()=>{const token=auth.current?.token;auth.current=null;setAccount(null);setFiles([]);setSelected('');setStatus('Google Drive 연결을 해제했습니다. Drive 백업과 이 브라우저 기록은 유지됩니다.');if(token)window.google?.accounts.oauth2.revoke(token,()=>{})}
 const target=files.find(file=>file.id===selected)
 return <div className="block drive-backup-panel"><h2>Google Drive 백업</h2><p className="hint">각 사용자가 선택한 Google 계정의 내 드라이브에 티칭플로 백업을 저장하고 불러옵니다. 버튼을 눌렀을 때만 전송하며 자동 동기화하지 않습니다.</p>
 {!GOOGLE_CLIENT_ID&&<p className="banner">이 배포본은 Google Drive 연결 준비가 필요합니다. 준비가 끝나면 Google 계정을 연결해 사용할 수 있습니다.</p>}
 {!hosted&&<p className="hint">Google Drive 연결은 배포된 웹사이트에서 사용하세요. 다운로드한 HTML에서는 JSON 파일 내보내기·불러오기를 이용할 수 있습니다.</p>}
 {account?<><p><strong>{account.displayName||'연결한 계정'}</strong> · {account.emailAddress}</p><div className="inline-form"><button disabled={busy} onClick={disconnect}>연결 해제 / 계정 변경</button><button disabled={busy} onClick={()=>run(()=>refresh(requireToken()))}>백업 목록 새로고침</button></div><label>백업 파일<select aria-label="Drive 백업 파일" disabled={busy} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">새 백업 파일 만들기</option>{files.map(file=><option key={file.id} value={file.id}>{file.name}{file.modifiedTime?' · '+new Date(file.modifiedTime).toLocaleString('ko-KR'):''}</option>)}</select></label><div className="inline-form"><button className="primary-button" disabled={busy} onClick={()=>run(async()=>{const token=requireToken();if(target&&!window.confirm(`${account.emailAddress||'연결한 계정'}의 ${target.name}을 현재 브라우저 기록으로 덮어쓸까요?`))return;await saveDriveBackup(token,data,target);await refresh(token);setStatus('현재 기록과 위젯 설정을 Drive에 백업했습니다.')})}>Drive에 백업 저장</button><button disabled={busy||!target} onClick={()=>run(async()=>{if(!target)return;const file=await downloadDriveBackup(requireToken(),target);await importData(file);await onImport(file)})}>Drive에서 불러오기</button></div></>:<button className="primary-button" disabled={!enabled||!ready||busy} onClick={connect}>{busy?'연결 중…':enabled&&!ready?'Google 연결 준비 중…':'Google 계정 연결'}</button>}
 {enabled&&!ready&&error&&<button onClick={prepare}>연결 준비 다시 시도</button>}
 {busy&&account&&<p role="status">Drive 백업을 처리하고 있습니다…</p>}{status&&<p role="status">{status}</p>}{error&&<p className="banner warn" role="alert">{error}</p>}
 </div>
}
