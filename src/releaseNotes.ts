import { APP_VERSION } from './storage'
export const releaseNoticeKey=`teachingflow-release-seen:${APP_VERSION}`
export const releaseHighlights=[
 '담임·동아리·업무 기능이 추가되었습니다. 환경설정에서 필요한 기능을 켜서 사용할 수 있습니다.',
 '첫 화면에 위젯 기능이 추가되었습니다. 원하는 위젯을 선택하고 위치와 크기를 자유롭게 배치할 수 있습니다.',
]

export function shouldShowRelease(storage:Pick<Storage,'getItem'>){try{return storage.getItem(releaseNoticeKey)!=='1'}catch{return true}}
export function markReleaseSeen(storage:Pick<Storage,'setItem'>){try{storage.setItem(releaseNoticeKey,'1');return true}catch{return false}}
