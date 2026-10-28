# 위젯 업데이트 안내

앱을 열면 새 위젯 기능 안내가 표시됩니다. 기존 v4.5 안내를 본 사용자도 새 안내를 볼 수 있으며 확인 후에는 같은 브라우저에서 반복하지 않습니다. 수업 기록 제목 갱신 및 앞서 진행한 위젯 개선도 포함합니다.

```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-widget-update.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm run build
```

```bash
git add src scripts/check-teacher-desk.mjs WIDGET-STYLE.md JOURNAL-UPDATE.md LAYOUT-FIX.md CALENDAR-TITLE-FIX.md JOURNAL-TITLE-FIX.md WIDGET-RELEASE.md
git commit -m "위젯 업데이트 안내 및 수업 기록 제목 갱신"
git push
```
