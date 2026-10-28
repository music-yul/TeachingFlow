# 모든 위젯 1×1 수정본 적용

앞서 제공한 요약 간소화·달력 복수 선택·상단 문구 제거 변경도 포함했습니다.
직전 위젯/Drive 수정본이 적용된 프로젝트 루트에서 이 ZIP을 덮어쓰면 됩니다.
사용자가 별도로 소스를 수정했다면 먼저 변경 내역을 보관하세요.

```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-widget-adaptive.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm ci &&
npm run build &&
npm run check:teacher-desk &&
npm run check:dashboard
```

검사가 PASS로 끝나면 이번 수정 파일만 올립니다.

```bash
git add src scripts package.json DASHBOARD-UPDATE.md REFINEMENT-UPDATE.md ADAPTIVE-UPDATE.md
git diff --cached --stat
git commit -m "모든 위젯 1x1 지원과 크기별 보기 추가"
git push
```

Google Drive 설정과 기존 백업 형식은 유지됩니다.
