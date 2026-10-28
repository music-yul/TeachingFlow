# 최근 수업 기록 조회 기간

위젯 설정에서 지난 수업(학급별 최근 기록 1회), 오늘, 어제, 이번 주(월요일부터 오늘), 최근 7일, 최근 30일, 전체, 직접 지정(1~365일)을 선택합니다. 최근 N일에는 오늘을 포함합니다.

위젯별 학급 필터와 함께 적용하며 작은 위젯 요약에도 동일하게 반영합니다. 기본값은 전체입니다. 이전 위젯 스타일 개선과 3주 달력도 포함합니다.

ZIP을 저장소 맨 위에 올린 후:
```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-journal-period.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm run build
```

```bash
git add src scripts/check-teacher-desk.mjs WIDGET-STYLE.md JOURNAL-UPDATE.md
git commit -m "최근 수업 기록 조회 기간 설정 추가"
git push
```

## 위젯 외형
각 위젯 설정의 제목과 테두리에서 제목+테두리, 제목만, 제목 없음(테두리도 숨김)을 선택합니다. 설정 버튼 및 날짜 이동 등 기능 버튼은 유지합니다.

기록이 있는 수업만 체크 시 record 본문이 비어 있거나 공백뿐인 항목을 숨깁니다. 기간/학급 조건과 함께 적용합니다.
