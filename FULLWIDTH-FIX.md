# 위젯 가로폭 복원

설정 버튼을 위해 오른쪽 전체를 비우던 여백을 제거했습니다. 설정/이동/제거 버튼은 위쪽 고정 행에 두고 본문 스크롤을 아래에서 시작합니다. 시간표와 달력은 본문 가로폭 전체를 사용합니다. 기존 위젯·수업 기록·업데이트 안내 개선 포함.

```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-fullwidth-fix.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm run build
```

```bash
git add src scripts/check-teacher-desk.mjs FULLWIDTH-FIX.md
git commit -m "위젯 가로폭 복원 및 버튼 아래 스크롤 배치"
git push
```
