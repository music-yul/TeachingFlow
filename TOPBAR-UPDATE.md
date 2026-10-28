# 위젯 버튼을 상단 탭 오른쪽으로 이동

- 오늘 화면의 위젯 추가·화면 편집 버튼을 오늘/교과/환경설정 탭과 같은 줄의 맨 오른쪽으로 이동했습니다.
- 오늘 탭에서만 표시합니다. 버튼 기능은 기존 대시보드 상태와 연결되며 본문에는 중복 표시하지 않습니다.
- 작은 화면에서는 탭 목록만 가로 스크롤되고 버튼은 오른쪽에 남습니다.
- 편집 중 기본 배치로 버튼은 본문 편집 안내 옆에 둡니다.
- 기존 위젯 배치·이름·내용·Google Drive 설정은 유지합니다.

기존 수정본에 이 ZIP의 TeachingFlow-main 폴더 안 내용을 덮어쓰세요.

```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-topbar-buttons.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm run build &&
git add src/App.tsx src/App.css src/dashboardToolbar.ts src/components/FlexibleDashboard.tsx TOPBAR-UPDATE.md &&
git commit -m "위젯 버튼을 상단 탭 오른쪽으로 이동" &&
git push
```

검증: 빌드 및 기존 기능·대시보드 검사 통과. Chromium에서 1920/1366/768/390/320px 화면의 같은 줄 오른쪽 정렬·가로 넘침·추가/편집/초기화 버튼 위치·오늘 탭에만 표시되는 동작을 확인했습니다.
