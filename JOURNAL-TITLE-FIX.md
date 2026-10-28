# 수업 기록 제목 갱신

최근 수업 기록과 수업 상세 이력에서 저장 시점의 제목 대신 현재 진도계획의 제목을 표시합니다. 기록 본문과 다음 수업 메모는 그대로 보존합니다. 연결 수업이 삭제된 경우 저장 당시 제목을 유지합니다. 작은 위젯 요약도 동일하게 적용합니다. 이전 위젯 개선을 포함합니다.

```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-journal-title.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm run build
```

```bash
git add src scripts/check-teacher-desk.mjs WIDGET-STYLE.md JOURNAL-UPDATE.md LAYOUT-FIX.md CALENDAR-TITLE-FIX.md JOURNAL-TITLE-FIX.md
git commit -m "수업 기록 제목을 현재 진도계획과 일치"
git push
```
