import { APP_VERSION } from './storage'
export const releaseNoticeKey=`teachingflow-release-seen:${APP_VERSION}`
export const releaseHighlights=[
 '담임·동아리·업무 기능이 추가되었습니다. 환경설정에서 필요한 기능을 켜서 사용할 수 있습니다. 지난 업무 기록과 완료 업무도 모아볼 수 있습니다.',
 '첫 화면에 위젯 기능이 추가되었습니다. 원하는 위젯을 선택하고 위치·크기·표시 정보를 조절할 수 있습니다.',
 '수업 기록과 다음 수업 메모 기능이 추가되었습니다. 캘린더나 오늘의 수업에서 수업을 눌러 기록을 남길 수 있습니다. 다음 수업 메모는 같은 학급·과목의 다음 수업일에 오늘의 수업 위젯에 표시됩니다.',
]

export function shouldShowRelease(storage:Pick<Storage,'getItem'>){try{return storage.getItem(releaseNoticeKey)!=='1'}catch{return true}}
export function markReleaseSeen(storage:Pick<Storage,'setItem'>){try{storage.setItem(releaseNoticeKey,'1');return true}catch{return false}}
