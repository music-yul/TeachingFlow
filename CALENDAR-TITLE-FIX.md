# 달력 위젯 제목 표시 수정

위젯 이름을 지정한 후 제목+테두리 또는 제목만을 선택하면 달력 내부에 이름이 표시됩니다. 테두리만/둘 다 없음에서는 이름을 숨깁니다. 기간 및 이동 버튼은 유지됩니다. 이전 위젯/달력 수정도 모두 포함합니다.

```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-calendar-title.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm run build
```

```bash
git add src scripts/check-teacher-desk.mjs WIDGET-STYLE.md JOURNAL-UPDATE.md LAYOUT-FIX.md CALENDAR-TITLE-FIX.md
git commit -m "달력 위젯 이름 표시 수정"
git push
```
