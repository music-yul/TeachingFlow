# 위젯 스크롤 및 달력 높이 수정

- 설정/이동/제거 버튼이 본문 스크롤바와 겹치지 않도록 독립 공간 확보.
- 달력이 위젯 내부 높이를 채우도록 수정. 중복 카드 테두리와 불필요한 내부 여백 제거.
- 기존 조회 기간, 기록 있는 수업만, 외형 선택, 글자 크기 및 3주 달력 수정 포함.

```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-layout-fix.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm run build
```

```bash
git add src scripts/check-teacher-desk.mjs WIDGET-STYLE.md JOURNAL-UPDATE.md LAYOUT-FIX.md
git commit -m "위젯 스크롤 겹침 및 달력 여백 수정"
git push
```

위젯 외형: 제목+테두리 / 제목만 / 테두리만 / 둘 다 없음.
