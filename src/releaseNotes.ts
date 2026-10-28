import { APP_VERSION } from './storage'
export const releaseNoticeKey=`teachingflow-release-seen:${APP_VERSION}:widgets-2026-10`
export const releaseHighlights=[
 '내 화면에 맞게 자유롭게: 위젯을 추가하고 위치와 크기를 조절하세요. 큰 모니터에서는 더 많은 위젯을 배치할 수 있습니다.',
 '오늘 화면에서 바로 편집: 상단의 위젯 추가·화면 편집 버튼을 이용하세요. 작은 위젯은 요약으로 보고 눌러서 펼칠 수 있습니다.',
 '위젯마다 다르게: 이름과 글자 크기를 바꾸고, 제목+테두리·제목만·테두리만·둘 다 없음 중에서 선택할 수 있습니다.',
 '달력도 내 방식으로: 1·2·3·4주 또는 월간으로 보고, 표시할 자료를 체크해 모아보세요. 이름을 달리한 달력을 여러 개 놓을 수도 있습니다.',
 '필요한 수업 기록만: 지난 수업·어제·이번 주·최근 며칠 등 조회 기간을 선택하고, 기록이 있는 수업만 모아볼 수 있습니다.',
 '각 위젯의 ⚙ 버튼에서 설정하세요. 기존 기록과 메모는 그대로 유지됩니다.',
]

export function shouldShowRelease(storage:Pick<Storage,'getItem'>){try{return storage.getItem(releaseNoticeKey)!=='1'}catch{return true}}
export function markReleaseSeen(storage:Pick<Storage,'setItem'>){try{storage.setItem(releaseNoticeKey,'1');return true}catch{return false}}
