# 추가 수정 적용

이 ZIP은 직전 위젯/Google Drive 수정본에 추가로 적용하는 파일만 담았습니다.
TeachingFlow-main 폴더 안의 내용을 프로젝트 루트에 덮어쓰세요.

```bash
tf_update_dir=$(mktemp -d) &&
unzip -q TeachingFlow-widget-refinement.zip -d "$tf_update_dir" &&
cp -a "$tf_update_dir/TeachingFlow-main/." . &&
npm ci &&
npm run build &&
npm run check:teacher-desk &&
npm run check:dashboard
```

확인이 끝나면 수정 파일만 선택해 올립니다. ZIP 파일은 포함하지 않습니다.

```bash
git add src scripts package.json DASHBOARD-UPDATE.md REFINEMENT-UPDATE.md
git diff --cached --stat
git commit -m "요약 위젯 간소화 및 달력 복수 선택"
git push
```

기존 코드 변경이 있으면 덮어쓰기 전에 먼저 보관하거나 변경 내역을 확인하세요.
