# Google Drive 백업 연결 설정

이 기능은 각 사용자가 선택한 Google 계정의 내 드라이브에 `티칭플로_백업.json`을 저장하고 불러오는 수동 백업입니다. 자동 동기화가 아닙니다.
개발자가 배포 앱의 OAuth 클라이언트 ID를 한 번 설정하면, 사용자는 자신의 Google 계정으로 연결합니다. 사용자마다 Cloud 프로젝트를 만들 필요는 없습니다.

## 배포 담당자 설정
1. Google Cloud Console에서 사용할 프로젝트를 선택하고 **Google Drive API**를 활성화합니다.
2. Google Auth Platform에서 앱 이름·지원 이메일·연락처와 Audience를 설정합니다. 테스트 상태라면 사용할 계정을 테스트 사용자로 추가합니다. 일반 사용자에게 배포할 때는 해당 앱의 게시 설정을 완료합니다.
3. Data Access에 `https://www.googleapis.com/auth/drive.file` 권한을 등록합니다. 전체 Drive 접근 권한은 요청하지 않습니다.
4. **OAuth 클라이언트 ID → 웹 애플리케이션**을 만듭니다.
5. 승인된 JavaScript 원본에 `https://music-yul.github.io`를 추가합니다. `/TeachingFlow/` 경로를 붙이지 않습니다. 개발 환경은 실제로 쓰는 `http://localhost:5173` 등 정확한 원본을 별도로 등록합니다.
6. GitHub 저장소의 **Settings → Secrets and variables → Actions → Variables**에 `VITE_GOOGLE_CLIENT_ID`를 추가하고 웹 클라이언트 ID를 넣습니다. 예: `...apps.googleusercontent.com`.
7. 포함된 `.github/workflows/deploy.yml`을 적용한 뒤 다시 배포합니다. 클라이언트 ID는 빌드에 포함되므로 변수만 추가하고 이미 만들어진 HTML을 올리면 활성화되지 않습니다.

로컬 소스 개발은 `.env.example`을 `.env.local`로 복사해 같은 값을 넣고 `npm run dev` 또는 `npm run build`를 실행합니다.
**클라이언트 시크릿은 입력하거나 프런트엔드에 넣지 않습니다.** 이 구현은 Google Identity Services의 브라우저 토큰 방식입니다.

## 사용자 사용법
- 배포된 티칭플로 → 환경설정 → 데이터 관리 → Google 계정 연결.
- 연결한 계정의 이름과 이메일을 확인합니다.
- **Drive에 백업 저장**: 현재 기록과 화면별 위젯 설정을 저장합니다.
- 기존 백업이 선택돼 있으면 확인 후 덮어씁니다. **새 백업 파일 만들기**를 고르면 같은 이름의 새 백업을 별도로 만듭니다.
- **Drive에서 불러오기**: 선택한 백업을 검증한 뒤 기존 불러오기 확인 절차로 현재 기록을 바꿉니다.
- **연결 해제 / 계정 변경**: 연결 권한을 해제하고 다른 계정을 선택할 수 있습니다. 백업 파일과 로컬 기록은 지우지 않습니다.

## 동작과 한계
- 권한 범위는 `drive.file`입니다. 이 앱이 만들었거나 이 앱에 접근이 허용된 파일만 다룹니다. 다른 앱이 임의로 올린 JSON은 로컬 파일 불러오기를 이용하세요.
- 목록은 이 앱이 접근할 수 있는 티칭플로 백업 파일만 보여줍니다. 파일 이름과 수정 날짜로 선택할 수 있습니다.
- 액세스 토큰은 메모리에만 두며 JSON 백업·localStorage에 저장하지 않습니다. 페이지를 다시 열거나 토큰이 만료되면 다시 연결합니다.
- 다른 기기에서 변경된 백업 버전을 감지하면 덮어쓰기를 중단합니다. 서버가 ETag를 제공하면 If-Match도 사용합니다. ETag가 없을 때 버전 확인과 업로드 사이의 동시 수정까지 원자적으로 막는 동기화 시스템은 아닙니다.
- OAuth 설정이 없는 배포본은 연결 버튼을 비활성화합니다. 다운로드한 `file://` HTML은 JSON 파일 백업을 사용할 수 있고 Drive 연동은 배포된 웹사이트에서 사용합니다.
- 실제 Google OAuth 및 Drive 계정으로 끝까지 연결하는 검증은 클라이언트 ID 설정 후 진행해야 합니다. 자동화 검사는 테스트 응답으로 계정 선택·저장·복원·만료·충돌을 검증했습니다.

## 공식 문서
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
