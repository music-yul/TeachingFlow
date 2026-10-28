# 위젯 표시 개선

- 기본 바깥 제목줄 숨김. 필요한 경우 위젯 설정에서 다시 표시.
- 빠른 메모 등 내부 제목이 없던 위젯에 작은 제목 추가.
- 본문과 제목의 기본 글자 크기 정리. 최근 수업 기록 줄바꿈 개선.
- 모든 위젯에 내용 글자 크기 설정 추가(자동 또는 11~24px). 위젯별 저장. 시간표 자동 모드의 맞춤 기능 유지.
- 달력 날짜 칸 높이 유지. 3주 달력 추가. 작은 위젯은 요약 보기 유지.

## 적용
저장소 최상위에 ZIP을 업로드한 뒤 실행:

```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-widget-style.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm run build
```

확인 후 저장소에 반영:

```bash
git add src scripts/check-teacher-desk.mjs WIDGET-STYLE.md
git commit -m "위젯 제목과 본문 스타일 정리"
git push
```
