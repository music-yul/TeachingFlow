import { APP_VERSION } from './storage'
import { GOOGLE_CLIENT_ID } from './googleDrive'
export const releaseTitle=`티칭플로 ${APP_VERSION} 업데이트`
export const releaseNoticeKey=`teachingflow-release-seen:${APP_VERSION}:2026-11`
/** '제목: 설명' 형식. 팝업에서 콜론 앞을 굵게 표시한다. */
export function releaseHighlightsFor(driveEnabled:boolean){
 return [
  '기간 업무를 날마다 체크: 기간으로 등록한 업무는 오늘의 할 일에서 체크하면 그날만 완료되고, 다음 날 다시 표시됩니다. 업무 목록에서 ‘매일 체크 3/10일’처럼 진행 현황을 볼 수 있고, 기간 전체를 끝냈을 때는 업무 목록의 체크박스나 달력 팝업의 ‘기간 전체 완료’를 누르세요.',
  '완료 업무 되돌리기: 실수로 완료 처리한 업무는 업무 › 히스토리의 ‘미완료로 되돌리기’로 원래대로 돌릴 수 있습니다.',
  '인터넷 없이 사용: 인터넷이 될 때 한 번 열어 두면 인터넷이 끊겨도 같은 주소로 열립니다. 주소창 오른쪽의 앱 설치 아이콘을 누르면 바탕화면에서 프로그램처럼 쓸 수 있습니다.',
  '전체 기록 엑셀로 받기: 환경설정 › 데이터 관리에서 명단·진도표·수업 기록·출결과 특기사항·평가 점수·업무·담임·동아리 기록을 기능별 시트로 나눈 엑셀 파일 하나로 받을 수 있습니다.',
  ...(driveEnabled?['Google Drive 백업: 환경설정 › 데이터 관리에서 내 Google 계정에 백업을 저장하고 불러올 수 있습니다. 학교·교육청 계정은 막힐 수 있으니 개인 Gmail로 연결하세요. 자동 저장이 아니므로 다른 기기에서 쓰기 전에는 불러오기, 끝나면 백업 저장을 눌러 주세요.']:[]),
  '기존 기록과 설정은 그대로 유지됩니다. 자세한 사용법은 환경설정 › 도움말에서 확인하세요.',
 ]
}
export const releaseHighlights=releaseHighlightsFor(!!GOOGLE_CLIENT_ID)

export function shouldShowRelease(storage:Pick<Storage,'getItem'>){try{return storage.getItem(releaseNoticeKey)!=='1'}catch{return true}}
export function markReleaseSeen(storage:Pick<Storage,'setItem'>){try{storage.setItem(releaseNoticeKey,'1');return true}catch{return false}}
